(function(){
  function applySessionSettings() {
    try {
      var dataStr = sessionStorage.getItem('similarityAppSettings');
      if (!dataStr) return false;
      var data = JSON.parse(dataStr);
      if (!data || !data.settings) return false;
      var s = data.settings;
      var q = function(id){ return document.getElementById(id); };
      var setRadio = function(name, value){
        var list = document.querySelectorAll('input[name="' + name + '"]');
        if (!list || !list.length) return;
        list.forEach(function(r){ r.checked = (r.value === value); });
      };
      var slider = q('similarity-threshold');
      var thresholdValue = q('threshold-value');
      if (slider && s.threshold != null) {
        slider.value = s.threshold;
        if (thresholdValue) thresholdValue.textContent = s.threshold + '%';
      }
      var ip = q('ignore-punctuation'); if (ip) ip.checked = s.ignorePunctuation !== false;
      var fw = q('fullwidth-to-halfwidth'); if (fw) fw.checked = s.fullwidthToHalfwidth !== false;
      var inv = q('ignore-invisible-chars'); if (inv) inv.checked = s.ignoreInvisibleChars !== false;
      var syn = q('synonym-groups'); if (syn) syn.value = s.synonymGroups || '';
      var ign = q('ignore-terms'); if (ign) ign.value = s.ignoreTerms || '';
      if (s.algoMode) setRadio('algo-mode', s.algoMode);
      return true;
    } catch (e) { return false; }
  }

  function saveSessionSettings() {
    try {
      var q = function(id){ return document.getElementById(id); };
      var slider = q('similarity-threshold');
      var data = {
        settings: {
          threshold: slider ? slider.value : 70,
          ignorePunctuation: q('ignore-punctuation') ? q('ignore-punctuation').checked : true,
          fullwidthToHalfwidth: q('fullwidth-to-halfwidth') ? q('fullwidth-to-halfwidth').checked : true,
          ignoreInvisibleChars: q('ignore-invisible-chars') ? q('ignore-invisible-chars').checked : true,
          synonymGroups: q('synonym-groups') ? q('synonym-groups').value : '',
          ignoreTerms: q('ignore-terms') ? q('ignore-terms').value : '',
          algoMode: (function(){
            var r = document.querySelector('input[name="algo-mode"]:checked');
            return r ? r.value : 'fusion';
          })()
        }
      };
      sessionStorage.setItem('similarityAppSettings', JSON.stringify(data));
    } catch (e) {}
  }

  function attachAutoSave() {
    var add = function(el, evt) { if (el) el.addEventListener(evt, saveSessionSettings); };
    add(document.getElementById('similarity-threshold'), 'change');
    add(document.getElementById('similarity-threshold'), 'input');
    add(document.getElementById('ignore-punctuation'), 'change');
    add(document.getElementById('fullwidth-to-halfwidth'), 'change');
    add(document.getElementById('ignore-invisible-chars'), 'change');
    add(document.getElementById('synonym-groups'), 'input');
    add(document.getElementById('ignore-terms'), 'input');
  }

  function clearDataAndResults() {
    var src = document.getElementById('source-column');
    var tgt = document.getElementById('target-column');
    if (src) src.value = '';
    if (tgt) tgt.value = '';
    var sc = document.getElementById('source-count'); if (sc) sc.textContent = '0';
    var tc = document.getElementById('target-count'); if (tc) tc.textContent = '0';
    var rc = document.getElementById('results-container');
    if (rc) rc.innerHTML = '<div class="no-results">暂无比较结果</div>';
  }

  document.addEventListener('DOMContentLoaded', function(){
    // 应用 session 设置（若有），然后清空输入与结果
    applySessionSettings();
    attachAutoSave();
    // 若存在 session/local 已保存设置，则清空数据；否则保留示例
    var hasSession = !!sessionStorage.getItem('similarityAppSettings');
    var hasLocal = !!localStorage.getItem('similarityAppData');
    if (hasSession || hasLocal) {
      clearDataAndResults();
    }
  });
})();
