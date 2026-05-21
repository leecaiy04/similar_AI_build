FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 复制 node_modules（从本地已安装的）
COPY node_modules ./node_modules

# 复制已构建的前端文件
COPY dist ./dist

# 复制服务器文件
COPY server.js ./

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务
CMD ["node", "server.js"]
