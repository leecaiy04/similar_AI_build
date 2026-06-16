# CORS 问题解决方案

## 问题说明

浏览器直接请求 Claude API 会遇到 CORS 跨域限制，导致 "Failed to fetch" 错误。

## 解决方案

使用服务器端代理转发请求，避免 CORS 问题。

---

## 方案一：使用本地 Node.js 服务器（已实现）

### 本地开发/测试

```bash
# 启动本地服务器
PORT=56600 npm start

# 访问
http://localhost:56600
```

**优点：**
- ✅ 已内置 API 代理功能
- ✅ 自动处理 CORS
- ✅ 无需额外配置

**server.js 已包含：**
```javascript
app.post('/api/claude-proxy', async (req, res) => {
  // 转发请求到 Claude API
})
```

---

## 方案二：生产环境部署（需要配置）

如果部署到生产环境（如 `https://similar.222869.xyz:50000`），需要：

### 选项 A：使用 Node.js 服务器

确保生产环境运行的是 `server.js`，不是纯静态托管。

**1Panel 配置：**
```
网站类型：运行时网站 > Node.js
启动文件：server.js
端口：50000
```

### 选项 B：Nginx 反向代理

如果使用 Nginx 托管静态文件，添加代理配置：

```nginx
# 在你的 Nginx 配置中添加
location /api/claude-proxy {
    proxy_pass http://localhost:3000;  # 指向 Node.js 服务器
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# 或者直接在 Nginx 中代理到 Claude API
location /api/claude-proxy {
    # Nginx 需要安装 ngx_http_js_module 或使用 Lua
    # 这个方案较复杂，推荐使用 Node.js
}
```

### 选项 C：Cloudflare Worker（推荐生产环境）

创建 Cloudflare Worker 代理：

```javascript
// worker.js
export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    const { baseUrl, apiKey, model, systemPrompt, prompt } = body;

    const targetUrl = baseUrl.endsWith('/') 
      ? `${baseUrl}v1/messages` 
      : `${baseUrl}/v1/messages`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        system: systemPrompt || '',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
```

部署后修改前端代码，将 `/api/claude-proxy` 改为 Worker URL。

---

## 快速解决方案

### 当前情况分析

你访问的是：`https://similar.222869.xyz:50000`

这个服务器需要运行 `server.js` 才能使用 API 代理功能。

### 立即解决步骤

**方法 1：确认服务器运行 Node.js**

SSH 到服务器检查：

```bash
# 检查端口 50000 运行的是什么
netstat -tulpn | grep 50000

# 如果是 Nginx 静态托管，需要改为 Node.js
# 在 1Panel 中重新配置为 Node.js 网站
```

**方法 2：临时使用本地测试**

```bash
# 在你的电脑上
cd /vol1/1000/code/similar_AI_build
PORT=56600 npm start

# 访问
http://localhost:56600
```

**方法 3：修改代码使用公共代理（不推荐）**

可以临时修改前端代码直接请求 API（会有 CORS 问题）：

```typescript
// 在 claudeAdapter.ts 中添加 mode: 'no-cors'
const response = await fetchImpl(url, {
  method: 'POST',
  mode: 'no-cors',  // 添加这行
  // ...
});
```

但这样会导致无法读取响应内容。

---

## 推荐方案

### 开发/测试环境
使用本地 Node.js 服务器（当前已实现）

### 生产环境
1. **最简单**：1Panel 配置为 Node.js 网站，运行 server.js
2. **最稳定**：Cloudflare Worker 代理
3. **最灵活**：Nginx + Node.js 代理

---

## 检查清单

当前部署检查：

- [ ] 服务器运行的是 `server.js` 还是静态文件？
- [ ] 端口 50000 是否正确配置？
- [ ] 是否可以访问 `https://similar.222869.xyz:50000/api/claude-proxy`？
- [ ] Node.js 版本是否 >= 20？

测试 API 代理：

```bash
# 测试代理是否工作
curl -X POST https://similar.222869.xyz:50000/api/claude-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://cc-vibe.com",
    "apiKey": "llllllllllllllll",
    "model": "claude-opus-4-7",
    "prompt": "Hello"
  }'
```

如果返回错误或 404，说明服务器没有运行 `server.js`。

---

## 总结

**CORS 问题的根本原因：**
浏览器安全策略阻止跨域请求

**解决方案：**
服务器端代理转发请求

**你的当前问题：**
生产服务器 `https://similar.222869.xyz:50000` 可能没有运行包含代理功能的 `server.js`

**立即行动：**
检查并确保生产服务器运行的是 Node.js 应用（server.js），而不是纯静态文件托管。
