(function(){
  try {
    if (!window.SimilarityCalculator) return; // ensure app context
    // wait for SimilarityApp to be defined
    var tryPatch = function(){
      if (!window.SimilarityApp) { setTimeout(tryPatch, 0); return; }
      var P = window.SimilarityApp && window.SimilarityApp.prototype;
      if (!P) return;

      // 构建 Excel 兼容 HTML 文档，设置列宽与自动换行
      P.buildExcelHTML = function(headers, rows, widthsPx){
        var escape = (txt) => {
          var div = document.createElement('div');
          div.textContent = (txt == null ? '' : String(txt));
          return div.innerHTML;
        };
        var style = '\n<meta charset="UTF-8">\n<style>\n' +
          'table{border-collapse:collapse;table-layout:fixed;width:100%;}' +
          'th,td{border:1px solid #ccc;padding:4px;vertical-align:top;white-space:normal;word-wrap:break-word;word-break:break-all;mso-word-wrap:break-word;}' +
          // 统一列宽：约等于30字符宽 — 用col宽度+px/pt同时指定，提升Excel兼容性
          'td{mso-number-format:"@";}' +
        '</style>';
        // 估算：30字符 ≈ 300px（按常见字体），同时设置pt与px
        // 默认每列 ~30ch 宽；允许传入 widthsPx 指定每列像素宽度
        var defaultPx = 300, defaultPt = 225;
        var colgroup = '<colgroup>' + headers.map(function(_, idx){
          var px = (widthsPx && widthsPx[idx]) || defaultPx;
          var pt = Math.round(px * 0.75); // 1pt ≈ 1.333px => px * 0.75 ≈ pt
          return '<col width="' + px + '" style="width:' + px + 'px; width:' + pt + 'pt; mso-width-source:userset;">';
        }).join('') + '</colgroup>';
        var thead = '<tr>' + headers.map(function(h){ return '<th>' + escape(h) + '</th>'; }).join('') + '</tr>';
        var tbody = rows.map(function(r){ return '<tr>' + r.map(function(c){ return '<td>' + escape(c) + '</td>'; }).join('') + '</tr>'; }).join('');
        return '<!DOCTYPE html><html><head>' + style + '</head><body><table>' + colgroup + thead + tbody + '</table></body></html>';
      };

      // 完整导出：源文本, 最相似值(仅锁定才填), 第1相似, 第1相似度, …, 第5相似, 第5相似度
      P.generateFullExcelHTML = function(){
        var headers = ['源文本','最相似值'];
        for (var i = 1; i <= 5; i++) { headers.push('第' + i + '相似'); headers.push('第' + i + '相似度'); }
        var rows = [];
        this.results.forEach((result, index) => {
          var isLocked = this.lockedResults.has(index);
          var bestText = '';
          if (isLocked) {
            var lockedMatch = this.lockedResults.get(index);
            bestText = lockedMatch && lockedMatch.text ? lockedMatch.text : '';
          }

          // 取前5个相似项（不排除最相似值，避免未锁定时缺失）
          var top = (result.matches || []).slice(0, 5);
          while (top.length < 5) top.push(null);

          var row = [ result.source, bestText ];
          top.forEach(function(m){
            if (m) row.push(m.text, Math.round(m.similarity * 100) + '%');
            else row.push('', '');
          });
          rows.push(row);
        });
        // 列宽：前两列 30ch ≈ 300px；后续列 15ch ≈ 150px
        var widths = headers.map(function(_, idx){ return idx < 2 ? 300 : 150; });
        return this.buildExcelHTML(headers, rows, widths);
      };

      // 简化导出：源文本, 最相似值（仅锁定的填写；未锁定留空）
      P.generateSimpleExcelHTML = function(){
        var headers = ['源文本','最相似值'];
        var rows = [];
        this.results.forEach((result, index) => {
          var isLocked = this.lockedResults.has(index);
          var bestMatch = '';
          if (isLocked) {
            var lockedMatch = this.lockedResults.get(index);
            bestMatch = (lockedMatch && lockedMatch.text) ? lockedMatch.text : '';
          }
          rows.push([result.source, bestMatch]);
        });
        return this.buildExcelHTML(headers, rows);
      };

      // 覆盖导出方法，输出 .xls(HTML) 且设置列宽/换行
      var origExportResults = P.exportResults;
      P.exportResults = function(){
        if (this.results.length === 0) { alert('û�пɵ����Ľ��'); return; }
        var html = this.generateFullExcelHTML();
        this.downloadFile('\ufeff' + html, 'similarity_results.xls', 'application/vnd.ms-excel;charset=utf-8');
      };

      var origExportSimpleResults = P.exportSimpleResults;
      P.exportSimpleResults = function(){
        if (this.results.length === 0) { alert('û�пɵ����Ľ��'); return; }
        var html = this.generateSimpleExcelHTML();
        this.downloadFile('\ufeff' + html, 'similarity_results_simple.xls', 'application/vnd.ms-excel;charset=utf-8');
      };
    };
    tryPatch();
  } catch (e) {
    console && console.warn && console.warn('export excel patch init failed:', e);
  }
})();
