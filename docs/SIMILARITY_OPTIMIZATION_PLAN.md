# 相似度功能优化方案

## 项目背景

基于 `similar_AI_build.tar.gz` 中的 AI 增强匹配架构，优化当前 Vue 项目的相似度比对功能。

## 核心理念对比

### Python 项目架构（参考）

```
第一层：规则预处理层
  - 完全匹配快速返回
  - 版本号智能处理
  - 核心名称提取
  - 长度过滤
  ↓
第二层：传统算法层
  - 编辑距离 (Levenshtein)
  - 词集相似度 (Token Set / Jaccard)
  - N-gram 相似度
  - 序列匹配 (SequenceMatcher)
  ↓
第三层：AI 语义理解层
  - Sentence-BERT 嵌入向量
  - LLM 边界判断
  ↓
第四层：决策融合层
  - 多维度特征加权
  - 阈值自适应
  - 置信度评分
```

### 当前 Vue 项目架构

```
文本预处理
  - 全角半角转换
  - 标点符号处理
  - 不可见字符移除
  - 同义词替换
  - 忽略词过滤
  ↓
相似度计算
  - 编辑距离 (Levenshtein)
  - Jaro-Winkler 算法
  - 加权融合（60% edit + 40% jaro）
  ↓
批量比对
  - Left/Inner/Right/Outer Join 模式
  - 锁定匹配机制
  - AI 建议功能
```

## 优化方向

### 1. 增强规则预处理层

#### 1.1 版本号智能处理

**当前问题**：
- "项目管理系统v1.0" 和 "项目管理系统v2.0" 相似度很低
- 用户需要手动处理版本号差异

**优化方案**：
```typescript
// 版本号正则模式
const VERSION_PATTERNS = [
  /[\s\-_]*(?:v|version|版本)?[\s\-_]*\d+(?:\.\d+)*(?:[\s\-_]*(?:旧版|新版|old|new))?\b/gi,
  /\(.*?版.*?\)/g,  // 括号内的版本说明
  /\[.*?版.*?\]/g,  // 方括号内的版本说明
]

function extractCoreName(text: string): string {
  let core = text
  for (const pattern of VERSION_PATTERNS) {
    core = core.replace(pattern, '')
  }
  return core.trim()
}

// 使用场景
extractCoreName("数据分析平台v1.0")  // "数据分析平台"
extractCoreName("数据分析平台v2.0")  // "数据分析平台"
// → 两者核心名称相同，相似度应为 1.0
```

#### 1.2 地块名识别规则

**需求**：
- "XXX-R21-YY" 与 "XXX-YY" 应视为同一地块
- "A-01" 与 "A-02" 必须视为不同地块

**优化方案**：
```typescript
interface LandParcelInfo {
  prefix: string      // 前缀：XXX
  type?: string       // 类型代码：R21（可选）
  suffix: string      // 后缀：YY
  raw: string         // 原始名称
}

function parseLandParcel(text: string): LandParcelInfo | null {
  // 匹配模式：前缀-[类型代码]-后缀
  const patterns = [
    /([A-Z一-鿿]+)-([A-Z]\d+)-([A-Z一-鿿\d]+)/i,  // XXX-R21-YY
    /([A-Z一-鿿]+)-([A-Z一-鿿\d]+)/i,             // XXX-YY
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return {
        prefix: match[1],
        type: match[2]?.match(/^[A-Z]\d+$/i) ? match[2] : undefined,
        suffix: match[match.length - 1],
        raw: text
      }
    }
  }
  return null
}

function isSameLandParcel(text1: string, text2: string): boolean | null {
  const parcel1 = parseLandParcel(text1)
  const parcel2 = parseLandParcel(text2)
  
  if (!parcel1 || !parcel2) return null  // 不是地块名，返回null
  
  // 比较前缀和后缀，忽略中间的类型代码
  return parcel1.prefix === parcel2.prefix && 
         parcel1.suffix === parcel2.suffix
}

// 使用场景
isSameLandParcel("滨江-R21-01地块", "滨江-01地块")  // true
isSameLandParcel("滨江-01地块", "滨江-02地块")      // false
```

#### 1.3 道路桩号识别

**需求**：
- "XX路K1+000~K2+000" 与 "XX路K3+000~K4+000" 必须识别为不同项目
- 路名相同但桩号不同 = 不同项目

**优化方案**：
```typescript
interface RoadSection {
  roadName: string    // 路名
  startPile: string   // 起点桩号：K1+000
  endPile: string     // 终点桩号：K2+000
  raw: string
}

function parseRoadSection(text: string): RoadSection | null {
  // 匹配模式：路名 + 桩号范围
  const pattern = /([一-鿿]+路)\s*(K\d+\+\d+)\s*[~～至-]\s*(K\d+\+\d+)/
  const match = text.match(pattern)
  
  if (match) {
    return {
      roadName: match[1],
      startPile: match[2],
      endPile: match[3],
      raw: text
    }
  }
  return null
}

function isSameRoadSection(text1: string, text2: string): boolean | null {
  const section1 = parseRoadSection(text1)
  const section2 = parseRoadSection(text2)
  
  if (!section1 || !section2) return null  // 不是道路工程，返回null
  
  // 路名和桩号都必须一致
  return section1.roadName === section2.roadName &&
         section1.startPile === section2.startPile &&
         section1.endPile === section2.endPile
}

// 使用场景
isSameRoadSection("滨江路K1+000~K2+000", "滨江路K1+000~K2+000")  // true
isSameRoadSection("滨江路K1+000~K2+000", "滨江路K3+000~K4+000")  // false
```

#### 1.4 附属词语容忍度

**需求**：
- 标点符号差异（括号、引号、顿号）可忽略
- 助词差异（的、之、及）可忽略
- 项目类型词差异（工程、项目、建设、地下车库、地下停车场）可适当容忍

**优化方案**：
```typescript
const NOISE_WORDS = [
  // 标点符号会在预处理中统一移除
  
  // 助词
  '的', '之', '及', '与', '和',
  
  // 项目类型词（可配置优先级）
  '工程', '项目', '建设', '建筑', '设施',
  '地下车库', '地下停车场', '停车场', '车库',
  '系统', '平台', '工具', '应用',
]

function removeNoiseWords(text: string, aggressiveness: 'low' | 'medium' | 'high'): string {
  let result = text
  
  const wordsToRemove = aggressiveness === 'high' 
    ? NOISE_WORDS 
    : aggressiveness === 'medium'
    ? NOISE_WORDS.slice(0, 10)  // 只移除助词和常见类型词
    : NOISE_WORDS.slice(0, 5)   // 只移除助词
  
  for (const word of wordsToRemove) {
    result = result.replace(new RegExp(word, 'g'), '')
  }
  
  return result.trim()
}
```

### 2. 增强传统算法层

#### 2.1 Token Set 相似度（新增）

**Python 参考实现**：
```python
def token_set_similarity(name1: str, name2: str) -> float:
    tokens1 = set(normalize(name1).split())
    tokens2 = set(normalize(name2).split())
    
    intersection = len(tokens1 & tokens2)
    union = len(tokens1 | tokens2)
    return intersection / union if union > 0 else 0.0
```

**TypeScript 实现**：
```typescript
function tokenSetSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(normalize(text1).split(/\s+/))
  const tokens2 = new Set(normalize(text2).split(/\s+/))
  
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)))
  const union = new Set([...tokens1, ...tokens2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

// 使用场景
tokenSetSimilarity("数据分析平台系统", "数据平台分析工具")
// tokens1: {数据, 分析, 平台, 系统}
// tokens2: {数据, 平台, 分析, 工具}
// 交集: {数据, 分析, 平台}
// Jaccard = 3/5 = 0.6
```

**优势**：
- 对词序不敏感
- 适合处理"数据分析平台" vs "数据平台分析"这类词序不同的情况

#### 2.2 N-gram 相似度（新增）

**TypeScript 实现**：
```typescript
function getNgrams(text: string, n: number = 2): Set<string> {
  const normalized = normalize(text).replace(/\s+/g, '')
  const ngrams = new Set<string>()
  
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n))
  }
  
  return ngrams
}

function ngramSimilarity(text1: string, text2: string, n: number = 2): number {
  const ngrams1 = getNgrams(text1, n)
  const ngrams2 = getNgrams(text2, n)
  
  const intersection = new Set([...ngrams1].filter(g => ngrams2.has(g)))
  const union = new Set([...ngrams1, ...ngrams2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

// 使用场景（2-gram）
ngramSimilarity("数据分析", "数据统计")
// ngrams1: ["数据", "据分", "分析"]
// ngrams2: ["数据", "据统", "统计"]
// 相似度 = 1/5 = 0.2
```

### 3. 优化决策融合层

#### 3.1 多维度特征向量

**当前**：
```typescript
// 仅使用两种算法
score = editSimilarity * 0.6 + jaroSimilarity * 0.4
```

**优化后**：
```typescript
interface SimilarityFeatures {
  // 规则层
  coreName?: number        // 核心名称匹配（如果适用）
  landParcel?: number      // 地块名匹配（如果适用）
  roadSection?: number     // 道路桩号匹配（如果适用）
  
  // 传统算法层
  edit: number            // 编辑距离
  jaro: number            // Jaro-Winkler
  tokenSet: number        // 词集相似度（新增）
  ngram: number           // N-gram相似度（新增）
  
  // AI层（可选）
  embedding?: number      // 语义嵌入（未来）
  llm?: number           // LLM判断（现有）
}

interface SimilarityWeights {
  // 规则层权重（优先级最高）
  coreName: number
  landParcel: number
  roadSection: number
  
  // 传统算法层权重
  edit: number
  jaro: number
  tokenSet: number
  ngram: number
  
  // AI层权重
  embedding: number
  llm: number
}

// 预设权重配置
const WEIGHT_PRESETS = {
  // 默认（平衡）
  balanced: {
    coreName: 0.30,
    landParcel: 0.30,
    roadSection: 0.30,
    edit: 0.15,
    jaro: 0.10,
    tokenSet: 0.10,
    ngram: 0.05,
    embedding: 0.00,
    llm: 0.00,
  },
  
  // 字符精确优先
  precise: {
    coreName: 0.20,
    landParcel: 0.20,
    roadSection: 0.20,
    edit: 0.25,
    jaro: 0.10,
    tokenSet: 0.03,
    ngram: 0.02,
    embedding: 0.00,
    llm: 0.00,
  },
  
  // 语义理解优先（未来）
  semantic: {
    coreName: 0.15,
    landParcel: 0.15,
    roadSection: 0.15,
    edit: 0.05,
    jaro: 0.05,
    tokenSet: 0.10,
    ngram: 0.05,
    embedding: 0.25,
    llm: 0.05,
  },
}

function calculateWeightedScore(
  features: SimilarityFeatures,
  weights: SimilarityWeights
): number {
  let totalScore = 0
  let totalWeight = 0
  
  // 规则层（如果匹配到则直接返回高分）
  if (features.coreName !== undefined) {
    return features.coreName  // 核心名称匹配，直接返回
  }
  if (features.landParcel !== undefined) {
    return features.landParcel  // 地块名确定性判断
  }
  if (features.roadSection !== undefined) {
    return features.roadSection  // 道路段确定性判断
  }
  
  // 传统算法层加权
  for (const [key, value] of Object.entries(features)) {
    if (value !== undefined && key in weights) {
      const weight = weights[key as keyof SimilarityWeights]
      totalScore += value * weight
      totalWeight += weight
    }
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0
}
```

#### 3.2 决策过程可视化

**需求**：用户需要了解相似度是如何计算出来的

**实现方案**：
```typescript
interface SimilarityDetail {
  finalScore: number
  features: SimilarityFeatures
  weights: SimilarityWeights
  explanation: string[]  // 决策过程说明
}

function calculateSimilarityWithDetails(
  text1: string,
  text2: string,
  options: SimilarityOptions
): SimilarityDetail {
  const features: SimilarityFeatures = {}
  const explanation: string[] = []
  
  // 1. 规则层判断
  const core1 = extractCoreName(text1)
  const core2 = extractCoreName(text2)
  if (core1 === core2) {
    features.coreName = 1.0
    explanation.push(`✓ 核心名称完全匹配（移除版本号后）`)
    explanation.push(`  "${text1}" → "${core1}"`)
    explanation.push(`  "${text2}" → "${core2}"`)
  }
  
  const landMatch = isSameLandParcel(text1, text2)
  if (landMatch !== null) {
    features.landParcel = landMatch ? 1.0 : 0.0
    explanation.push(
      landMatch 
        ? `✓ 地块名匹配（忽略类型代码）`
        : `✗ 地块名不同，确定为不同项目`
    )
  }
  
  // 2. 传统算法层
  features.edit = editSimilarity(text1, text2, options)
  features.jaro = jaroWinklerSimilarity(text1, text2)
  features.tokenSet = tokenSetSimilarity(text1, text2)
  features.ngram = ngramSimilarity(text1, text2)
  
  explanation.push(`\n传统算法特征：`)
  explanation.push(`  编辑距离相似度: ${(features.edit * 100).toFixed(1)}%`)
  explanation.push(`  Jaro-Winkler: ${(features.jaro * 100).toFixed(1)}%`)
  explanation.push(`  词集相似度: ${(features.tokenSet * 100).toFixed(1)}%`)
  explanation.push(`  N-gram相似度: ${(features.ngram * 100).toFixed(1)}%`)
  
  // 3. 计算最终分数
  const weights = WEIGHT_PRESETS.balanced
  const finalScore = calculateWeightedScore(features, weights)
  
  explanation.push(`\n最终加权分数: ${(finalScore * 100).toFixed(2)}%`)
  
  return {
    finalScore,
    features,
    weights,
    explanation
  }
}
```

### 4. 用户界面增强

#### 4.1 高级配置面板

```vue
<el-collapse v-model="activeConfigPanels">
  <el-collapse-item title="算法权重配置" name="weights">
    <el-radio-group v-model="weightPreset">
      <el-radio label="balanced">平衡模式</el-radio>
      <el-radio label="precise">精确模式</el-radio>
      <el-radio label="custom">自定义</el-radio>
    </el-radio-group>
    
    <div v-if="weightPreset === 'custom'" class="mt-4">
      <div v-for="(value, key) in weights" :key="key" class="mb-3">
        <label>{{ featureLabels[key] }}</label>
        <el-slider v-model="weights[key]" :min="0" :max="100" :step="5" />
        <span>{{ weights[key] }}%</span>
      </div>
    </div>
  </el-collapse-item>
  
  <el-collapse-item title="规则预处理配置" name="rules">
    <el-checkbox v-model="options.enableVersionNormalization">
      版本号标准化
    </el-checkbox>
    <el-checkbox v-model="options.enableLandParcelRule">
      地块名识别
    </el-checkbox>
    <el-checkbox v-model="options.enableRoadSectionRule">
      道路桩号识别
    </el-checkbox>
    <el-select v-model="options.noiseWordAggressiveness">
      <el-option label="低容忍度（仅移除助词）" value="low" />
      <el-option label="中容忍度（移除常见类型词）" value="medium" />
      <el-option label="高容忍度（移除所有附属词）" value="high" />
    </el-select>
  </el-collapse-item>
  
  <el-collapse-item title="调试与诊断" name="debug">
    <el-checkbox v-model="showDetailedFeatures">
      显示详细特征分数
    </el-checkbox>
    <el-checkbox v-model="showExplanation">
      显示决策过程
    </el-checkbox>
  </el-collapse-item>
</el-collapse>
```

#### 4.2 结果详情展示

```vue
<template v-if="showDetailedFeatures && item.matches.length > 0">
  <div class="feature-details">
    <div class="feature-bar" v-for="(value, key) in item.matches[0].features" :key="key">
      <span class="feature-label">{{ featureLabels[key] }}</span>
      <el-progress 
        :percentage="value * 100" 
        :color="getFeatureColor(value)"
        :stroke-width="6"
      />
      <span class="feature-value">{{ (value * 100).toFixed(1) }}%</span>
    </div>
  </div>
  
  <div v-if="showExplanation" class="explanation">
    <el-alert type="info" :closable="false">
      <template #title>
        <div class="text-xs">
          <div v-for="line in item.matches[0].explanation" :key="line">
            {{ line }}
          </div>
        </div>
      </template>
    </el-alert>
  </div>
</template>
```

## 实施计划

### Phase 1: 规则预处理增强（优先）
- [ ] 实现版本号提取和标准化
- [ ] 实现地块名识别规则
- [ ] 实现道路桩号识别规则
- [ ] 实现附属词语过滤
- [ ] 单元测试覆盖

### Phase 2: 传统算法扩展
- [ ] 实现 Token Set 相似度
- [ ] 实现 N-gram 相似度
- [ ] 更新 SimilarityCalculator 类
- [ ] 更新权重配置
- [ ] 性能基准测试

### Phase 3: 决策融合优化
- [ ] 实现多维度特征向量
- [ ] 实现可配置权重系统
- [ ] 实现决策过程记录
- [ ] 添加调试模式

### Phase 4: UI/UX 改进
- [ ] 设计高级配置面板
- [ ] 实现特征详情可视化
- [ ] 添加决策过程说明
- [ ] 用户文档更新

### Phase 5: AI 层集成（可选）
- [ ] 评估 Sentence-BERT 集成方案
- [ ] 前端调用后端嵌入服务
- [ ] 缓存优化
- [ ] 性能测试

## 关键成功因素

1. **向后兼容**：新功能应保持与现有数据的兼容性
2. **性能优先**：规则层快速返回，避免不必要的复杂计算
3. **可解释性**：用户能够理解相似度是如何计算的
4. **可配置性**：不同场景可以使用不同的权重配置
5. **测试覆盖**：每个新规则都需要充分的单元测试

## 参考资料

- `similar_AI_build/docs/project_name_identity_solution.md` - 多层次架构设计
- `similar_AI_build/docs/ai_matcher_guide.md` - Python 实现指南
- `similar_AI_build/src/name_matcher/ai_enhanced.py` - 完整参考实现
