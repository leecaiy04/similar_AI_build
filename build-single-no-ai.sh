#!/bin/bash

echo "开始构建单文件无AI版本..."

# 备份原文件
cp src/main.ts src/main.ts.bak
cp src/App.vue src/App.vue.bak
cp src/router/index.ts src/router/index.ts.bak
cp index.html index.html.bak

# 替换为无AI版本
cp src/main.no-ai.ts src/main.ts
cp src/App.no-ai.vue src/App.vue
cp src/router/index.no-ai.ts src/router/index.ts
cp index.no-ai.html index.html

# 执行单文件构建
echo "正在构建单文件版本..."
npx vue-tsc -b && npx vite build --config vite.config.single-no-ai.ts

# 恢复原文件
mv src/main.ts.bak src/main.ts
mv src/App.vue.bak src/App.vue
mv src/router/index.ts.bak src/router/index.ts
mv index.html.bak index.html

# 复制单文件到根目录
if [ -f "dist-single-no-ai/index.html" ]; then
    cp dist-single-no-ai/index.html standalone-no-ai.html
    echo ""
    echo "✅ 构建完成！"
    echo "📁 输出文件："
    echo "   - dist-single-no-ai/index.html (构建目录)"
    echo "   - standalone-no-ai.html (根目录副本)"
    echo ""
    echo "📊 文件大小："
    ls -lh standalone-no-ai.html | awk '{print "   " $5}'
    echo ""
    echo "✨ 包含功能："
    echo "   - 相似度比对（完整算法实现）"
    echo "   - 数据Diff（LCS/Levenshtein/Myers算法）"
    echo "   - 数据处理（去重/提取/脱敏/排序等）"
    echo "   - 表格合并（CSV解析和合并）"
    echo ""
    echo "🚀 直接在浏览器中打开 standalone-no-ai.html 即可使用"
else
    echo "❌ 构建失败：未找到输出文件"
fi
