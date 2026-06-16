#!/bin/bash

# 1Panel 部署脚本
# 用于快速部署到 1Panel Node.js 运行时

set -e

echo "🚀 开始部署到 1Panel..."
echo ""

# 1. 安装依赖
echo "📦 安装依赖..."
npm install

# 2. 构建项目
echo "🔨 构建项目..."
npm run build

# 3. 检查构建结果
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist 目录不存在"
    exit 1
fi

echo "✅ 构建完成"
echo ""

# 4. 显示部署信息
echo "📋 部署信息："
echo "   静态文件：dist/"
echo "   启动文件：server.js"
echo "   端口：3000 (可通过 PORT 环境变量修改)"
echo ""

echo "✅ 部署准备完成！"
echo ""
echo "📖 1Panel 部署步骤："
echo "   1. 在 1Panel 中创建 Node.js 网站"
echo "   2. 选择本项目目录作为项目目录"
echo "   3. 启动文件设置为：server.js"
echo "   4. Node.js 版本选择：v20 或更高"
echo "   5. 端口设置为：3000"
echo "   6. 启动应用即可"
echo ""
echo "📚 详细文档请参考：DEPLOY_1PANEL.md"
