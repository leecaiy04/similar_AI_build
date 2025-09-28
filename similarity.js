/**
 * 字符串相似度计算工具
 * 支持多种相似度算法和文本预处理选项
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
     * @param {string} synonymText - 同义词组文本，用逗号分隔
     */
    setSynonymGroups(synonymText) {
        this.synonymGroups.clear();
        if (!synonymText.trim()) return;

        const groups = synonymText.split(',').map(group => group.trim()).filter(group => group);
        groups.forEach(group => {
            const words = group.split(/[,，\s]+/).map(word => word.trim()).filter(word => word);
            if (words.length > 1) {
                const normalized = this.normalizeText(words[0]);
                words.forEach(word => {
                    this.synonymGroups.set(this.normalizeText(word), normalized);
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
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @param {Object} options - 计算选项
     * @returns {number} - 综合相似度 (0-1)
     */
    calculateSimilarity(str1, str2, options = {}) {
        if (!str1 || !str2) return 0.0;
        if (str1 === str2) return 1.0;

        // 预处理文本
        const processed1 = this.preprocessText(str1, options);
        const processed2 = this.preprocessText(str2, options);

        // 同义词处理
        const normalized1 = this.normalizeText(processed1);
        const normalized2 = this.normalizeText(processed2);
        
        const synonym1 = this.synonymGroups.get(normalized1) || normalized1;
        const synonym2 = this.synonymGroups.get(normalized2) || normalized2;

        if (synonym1 === synonym2) return 1.0;

        // 计算多种相似度
        const editSim = this.editDistanceSimilarity(processed1, processed2);
        const jaroSim = this.jaroWinklerSimilarity(processed1, processed2);
        
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
}

// 导出到全局作用域
window.SimilarityCalculator = SimilarityCalculator;
