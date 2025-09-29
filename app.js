/**
 * 字符串相似度比较工具主应用程序
 * 处理用户界面交互、数据管理和结果展示
 */

class SimilarityApp {
    constructor() {
        this.worker = null;
        this.results = [];
        this.lockedResults = new Map(); // 存储锁定的结果
        this.calculator = new SimilarityCalculator(); // 用于字符级差异与相似度辅助
        this.isCalculating = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadStoredData();
        
        // 如果没有存储的数据，默认加载示例数据
        if (!localStorage.getItem('similarityAppData')) {
            this.loadSampleData();
            // 设置默认同义词组
            this.synonymGroups.value = '腾讯控股有限公司,腾讯';
        }
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
            '阿里巴巴集团',
            '腾讯控股有限公司',
            '百度在线网络技术公司',
            '字节跳动科技有限公司'
        ].join('\n');

        const sampleTarget = [
            // 阿里巴巴相关 - 各种相似度
            'Alibaba Group Holding Limited',
            '阿里巴巴集团控股有限公司',
            'Alibaba.com',
            '淘宝网',
            '天猫',
            '支付宝',
            '阿里云',
            '阿里巴巴网络技术有限公司',
            'Alibaba Group',
            '阿里巴巴',
            
            // 腾讯相关 - 各种相似度
            'Tencent Holdings Limited',
            '腾讯控股',
            '腾讯',
            '腾讯科技（深圳）有限公司',
            '微信',
            'QQ',
            '腾讯游戏',
            '腾讯音乐',
            '腾讯视频',
            'Tencent',
            '腾讯公司',
            '深圳市腾讯计算机系统有限公司',
            
            // 百度相关 - 各种相似度
            'Baidu Inc.',
            '百度在线网络技术（北京）有限公司',
            '百度',
            '百度搜索',
            '百度地图',
            '百度网盘',
            '百度AI',
            '百度智能云',
            'Baidu.com',
            '百度公司',
            
            // 字节跳动相关 - 各种相似度
            'ByteDance Ltd.',
            '字节跳动',
            '抖音',
            '今日头条',
            'TikTok',
            '西瓜视频',
            '火山小视频',
            '字节跳动科技有限公司',
            'ByteDance Technology',
            '北京字节跳动科技有限公司',
            
            // 其他公司 - 增加对比难度
            '华为技术有限公司',
            '小米科技有限责任公司',
            '京东集团',
            '美团点评',
            '拼多多',
            '网易',
            '新浪',
            '搜狐',
            '360',
            '滴滴出行'
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

            // 如果最相似值相似度为100%，则直接锁定
            if (matches.length > 0 && matches[0].similarity === 1) {
                this.lockedResults.set(index, matches[0]);
                if (this.tempSelections) {
                    this.tempSelections.delete(index);
                }
            }

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

        // 创建表格格式的结果
        const html = this.createTableHTML();
        this.resultsContainer.innerHTML = html;

        // 绑定事件
        this.bindTableEvents();
    }

    /**
     * 创建表格HTML
     * @returns {string} - 表格HTML字符串
     */
    createTableHTML() {
        let html = `
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>源数据</th>
                            <th>最相似值</th>
                            <th>相似度</th>
                            <th>其他相似值</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.results.forEach((result, index) => {
            const isLocked = this.lockedResults.has(index);
            const lockedMatch = isLocked ? this.lockedResults.get(index) : null;
            const tempMatch = this.tempSelections && this.tempSelections.has(index) ? this.tempSelections.get(index) : null;
            
            let bestMatch = '';
            let bestSimilarity = '';
            let otherMatches = '';
            let bestMatchDiffHtml = '';

            if (isLocked && lockedMatch) {
                // 显示锁定的结果
                bestMatch = lockedMatch.text;
                bestSimilarity = Math.round(lockedMatch.similarity * 100) + '%';
                otherMatches = '<span class="locked-indicator">已锁定</span>';
                // 生成字符级差异（目标相对源：新增=红底，删除=绿删）
                const diff = this.calculator.calculateCharDiff(result.source, lockedMatch.text, 'lcs');
                bestMatchDiffHtml = this.calculator.generateDiffHTML(diff.diff);
            } else if (tempMatch) {
                // 显示临时选择的结果
                bestMatch = tempMatch.text;
                bestSimilarity = Math.round(tempMatch.similarity * 100) + '%';
                // 生成字符级差异
                const diff = this.calculator.calculateCharDiff(result.source, tempMatch.text, 'lcs');
                bestMatchDiffHtml = this.calculator.generateDiffHTML(diff.diff);
                // 显示其他相似值（包括原来的最相似值）
                const otherMatchesList = result.matches
                    .filter(match => match.text !== tempMatch.text)
                    .slice(0, 5)
                    .map(match => {
                    const percentage = Math.round(match.similarity * 100);
                        const diff = this.calculator.calculateCharDiff(result.source, match.text, 'lcs');
                        const diffHtml = this.calculator.generateDiffHTML(diff.diff);
                    return `<div class="other-match" data-match='${JSON.stringify(match)}' data-source-index="${index}">
                        <span class="match-text">${diffHtml}</span>
                        <span class="match-similarity">${percentage}%</span>
                    </div>`;
                }).join('');
                
                otherMatches = otherMatchesList || '<span class="no-matches">无其他匹配</span>';
            } else if (result.matches.length > 0) {
                // 显示最相似的结果
                const topMatch = result.matches[0];
                bestMatch = topMatch.text;
                bestSimilarity = Math.round(topMatch.similarity * 100) + '%';
                // 生成字符级差异
                const diff = this.calculator.calculateCharDiff(result.source, topMatch.text, 'lcs');
                bestMatchDiffHtml = this.calculator.generateDiffHTML(diff.diff);
                // 显示其他相似值（最多显示3个）
                const otherMatchesList = result.matches.slice(1, 6).map(match => {
                    const percentage = Math.round(match.similarity * 100);
                    const diff = this.calculator.calculateCharDiff(result.source, match.text, 'lcs');
                    const diffHtml = this.calculator.generateDiffHTML(diff.diff);
                    return `<div class="other-match" data-match='${JSON.stringify(match)}' data-source-index="${index}">
                        <span class="match-text">${diffHtml}</span>
                        <span class="match-similarity">${percentage}%</span>
                    </div>`;
                }).join('');
                
                otherMatches = otherMatchesList || '<span class="no-matches">无其他匹配</span>';
            } else {
                bestMatch = '无匹配';
                bestSimilarity = '0%';
                otherMatches = '<span class="no-matches">无匹配结果</span>';
                bestMatchDiffHtml = '<span class="diff-unchanged">无差异数据</span>';
            }

            html += `
                <tr class="result-row ${isLocked ? 'locked' : ''}" data-index="${index}">
                    <td class="source-cell">${this.escapeHtml(result.source)}</td>
                    <td class="best-match-cell">
                        <div class="best-match" data-source-index="${index}">
                            ${bestMatchDiffHtml || this.escapeHtml(bestMatch)}
                        </div>
                    </td>
                    <td class="similarity-cell">
                        <span class="similarity-value ${this.getSimilarityClass(lockedMatch ? lockedMatch.similarity : (tempMatch ? tempMatch.similarity : (result.matches[0]?.similarity || 0)))}">
                            ${bestSimilarity}
                        </span>
                    </td>
                    <td class="other-matches-cell">
                        ${otherMatches}
                    </td>
                    <td class="action-cell">
                        <button class="lock-btn ${isLocked ? 'locked' : 'unlocked'}" data-index="${index}">
                            ${isLocked ? '已锁定' : '锁定'}
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    /**
     * 获取相似度样式类
     * @param {number} similarity - 相似度值
     * @returns {string} - CSS类名
     */
    getSimilarityClass(similarity) {
        if (similarity === 1.0) return 'exact';
        if (similarity >= 0.8) return 'similar';
        if (similarity >= 0.5) return 'medium';
        return 'low';
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
     * 绑定表格事件
     */
    bindTableEvents() {
        // 绑定锁定按钮事件
        const lockButtons = this.resultsContainer.querySelectorAll('.lock-btn');
        lockButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.toggleLock(index);
            });
        });

        // 绑定其他相似值点击事件
        const otherMatches = this.resultsContainer.querySelectorAll('.other-match');
        otherMatches.forEach(match => {
            match.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchData = JSON.parse(e.currentTarget.dataset.match);
                const sourceIndex = parseInt(e.currentTarget.dataset.sourceIndex);
                this.selectMatch(sourceIndex, matchData);
            });
        });

        // 绑定最相似值点击事件（用于取消选择）
        const bestMatches = this.resultsContainer.querySelectorAll('.best-match');
        bestMatches.forEach(match => {
            match.addEventListener('click', (e) => {
                e.stopPropagation();
                const sourceIndex = parseInt(e.currentTarget.dataset.sourceIndex);
                this.clearSelection(sourceIndex);
            });
        });
    }

    /**
     * 选择匹配项
     * @param {number} sourceIndex - 源数据索引
     * @param {Object} matchData - 匹配数据
     */
    selectMatch(sourceIndex, matchData) {
        // 如果已经锁定，不允许更改
        if (this.lockedResults.has(sourceIndex)) {
            return;
        }
        
        // 临时存储选择，但不锁定
        this.tempSelections = this.tempSelections || new Map();
        this.tempSelections.set(sourceIndex, matchData);
        
        // 重新显示结果
        this.displayResults();
    }

    /**
     * 清除选择
     * @param {number} sourceIndex - 源数据索引
     */
    clearSelection(sourceIndex) {
        // 如果已经锁定，不允许更改
        if (this.lockedResults.has(sourceIndex)) {
            return;
        }
        
        // 清除临时选择
        this.tempSelections = this.tempSelections || new Map();
        this.tempSelections.delete(sourceIndex);
        
        // 重新显示结果
        this.displayResults();
    }

    /**
     * 切换锁定状态
     * @param {number} index - 结果索引
     */
    toggleLock(index) {
        if (this.lockedResults.has(index)) {
            // 解锁
            this.lockedResults.delete(index);
        } else {
            // 锁定当前选择的值
            const result = this.results[index];
            let matchToLock = null;
            
            // 优先使用临时选择的值
            if (this.tempSelections && this.tempSelections.has(index)) {
                matchToLock = this.tempSelections.get(index);
            } else if (result && result.matches.length > 0) {
                // 否则使用最相似的值
                matchToLock = result.matches[0];
            }
            
            if (matchToLock) {
                this.lockedResults.set(index, matchToLock);
                // 清除临时选择
                if (this.tempSelections) {
                    this.tempSelections.delete(index);
                }
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
            const tempMatch = this.tempSelections && this.tempSelections.has(index) ? this.tempSelections.get(index) : null;
            let bestMatch = '';
            let similarity = '';

            if (isLocked) {
                const lockedMatch = this.lockedResults.get(index);
                bestMatch = lockedMatch.text;
                similarity = Math.round(lockedMatch.similarity * 100) + '%';
            } else if (tempMatch) {
                bestMatch = tempMatch.text;
                similarity = Math.round(tempMatch.similarity * 100) + '%';
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
            lockedResults: Array.from(this.lockedResults.entries()),
            tempSelections: this.tempSelections ? Array.from(this.tempSelections.entries()) : []
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

            // 恢复临时选择状态
            if (data.tempSelections) {
                this.tempSelections = new Map(data.tempSelections);
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