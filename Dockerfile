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
# 將所有檔案複製進來，確保路徑一致
COPY . .

# 安裝後端生產環境依賴
RUN cd server && npm install --production

# 複製前端構建好的靜態檔案
COPY --from=frontend-builder /app/dist ./dist

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 啟動指令：從根目錄啟動 server/index.js
CMD ["node", "server/index.js"]
