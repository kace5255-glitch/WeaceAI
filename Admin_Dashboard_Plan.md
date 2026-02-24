# 知靈AI 平台管理員後台功能規劃

## 一、儀表板（Dashboard）

### 1.1 平台總覽
- 註冊用戶總數 / 日活躍用戶數（DAU）/ 月活躍用戶數（MAU）
- 小說總數 / 章節總數 / 今日新增內容量
- AI API 調用總次數（今日 / 本週 / 本月）
- 系統健康狀態（後端服務、Supabase 連線、各 AI 服務可用性）

### 1.2 趨勢圖表
- 用戶增長趨勢（日/週/月）
- AI 使用量趨勢（按端點分類：generate / outline / critique / briefing / chat）
- 內容產出趨勢（新增章節數、字數統計）

---

## 二、用戶管理

### 2.1 用戶列表
- 搜尋與篩選：依 email、username、註冊日期、活躍狀態
- 用戶資訊顯示：user_id、email、username、display_name、註冊時間、最後活躍時間
- 用戶擁有的小說數量、章節數量

### 2.2 用戶詳情
- 完整個人資料檢視（profile 資訊）
- 該用戶的所有小說列表
- AI 使用紀錄（調用次數、使用的模型分佈）
- 帳號操作：停用 / 啟用帳號、重設密碼連結

### 2.3 角色與權限
- 角色定義：
  - `admin` — 管理員（完整後台存取權限）
  - `senior_tester` — 高級測試人員（完整功能存取 + 測試回報權限）
  - `tester` — 普通測試人員（基本功能測試 + Bug 回報）
  - `vip` — VIP 會員（付費高級功能）⚠️ 暫停實作
  - `pro` — Pro 會員（基礎付費功能）⚠️ 暫停實作
  - `user` — 免費用戶（基本功能）
- 權限設定：指定 / 移除管理員身份、指派測試人員角色
- 未來擴展：審核員（moderator）、付費會員等級（待會員系統啟動後實作）

### 2.4 測試人員角色說明

#### 高級測試人員（senior_tester）
- 存取所有 AI 功能（無每日次數限制）
- 可查看系統狀態面板（唯讀，非完整後台）
- 可提交 Bug 回報與功能建議
- 可查看其他測試人員的回報紀錄

#### 普通測試人員（tester）
- 存取所有基本 AI 功能（放寬限制但非無限）
- 可提交 Bug 回報
- 無法查看系統狀態或其他人的回報

### 2.5 角色管理 UI（AdminDashboard 子模組）

管理員可在後台直接管理用戶角色，無需手動執行 SQL。

#### 用戶列表頁
- 顯示所有用戶：暱稱、email、當前角色、註冊時間
- 搜尋：依 email 或 username 搜尋
- 篩選：依角色篩選（全部 / admin / senior_tester / tester / user）
- 每行顯示角色下拉選單，admin 可即時切換

#### 角色切換流程
1. Admin 在用戶列表選擇目標用戶的角色下拉選單
2. 選擇新角色（user / tester / senior_tester）
3. 彈出確認對話框：「確定將 xxx 的角色從 user 改為 tester？」
4. 確認後呼叫 `PUT /api/admin/users/:userId/role`
5. 後端驗證 admin 身份後更新 `user_profiles.role`
6. 前端即時更新列表顯示

#### 安全限制
- 不能透過 UI 將自己降級（防止鎖死）
- 不能透過 UI 指派 admin 角色（admin 只能透過 SQL 指派，防止權限擴散）
- 所有角色變更記錄到 `admin_audit_logs`

#### 後端 API
```
PUT /api/admin/users/:userId/role
Body: { "role": "tester" | "senior_tester" | "user" }
Response: { "success": true, "user": { ... } }

GET /api/admin/users?search=xxx&role=tester&page=1&limit=20
Response: { "users": [...], "total": 100, "page": 1 }
```

---

## 三、內容管理

### 3.1 小說總覽
- 小說列表：標題、作者、類型（genre）、章節數、建立時間、最後更新
- 搜尋與篩選：依標題、作者、類型、建立日期
- 內容統計：總字數、章節數、分卷數

### 3.2 內容審核（未來擴展）
- 標記 / 檢舉內容的審核佇列
- 內容違規處理：警告、隱藏、刪除
- 審核紀錄與操作日誌

---

## 四、AI 服務管理

### 4.1 模型狀態監控
- 各 AI 服務即時狀態（Google Gemini、DeepSeek、Qwen、Kimi、OpenRouter）
- 各模型的回應時間、成功率、錯誤率
- API Key 有效性檢查

### 4.2 使用量統計
- 按模型分類的調用次數統計
- 按端點分類的調用次數（generate / outline / critique / briefing / character / worldview / chat）
- 按用戶分類的使用量排行
- Token 消耗統計（input tokens / output tokens）

### 4.3 速率限制管理
- 當前速率限制設定（目前：100 次 / 15 分鐘 / IP）
- 調整全域速率限制
- 針對特定用戶的自訂限制（白名單 / 黑名單）
- 被限流的請求紀錄

### 4.4 模型配置
- 各端點的預設模型設定
- 模型 fallback 順序配置
- 新增 / 移除可用模型
- 各模型的 timeout 設定

---

## 五、聊天系統管理

### 5.1 聊天統計
- 聊天 session 總數、訊息總數
- 各 persona 使用分佈（editor / muse / reader / plot_architect）
- 各 context_mode 使用分佈
- 平均對話長度

### 5.2 聊天紀錄查詢
- 依用戶、小說、時間範圍搜尋聊天紀錄
- 檢視對話內容（僅限必要的問題排查場景）
- Token 消耗明細

---

## 六、系統設定

### 6.1 AI 寫作規範管理
- 檢視 / 編輯 20 條核心寫作規範（目前寫死在 buildSystemPrompt 中）
- 檢視 / 編輯 11 項點評維度
- 各 persona 的 system prompt 管理
- 規範版本紀錄與回滾

### 6.2 平台參數設定
- 全域 API timeout 設定
- 檔案大小限制
- 用戶預設配額設定

### 6.3 環境變數管理
- API Key 狀態檢視（不顯示完整 key，僅顯示是否有效）
- Supabase 連線狀態
- 各服務端點配置

---

## 七、日誌與監控

### 7.1 操作日誌
- 管理員操作紀錄（誰在什麼時間做了什麼）
- 用戶登入 / 登出紀錄
- 重要操作追蹤（刪除內容、帳號停用等）

### 7.2 錯誤日誌
- AI API 調用失敗紀錄（錯誤類型、模型、時間）
- 後端服務錯誤紀錄
- 前端錯誤回報（如有整合 error tracking）

### 7.3 效能監控
- API 回應時間統計
- 資料庫查詢效能
- 記憶體 / CPU 使用狀況（如部署在 Render）

---

## 八、資料管理

### 8.1 資料庫維護
- 資料表統計（各表的資料筆數、儲存空間）
- 孤立資料清理（無主的 chapters、orphaned records）
- 資料匯出功能（CSV / JSON）

### 8.2 備份管理
- 手動觸發備份
- 備份排程設定
- 備份還原操作

---

## 九、通知與公告

### 9.1 系統公告
- 發布平台公告（維護通知、新功能上線、版本更新）
- 公告排程（定時發布 / 到期自動下架）
- 公告歷史紀錄

### 9.2 用戶通知（未來擴展）
- 針對特定用戶發送通知
- 群發通知（全體 / 特定角色）

---

## 十、付費會員系統 ⚠️ 暫停實作

> 付費會員的功能差異限制（§10.2）和會員管理後台（§10.3）暫停開發，待核心功能和測試體系穩定後再啟動。
> 目前優先實作：角色系統基礎（role 欄位）+ 測試人員角色。

### 10.1 會員等級定義

| 等級 | role 值 | 說明 | 狀態 |
|------|---------|------|------|
| 管理員 | `admin` | 後台管理權限 | ✅ 實作中 |
| 高級測試人員 | `senior_tester` | 完整功能 + 測試回報 | ✅ 實作中 |
| 普通測試人員 | `tester` | 基本測試 + Bug 回報 | ✅ 實作中 |
| VIP 會員 | `vip` | 最高級付費，完整功能 | ⏸️ 暫停 |
| Pro 會員 | `pro` | 基礎付費，放寬限制 | ⏸️ 暫停 |
| 免費用戶 | `user` | 基本功能，有使用限制 | ✅ 預設 |

### 10.2 各等級功能差異 ⏸️ 暫停實作

| 功能 | Free | Pro | VIP |
|------|------|-----|-----|
| AI 生成（每日次數） | 20 次 | 100 次 | 無限制 |
| AI 點評 | 5 次/日 | 30 次/日 | 無限制 |
| AI 聊天 | 10 次/日 | 50 次/日 | 無限制 |
| 小說數量上限 | 3 本 | 10 本 | 無限制 |
| 章節匯出 | TXT | TXT / DOCX | TXT / DOCX / EPUB |
| 進階 AI 模型 | ✗ | 部分 | 全部 |
| 世界觀 / 角色 AI 生成 | ✗ | ✓ | ✓ |
| 大綱 AI 生成 | 基礎 | 進階 | 完整 |
| 優先客服 | ✗ | ✗ | ✓ |
| 自訂 AI 寫作風格 | ✗ | ✗ | ✓ |

### 10.3 會員管理（後台功能）⏸️ 暫停實作
- 會員列表：依等級篩選、到期日排序
- 手動升級 / 降級用戶等級
- 會員到期自動降級機制
- 會員統計：各等級人數、轉換率、續費率

### 10.4 資料庫擴展
```sql
-- user_profiles 新增欄位
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 10.5 前端角色顯示
```typescript
// HomePage.tsx getRoleBadge
const getRoleBadge = (role: string) => {
  if (role === 'admin')         return { label: 'Admin', color: 'bg-red-500/20 text-red-400' };
  if (role === 'senior_tester') return { label: 'Sr.Tester', color: 'bg-emerald-500/20 text-emerald-400' };
  if (role === 'tester')        return { label: 'Tester', color: 'bg-teal-500/20 text-teal-400' };
  if (role === 'vip')           return { label: 'VIP', color: 'bg-amber-500/20 text-amber-400' };
  if (role === 'pro')           return { label: 'Pro', color: 'bg-violet-500/20 text-violet-400' };
  return { label: 'Free', color: 'bg-slate-500/20 text-slate-400' };
};

// Sidebar.tsx 角色顯示
userRole === 'admin' ? 'Admin'
  : userRole === 'senior_tester' ? 'Sr. Tester'
  : userRole === 'tester' ? 'Tester'
  : userRole === 'vip' ? 'VIP'
  : userRole === 'pro' ? 'Pro Plan'
  : 'Free Plan'
```

---

## 十一、管理員後台入口實作計畫

### 11.1 前置修復：fetchUserRole Bug

目前 `App.tsx:42-56` 的 `fetchUserRole` 查的是 `profiles` 表，但實際資料在 `user_profiles` 表。需修正：
- `.from('profiles')` → `.from('user_profiles')`
- `.eq('id', userId)` → `.eq('user_id', userId)`

### 11.2 入口方式：HomePage 側邊欄

在 `currentView` state 新增 `'admin'` 選項：
```typescript
const [currentView, setCurrentView] = useState<'home' | 'editor' | 'admin'>('home');
```

HomePage navItems 動態加入（僅 admin 可見）：
```typescript
{ id: 'admin', icon: Shield, label: '管理後台' }
```

App.tsx 新增渲染邏輯：
```typescript
if (currentView === 'admin' && userRole === 'admin') {
  return <AdminDashboard onBack={() => setCurrentView('home')} />;
}
```

### 11.3 AdminDashboard 骨架元件

新增 `components/AdminDashboard.tsx`：
- 頂部導航列（含返回主頁按鈕）
- 左側選單（對應本文件各模組）
- 主內容區顯示 placeholder
- 預設載入「用戶管理」子模組

### 11.3.1 用戶角色管理子模組

新增 `components/admin/UserManagement.tsx`：
- 用戶列表（分頁、搜尋、角色篩選）
- 角色下拉選單（user / tester / senior_tester）
- 確認對話框
- 呼叫 `PUT /api/admin/users/:userId/role`

### 11.4 後端 admin 中介層 + API

`server/index.js` 新增：
```javascript
// middleware
const requireAdmin = async (req, res, next) => {
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', req.user.id)
    .single();
  if (data?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
app.use('/api/admin/*', requireAdmin);

// 用戶列表
app.get('/api/admin/users', ...);

// 角色變更
app.put('/api/admin/users/:userId/role', ...);
```

### 11.5 涉及檔案

| 檔案 | 動作 |
|------|------|
| `App.tsx` | 修改（fetchUserRole、currentView、admin 渲染） |
| `components/HomePage.tsx` | 修改（新增 admin nav item + onOpenAdmin prop + tester badge） |
| `components/Sidebar.tsx` | 修改（新增 tester 角色顯示） |
| `components/AdminDashboard.tsx` | 新建（骨架元件 + 左側選單） |
| `components/admin/UserManagement.tsx` | 新建（用戶列表 + 角色管理 UI） |
| `server/index.js` | 修改（requireAdmin middleware + GET/PUT admin API） |
| `supabase_add_role.sql` | 新建（migration SQL，含 role + is_active 欄位） |

### 11.6 驗證方式

1. 在 Supabase SQL Editor 執行 migration SQL
2. 手動設定帳號角色：
   - `UPDATE user_profiles SET role = 'admin' WHERE email = 'your-admin-email';`
   - `UPDATE user_profiles SET role = 'senior_tester' WHERE email = 'your-sr-tester-email';`
   - `UPDATE user_profiles SET role = 'tester' WHERE email = 'your-tester-email';`
3. 登入 admin 帳號確認側邊欄出現「管理後台」
4. 點擊進入確認 AdminDashboard 正常顯示
5. 非 admin 帳號確認看不到後台入口
6. 測試各角色 badge 正確顯示（Admin / Sr.Tester / Tester / Free）

---

## 十二、實作優先級建議

### P0 — 核心必備
1. **管理員後台入口**（§11：fetchUserRole 修復、currentView 擴展、AdminDashboard 骨架）
2. **角色系統完善**（§2.3 + §10：role 欄位、admin / senior_tester / tester / user 角色）
3. **用戶角色管理 UI**（§2.5：用戶列表 + 角色下拉切換 + 後端 API）
4. **測試人員角色 badge 顯示**（§10.5：HomePage + Sidebar）
5. 儀表板總覽（用戶數、小說數、API 調用量）
6. AI 服務狀態監控
7. 錯誤日誌檢視

### P1 — 重要功能
8. AI 使用量統計與圖表
9. 速率限制管理
10. 操作日誌
11. 小說內容總覽
12. 系統公告

### P2 — 進階功能
13. AI 寫作規範線上編輯
14. 聊天系統統計
15. 資料庫維護工具
16. 效能監控

### P3 — 未來擴展（暫停中）
17. **付費會員功能差異實作**（§10.2：各等級限制邏輯）⏸️
18. **會員管理後台**（§10.3：升降級、到期管理）⏸️
19. 內容審核系統
20. 付費金流整合（Stripe / 綠界等）
21. 備份管理
22. 進階通知系統

---

## 技術備註

### 需要新增的資料庫結構
- `user_profiles` 新增欄位：`role`（角色）、`is_active`（帳號啟用狀態）、`subscription_start`、`subscription_end`
- `admin_audit_logs` 表：管理員操作日誌
- `system_announcements` 表：系統公告
- `api_usage_logs` 表：API 調用紀錄（目前 chat_messages 已有部分紀錄）

### 後端需要新增
- 管理員認證中介層（`requireAdmin` middleware）
- `/api/admin/*` 系列端點
- API 調用計數與紀錄機制
- 角色權限檢查 helper（用於限制 Free/Pro/VIP 功能差異）

### 前端需要新增
- 管理員後台入口（HomePage 側邊欄，僅 admin 可見）
- AdminDashboard 元件（骨架 + 各子模組）
- VIP 角色 badge 顯示（HomePage + Sidebar）
- 圖表元件（推薦 Recharts，與現有 React 生態相容）
