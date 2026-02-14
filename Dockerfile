# 使用 Node.js 官方映像檔
FROM node:20-slim AS base
WORKDIR /app

# --- 第一階段：構建前端 ---
FROM base AS frontend-builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- 第二階段：運行環境 ---
FROM base AS runner
# 複製後端程式碼
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server/ ./server/

# 複製前端構建好的靜態檔案 (供後端託管或單獨服務)
COPY --from=frontend-builder /app/dist ./dist

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3001

# 開放後端連接埠
EXPOSE 3001

# 啟動指令 (指向後端進入點)
CMD ["node", "server/index.js"]
