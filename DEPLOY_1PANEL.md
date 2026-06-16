# 1Panel 部署指南

本文档介绍如何在 1Panel 的网站功能中使用 Node.js 部署本项目。

## 部署方式选择

本项目支持两种部署方式：

### 方式一：静态网站部署（推荐）

纯前端静态部署，性能最好，最简单。

### 方式二：Node.js 应用部署

使用 Node.js 服务器托管静态文件。

---

## 方式一：静态网站部署（推荐）

### 1. 本地构建项目

```bash
cd /vol1/1000/code/similar_AI_build

# 安装依赖
npm install

# 构建生产版本
npm run build
```

构建完成后，会在 `dist/` 目录生成静态文件。

### 2. 在 1Panel 中创建网站

1. 登录 1Panel 管理面板
2. 进入 **网站** 菜单
3. 点击 **创建网站**
4. 选择 **静态网站**
5. 填写配置：
   - **域名**：填写你的域名或使用 IP:端口
   - **网站目录**：选择或创建目录（如：`/opt/1panel/apps/openresty/www/sites/similarity-app`）
   - **PHP版本**：无需选择
   - **备注**：文本相似度分析工具

### 3. 上传文件

方式 A - 使用 1Panel 文件管理器：
1. 进入 **文件** 菜单
2. 导航到网站目录
3. 上传 `dist/` 目录下的所有文件

方式 B - 使用 SCP/SFTP：
```bash
# 从服务器复制构建文件到网站目录
cp -r /vol1/1000/code/similar_AI_build/dist/* /opt/1panel/apps/openresty/www/sites/similarity-app/
```

### 4. 配置 Nginx

1Panel 会自动配置基础 Nginx，但需要添加路由配置：

进入网站设置 > Nginx 配置，在 `location /` 块中添加：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

这样可以支持 Vue Router 的 hash 模式。

### 5. 访问网站

通过配置的域名或 IP:端口访问即可。

---

## 方式二：Node.js 应用部署

### 1. 创建部署脚本

在项目根目录创建 `server.js`：

```javascript
const express = require('express')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')))

// SPA 路由支持
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
```

### 2. 更新 package.json

添加 start 脚本和依赖：

```json
{
  "scripts": {
    "start": "node server.js",
    "build": "vue-tsc -b && vite build"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

### 3. 本地构建

```bash
# 安装依赖（包括 express）
npm install

# 构建前端
npm run build

# 测试运行
npm start
```

### 4. 上传到服务器

将整个项目上传到服务器：

```bash
# 打包项目（排除 node_modules）
tar --exclude='node_modules' --exclude='.git' -czf similarity-app.tar.gz .

# 上传到服务器
scp similarity-app.tar.gz root@your-server:/opt/1panel/apps/
```

在服务器上解压：

```bash
cd /opt/1panel/apps/
mkdir similarity-app
cd similarity-app
tar -xzf ../similarity-app.tar.gz
```

### 5. 在 1Panel 中创建 Node.js 应用

1. 登录 1Panel 管理面板
2. 进入 **网站** 菜单
3. 点击 **创建网站**
4. 选择 **运行时网站** > **Node.js**
5. 填写配置：
   - **域名**：填写你的域名或使用 IP
   - **端口**：3000（或你在 server.js 中设置的端口）
   - **项目目录**：`/opt/1panel/apps/similarity-app`
   - **启动文件**：`server.js`
   - **Node版本**：选择 v20 或更高版本

### 6. 配置应用

在 1Panel 的应用配置中：

1. **环境变量**（可选）：
   ```
   NODE_ENV=production
   PORT=3000
   ```

2. **进程管理**：
   - 1Panel 会使用 PM2 自动管理进程
   - 支持自动重启、日志管理

### 7. 启动应用

1. 在 1Panel 网站列表中找到应用
2. 点击 **启动**
3. 查看状态确认运行正常

### 8. 配置反向代理（如需要）

如果需要使用域名访问，1Panel 会自动配置 Nginx 反向代理：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

## 更新部署

### 静态网站更新

```bash
# 本地重新构建
npm run build

# 上传新文件
cp -r dist/* /opt/1panel/apps/openresty/www/sites/similarity-app/
```

### Node.js 应用更新

```bash
# 本地重新构建
npm run build

# 上传到服务器
scp -r dist/* root@your-server:/opt/1panel/apps/similarity-app/dist/

# 在 1Panel 中重启应用
# 或使用 PM2 命令
pm2 restart similarity-app
```

---

## 常见问题

### 1. 端口被占用

修改 `server.js` 中的 PORT 或在 1Panel 中选择其他端口。

### 2. 路由 404 错误

确保 Nginx 配置了 `try_files $uri $uri/ /index.html;` 或 Node.js 有 SPA 路由支持。

### 3. 权限问题

确保文件所有者正确：
```bash
chown -R 1panel:1panel /opt/1panel/apps/similarity-app
```

### 4. Node.js 版本问题

本项目需要 Node.js >= 20，在 1Panel 运行时设置中选择正确版本。

### 5. 内存不足

在 1Panel 应用设置中增加内存限制，或使用静态部署方式。

---

## 性能优化建议

1. **使用静态部署**：如果不需要后端 API，推荐使用静态部署方式
2. **启用 Gzip**：在 Nginx 配置中启用压缩
3. **配置缓存**：为静态资源设置合适的缓存策略
4. **使用 CDN**：将静态资源托管到 CDN

---

## 安全建议

1. **配置 HTTPS**：在 1Panel 中申请 SSL 证书
2. **限制访问**：如需要，配置 IP 白名单
3. **定期更新**：保持依赖包更新
4. **备份数据**：定期备份网站文件

---

## 监控和日志

### 查看应用日志

在 1Panel 中：
1. 进入 **网站** > 选择应用
2. 点击 **日志**
3. 查看实时日志或下载日志文件

### PM2 命令（Node.js 部署）

```bash
# 查看所有应用
pm2 list

# 查看日志
pm2 logs similarity-app

# 重启应用
pm2 restart similarity-app

# 停止应用
pm2 stop similarity-app

# 监控应用
pm2 monit
```

---

## 总结

- **推荐方式**：静态网站部署（更简单、性能更好）
- **适用场景**：如果需要后端 API 或服务器端逻辑，使用 Node.js 部署
- **1Panel 优势**：自动化配置、可视化管理、PM2 进程管理

部署完成后，你的文本相似度分析工具就可以通过域名或 IP 访问了！
