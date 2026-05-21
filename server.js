import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PROXY_URL = process.env.PROXY_URL || ''; // 可选的上游代理

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API 代理路由
app.all('/api/cc-vibe/*', async (req, res) => {
  try {
    const targetPath = req.path.replace('/api/cc-vibe', '');
    const targetUrl = `https://cc-vibe.com${targetPath}`;

    console.log(`[代理] ${req.method} ${targetPath}`);

    // 构建请求选项
    const options = {
      method: req.method,
      hostname: 'cc-vibe.com',
      path: targetPath,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'anthropic-version': '2023-06-01',
      },
    };

    // 如果配置了上游代理，使用它
    if (PROXY_URL) {
      options.agent = new HttpsProxyAgent(PROXY_URL);
      console.log(`[代理] 使用上游代理: ${PROXY_URL}`);
    }

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        console.log(`[代理] 响应状态: ${proxyRes.statusCode}`);
        try {
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch (e) {
          res.status(proxyRes.statusCode).send(data);
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('[代理错误]', error.message);
      res.status(500).json({
        error: 'Proxy error',
        message: error.message
      });
    });

    // 如果有请求体，写入
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      proxyReq.write(JSON.stringify(req.body));
    }

    proxyReq.end();
  } catch (error) {
    console.error('[代理错误]', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📁 静态文件目录: ${path.join(__dirname, 'dist')}`);
  if (PROXY_URL) {
    console.log(`🔗 上游代理: ${PROXY_URL}`);
  }
});
