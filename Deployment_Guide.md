# MuseAI 雲端部署手冊 (Step-by-Step)

本手冊將引導您將 MuseAI 部署到雲端服務 (Vercel + Render)。

## 第一階段：GitHub 準備作業
1. **建立專案**：在 GitHub 建立一個新的私有倉庫 (Private Repository)。
2. **忽略環境檔**：請確保 `.gitignore` 包含 `.env.local`，我們不應該將金鑰上傳至 GitHub。
3. **上傳程式碼**：將本地 `wiritng` 資料夾的所有檔案推送到 GitHub 倉庫。
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

## 第二階段：後端部署 (Render)
1. 登入 [Render](https://render.com/) 並新增一個 **Web Service**。
2. 連接您的 GitHub 倉庫。
3. **設定參數**：
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. **環境變數 (Environment Variables)**：
   點擊 "Advanced" -> "Add Environment Variable"，輸入以下所有內容：
   - `GOOGLE_API_KEY`: (您的 Google API Key)
   - `OPENROUTER_API_KEY`: (您的 OpenRouter API Key)
   - `DEEPSEEK_API_KEY`: (您的 DeepSeek Key)
   - `QWEN_API_KEY`: (您的 Qwen Key)
   - `KIMI_API_KEY`: (您的 Kimi Key)
   - `VITE_SUPABASE_URL`: (您的 Supabase URL)
   - `VITE_SUPABASE_ANON_KEY`: (您的 Supabase Anon Key)
5. **備註**：部署成功後，記下您的後端網址 (例如: `https://muse-api.onrender.com`)。

## 第三階段：前端部署 (Vercel)
1. 登入 [Vercel](https://vercel.com/) 並匯入您的 GitHub 倉庫。
2. **Framework Preset**: 選擇 `Vite`。
3. **環境變數 (Environment Variables)**：
   在 Vercel 設定介面輸入：
   - `VITE_SUPABASE_URL`: (同上)
   - `VITE_SUPABASE_ANON_KEY`: (同上)
   - `VITE_API_BASE_URL`: **輸入您在第二階段得到的 Render 後端網址** (記得加上 `/api`，例如 `https://muse-api.onrender.com/api`)
4. 點擊 **Deploy**。

## 部署完成
現在，您的應用程式應該可以透過 Vercel 提供的網址公開存取了！
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://your-api.onrender.com`
