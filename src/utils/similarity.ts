/**
 * 字符串相似度计算工具类
 * 
 * 功能说明：
 * - 提供多种相似度算法（编辑距离、Jaro-Winkler）
 * - 支持同义词替换、忽略词过滤
 * - 支持全角/半角转换、标点符号忽略等文本预处理
 * - 支持批量比对和字符级差异分析
 */

/**
 * 相似度计算选项接口
 */
export interface SimilarityOptions {
    /** 相似度阈值（0-1），低于此值的匹配将被过滤 */
    threshold?: number;
    /** 是否忽略不可见字符（如空格、制表符等） */
    ignoreInvisibleChars?: boolean;
    /** 是否将全角字符转换为半角字符 */
    fullwidthToHalfwidth?: boolean;
    /** 是否忽略标点符号 */
    ignorePunctuation?: boolean;
    /** 算法权重配置：edit = 编辑距离权重，jaro = Jaro-Winkler权重 */
    weights?: { edit: number; jaro: number };
}

/**
 * 单个匹配结果接口
 */
export interface MatchResult {
    /** 匹配到的目标文本 */
    text: string;
    /** 相似度分数（0-1） */
    similarity: number;
    /** 在目标列表中的索引位置 */
    index: number;
}

/**
 * 连接模式类型
 */
export type JoinMode = 'left' | 'inner' | 'right' | 'outer';

/**
 * 批量比对结果接口
 */
export interface BatchResult {
    /** 主轴文本（源项或目标项，取决于连接模式） */
    source: string;
    /** 匹配结果列表（按相似度降序排列） */
    matches: MatchResult[];
    /** 在主轴列表中的原始索引位置 */
    index: number;
    /** 是否为右侧视角（目标列表作为主轴） */
    isRight?: boolean;
}

/**
 * 字符差异项接口
 */
export interface DifferenceItem {
    /** 差异类型：added=新增，removed=删除，unchanged=未改变 */
    type: 'added' | 'removed' | 'unchanged';
    /** 字符内容 */
    char: string;
}

export type DiffAlgorithm = 'lcs' | 'levenshtein' | 'myers';

/**
 * 字符级差异分析结果接口
 */
export interface CharDiffResult {
    /** 差异详情列表 */
    diff: DifferenceItem[];
    /** 新增字符数量 */
    added: number;
    /** 删除字符数量 */
    removed: number;
    /** 未改变字符数量 */
    unchanged: number;
    /** 相似度分数（0-1） */
    similarity: number;
}

/**
 * 相似度计算器类
 * 提供文本相似度计算的核心功能
 */
export class SimilarityCalculator {
    /** 同义词映射表：将同义词映射到代表词 */
    private synonymGroups: Map<string, string>;
    /** 全角到半角的字符映射表 */
    private fullwidthToHalfwidthMap: Map<string, string>;
    /** 需要忽略的词汇列表 */
    private ignoreTerms: string[];

    /**
     * 构造函数
     * 初始化计算器，创建全角半角映射表
     */
    constructor() {
        this.synonymGroups = new Map();
        this.fullwidthToHalfwidthMap = this.createFullwidthMap();
        this.ignoreTerms = [];
    }

    /**
     * 创建全角到半角的字符映射表
     * 包含数字、英文字母、标点符号的全角半角对应关系
     * @returns 全角到半角的映射表
     */
    private createFullwidthMap(): Map<string, string> {
        const map = new Map<string, string>();
        // 数字：０-９ -> 0-9
        for (let i = 0; i < 10; i++) {
            map.set(String.fromCharCode(0xFF10 + i), String(i));
        }
        // 英文字母：Ａ-Ｚ和ａ-ｚ -> A-Z和a-z
        for (let i = 0; i < 26; i++) {
            map.set(String.fromCharCode(0xFF21 + i), String.fromCharCode(0x41 + i)); // A-Z
            map.set(String.fromCharCode(0xFF41 + i), String.fromCharCode(0x61 + i)); // a-z
        }
        // 标点符号映射
        const punctuation: [string, string][] = [
            ['！', '!'], ['＂', '"'], ['＃', '#'], ['＄', '$'], ['％', '%'], ['＆', '&'], ['＇', "'"],
            ['（', '('], ['）', ')'], ['＊', '*'], ['＋', '+'], ['，', ','], ['－', '-'], ['．', '.'],
            ['／', '/'], ['：', ':'], ['；', ';'], ['＜', '<'], ['＝', '='], ['＞', '>'], ['？', '?'],
            ['＠', '@'], ['［', '['], ['＼', '\\'], ['］', ']'], ['＾', '^'], ['＿', '_'], ['｀', '`'],
            ['｛', '{'], ['｜', '|'], ['｝', '}'], ['～', '~'], ['　', ' ']
        ];
        punctuation.forEach(([full, half]) => map.set(full, half));
        return map;
    }

    /**
     * 设置同义词组
     * 同义词组内的所有词会被统一替换为最短的词（代表词）
     * @param synonymText 同义词文本，格式："词1,词2,词3\n词4,词5" （逗号分隔同义词，换行或分号分隔不同组）
     * @example
     * setSynonymGroups("阿里巴巴集团,阿里\n腾讯控股有限公司,腾讯")
     * // 结果："阿里巴巴集团" 和 "阿里" 都会被替换为 "阿里"（最短）
     */
    public setSynonymGroups(synonymText: string): void {
        this.synonymGroups.clear();
        if (!synonymText || !synonymText.trim()) return;

        // 按换行符、分号等分隔符拆分成多个同义词组
        let groupTexts = synonymText
            .split(/[\n;；]+/)
            .map(s => s.trim())
            .filter(Boolean);

        if (groupTexts.length === 1) {
            groupTexts = [synonymText.trim()];
        }

        groupTexts.forEach(groupStr => {
            // 在每个组内，按逗号、顿号等分隔符拆分同义词
            const words = groupStr
                .split(/[,，\s\u3001]+/) // 支持中英文逗号、顿号、空格
                .map(w => w.trim())
                .filter(Boolean);
            if (words.length > 1) {
                // 标准化并去重
                const uniqueWords = Array.from(new Set(words.map(w => this.normalizeText(w)).filter(Boolean))) as string[];
                if (uniqueWords.length <= 1) return;

                // 选择最短的词作为代表词（长度相同时选择第一个）
                let representative = uniqueWords[0]!;
                for (let i = 1; i < uniqueWords.length; i++) {
                    const word = uniqueWords[i]!;
                    if (word && word.length < representative.length) {
                        representative = word;
                    }
                }

                // 将组内所有词映射到代表词
                uniqueWords.forEach(word => {
                    this.synonymGroups.set(word, representative);
                });
            }
        });
    }

    /**
     * 设置需要忽略的词汇
     * 这些词会在文本比对前被移除
     * @param text 忽略词文本，用逗号、换行等分隔
     * @example
     * setIgnoreTerms("有限公司,股份有限公司,科技")
     * // 结果：文本中的这些词会被移除后再进行比对
     */
    public setIgnoreTerms(text: string): void {
        this.ignoreTerms = [];
        if (!text || !text.trim()) return;
        const terms = text
            .split(/[\n,，、;；\s]+/) // 支持多种分隔符
            .map(s => this.normalizeText(s))
            .filter(Boolean);
        // 按长度降序排列，避免短词先被替换导致长词无法匹配
        this.ignoreTerms = Array.from(new Set(terms)).sort((a, b) => b.length - a.length);
    }

    /**
     * 文本预处理
     * 根据配置选项对文本进行标准化处理
     * @param text 原始文本
     * @param options 预处理选项
     * @returns 处理后的文本
     */
    public preprocessText(text: string, options: SimilarityOptions = {}): string {
        if (!text) return '';

        let processed = text.toString();

        // 1. 移除不可见字符（控制字符、零宽空格等）
        if (options.ignoreInvisibleChars) {
            processed = processed.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g, '');
        }

        // 2. 全角转半角
        if (options.fullwidthToHalfwidth) {
            processed = processed.split('').map(char => this.fullwidthToHalfwidthMap.get(char) || char).join('');
        }

        // 3. 移除标点符号（保留字母、数字、中文、空格）
        if (options.ignorePunctuation) {
            processed = processed.replace(/[^\w\u4e00-\u9fff\s]/g, '');
        }

        // 4. 转为小写并合并多个空格
        processed = processed.toLowerCase().replace(/\s+/g, ' ').trim();

        // 5. 移除忽略词
        if (this.ignoreTerms && this.ignoreTerms.length) {
            let _out = processed;
            this.ignoreTerms.forEach(term => {
                if (!term) return;
                // 转义正则特殊字符
                const _esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const _re = new RegExp(_esc, 'g');
                _out = _out.replace(_re, '');
            });
            processed = _out.replace(/\s+/g, ' ').trim();
        }
        return processed;
    }

    /**
     * 文本标准化（私有方法）
     * 转为小写并去除首尾空格
     * @param text 原始文本
     * @returns 标准化后的文本
     */
    private normalizeText(text: string): string {
        return text.toLowerCase().trim();
    }

    /**
     * 应用同义词替换
     * 将文本中的同义词替换为代表词
     * @param text 原始文本
     * @returns 替换后的文本
     */
    private applySynonyms(text: string): string {
        if (!text || this.synonymGroups.size === 0) return text;
        let result = text;

        // 按长度降序排列，避免部分替换问题
        // 例如：先替换"阿里巴巴集团"，再替换"阿里"
        const entries = Array.from(this.synonymGroups.entries()).sort((a, b) => b[0].length - a[0].length);

        for (const [key, rep] of entries) {
            if (!key) continue;
            // 转义正则特殊字符
            const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'g');
            result = result.replace(regex, rep);
        }
        return result;
    }

    /**
     * Levenshtein 距离算法（编辑距离）
     * 计算将 str1 转换为 str2 所需的最少编辑次数（增、删、改）
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @returns 编辑距离
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2;
        if (len2 === 0) return len1;

        // 初始化 DP 矩阵
        const matrix = Array(len2 + 1).fill(0).map(() => Array(len1 + 1).fill(0));

        // 初始化边界条件
        for (let i = 0; i <= len1; i++) matrix[0]![i] = i;
        for (let j = 0; j <= len2; j++) matrix[j]![0] = j;

        // 填充 DP 矩阵
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j]![i] = Math.min(
                    matrix[j]![i - 1]! + 1,     // 删除
                    matrix[j - 1]![i]! + 1,     // 插入
                    matrix[j - 1]![i - 1]! + cost  // 替换
                );
            }
        }

        return matrix[len2]![len1]!;
    }

    /**
     * Jaro-Winkler 相似度算法
     * 基于 Jaro 距离改进，对前缀相同的字符串给予更高评分
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @returns 相似度分数（0-1）
     */
    private jaroWinklerSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0.0;

        const len1 = str1.length;
        const len2 = str2.length;
        
        // 对于极短字符串，Jaro-Winkler 窗口计算可能为 0 或负数
        // 确保窗口至少为 0
        const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

        const str1Matches = new Array(len1).fill(false);
        const str2Matches = new Array(len2).fill(false);

        let matches = 0;
        let transpositions = 0;

        // 寻找匹配字符
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchWindow);
            const end = Math.min(i + matchWindow + 1, len2);

            for (let j = start; j < end; j++) {
                if (str2Matches[j] || str1[i] !== str2[j]) continue;
                str1Matches[i] = true;
                str2Matches[j] = true;
                matches++;
                break;
            }
        }

        if (matches === 0) return 0.0;

        // 计算交换次数
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!str1Matches[i]) continue;
            while (k < len2 && !str2Matches[k]) k++;
            if (k < len2 && str1[i] !== str2[k]) transpositions++;
            k++;
        }

        // 计算 Jaro 相似度
        const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

        // 如果 Jaro 相似度较低，直接返回
        if (jaro < 0.7) return jaro;

        // 计算公共前缀长度（最多4个字符）
        let prefix = 0;
        for (let i = 0; i < Math.min(len1, len2, 4); i++) {
            if (str1[i] === str2[i]) prefix++;
            else break;
        }

        // 应用 Winkler 修正
        const result = jaro + 0.1 * prefix * (1 - jaro);
        return Math.min(1.0, result);
    }

    /**
     * 基于编辑距离计算相似度
     * 相似度 = 1 - (编辑距离 / 最大字符串长度)
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @returns 相似度分数（0-1）
     */
    private editDistanceSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0.0;

        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1.0; // 虽然前面 !str1 已经拦截了，但为了严谨性增加
        
        const distance = this.levenshteinDistance(str1, str2);
        return Math.max(0, 1 - (distance / maxLen));
    }

    /**
     * 计算两个字符串的相似度
     * 结合编辑距离和 Jaro-Winkler 两种算法，加权求和
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @param options 相似度计算选项
     * @returns 相似度分数（0-1）
     */
    public calculateSimilarity(str1: string, str2: string, options: SimilarityOptions = {}): number {
        if (!str1 || !str2) return 0.0;
        if (str1 === str2) return 1.0;

        // 1. 文本预处理
        const processed1 = this.preprocessText(str1, options);
        const processed2 = this.preprocessText(str2, options);

        // 2. 标准化处理
        const normalized1 = this.normalizeText(processed1);
        const normalized2 = this.normalizeText(processed2);

        // 3. 应用同义词替换
        const synonymApplied1 = this.applySynonyms(normalized1);
        const synonymApplied2 = this.applySynonyms(normalized2);
        if (synonymApplied1 === synonymApplied2 && synonymApplied1 !== '') return 1.0;

        // 4. 计算两种相似度
        const editSim = this.editDistanceSimilarity(synonymApplied1, synonymApplied2);
        const jaroSim = this.jaroWinklerSimilarity(synonymApplied1, synonymApplied2);

        // 5. 加权求和（默认：编辑距离 60%，Jaro-Winkler 40%）
        const weights = options.weights || { edit: 0.6, jaro: 0.4 };
        const result = editSim * weights.edit + jaroSim * weights.jaro;
        
        // 兜底：如果结果非 1 但非常接近 1（如 0.99999999），通常是由于浮点误差
        // 只有当 synonymApplied1 === synonymApplied2 显式匹配时才允许返回正好 1.0
        if (result > 0.99999 && synonymApplied1 !== synonymApplied2) {
             return 0.9999;
        }
        
        return Math.min(1.0, Math.max(0.0, result));
    }

    /**
     * 批量比对匹配（支持多种连接模式）
     * 
     * @param sourceList 源文本列表
     * @param targetList 目标文本列表
     * @param mode 连接模式：'left' | 'inner' | 'right' | 'outer'
     * @param options 相似度计算选项
     * @param progressCallback 进度回调
     * @returns 匹配结果列表
     */
    public batchCalculate(
        sourceList: string[],
        targetList: string[],
        mode: JoinMode = 'left',
        options: SimilarityOptions = {},
        progressCallback: ((current: number, total: number, source: string) => void) | null = null
    ): BatchResult[] {
        // 首先执行标准的 Left Join 计算（获取所有源到目标的匹配）
        const leftResults: BatchResult[] = [];
        const totalSources = sourceList.length;

        for (let i = 0; i < sourceList.length; i++) {
            const source = sourceList[i]!;
            const matches: MatchResult[] = [];

            for (let j = 0; j < targetList.length; j++) {
                const target = targetList[j]!;
                const similarity = this.calculateSimilarity(source, target, options);

                if (similarity >= (options.threshold != null ? options.threshold : 0)) {
                    matches.push({
                        text: target,
                        similarity: similarity,
                        index: j
                    });
                }
            }

            matches.sort((a, b) => b.similarity - a.similarity);
            leftResults.push({
                source: source,
                matches: matches,
                index: i
            });

            if (progressCallback) {
                progressCallback(i + 1, totalSources, source);
            }
        }

        // 根据模式处理结果
        switch (mode) {
            case 'inner':
                // 仅保留有匹配项的源
                return leftResults.filter(r => r.matches.length > 0);

            case 'right': {
                // 以目标项为主轴，寻找匹配的源项
                const rightResults: BatchResult[] = [];
                for (let j = 0; j < targetList.length; j++) {
                    const target = targetList[j]!;
                    const matches: MatchResult[] = [];

                    // 反向查找匹配该目标的源
                    leftResults.forEach(lr => {
                        const m = lr.matches.find(match => match.text === target);
                        if (m) {
                            matches.push({
                                text: lr.source,
                                similarity: m.similarity,
                                index: lr.index
                            });
                        }
                    });

                    matches.sort((a, b) => b.similarity - a.similarity);
                    rightResults.push({
                        source: target,
                        matches: matches,
                        index: j,
                        isRight: true
                    });
                }
                return rightResults;
            }

            case 'outer': {
                // Left Join + 未被匹配到的目标项
                const matchedTargets = new Set<string>();
                leftResults.forEach(r => {
                    if (r.matches.length > 0) {
                        matchedTargets.add(r.matches[0]!.text);
                    }
                });

                const unmatchedTargets: BatchResult[] = [];
                targetList.forEach((t, ti) => {
                    if (!matchedTargets.has(t)) {
                        unmatchedTargets.push({
                            source: t,
                            matches: [],
                            index: ti,
                            isRight: true
                        });
                    }
                });

                return [...leftResults, ...unmatchedTargets];
            }

            case 'left':
            default:
                return leftResults;
        }
    }

    /**
     * 计算字符级差异
     * 比较两个字符串并返回详细的差异信息（增加、删除、未改变）
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @param algorithm 差异算法：'lcs'(最长公共子序列)、'levenshtein'(编辑距离)、'myers'(Myers算法)
     * @returns 字符差异结果
     */
    public calculateCharDiff(str1: string, str2: string, algorithm: DiffAlgorithm = 'lcs'): CharDiffResult {
        // 两个字符串都为空
        if (!str1 && !str2) {
            return { diff: [], added: 0, removed: 0, unchanged: 0, similarity: 1 };
        }
        // 只有一个字符串为空
        if (!str1 || !str2) {
            const only = (str1 || str2).split('');
            const type = str1 ? 'removed' : 'added';
            const diff: DifferenceItem[] = only.map(c => ({ type: type as any, char: c }));
            return {
                diff,
                added: type === 'added' ? only.length : 0,
                removed: type === 'removed' ? only.length : 0,
                unchanged: 0,
                similarity: 0
            };
        }

        // 根据算法选择不同的实现
        switch (algorithm) {
            case 'levenshtein':
                return this.levenshteinDiff(str1, str2);
            case 'myers':
                return this.myersDiff(str1, str2);
            case 'lcs':
            default:
                return this.lcsDiff(str1, str2);
        }
    }

    /**
     * 基于最长公共子序列(LCS)的差异算法
     * 找出两个字符串的最长公共子序列，并标记增加、删除、未改变的字符
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @returns 字符差异结果
     */
    private lcsDiff(str1: string, str2: string): CharDiffResult {
        const m = str1.length;
        const n = str2.length;

        // 构建 DP 表：dp[i][j] 表示 str1[0..i-1] 和 str2[0..j-1] 的 LCS 长度
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]! + 1;
                else dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
            }
        }

        // 回溯构建差异列表
        const diff: DifferenceItem[] = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
                // 字符相同，未改变
                diff.unshift({ type: 'unchanged', char: str1[i - 1]! });
                i--; j--;
            } else if (i > 0 && (j === 0 || dp[i - 1]![j]! >= dp[i]![j - 1]!)) {
                // str1 中被删除的字符
                diff.unshift({ type: 'removed', char: str1[i - 1]! });
                i--;
            } else if (j > 0) {
                // str2 中新增的字符
                diff.unshift({ type: 'added', char: str2[j - 1]! });
                j--;
            }
        }

        // 统计各类型字符数量
        const added = diff.filter(d => d.type === 'added').length;
        const removed = diff.filter(d => d.type === 'removed').length;
        const unchanged = diff.filter(d => d.type === 'unchanged').length;
        const denominator = added + removed + unchanged || 1;
        return { diff, added, removed, unchanged, similarity: unchanged / denominator };
    }

    /**
     * 基于 Levenshtein 编辑距离的差异算法
     * 通过动态规划找出将 str1 转换为 str2 的最小编辑操作序列
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @returns 字符差异结果
     */
    private levenshteinDiff(str1: string, str2: string): CharDiffResult {
        const m = str1.length;
        const n = str2.length;

        // 构建 DP 表：dp[i][j] 表示 str1[0..i-1] 转换为 str2[0..j-1] 的最小编辑距离
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i]![0] = i;
        for (let j = 0; j <= n; j++) dp[0]![j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]!;
                else dp[i]![j] = Math.min(
                    dp[i - 1]![j]! + 1,      // 删除
                    dp[i]![j - 1]! + 1,      // 插入
                    dp[i - 1]![j - 1]! + 1   // 替换
                );
            }
        }

        // 回溯构建差异列表
        const diff: DifferenceItem[] = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
                // 字符相同
                diff.unshift({ type: 'unchanged', char: str1[i - 1]! });
                i--; j--;
            } else if (i > 0 && j > 0 && dp[i]![j]! === dp[i - 1]![j - 1]! + 1) {
                // 替换操作：同时标记为删除和添加
                diff.unshift({ type: 'removed', char: str1[i - 1]! });
                diff.unshift({ type: 'added', char: str2[j - 1]! });
                i--; j--;
            } else if (i > 0 && dp[i]![j]! === dp[i - 1]![j]! + 1) {
                // 删除操作
                diff.unshift({ type: 'removed', char: str1[i - 1]! });
                i--;
            } else {
                // 插入操作
                diff.unshift({ type: 'added', char: str2[j - 1]! });
                j--;
            }
        }

        // 统计各类型字符数量
        const added = diff.filter(d => d.type === 'added').length;
        const removed = diff.filter(d => d.type === 'removed').length;
        const unchanged = diff.filter(d => d.type === 'unchanged').length;
        const denominator = added + removed + unchanged || 1;
        return { diff, added, removed, unchanged, similarity: unchanged / denominator };
    }

    /**
     * Myers 差异算法
     * 一种高效的差异算法，在Git等版本控制系统中广泛使用
     * 时间复杂度：O((M+N)D)，其中D是编辑距离
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @returns 字符差异结果
     */
    private myersDiff(str1: string, str2: string): CharDiffResult {
        const m = str1.length;
        const n = str2.length;
        const max = m + n;
        const v = new Array(2 * max + 1).fill(0);
        const trace: number[][] = [];

        // 前向搜索，找到最短编辑路径
        for (let d = 0; d <= max; d++) {
            trace.push(v.slice());
            for (let k = -d; k <= d; k += 2) {
                let x;
                // 选择向下或向右移动
                if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) x = v[k + 1 + max];
                else x = v[k - 1 + max] + 1;
                let y = x - k;
                // 沿对角线前进（字符匹配）
                while (x < m && y < n && str1[x] === str2[y]) { x++; y++; }
                v[k + max] = x;
                // 找到终点
                if (x >= m && y >= n) return this.buildMyersDiff(str1, str2, trace, d);
            }
        }
        // 如果没有找到路径，回退到 LCS 算法
        return this.lcsDiff(str1, str2);
    }

    /**
     * 构建 Myers 算法的差异结果
     * 从跟踪数组中回溯构建完整的差异列表
     * @param str1 第一个字符串
     * @param str2 第二个字符串
     * @param trace Myers 算法的跟踪数组
     * @param d 编辑距离
     * @returns 字符差异结果
     */
    private buildMyersDiff(str1: string, str2: string, trace: number[][], d: number): CharDiffResult {
        const diff: DifferenceItem[] = [];
        let x = str1.length;
        let y = str2.length;

        // 从终点回溯到起点
        for (let i = d; i >= 0; i--) {
            const v = trace[i]!;
            const k = x - y;
            let prevK;
            const offset = Math.floor(v.length / 2);

            // 确定前一步的 k 值
            if (k === -i || (k !== i && v[k - 1 + offset]! < v[k + 1 + offset]!)) prevK = k + 1;
            else prevK = k - 1;

            const prevX = v[prevK + offset]!;
            const prevY = prevX - prevK;

            // 添加对角线上的未改变字符
            while (x > prevX && y > prevY) {
                diff.unshift({ type: 'unchanged', char: str1[x - 1]! });
                x--; y--;
            }

            // 添加编辑操作
            if (i > 0) {
                if (x === prevX) {
                    // 插入操作
                    diff.unshift({ type: 'added', char: str2[y - 1]! });
                    y--;
                }
                else {
                    // 删除操作
                    diff.unshift({ type: 'removed', char: str1[x - 1]! });
                    x--;
                }
            }
        }

        // 统计各类型字符数量
        const added = diff.filter(d => d.type === 'added').length;
        const removed = diff.filter(d => d.type === 'removed').length;
        const unchanged = diff.filter(d => d.type === 'unchanged').length;
        const denominator = added + removed + unchanged || 1;
        return { diff, added, removed, unchanged, similarity: unchanged / denominator };
    }
}
