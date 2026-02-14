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
# 先複製依賴定義
COPY server/package*.json ./server/
# 安裝依賴 (在 server 目錄下)
RUN cd server && npm install --production
# 再複製程式碼 (避免與 node_modules 衝突)
COPY server/ ./server/

# 複製前端構建好的靜態檔案
COPY --from=frontend-builder /app/dist ./dist

# 設定環境變數
ENV NODE_ENV=production
# 移除強制 PORT，讓雲端平台決定
# ENV PORT=3001 

# 啟動指令 (從根目錄執行)
CMD ["node", "server/index.js"]
