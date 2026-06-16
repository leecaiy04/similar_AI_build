# 前后端分离架构部署指南

## 🏗️ 架构说明

本项目支持两种部署模式：

### 1. 单体部署（原有方式）
- 前端 + 后端在同一个容器中
- 使用 `docker-compose.yml`
- 端口：56600

### 2. 前后端分离部署（新架构）
- **前端容器**: Nginx + Vue3 静态文件
- **后端容器**: Node.js Express API 服务
- 使用 `docker-compose.separated.yml`
- 前端端口：56600，后端内部端口：3000

```
┌─────────────────────────────────────────┐
│         用户浏览器                       │
└─────────────┬───────────────────────────┘
              │ http://localhost:56600
              ↓
┌─────────────────────────────────────────┐
│   前端容器 (similar-ai-frontend)         │
│   ├─ Nginx (端口 80 → 56600)            │
│   ├─ Vue3 静态文件                       │
│   └─ /api/* → 代理到后端                │
└─────────────┬───────────────────────────┘
              │ 内部网络 (app-network)
              ↓
┌─────────────────────────────────────────┐
│   后端容器 (similar-ai-backend)          │
│   ├─ Node.js Express                    │
│   ├─ API 服务 (端口 3000)               │
│   └─ 代理到 cc-vibe.com                 │
└─────────────────────────────────────────┘
```

## 🚀 快速部署

### 方法一：使用部署脚本（推荐）

```bash
cd /vol1/1000/code/similar_AI_build
./deploy-separated.sh
```

### 方法二：使用 npm 命令

```bash
# 前后端分离部署
npm run deploy:separated

# 停止服务
npm run deploy:separated:down
```

### 方法三：直接使用 Docker Compose

```bash
# 启动
docker-compose -f docker-compose.separated.yml up -d --build

# 停止
docker-compose -f docker-compose.separated.yml down

# 查看日志
docker-compose -f docker-compose.separated.yml logs -f
```

## 📁 文件结构

```
/vol1/1000/code/similar_AI_build/
├── Dockerfile                      # 单体部署的 Dockerfile
├── Dockerfile.frontend             # 前端 Dockerfile (Nginx + Vue3)
├── Dockerfile.backend              # 后端 Dockerfile (Node.js)
├── nginx.conf                      # Nginx 配置文件
├── docker-compose.yml              # 单体部署配置
├── docker-compose.separated.yml    # 前后端分离配置
├── deploy-1panel.sh                # 单体部署脚本
└── deploy-separated.sh             # 前后端分离部署脚本
```

## 🔧 配置说明

### 前端配置 (nginx.conf)

- **静态文件服务**: 提供 Vue3 构建产物
- **API 代理**: `/api/*` 请求代理到后端容器
- **路由支持**: SPA 路由回退到 index.html
- **静态资源缓存**: JS/CSS/图片等缓存 1 年

### 后端配置 (Dockerfile.backend)

- **运行环境**: Node.js 20 Alpine
- **端口**: 3000 (仅内部访问)
- **健康检查**: 每 30 秒检查一次
- **环境变量**: 
  - `NODE_ENV=production`
  - `PORT=3000`
  - `PROXY_URL=http://192.168.9.2:1082`

### 网络配置

- **app-network**: 前后端容器内部通信
- **1panel-network**: 连接到 1Panel 管理网络

## 🎯 端口分配

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|---------|-----------|------|
| 前端 | 80 | 56600 | 对外访问端口 |
| 后端 | 3000 | - | 仅内部访问 |

## 📊 管理命令

### 查看服务状态
```bash
docker-compose -f docker-compose.separated.yml ps
```

### 查看日志
```bash
# 前端日志
docker logs -f similar-ai-frontend

# 后端日志
docker logs -f similar-ai-backend

# 所有日志
docker-compose -f docker-compose.separated.yml logs -f
```

### 重启服务
```bash
# 重启前端
docker restart similar-ai-frontend

# 重启后端
docker restart similar-ai-backend

# 重启所有
docker-compose -f docker-compose.separated.yml restart
```

### 更新部署
```bash
cd /vol1/1000/code/similar_AI_build
git pull
./deploy-separated.sh
```

## 🔍 故障排查

### 前端无法访问
```bash
# 检查前端容器状态
docker ps | grep similar-ai-frontend

# 查看前端日志
docker logs similar-ai-frontend

# 检查端口占用
netstat -tulpn | grep 56600
```

### API 请求失败
```bash
# 检查后端容器状态
docker ps | grep similar-ai-backend

# 查看后端日志
docker logs similar-ai-backend

# 测试后端健康
docker exec similar-ai-backend wget -O- http://localhost:3000
```

### 网络连接问题
```bash
# 检查网络
docker network ls | grep app-network

# 检查容器网络连接
docker network inspect app-network
```

## 🆚 单体 vs 分离部署对比

| 特性 | 单体部署 | 前后端分离 |
|------|---------|-----------|
| 容器数量 | 1 个 | 2 个 |
| 资源占用 | 较少 | 较多 |
| 扩展性 | 一般 | 优秀 |
| 独立更新 | 不支持 | 支持 |
| 性能 | 一般 | 更好（Nginx） |
| 复杂度 | 简单 | 中等 |
| 适用场景 | 开发/小型项目 | 生产/大型项目 |

## 💡 最佳实践

1. **开发环境**: 使用单体部署（`npm run deploy`）
2. **生产环境**: 使用前后端分离（`npm run deploy:separated`）
3. **监控**: 定期查看容器日志和健康状态
4. **备份**: 定期备份配置文件和数据
5. **更新**: 使用 `--build` 参数确保使用最新代码

## 🌐 访问地址

- **前后端分离**: http://localhost:56600
- **单体部署**: http://localhost:56600

两种部署方式使用相同的端口，但架构不同。

## 📞 支持

如有问题，请查看：
- [README.md](./README.md) - 项目说明
- [DEPLOY.md](./DEPLOY.md) - 通用部署文档
- [1PANEL-DEPLOY.md](./1PANEL-DEPLOY.md) - 1Panel 部署文档
