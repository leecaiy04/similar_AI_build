#!/bin/bash

echo "开始构建无AI版本..."

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

# 执行构建
echo "正在构建..."
npm run build

# 恢复原文件
mv src/main.ts.bak src/main.ts
mv src/App.vue.bak src/App.vue
mv src/router/index.ts.bak src/router/index.ts
mv index.html.bak index.html

echo "构建完成！输出目录：dist/"
echo "无AI版本已生成，包含以下功能："
echo "  - 相似度比对"
echo "  - 数据Diff"
echo "  - 数据处理"
echo "  - 表格合并"
