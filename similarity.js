/**
 * 字符串相似度计算工具
 *
 * 作用：
 * - 提供多种相似度算法（编辑距离、Jaro-Winkler）并支持加权融合
 * - 支持文本预处理（忽略标点、全角转半角、忽略不可见字符、小写化等）
 * - 支持“同义词组”参与计算：
 *   1) 解析同义词组，将同组词映射到“代表词”（组内第一个词）
 *   2) 在比较前对整段文本做同义词内联替换（把出现的同组词替换为代表词）
 *   3) 若替换后两侧文本完全一致，则直接判定相似度=1.0（100%）
 *
 * 使用要点：
 * - 将更完整/标准的词放在组内第一个，便于替换后文本完全一致
 * - 多组同义词可用换行/分号/中文分号分隔；组内用逗号/中文逗号分隔
 */

class SimilarityCalculator {
    constructor() {
        this.synonymGroups = new Map();
        this.fullwidthToHalfwidthMap = this.createFullwidthMap();
    }

    /**
     * 创建全角到半角的映射表
     */
    createFullwidthMap() {
        const map = new Map();
        // 数字
        for (let i = 0; i < 10; i++) {
            map.set(String.fromCharCode(0xFF10 + i), String(i));
        }
        // 英文字母
        for (let i = 0; i < 26; i++) {
            map.set(String.fromCharCode(0xFF21 + i), String.fromCharCode(0x41 + i)); // A-Z
            map.set(String.fromCharCode(0xFF41 + i), String.fromCharCode(0x61 + i)); // a-z
        }
        // 标点符号
        const punctuation = [
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
     *
     * 解析规则：
     * - 组分隔：按换行/分号/中文分号分组
     * - 组内分隔：按逗号/中文逗号/空白分隔
     * - 映射策略：组内第一个词为代表词，组内所有词都映射为该代表词
     *
     * 示例：
     * 阿里巴巴集团,阿里\n腾讯控股有限公司,腾讯；百度在线网络技术公司,百度
     *
     * @param {string} synonymText 同义词组原始文本
     */
    setSynonymGroups(synonymText) {
        this.synonymGroups.clear();
        if (!synonymText || !synonymText.trim()) return;

        // 先按“组”分割：支持 换行 / 分号 / 中文分号
        let groupTexts = synonymText
            .split(/[\n;；]+/)
            .map(s => s.trim())
            .filter(Boolean);

        // 如果没有明确的组分隔符（仅一段文本），则将整段视为一个同义词组
        if (groupTexts.length === 1) {
            groupTexts = [synonymText.trim()];
        }

        groupTexts.forEach(groupStr => {
            const words = groupStr
                .split(/[,，\s]+/)
                .map(w => w.trim())
                .filter(Boolean);
            if (words.length > 1) {
                // 以组内第一个词作为代表词
                const representative = this.normalizeText(words[0]);
                words.forEach(word => {
                    const normalized = this.normalizeText(word);
                    this.synonymGroups.set(normalized, representative);
                });
            }
        });
    }

    /**
     * 文本预处理
     * @param {string} text - 原始文本
     * @param {Object} options - 预处理选项
     * @returns {string} - 处理后的文本
     */
    preprocessText(text, options = {}) {
        if (!text) return '';

        let processed = text.toString();

        // 忽略不可见字符
        if (options.ignoreInvisibleChars) {
            processed = processed.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g, '');
        }

        // 全角转半角
        if (options.fullwidthToHalfwidth) {
            processed = processed.split('').map(char => this.fullwidthToHalfwidthMap.get(char) || char).join('');
        }

        // 忽略标点符号
        if (options.ignorePunctuation) {
            processed = processed.replace(/[^\w\u4e00-\u9fff\s]/g, '');
        }

        // 转换为小写并去除多余空格
        processed = processed.toLowerCase().replace(/\s+/g, ' ').trim();

        return processed;
    }

    /**
     * 标准化文本（用于同义词处理）
     * @param {string} text - 文本
     * @returns {string} - 标准化后的文本
     */
    normalizeText(text) {
        return text.toLowerCase().trim();
    }

    /**
     * 在整段文本中应用同义词替换（将同组词替换为代表词）
     *
     * 说明：
     * - 输入应为已预处理且小写的文本（见 preprocessText → normalizeText）
     * - 替换是直接字符串替换（非分词），适合公司名等专有词场景
     *
     * @param {string} text 已预处理的小写文本
     * @returns {string} 替换后的文本
     */
    applySynonyms(text) {
        if (!text || this.synonymGroups.size === 0) return text;
        let result = text;
        // 逐个词替换为组代表词
        this.synonymGroups.forEach((representative, key) => {
            if (!key) return;
            const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'g');
            result = result.replace(regex, representative);
        });
        return result;
    }

    /**
     * 计算编辑距离（Levenshtein距离）
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} - 编辑距离
     */
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2;
        if (len2 === 0) return len1;

        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // 删除
                    matrix[j - 1][i] + 1,     // 插入
                    matrix[j - 1][i - 1] + cost // 替换
                );
            }
        }

        return matrix[len2][len1];
    }

    /**
     * 计算Jaro-Winkler相似度
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} - 相似度 (0-1)
     */
    jaroWinklerSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0.0;

        const len1 = str1.length;
        const len2 = str2.length;
        const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
        
        if (matchWindow < 0) return 0.0;

        const str1Matches = new Array(len1).fill(false);
        const str2Matches = new Array(len2).fill(false);

        let matches = 0;
        let transpositions = 0;

        // 查找匹配字符
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

        // 计算转置
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!str1Matches[i]) continue;
            while (!str2Matches[k]) k++;
            if (str1[i] !== str2[k]) transpositions++;
            k++;
        }

        const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
        
        // Winkler修正
        if (jaro < 0.7) return jaro;
        
        let prefix = 0;
        for (let i = 0; i < Math.min(len1, len2, 4); i++) {
            if (str1[i] === str2[i]) prefix++;
            else break;
        }

        return jaro + 0.1 * prefix * (1 - jaro);
    }

    /**
     * 计算最长公共子序列长度
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} - LCS长度
     */
    longestCommonSubsequence(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp[len1][len2];
    }

    /**
     * 计算基于编辑距离的相似度
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} - 相似度 (0-1)
     */
    editDistanceSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0.0;

        const maxLen = Math.max(str1.length, str2.length);
        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLen);
    }

    /**
     * 计算综合相似度
     *
     * 流程：
     * 1) 预处理：大小写/空白/标点/全角/不可见字符
     * 2) 同义词：将整段文本内联替换为代表词
     * 3) 快速判断：若替换后完全一致，直接返回 1.0
     * 4) 计算：使用编辑距离与 Jaro-Winkler，按权重融合
     *
     * @param {string} str1 字符串1
     * @param {string} str2 字符串2
     * @param {Object} options 计算选项（threshold/预处理开关/weights/synonymGroups）
     * @returns {number} 综合相似度 (0-1)
     */
    calculateSimilarity(str1, str2, options = {}) {
        if (!str1 || !str2) return 0.0;
        if (str1 === str2) return 1.0;

        // 预处理文本
        const processed1 = this.preprocessText(str1, options);
        const processed2 = this.preprocessText(str2, options);

        // 同义词处理（整段替换）
        const normalized1 = this.normalizeText(processed1);
        const normalized2 = this.normalizeText(processed2);
        const synonymApplied1 = this.applySynonyms(normalized1);
        const synonymApplied2 = this.applySynonyms(normalized2);
        if (synonymApplied1 === synonymApplied2) return 1.0;

        // 计算多种相似度
        const editSim = this.editDistanceSimilarity(synonymApplied1, synonymApplied2);
        const jaroSim = this.jaroWinklerSimilarity(synonymApplied1, synonymApplied2);
        
        // 加权平均
        const weights = options.weights || { edit: 0.6, jaro: 0.4 };
        return editSim * weights.edit + jaroSim * weights.jaro;
    }

    /**
     * 批量计算相似度
     * @param {Array<string>} sourceList - 源字符串列表
     * @param {Array<string>} targetList - 目标字符串列表
     * @param {Object} options - 计算选项
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Array} - 相似度结果
     */
    batchCalculate(sourceList, targetList, options = {}, progressCallback = null) {
        const results = [];
        const total = sourceList.length;

        for (let i = 0; i < sourceList.length; i++) {
            const source = sourceList[i];
            const matches = [];

            for (let j = 0; j < targetList.length; j++) {
                const target = targetList[j];
                const similarity = this.calculateSimilarity(source, target, options);
                
                if (similarity >= (options.threshold || 0)) {
                    matches.push({
                        text: target,
                        similarity: similarity,
                        index: j
                    });
                }
            }

            // 按相似度排序
            matches.sort((a, b) => b.similarity - a.similarity);

            results.push({
                source: source,
                matches: matches,
                index: i
            });

            // 调用进度回调
            if (progressCallback) {
                progressCallback(i + 1, total, source);
            }
        }

        return results;
    }

    /**
     * 计算字符级差异
     * @param {string} str1 源字符串
     * @param {string} str2 目标字符串
     * @param {string} algorithm 差异算法: 'lcs' | 'levenshtein' | 'myers'
     * @returns {{diff:Array<{type:string,char:string}>, added:number, removed:number, unchanged:number, similarity:number}}
     */
    calculateCharDiff(str1, str2, algorithm = 'lcs') {
        if (!str1 && !str2) {
            return { diff: [], added: 0, removed: 0, unchanged: 0, similarity: 1 };
        }
        if (!str1 || !str2) {
            const only = (str1 || str2).split('');
            const type = str1 ? 'removed' : 'added';
            const diff = only.map(c => ({ type, char: c }));
            return {
                diff,
                added: type === 'added' ? only.length : 0,
                removed: type === 'removed' ? only.length : 0,
                unchanged: 0,
                similarity: 0
            };
        }

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
     * 基于LCS的差异
     */
    lcsDiff(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        const diff = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
                diff.unshift({ type: 'unchanged', char: str1[i - 1] });
                i--; j--;
            } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
                diff.unshift({ type: 'removed', char: str1[i - 1] });
                i--;
            } else if (j > 0) {
                diff.unshift({ type: 'added', char: str2[j - 1] });
                j--;
            }
        }
        const added = diff.filter(d => d.type === 'added').length;
        const removed = diff.filter(d => d.type === 'removed').length;
        const unchanged = diff.filter(d => d.type === 'unchanged').length;
        const denominator = added + removed + unchanged || 1;
        return { diff, added, removed, unchanged, similarity: unchanged / denominator };
    }

    /**
     * 基于Levenshtein的差异
     */
    levenshteinDiff(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, // 删除
                    dp[i][j - 1] + 1, // 插入
                    dp[i - 1][j - 1] + 1 // 替换
                );
            }
        }
        const diff = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
                diff.unshift({ type: 'unchanged', char: str1[i - 1] });
                i--; j--;
            } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                diff.unshift({ type: 'removed', char: str1[i - 1] });
                diff.unshift({ type: 'added', char: str2[j - 1] });
                i--; j--;
            } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                diff.unshift({ type: 'removed', char: str1[i - 1] });
                i--;
            } else {
                diff.unshift({ type: 'added', char: str2[j - 1] });
                j--;
            }
        }
        const added = diff.filter(d => d.type === 'added').length;
        const removed = diff.filter(d => d.type === 'removed').length;
        const unchanged = diff.filter(d => d.type === 'unchanged').length;
        const denominator = added + removed + unchanged || 1;
        return { diff, added, removed, unchanged, similarity: unchanged / denominator };
    }

    /**
     * 简化Myers差异
     */
    myersDiff(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const max = m + n;
        const v = new Array(2 * max + 1).fill(0);
        const trace = [];
        for (let d = 0; d <= max; d++) {
            trace.push(v.slice());
            for (let k = -d; k <= d; k += 2) {
                let x;
                if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) x = v[k + 1 + max];
                else x = v[k - 1 + max] + 1;
                let y = x - k;
                while (x < m && y < n && str1[x] === str2[y]) { x++; y++; }
                v[k + max] = x;
                if (x >= m && y >= n) return this.buildMyersDiff(str1, str2, trace, d);
            }
        }
        return this.lcsDiff(str1, str2);
    }

    buildMyersDiff(str1, str2, trace, d) {
        const diff = [];
        let x = str1.length;
        let y = str2.length;
        for (let i = d; i >= 0; i--) {
            const v = trace[i];
            const k = x - y;
            let prevK;
            const offset = Math.floor(v.length / 2);
            if (k === -i || (k !== i && v[k - 1 + offset] < v[k + 1 + offset])) prevK = k + 1;
            else prevK = k - 1;
            const prevX = v[prevK + offset];
            const prevY = prevX - prevK;
            while (x > prevX && y > prevY) {
                diff.unshift({ type: 'unchanged', char: str1[x - 1] });
                x--; y--;
            }
            if (i > 0) {
                if (x === prevX) { diff.unshift({ type: 'added', char: str2[y - 1] }); y--; }
                else { diff.unshift({ type: 'removed', char: str1[x - 1] }); x--; }
            }
        }
        const added = diff.filter(d => d.type === 'added').length;
        const removed = diff.filter(d => d.type === 'removed').length;
        const unchanged = diff.filter(d => d.type === 'unchanged').length;
        const denominator = added + removed + unchanged || 1;
        return { diff, added, removed, unchanged, similarity: unchanged / denominator };
    }

    /**
     * 生成差异HTML（用于内联渲染）
     */
    generateDiffHTML(diff) {
        return diff.map(item => `<span class="diff-${item.type}">${this.escapeHtml(item.char)}</span>`).join('');
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出到全局作用域
window.SimilarityCalculator = SimilarityCalculator;
