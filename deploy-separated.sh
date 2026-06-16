#!/bin/bash

# Similar AI Build - 前后端分离部署脚本
# 用途: 自动构建前后端镜像并在1Panel中部署

set -e

echo "======================================"
echo "  前后端分离部署"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_DIR="/vol1/1000/code/similar_AI_build"
FRONTEND_CONTAINER="similar-ai-frontend"
BACKEND_CONTAINER="similar-ai-backend"
FRONTEND_PORT="56600"

# 步骤1: 检查是否在项目目录
echo -e "${YELLOW}[1/5]${NC} 检查项目目录..."
cd "$PROJECT_DIR" || { echo -e "${RED}错误: 无法进入项目目录${NC}"; exit 1; }
echo -e "${GREEN}✓${NC} 当前目录: $(pwd)"
echo ""

# 步骤2: 停止并删除旧容器
echo -e "${YELLOW}[2/5]${NC} 清理旧容器..."
docker-compose -f docker-compose.separated.yml down 2>/dev/null || true
echo -e "${GREEN}✓${NC} 旧容器已清理"
echo ""

# 步骤3: 检查网络
echo -e "${YELLOW}[3/5]${NC} 检查Docker网络..."
if ! docker network ls | grep -q "1panel-network"; then
    docker network create 1panel-network
    echo -e "${GREEN}✓${NC} 创建1panel-network网络"
else
    echo -e "${GREEN}✓${NC} 网络已存在"
fi
echo ""

# 步骤4: 构建并启动容器
echo -e "${YELLOW}[4/5]${NC} 构建并启动前后端服务..."
docker-compose -f docker-compose.separated.yml up -d --build
echo -e "${GREEN}✓${NC} 服务启动成功"
echo ""

# 步骤5: 等待服务就绪
echo -e "${YELLOW}[5/5]${NC} 等待服务就绪..."
sleep 5
echo -e "${GREEN}✓${NC} 服务已就绪"
echo ""

# 显示部署信息
echo "======================================"
echo -e "${GREEN}  部署完成！${NC}"
echo "======================================"
echo ""
echo "📦 前端容器: $FRONTEND_CONTAINER"
echo "📦 后端容器: $BACKEND_CONTAINER"
echo ""
echo "🔗 访问地址: http://localhost:$FRONTEND_PORT"
echo "🌐 局域网访问: http://$(hostname -I | awk '{print $1}'):$FRONTEND_PORT"
echo ""
echo "架构说明:"
echo "  ├─ 前端: Nginx + Vue3 (端口 $FRONTEND_PORT)"
echo "  ├─ 后端: Node.js Express (内部端口 3000)"
echo "  └─ 通信: 前端通过 /api/ 代理到后端"
echo ""
echo "常用命令:"
echo "  查看前端日志: docker logs -f $FRONTEND_CONTAINER"
echo "  查看后端日志: docker logs -f $BACKEND_CONTAINER"
echo "  查看所有容器: docker-compose -f docker-compose.separated.yml ps"
echo "  停止服务: npm run deploy:separated:down"
echo "  重启服务: docker-compose -f docker-compose.separated.yml restart"
echo ""
