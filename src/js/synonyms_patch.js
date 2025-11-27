(function() {
  try {
    var Calculator = window.SimilarityCalculator;
    if (!Calculator || !Calculator.prototype) return;
    var proto = Calculator.prototype;

    // 覆盖：同义词分组 -> 每组最短项为代表词
    proto.setSynonymGroups = function(synonymText) {
      this.synonymGroups.clear();
      if (!synonymText || !synonymText.trim()) return;

      // 组分隔：换行 / 分号 / 顿号
      var groups = synonymText
        .split(/[\n；;、]+/)
        .map(function(s){ return s.trim(); })
        .filter(Boolean);

      for (var gi = 0; gi < groups.length; gi++) {
        var g = groups[gi];
        // 组内分隔：逗号 / 空格 / 顿号
        var raw = g.split(/[，,、\s]+/).map(function(w){ return w.trim(); }).filter(Boolean);
        if (raw.length <= 1) continue;

        // 归一化去重（与现有 normalizeText 对齐）
        var words = Array.from(new Set(raw.map(this.normalizeText).filter(Boolean)));
        if (words.length <= 1) continue;

        // 选“最短”的作为代表词（长度相同取先出现的）
        var representative = words[0];
        for (var i = 1; i < words.length; i++) {
          if (words[i].length < representative.length) representative = words[i];
        }

        // 建立映射
        for (var j = 0; j < words.length; j++) {
          this.synonymGroups.set(words[j], representative);
        }
      }
    };

    // 覆盖：同义词替换，按 key 长度降序避免重叠替换
    proto.applySynonyms = function(text) {
      if (!text || this.synonymGroups.size === 0) return text;
      var result = text;
      var entries = Array.from(this.synonymGroups.entries()).sort(function(a, b) {
        return b[0].length - a[0].length;
      });
      for (var k = 0; k < entries.length; k++) {
        var key = entries[k][0];
        var rep = entries[k][1];
        if (!key) continue;
        var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp(escaped, 'g');
        result = result.replace(regex, rep);
      }
      return result;
    };
  } catch (e) {
    // 安静失败，避免影响页面
    console && console.warn && console.warn('synonyms_patch init failed:', e);
  }
})();

