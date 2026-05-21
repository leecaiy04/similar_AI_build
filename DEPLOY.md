# Similar AI Build - 部署文档

## 📦 Docker 容器部署

本项目已配置好 Docker 容器部署，包含前端静态文件服务和后端 API 代理。

### 快速开始

#### 1. 使用 Docker Compose（推荐）

```bash
# 构建并启动容器
npm run docker:compose

# 或直接使用 docker-compose
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
npm run docker:stop
```

#### 2. 使用 Docker 命令

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run

# 或使用完整命令
docker build -t similar-ai-build .
docker run -d -p 3000:3000 --name similar-ai-build similar-ai-build
```

### 环境变量配置

在 `docker-compose.yml` 中可以配置以下环境变量：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000                              # 服务端口
  - PROXY_URL=http://192.168.9.2:1082     # 可选：上游代理地址
```

### 端口映射

- 默认端口：`3000`
- 访问地址：`http://localhost:3000`
- 局域网访问：`http://<服务器IP>:3000`

### 架构说明

```
┌─────────────────────────────────────────┐
│         Docker Container                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Node.js Express Server         │  │
│  │                                  │  │
│  │  ├─ 静态文件服务 (/)            │  │
│  │  │   └─ Vue 3 前端应用          │  │
│  │  │                               │  │
│  │  └─ API 代理 (/api/cc-vibe/*)   │  │
│  │      └─ 转发到 cc-vibe.com      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Port: 3000                             │
└─────────────────────────────────────────┘
```

### 功能特性

✅ **CORS 跨域支持** - 后端代理自动处理跨域问题
✅ **上游代理支持** - 可配置代理访问外部 API
✅ **健康检查** - 自动监控容器健康状态
✅ **自动重启** - 容器异常时自动重启
✅ **多阶段构建** - 优化镜像大小

### 生产部署检查清单

- [ ] 修改 `docker-compose.yml` 中的端口映射（如需要）
- [ ] 配置 `PROXY_URL`（如果服务器需要代理访问外网）
- [ ] 设置防火墙规则开放端口
- [ ] 配置 Nginx 反向代理（可选，用于 HTTPS）
- [ ] 设置域名和 SSL 证书（可选）

### 本地测试

在部署前，可以本地测试：

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 启动服务器
npm start

# 4. 访问
# http://localhost:3000
```

### Nginx 反向代理配置（可选）

如果需要配置 HTTPS 或域名访问：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 故障排查

#### 容器无法启动
```bash
# 查看日志
docker-compose logs

# 检查端口占用
netstat -tulpn | grep 3000
```

#### API 代理失败
```bash
# 进入容器检查
docker exec -it similar-ai-build sh

# 测试网络连接
wget -O- https://cc-vibe.com/v1/messages
```

#### 需要上游代理
在 `docker-compose.yml` 中取消注释并配置：
```yaml
- PROXY_URL=http://your-proxy-server:port
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 3. 清理旧镜像（可选）
docker image prune -f
```

### 监控和维护

```bash
# 查看容器状态
docker-compose ps

# 查看资源使用
docker stats similar-ai-build

# 查看实时日志
docker-compose logs -f --tail=100

# 重启容器
docker-compose restart
```

## 🚀 其他部署方式

### Vercel / Netlify（静态部署）
需要额外的 Serverless Functions 处理 API 代理

### VPS / 云服务器
直接使用 Docker 部署即可

### Kubernetes
可以基于 Dockerfile 创建 K8s 部署配置

---

## 📝 注意事项

1. **API Key 安全**：用户的 API key 存储在浏览器 localStorage，提醒用户不要在公共设备使用
2. **代理配置**：如果服务器需要代理访问外网，务必配置 `PROXY_URL`
3. **端口冲突**：确保 3000 端口未被占用，或修改端口映射
4. **资源限制**：生产环境建议配置容器资源限制

## 🔗 相关链接

- 项目仓库：[GitHub]
- 问题反馈：[Issues]
- 文档：[README.md]
