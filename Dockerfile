# 使用完整的 Node.js 官方映像檔 (避免 slim 版本缺少工具)
FROM node:20 AS builder
WORKDIR /app

# 複製根目錄的依賴並安裝 (包含 Vite 等構建工具)
COPY package*.json ./
RUN npm install

# 複製源碼並執行前端構建 (排除 node_modules)
COPY . .
# 再次確保 node_modules乾淨
RUN npm ci || npm install 
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
