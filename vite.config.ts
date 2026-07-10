import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { HttpsProxyAgent } from 'https-proxy-agent'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/element-plus/')) return 'vendor-element-plus'
          if (id.includes('/@vue/') || id.includes('/vue/') || id.includes('/vue-router/')) return 'vendor-vue'
          if (id.includes('/read-excel-file/') || id.includes('/fflate/') || id.includes('/unzipper-esm/') || id.includes('/@xmldom/')) return 'vendor-excel'
          return 'vendor'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 56600,
    proxy: {
      '/api/cc-vibe': {
        target: 'https://cc-vibe.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cc-vibe/, ''),
        secure: false,
        agent: new HttpsProxyAgent('http://192.168.9.2:1082'),
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('代理请求:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('代理响应:', proxyRes.statusCode, req.url);
          });
          proxy.on('error', (err) => {
            console.error('代理错误:', err.message);
          });
        },
      },
    },
  },
})
