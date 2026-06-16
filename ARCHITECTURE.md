# 项目架构说明

## 架构概述

本项目是一个 **纯前端应用**，但提供了可选的 Node.js 静态文件服务器用于部署。

```
┌─────────────────────────────────────────┐
│         前端应用 (Vue 3)                 │
│  - 相似度比对                            │
│  - 数据Diff                              │
│  - 数据处理                              │
│  - 批量AI                                │
│  - AI对话                                │
└─────────────────────────────────────────┘
              ↓ 构建
┌─────────────────────────────────────────┐
│      dist/ (静态文件)                    │
│  - index.html                            │
│  - assets/js/*.js                        │
│  - assets/css/*.css                      │
└─────────────────────────────────────────┘
              ↓ 托管方式
    ┌─────────┴─────────┐
    ↓                   ↓
【方式1: 纯静态】  【方式2: Node.js托管】
  Nginx/Apache        server.js
  直接托管            Express服务器
  dist/文件           + API代理功能
```

---

## server.js 的作用

`server.js` **不是后端应用**，它是：

### 1. 静态文件服务器
```javascript
// 托管 dist/ 目录的所有文件
app.use(express.static(path.join(__dirname, 'dist')))
```

### 2. SPA路由支持
```javascript
// 所有路由都返回 index.html（Vue Router需要）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})
```

### 3. API代理（可选）
```javascript
// 转发 Claude API 请求，解决CORS问题
app.all('/api/cc-vibe/*', async (req, res) => {
  // 代理到 https://cc-vibe.com
})
```

---

## package.json 脚本说明

### 开发相关
```bash
npm run dev              # 开发模式（Vite热更新）
npm run build            # 构建生产版本到 dist/
npm run preview          # 预览构建结果
```

### 部署相关
```bash
npm start                # 启动静态文件服务器（开发/测试用）
npm run start:prod       # 生产模式启动（设置NODE_ENV=production）
npm run deploy:prepare   # 准备部署（安装依赖+构建）
npm run deploy:1panel    # 1Panel部署准备
```

### Docker相关
```bash
npm run deploy:full      # Docker完整部署
npm run docker:compose   # Docker Compose启动
npm run docker:stop      # Docker Compose停止
```

---

## 1Panel 部署配置

### 方式一：静态网站（推荐）

**优点：** 性能最好、最简单、无需Node.js

**步骤：**
1. 构建：`npm run build`
2. 在1Panel创建"静态网站"
3. 上传 `dist/` 目录内容
4. 配置Nginx：`try_files $uri $uri/ /index.html;`

**1Panel配置：**
- 网站类型：静态网站
- 网站目录：上传 dist/ 内容
- 无需其他配置

---

### 方式二：Node.js托管（带API代理）

**优点：** 支持API代理、统一端口访问

**步骤：**
1. 准备：`npm run deploy:1panel`
2. 在1Panel创建"Node.js网站"
3. 启动应用

**1Panel配置：**
```
网站类型：运行时网站 > Node.js
项目目录：/path/to/similar_AI_build
启动文件：server.js
启动命令：npm start 或 node server.js
Node版本：v20 或更高
端口：3000
环境变量：
  - NODE_ENV=production
  - PORT=3000
```

**PM2配置（1Panel自动生成）：**
```json
{
  "name": "similarity-app",
  "script": "server.js",
  "cwd": "/path/to/similar_AI_build",
  "instances": 1,
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

---

## 启动方式对比

| 方式 | 命令 | 说明 | 适用场景 |
|------|------|------|----------|
| 开发模式 | `npm run dev` | Vite热更新，端口5173 | 本地开发 |
| 预览模式 | `npm run preview` | 预览构建结果 | 本地测试 |
| Node.js托管 | `npm start` | Express服务器，端口3000 | 开发/生产环境 |
| PM2管理 | `pm2 start server.js` | 进程管理、自动重启 | 生产环境 |
| 静态托管 | Nginx/Apache | 直接托管dist/ | 生产环境（推荐）|

---

## 常见问题

### Q1: server.js 是前端还是后端？
**A:** 它是**前端静态文件服务器**，不是传统后端。它只负责：
- 托管已构建的前端文件（dist/）
- 提供路由支持（SPA需要）
- 可选的API代理（解决CORS）

### Q2: 1Panel中"启动文件"填什么？
**A:** 填 `server.js`，这会启动Express服务器来托管你的前端应用。

### Q3: 需要数据库吗？
**A:** 不需要。本应用所有数据都在前端处理，使用浏览器的localStorage存储。

### Q4: API代理是必须的吗？
**A:** 不是必须的。只有当你需要调用Claude API且遇到CORS问题时才需要。

### Q5: 推荐哪种部署方式？
**A:** 
- **纯展示**: 静态网站部署（性能最好）
- **需要API代理**: Node.js部署（server.js）
- **需要高可用**: Docker + Nginx

### Q6: 如何只启动前端不启动server.js？
**A:** 
```bash
# 开发模式
npm run dev

# 或者使用静态服务器（需要先构建）
npm run build
npx serve dist
```

---

## 目录结构

```
similar_AI_build/
├── src/                    # Vue源代码（前端）
│   ├── pages/             # 页面组件
│   ├── components/        # 通用组件
│   ├── features/          # 功能模块
│   └── ...
├── dist/                  # 构建输出（前端静态文件）
│   ├── index.html
│   └── assets/
├── server.js              # Express服务器（可选，用于托管dist/）
├── package.json           # 依赖和脚本
├── vite.config.ts         # Vite配置
├── DEPLOY_1PANEL.md       # 1Panel部署文档
└── deploy-1panel.sh       # 部署脚本
```

---

## 总结

- ✅ 本质上是**纯前端应用**
- ✅ `server.js` 是**可选的静态文件服务器**
- ✅ 可以用静态托管（Nginx）或Node.js托管（server.js）
- ✅ 1Panel中填`server.js`是为了启动Node.js托管
- ✅ 推荐使用静态网站部署，性能更好

**简单记忆：** `server.js = 前端文件的快递员，不是后端`
