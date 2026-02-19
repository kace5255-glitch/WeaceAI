# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

知靈AI 是一個 AI 輔助網文寫作工具，採用前後端分離架構，專注於提供專業的網文創作體驗。

## 開發環境設置

### 前置需求
- Node.js
- 多個 AI 服務的 API Keys（Google Gemini、DeepSeek、Qwen、Kimi、OpenRouter）
- Supabase 帳號（用於認證和數據存儲）

### 環境變數配置
在根目錄創建 `.env.local` 文件，包含：
```
GEMINI_API_KEY=your_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

後端 `server/` 目錄需要額外的 API keys：
- `GOOGLE_API_KEY`
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `KIMI_API_KEY`
- `OPENROUTER_API_KEY`

### 啟動開發環境

**重要：需要同時運行前端和後端**

1. 安裝依賴：
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. 啟動後端服務器（必須先啟動）：
   ```bash
   cd server
   node index.js
   ```
   後端運行在 `http://localhost:8080`

3. 在另一個終端啟動前端：
   ```bash
   npm run dev
   ```
   前端運行在 `http://localhost:3000`，通過 Vite proxy 轉發 `/api` 請求到後端

### 構建與部署

- 前端構建：`npm run build`（輸出到 `dist/`）
- 部署架構：Vercel（前端）+ Render（後端）
- 詳細部署步驟見 `Deployment_Guide.md`

## 架構設計

### 前後端分離架構

**前端（React + Vite）**
- 主應用：`App.tsx` - 統一管理狀態、認證、AI 生成流程
- 核心組件：
  - `Sidebar` - 章節/分卷管理
  - `Editor` - 富文本編輯器，支持工具欄快捷操作
  - `AssistantPanel` - AI 寫作助手面板（角色、詞彙、設定）
  - `ChapterReviewModal` - 章節簡報/點評顯示（支持結構化點評）
  - `AiReviewModal` - AI 生成內容預覽與接受/拒絕

**後端（Express.js）**
- `server/index.js` - 主服務器，整合多個 AI 服務
- 支持的 AI 模型：
  - Google Gemini (Flash/Pro/2.5)
  - DeepSeek (R1/V3)
  - Qwen (Plus/Max)
  - Kimi (Moonshot)
  - OpenRouter (Claude/GPT-4)
- API 端點：
  - `/api/generate` - 故事內容生成
  - `/api/outline` - 章節大綱生成
  - `/api/critique` - 文章點評（結構化輸出）
  - `/api/briefing` - 章節簡報生成
  - `/api/character` - AI 角色生成
  - `/api/worldview` - 世界觀生成

### 數據流架構

1. **認證層**：Supabase Auth（用戶登入、角色權限）
2. **數據持久化**：`useNovelData` hook 統一管理所有數據的 CRUD 和 Supabase 同步
3. **AI 生成流程**：
   - 用戶觸發 → `App.tsx` 組裝參數 → `geminiService.ts` 調用後端 API → 後端選擇對應 AI 服務 → 返回結果
   - 支持 AbortController 取消生成
   - 生成內容先顯示在 `AiReviewModal`，用戶確認後才寫入章節

### 核心數據結構

- **Volume（分卷）** → **Chapter（章節）**：層級結構
- **Chapter** 包含：
  - `content` - 正文內容
  - `outline` - 章節大綱
  - `briefing` - AI 生成的章節簡報（用於上下文參考）
  - `critique` - AI 點評（帶 contentHash 檢測內容變更）
- **Character**：支持自定義等級體系、陣營、種族
- **Vocabulary**：自定義分類的詞彙庫
- **NovelSettings**：包含世界觀、風格、自定義系統指令

### 智能上下文系統

- **自動簡報生成**：當選擇參考章節但該章節無簡報時，自動調用 AI 生成簡報
- **內容哈希檢測**：點評功能會檢測章節內容是否變更，避免重複生成
- **前情提要構建**：優先使用簡報，其次大綱，最後使用內容片段

## 網文寫作優化規範

本項目針對網文創作進行了專業優化（見 `網文寫作優化更新說明.md`）：

### AI 寫作核心規範（20 條）
- 避免劇情拖沓，增加衝突密度
- 爽點設置：打臉、裝逼、扮豬吃老虎
- 對話直白接地氣
- 章節鉤子：每章結尾必須留懸念
- 邏輯一致性檢查

### AI 點評維度（11 項）
1. 網文基礎：節奏、爽點、懸念、對話、水文檢測
2. 人物塑造：主角形象、配角功能
3. 場景與細節：真實感、設定融入
4. 商業價值：付費意願、讀者黏性
5. 具體修改建議（含示例）

### 大綱生成增強
- 爽點規劃：時機、方式、預期效果
- 場景功能標註：鋪墊/衝突/高潮/緩和
- 節奏控制：字數分配、加快/放慢時機

## 開發偏好設置

根據 `.agent/rules/c.md` 的全域設定：

- **預設語言**：繁體中文（包括文件、註解、commit messages）
- **程式碼本體**：保留原始語言（英文變數名、函數名）
- **Python 開發**：必須使用 `uv` + `.venv`，不使用 base 環境或單獨 pip
- **Git commit**：一律使用繁體中文
- **Agent 產生的文件**：implementation.plan、task.md、walkthrough.md 全部用繁體中文

## 常見開發任務

### 添加新的 AI 模型
1. 在 `server/index.js` 初始化新的 API client
2. 在 `buildSystemPrompt` 函數中添加模型特定的 prompt 格式
3. 在 `/api/generate` 端點的 switch 語句中添加新模型的處理邏輯
4. 更新前端 `AssistantPanel.tsx` 的模型選擇下拉選單

### 修改 AI 生成規範
編輯 `server/index.js` 中的 `buildSystemPrompt` 函數，該函數包含 20 條核心寫作規範

### 調整點評維度
修改 `server/index.js` 中 `/api/critique` 端點的 prompt，包含 11 項點評維度

### 添加新的編輯器快捷操作
1. 在 `types.ts` 的 `EditorActionType` 添加新類型
2. 在 `App.tsx` 的 `handleAiAction` 函數中添加對應的 instructions
3. 在 `Editor.tsx` 的工具欄添加按鈕

## 技術細節

### Diff 分析系統
- `utils/diffAnalyzer.ts` - 使用 diff-match-patch 進行內容對比
- `components/diff/DiffHighlight.tsx` - 可視化顯示修改差異

### 點評緩存機制
- `utils/critiqueCache.ts` - 基於內容哈希的緩存系統
- `utils/contentHash.ts` - SHA-256 內容哈希生成
- `utils/critiqueParser.ts` - 結構化點評解析器

### 結構化點評顯示
- `components/critique/` 目錄包含完整的點評 UI 組件
- 支持評分概覽、問題導航、建議列表、摺疊區塊

## 注意事項

- 後端 `server/index.js` 會嘗試從 `../dist` 提供靜態文件（生產環境）
- Vite proxy 配置在 `vite.config.ts`，開發時將 `/api` 轉發到 `localhost:8080`
- Supabase 認證狀態由 `App.tsx` 統一管理，未登入時顯示 `AuthPage`
- 所有數據操作通過 `useNovelData` hook，自動同步到 Supabase
- AI 生成支持取消操作（AbortController），避免浪費 API 配額
