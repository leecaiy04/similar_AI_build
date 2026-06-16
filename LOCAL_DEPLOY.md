# 本地部署指南

## 快速开始

### 方式一：开发模式（推荐用于开发）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问
# 浏览器打开：http://localhost:5174
```

**特点：**
- ✅ 热更新（修改代码自动刷新）
- ✅ 快速启动
- ✅ 适合开发调试

---

### 方式二：生产模式（Node.js服务器）

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 启动服务器
npm start

# 4. 访问
# 浏览器打开：http://localhost:3000
```

**特点：**
- ✅ 生产环境优化
- ✅ 支持API代理
- ✅ 适合本地生产环境测试

---

### 方式三：预览模式

```bash
# 1. 构建项目
npm run build

# 2. 预览构建结果
npm run preview

# 3. 访问
# 浏览器打开：http://localhost:4173
```

**特点：**
- ✅ 快速预览构建结果
- ✅ 不需要Express服务器
- ✅ Vite内置预览服务器

---

## 一键部署脚本

### Linux/Mac

创建 `start-local.sh`：

```bash
#!/bin/bash

echo "🚀 启动本地服务..."

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "🔨 构建项目..."
    npm run build
fi

# 启动服务器
echo "✅ 启动服务器..."
npm start
```

使用：
```bash
chmod +x start-local.sh
./start-local.sh
```

### Windows

创建 `start-local.bat`：

```batch
@echo off
echo 🚀 启动本地服务...

if not exist "node_modules" (
    echo 📦 安装依赖...
    call npm install
)

if not exist "dist" (
    echo 🔨 构建项目...
    call npm run build
)

echo ✅ 启动服务器...
call npm start
```

使用：
```cmd
start-local.bat
```

---

## 端口说明

| 模式 | 默认端口 | 修改方法 |
|------|---------|----------|
| 开发模式 | 5173/5174 | 修改 `vite.config.ts` |
| 生产模式 | 3000 | 设置环境变量 `PORT=3000` |
| 预览模式 | 4173 | Vite参数 `--port 4173` |

### 修改端口示例

**开发模式：**
```bash
npm run dev -- --port 8080
```

**生产模式：**
```bash
PORT=8080 npm start
```

**Windows：**
```cmd
set PORT=8080 && npm start
```

---

## 访问地址

### 本地访问
- 开发模式：http://localhost:5174
- 生产模式：http://localhost:3000
- 预览模式：http://localhost:4173

### 局域网访问

开发模式已默认开启局域网访问（之前用 `--host` 参数启动）

生产模式：
```bash
# 默认已绑定 0.0.0.0，可通过局域网IP访问
# 例如：http://192.168.9.200:3000
```

---

## 功能测试

部署成功后，测试以下功能：

### 1. 相似度比对
- 访问：http://localhost:3000/#/
- 点击"加载示例"
- 点击"启动智能比对"
- 查看结果

### 2. 数据Diff
- 访问：http://localhost:3000/#/diff
- 输入两组数据
- 点击"逐行 Diff 对比"

### 3. 数据处理
- 访问：http://localhost:3000/#/process
- 输入数据
- 测试各种处理功能

### 4. 批量AI
- 访问：http://localhost:3000/#/ai-batch
- 配置API（如果有）
- 测试批量请求

### 5. AI对话
- 访问：http://localhost:3000/#/chat
- 配置API（如果有）
- 测试对话功能

---

## 常见问题

### Q1: 端口被占用

**错误：** `Port 3000 is already in use`

**解决：**
```bash
# 查看占用端口的进程
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# 杀死进程或更换端口
PORT=3001 npm start
```

### Q2: 构建失败

**错误：** `Build failed`

**解决：**
```bash
# 清理缓存
rm -rf node_modules dist

# 重新安装
npm install

# 重新构建
npm run build
```

### Q3: 模块找不到

**错误：** `Cannot find module 'xxx'`

**解决：**
```bash
# 重新安装依赖
npm install
```

### Q4: TypeScript错误

**错误：** `TS errors in build`

**解决：**
```bash
# 跳过类型检查（临时）
vite build

# 或修复TypeScript错误
npm run build
```

### Q5: 页面空白

**可能原因：**
- 构建文件不存在
- 路径配置错误
- JavaScript错误

**解决：**
1. 检查浏览器控制台错误
2. 确认 `dist/` 目录存在
3. 重新构建项目

---

## 性能优化

### 1. 构建优化

```bash
# 使用生产模式构建
NODE_ENV=production npm run build
```

### 2. 缓存优化

浏览器会自动缓存静态资源（JS/CSS）

### 3. 内存优化

如果构建时内存不足：
```bash
# 增加Node.js内存限制
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## 开发调试

### 启用调试日志

开发模式自动包含详细日志。

生产模式启用调试：
```bash
DEBUG=* npm start
```

### 浏览器开发工具

- **Vue DevTools**: 安装浏览器扩展
- **Network**: 查看网络请求
- **Console**: 查看JavaScript错误
- **Elements**: 检查DOM结构

---

## 停止服务

### 开发/生产模式
```bash
# Ctrl + C (终端中)
```

### 后台运行的服务
```bash
# 查找进程
ps aux | grep node

# 杀死进程
kill <PID>
```

---

## 下一步

本地部署成功后，可以：

1. **开发新功能**: 使用 `npm run dev`
2. **测试功能**: 测试所有页面功能
3. **部署到服务器**: 参考 `DEPLOY_1PANEL.md`
4. **Docker部署**: 使用 `docker-compose up -d`

---

## 快速命令参考

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果

# 生产
npm start                # 启动生产服务器
npm run start:prod       # 生产模式启动

# 测试
npm test                 # 运行测试
npm run test:watch       # 监听模式测试

# 部署
npm run deploy:prepare   # 准备部署
npm run deploy:1panel    # 1Panel部署准备
```

---

## 系统要求

- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **内存**: >= 2GB
- **磁盘**: >= 500MB

检查版本：
```bash
node --version
npm --version
```

---

## 总结

✅ **最简单**: `npm install && npm run dev`
✅ **生产环境**: `npm install && npm run build && npm start`
✅ **快速预览**: `npm run build && npm run preview`

享受开发！🚀
