/**
 * 字符串相似度比较工具主应用程序
 * 处理用户界面交互、数据管理和结果展示
 */

class SimilarityApp {
    constructor() {
        this.worker = null;
        this.results = [];
        this.lockedResults = new Map(); // 存储锁定的结果
        this.isCalculating = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadStoredData();
    }

    /**
     * 初始化DOM元素引用
     */
    initializeElements() {
        // 输入区域
        this.sourceTextarea = document.getElementById('source-column');
        this.targetTextarea = document.getElementById('target-column');
        this.sourceCount = document.getElementById('source-count');
        this.targetCount = document.getElementById('target-count');

        // 设置选项
        this.thresholdSlider = document.getElementById('similarity-threshold');
        this.thresholdValue = document.getElementById('threshold-value');
        this.ignorePunctuation = document.getElementById('ignore-punctuation');
        this.fullwidthToHalfwidth = document.getElementById('fullwidth-to-halfwidth');
        this.ignoreInvisibleChars = document.getElementById('ignore-invisible-chars');
        this.wholeStringMode = document.getElementById('whole-string-mode');
        this.synonymGroups = document.getElementById('synonym-groups');

        // 控制按钮
        this.loadSampleBtn = document.getElementById('load-sample');
        this.startComparisonBtn = document.getElementById('start-comparison');
        this.stopComparisonBtn = document.getElementById('stop-comparison');

        // 进度条
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');

        // 结果区域
        this.resultsContainer = document.getElementById('results-container');
        this.exportResultsBtn = document.getElementById('export-results');
        this.exportSimpleBtn = document.getElementById('export-simple');
        this.saveDataBtn = document.getElementById('save-data');
        this.loadDataBtn = document.getElementById('load-data');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 输入区域事件
        this.sourceTextarea.addEventListener('input', () => this.updateCount('source'));
        this.targetTextarea.addEventListener('input', () => this.updateCount('target'));

        // 设置选项事件
        this.thresholdSlider.addEventListener('input', () => this.updateThresholdDisplay());
        this.synonymGroups.addEventListener('input', () => this.updateSynonymGroups());

        // 控制按钮事件
        this.loadSampleBtn.addEventListener('click', () => this.loadSampleData());
        this.startComparisonBtn.addEventListener('click', () => this.startComparison());
        this.stopComparisonBtn.addEventListener('click', () => this.stopComparison());

        // 导出按钮事件
        this.exportResultsBtn.addEventListener('click', () => this.exportResults());
        this.exportSimpleBtn.addEventListener('click', () => this.exportSimpleResults());
        this.saveDataBtn.addEventListener('click', () => this.saveData());
        this.loadDataBtn.addEventListener('click', () => this.loadData());

        // 初始化显示
        this.updateThresholdDisplay();
        this.updateCount('source');
        this.updateCount('target');
    }

    /**
     * 更新行数显示
     * @param {string} type - 'source' 或 'target'
     */
    updateCount(type) {
        const textarea = type === 'source' ? this.sourceTextarea : this.targetTextarea;
        const countElement = type === 'source' ? this.sourceCount : this.targetCount;
        const lines = textarea.value.split('\n').filter(line => line.trim()).length;
        countElement.textContent = lines;
    }

    /**
     * 更新阈值显示
     */
    updateThresholdDisplay() {
        this.thresholdValue.textContent = this.thresholdSlider.value + '%';
    }

    /**
     * 更新同义词组
     */
    updateSynonymGroups() {
        // 同义词组会在计算时更新
    }

    /**
     * 加载示例数据
     */
    loadSampleData() {
        const sampleSource = [
            '苹果公司',
            '微软公司',
            '谷歌公司',
            '亚马逊公司',
            'Facebook公司',
            '特斯拉公司',
            'Netflix公司',
            '阿里巴巴集团',
            '腾讯公司',
            '百度公司'
        ].join('\n');

        const sampleTarget = [
            'Apple Inc.',
            'Microsoft Corporation',
            'Google LLC',
            'Amazon.com Inc.',
            'Meta Platforms Inc.',
            'Tesla Inc.',
            'Netflix Inc.',
            'Alibaba Group',
            'Tencent Holdings',
            'Baidu Inc.',
            '字节跳动',
            '美团',
            '京东',
            '拼多多',
            '小米科技'
        ].join('\n');

        this.sourceTextarea.value = sampleSource;
        this.targetTextarea.value = sampleTarget;
        this.updateCount('source');
        this.updateCount('target');
    }

    /**
     * 开始比较
     */
    startComparison() {
        const sourceText = this.sourceTextarea.value.trim();
        const targetText = this.targetTextarea.value.trim();

        if (!sourceText || !targetText) {
            alert('请输入源数据和目标数据');
            return;
        }

        const sourceList = sourceText.split('\n').map(line => line.trim()).filter(line => line);
        const targetList = targetText.split('\n').map(line => line.trim()).filter(line => line);

        if (sourceList.length === 0 || targetList.length === 0) {
            alert('数据不能为空');
            return;
        }

        // 准备计算选项
        const options = {
            threshold: parseInt(this.thresholdSlider.value) / 100,
            ignorePunctuation: this.ignorePunctuation.checked,
            fullwidthToHalfwidth: this.fullwidthToHalfwidth.checked,
            ignoreInvisibleChars: this.ignoreInvisibleChars.checked,
            wholeStringMode: this.wholeStringMode.checked,
            synonymGroups: this.synonymGroups.value,
            weights: {
                edit: 0.6,
                jaro: 0.4
            }
        };

        // 开始计算
        this.isCalculating = true;
        this.updateUIState();
        this.results = [];

        // 使用同步计算（避免Worker的复杂性）
        this.performCalculation(sourceList, targetList, options);
    }

    /**
     * 执行同步计算
     * @param {Array} sourceList - 源数据列表
     * @param {Array} targetList - 目标数据列表
     * @param {Object} options - 计算选项
     */
    performCalculation(sourceList, targetList, options) {
        // 创建相似度计算器
        const calculator = new SimilarityCalculator();
        
        // 设置同义词组
        if (options.synonymGroups) {
            calculator.setSynonymGroups(options.synonymGroups);
        }

        const results = [];
        const total = sourceList.length;

        // 使用setTimeout来避免阻塞UI
        const processNext = (index) => {
            if (index >= sourceList.length) {
                // 计算完成
                this.results = results;
                this.isCalculating = false;
                this.updateUIState();
                this.displayResults();
                this.progressText.textContent = '计算完成';
                this.progressFill.style.width = '100%';
                return;
            }

            const source = sourceList[index];
            const matches = [];

            // 计算当前源字符串与所有目标字符串的相似度
            for (let j = 0; j < targetList.length; j++) {
                const target = targetList[j];
                const similarity = calculator.calculateSimilarity(source, target, options);
                
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
                index: index
            });

            // 更新进度
            const percentage = Math.round(((index + 1) / total) * 100);
            this.progressFill.style.width = percentage + '%';
            this.progressText.textContent = `正在处理: ${source} (${index + 1}/${total})`;

            // 继续处理下一个
            setTimeout(() => processNext(index + 1), 0);
        };

        // 开始处理
        processNext(0);
    }


    /**
     * 停止比较
     */
    stopComparison() {
        if (this.isCalculating) {
            this.isCalculating = false;
            this.updateUIState();
            this.progressText.textContent = '计算已停止';
        }
    }


    /**
     * 更新UI状态
     */
    updateUIState() {
        this.startComparisonBtn.disabled = this.isCalculating;
        this.stopComparisonBtn.disabled = !this.isCalculating;
        this.loadSampleBtn.disabled = this.isCalculating;
    }

    /**
     * 显示结果
     */
    displayResults() {
        if (this.results.length === 0) {
            this.resultsContainer.innerHTML = '<div class="no-results">暂无比较结果</div>';
            return;
        }

        const html = this.results.map(result => this.createResultHTML(result)).join('');
        this.resultsContainer.innerHTML = html;

        // 绑定锁定按钮事件
        this.bindLockEvents();
    }

    /**
     * 创建结果HTML
     * @param {Object} result - 结果对象
     * @returns {string} - HTML字符串
     */
    createResultHTML(result) {
        const { source, matches, index } = result;
        const isLocked = this.lockedResults.has(index);
        const lockedMatch = isLocked ? this.lockedResults.get(index) : null;

        let matchesHTML = '';
        
        if (isLocked && lockedMatch) {
            // 显示锁定的结果
            matchesHTML = this.createMatchHTML(lockedMatch, true);
        } else if (matches.length > 0) {
            // 显示前5个最相似的结果
            const topMatches = matches.slice(0, 5);
            matchesHTML = topMatches.map(match => this.createMatchHTML(match, false)).join('');
        } else {
            matchesHTML = '<div class="no-matches">无匹配结果</div>';
        }

        return `
            <div class="result-item" data-index="${index}">
                <div class="result-header">
                    <div class="result-source">${this.escapeHtml(source)}</div>
                    <div class="result-lock">
                        <button class="lock-btn ${isLocked ? 'locked' : 'unlocked'}" data-index="${index}">
                            ${isLocked ? '已锁定' : '锁定'}
                        </button>
                    </div>
                </div>
                <div class="result-matches">
                    ${matchesHTML}
                </div>
            </div>
        `;
    }

    /**
     * 创建匹配项HTML
     * @param {Object} match - 匹配对象
     * @param {boolean} isLocked - 是否锁定
     * @returns {string} - HTML字符串
     */
    createMatchHTML(match, isLocked) {
        const { text, similarity } = match;
        const percentage = Math.round(similarity * 100);
        let className = 'match-item';
        let similarityClass = 'match-similarity';

        if (similarity === 1.0) {
            className += ' exact';
            similarityClass += ' exact';
        } else if (similarity >= 0.8) {
            className += ' similar';
            similarityClass += ' similar';
        } else {
            className += ' low';
            similarityClass += ' low';
        }

        return `
            <div class="${className}">
                <div class="match-text">${this.escapeHtml(text)}</div>
                <div class="${similarityClass}">${percentage}%</div>
            </div>
        `;
    }

    /**
     * 绑定锁定事件
     */
    bindLockEvents() {
        const lockButtons = this.resultsContainer.querySelectorAll('.lock-btn');
        lockButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.toggleLock(index);
            });
        });
    }

    /**
     * 切换锁定状态
     * @param {number} index - 结果索引
     */
    toggleLock(index) {
        if (this.lockedResults.has(index)) {
            this.lockedResults.delete(index);
        } else {
            const result = this.results[index];
            if (result && result.matches.length > 0) {
                this.lockedResults.set(index, result.matches[0]);
            }
        }
        this.displayResults();
    }

    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string} - 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 导出结果
     */
    exportResults() {
        if (this.results.length === 0) {
            alert('没有可导出的结果');
            return;
        }

        const csvContent = this.generateCSV(true);
        this.downloadFile(csvContent, 'similarity_results.csv', 'text/csv');
    }

    /**
     * 导出简化结果
     */
    exportSimpleResults() {
        if (this.results.length === 0) {
            alert('没有可导出的结果');
            return;
        }

        const csvContent = this.generateCSV(false);
        this.downloadFile(csvContent, 'similarity_results_simple.csv', 'text/csv');
    }

    /**
     * 生成CSV内容
     * @param {boolean} includeSimilarity - 是否包含相似度
     * @returns {string} - CSV内容
     */
    generateCSV(includeSimilarity) {
        const headers = ['源数据', '最相似值'];
        if (includeSimilarity) {
            headers.push('相似度');
        }
        headers.push('锁定状态');

        const rows = [headers.join(',')];

        this.results.forEach((result, index) => {
            const isLocked = this.lockedResults.has(index);
            let bestMatch = '';
            let similarity = '';

            if (isLocked) {
                const lockedMatch = this.lockedResults.get(index);
                bestMatch = lockedMatch.text;
                similarity = Math.round(lockedMatch.similarity * 100) + '%';
            } else if (result.matches.length > 0) {
                bestMatch = result.matches[0].text;
                similarity = Math.round(result.matches[0].similarity * 100) + '%';
            }

            const row = [
                this.escapeCSV(result.source),
                this.escapeCSV(bestMatch)
            ];

            if (includeSimilarity) {
                row.push(similarity);
            }

            row.push(isLocked ? '已锁定' : '未锁定');
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * CSV字段转义
     * @param {string} field - 字段值
     * @returns {string} - 转义后的字段
     */
    escapeCSV(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }
        return field;
    }

    /**
     * 下载文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 保存数据到localStorage
     */
    saveData() {
        const data = {
            sourceText: this.sourceTextarea.value,
            targetText: this.targetTextarea.value,
            settings: {
                threshold: this.thresholdSlider.value,
                ignorePunctuation: this.ignorePunctuation.checked,
                fullwidthToHalfwidth: this.fullwidthToHalfwidth.checked,
                ignoreInvisibleChars: this.ignoreInvisibleChars.checked,
                wholeStringMode: this.wholeStringMode.checked,
                synonymGroups: this.synonymGroups.value
            },
            results: this.results,
            lockedResults: Array.from(this.lockedResults.entries())
        };

        try {
            localStorage.setItem('similarityAppData', JSON.stringify(data));
            alert('数据保存成功');
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    }

    /**
     * 从localStorage加载数据
     */
    loadData() {
        try {
            const dataStr = localStorage.getItem('similarityAppData');
            if (!dataStr) {
                alert('没有保存的数据');
                return;
            }

            const data = JSON.parse(dataStr);
            
            // 恢复输入数据
            this.sourceTextarea.value = data.sourceText || '';
            this.targetTextarea.value = data.targetText || '';
            this.updateCount('source');
            this.updateCount('target');

            // 恢复设置
            if (data.settings) {
                this.thresholdSlider.value = data.settings.threshold || 70;
                this.ignorePunctuation.checked = data.settings.ignorePunctuation !== false;
                this.fullwidthToHalfwidth.checked = data.settings.fullwidthToHalfwidth !== false;
                this.ignoreInvisibleChars.checked = data.settings.ignoreInvisibleChars !== false;
                this.wholeStringMode.checked = data.settings.wholeStringMode !== false;
                this.synonymGroups.value = data.settings.synonymGroups || '';
                this.updateThresholdDisplay();
            }

            // 恢复结果
            if (data.results) {
                this.results = data.results;
                this.displayResults();
            }

            // 恢复锁定状态
            if (data.lockedResults) {
                this.lockedResults = new Map(data.lockedResults);
            }

            alert('数据加载成功');
        } catch (error) {
            alert('加载失败: ' + error.message);
        }
    }

    /**
     * 加载存储的数据（页面加载时）
     */
    loadStoredData() {
        try {
            const dataStr = localStorage.getItem('similarityAppData');
            if (dataStr) {
                const data = JSON.parse(dataStr);
                
                // 只恢复设置，不恢复结果
                if (data.settings) {
                    this.thresholdSlider.value = data.settings.threshold || 70;
                    this.ignorePunctuation.checked = data.settings.ignorePunctuation !== false;
                    this.fullwidthToHalfwidth.checked = data.settings.fullwidthToHalfwidth !== false;
                    this.ignoreInvisibleChars.checked = data.settings.ignoreInvisibleChars !== false;
                    this.wholeStringMode.checked = data.settings.wholeStringMode !== false;
                    this.synonymGroups.value = data.settings.synonymGroups || '';
                    this.updateThresholdDisplay();
                }
            }
        } catch (error) {
            console.warn('加载存储数据失败:', error);
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SimilarityApp();
});