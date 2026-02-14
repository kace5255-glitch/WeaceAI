# 使用完整的 Node.js 官方映像檔
FROM node:20 AS builder
WORKDIR /app

# 複製依賴定義
COPY package*.json ./

# 強制安裝開發依賴 (即使 Zeabur 預設注入了 NODE_ENV=production)
RUN npm install --include=dev

# 複製源碼
COPY . .
# 執行構建
RUN npm run build

# --- 第二階段：運行環境 ---
FROM node:20-slim AS runner
WORKDIR /app

# 複製構建好的前端檔案
COPY --from=builder /app/dist ./dist

# 複製全體檔案 (包含 server 資料夾)
COPY . .

# 安裝後端所需的生產環境依賴
RUN cd server && npm install --production

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 啟動指令
CMD ["node", "server/index.js"]
