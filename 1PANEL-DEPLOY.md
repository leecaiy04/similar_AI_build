# 1Panel 部署指南

## 📋 配置说明

本项目已配置好1Panel部署，所有 `/vol1/1000/code` 下的项目都会映射到容器内的 `/code` 路径。

## 🚀 快速部署

### 方法一：使用自动部署脚本（推荐）

```bash
cd /vol1/1000/code/similar_AI_build
./deploy-1panel.sh
```

脚本会自动完成：
1. ✅ 检查项目目录
2. ✅ 安装依赖
3. ✅ 构建前端
4. ✅ 清理旧容器
5. ✅ 构建Docker镜像
6. ✅ 启动容器

### 方法二：在1Panel Web界面部署

1. 登录1Panel管理面板
2. 进入 **应用商店** → **自定义应用**
3. 点击 **创建应用**
4. 填写以下信息：
   - **应用名称**: similar-ai-build
   - **配置文件**: 上传 `1panel-deploy.yml` 或复制其内容
   - **端口映射**: 56600:3000
5. 点击 **部署**

### 方法三：手动Docker Compose部署

```bash
cd /vol1/1000/code/similar_AI_build

# 安装依赖并构建
npm install
npm run build

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 🔧 配置详情

### 卷映射
```yaml
volumes:
  - /vol1/1000/code:/code:ro  # 所有code项目映射到/code（只读）
```

### 端口配置
- **宿主机端口**: 56600
- **容器端口**: 3000
- **访问地址**: http://your-server-ip:56600
- **端口范围**: 1Panel项目统一使用 56600-56699 网段

### 环境变量
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - PROXY_URL=http://192.168.9.2:1082  # 上游代理（可选）
```

### 网络配置
- 使用1Panel的 `1panel-network` 网络
- 可与其他1Panel应用互联

## 📊 管理命令

### 查看容器状态
```bash
docker ps | grep similar-ai-build
```

### 查看日志
```bash
docker logs -f similar-ai-build
```

### 重启容器
```bash
docker restart similar-ai-build
```

### 停止容器
```bash
docker stop similar-ai-build
```

### 更新部署
```bash
cd /vol1/1000/code/similar_AI_build
git pull
./deploy-1panel.sh
```

## 🌐 访问方式

- **本地访问**: http://localhost:56600
- **局域网访问**: http://192.168.x.x:56600
- **通过1Panel反向代理**: 在1Panel中配置网站反向代理

## 🔐 在1Panel中配置反向代理（可选）

如果需要通过域名访问：

1. 进入1Panel → **网站** → **创建网站**
2. 选择 **反向代理**
3. 填写配置：
   - **域名**: your-domain.com
   - **代理地址**: http://similar-ai-build:3000
   - **启用HTTPS**: 可选配置SSL证书
4. 保存并重启OpenResty

## 📁 目录结构

```
/vol1/1000/code/similar_AI_build/
├── docker-compose.yml          # Docker Compose配置（已更新）
├── 1panel-deploy.yml          # 1Panel专用配置
├── deploy-1panel.sh           # 自动部署脚本
├── Dockerfile                 # Docker镜像配置
├── DEPLOY.md                  # 通用部署文档
└── 1PANEL-DEPLOY.md          # 本文件
```

## ⚠️ 注意事项

1. **端口冲突**: 确保56600端口未被占用（1Panel项目使用56600-56699网段）
2. **网络配置**: 确保1panel-network网络已创建
3. **权限问题**: 部署脚本需要Docker权限
4. **代理配置**: 如果服务器需要代理访问外网，请配置PROXY_URL
5. **数据持久化**: 用户数据存储在浏览器localStorage中

## 🐛 故障排查

### 容器无法启动
```bash
# 查看详细日志
docker logs similar-ai-build

# 检查端口占用
netstat -tulpn | grep 56600
```

### 网络连接问题
```bash
# 检查网络是否存在
docker network ls | grep 1panel-network

# 如果不存在，创建网络
docker network create 1panel-network
```

### 构建失败
```bash
# 清理并重新构建
docker-compose down
docker rmi similar-ai-build:latest
./deploy-1panel.sh
```

## 📞 支持

如有问题，请查看：
- [README.md](./README.md) - 项目说明
- [DEPLOY.md](./DEPLOY.md) - 通用部署文档
- [GitHub Issues](https://github.com/leecaiy04/similar_AI_build/issues)
