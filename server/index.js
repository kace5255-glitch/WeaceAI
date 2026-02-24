require('dotenv').config({ path: '../.env.local' });
require('dotenv').config(); // also load server/.env
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');
const { matchGenre, getUniversalRulesText, getGenreRulesText, getStyleRulesText, getAntiAIRulesText, getOutlineExtra, getCritiqueExtra } = require('./writingRules');
const { extractChapterMemory, saveExtractedMemory, getSmartContext } = require('./memoryEngine');

const app = express();
const port = process.env.PORT || 8080; // Zeabur default is often 8080, fallback to 8080

console.log(`Starting server with NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Port detected: ${process.env.PORT} (using ${port})`);

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve Static Files from Vite build
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// API Root
app.get('/api', (req, res) => {
    res.json({ status: 'running', message: '幻靈寫作AI Backend v2 is running.' });
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: "Too many requests, please try again later." }
});
app.use('/api/', limiter);

const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;
if (!apiKey) {
    console.warn("CRITICAL WARNING: GOOGLE_API_KEY not found. AI generation will fail.");
} else {
    console.log("GOOGLE_API_KEY found successfully.");
}
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client (Backend)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
} else if (supabaseUrl && supabaseAnonKey) {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Using anon key — admin write operations may fail due to RLS.");
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("WARNING: Supabase URL or keys missing. Auth features will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Initialize DeepSeek (OpenAI compatible API)
const OpenAI = require('openai');
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
let deepseek;
if (deepseekApiKey) {
    deepseek = new OpenAI({
        apiKey: deepseekApiKey,
        baseURL: 'https://api.deepseek.com'
    });
}

// Initialize Qwen (DashScope compatible API)
const qwenApiKey = process.env.QWEN_API_KEY;
let qwen;
if (qwenApiKey) {
    qwen = new OpenAI({
        apiKey: qwenApiKey,
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    });
}

// Initialize Claude (OpenAI compatible API)
const claudeApiKey = process.env.CLAUDE_API_KEY;
let claude;
if (claudeApiKey) {
    claude = new OpenAI({
        apiKey: claudeApiKey,
        baseURL: process.env.CLAUDE_BASE_URL || 'https://api.penguinsaichat.dpdns.org/v1'
    });
}

// Authentication Middleware
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization Header" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "Invalid Token Format" });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: "Invalid or Expired Token" });
    }

    // Attach user to request for downstream use
    req.user = user;
    next();
};

// Apply Auth Middleware to API routes
app.use('/api/', authenticateUser);

// ==================== 點數系統 ====================
const POINTS_COST = {
    generate: 10,    // 內容生成
    outline: 5,      // 大綱生成
    critique: 8,     // 文章點評
    briefing: 5,     // 章節簡報
    character: 3,    // 角色生成
    worldview: 5,    // 世界觀生成
    'locate-issues': 5, // 問題定位
    'update-character': 3, // 角色更新
    'wizard/levels': 3,
    'wizard/races': 3,
    'wizard/factions': 3,
    'wizard/character': 3,
    'wizard/goldenfinger': 3,
    'wizard/title': 2,
    'wizard/brief': 5,
    'ai-taste-check': 3,
    'ai-taste-rewrite': 8,
    'chat': 3,
    'chat_image': 5,
};

// 點數交易記錄
async function logPointsTransaction(userId, type, amount, source, description = '') {
    try {
        await supabase.from('points_transactions').insert({
            user_id: userId,
            type,       // 'earn' | 'spend'
            amount,     // 正數
            source,     // 'ai_generate' | 'invite_reward' | 'admin_adjust' | ...
            description,
        });
    } catch (e) {
        console.error('Failed to log points transaction:', e);
    }
}

// 檢查並扣除點數（admin 免費）— 扣除順序：daily → task → permanent
async function checkAndDeductPoints(userId, action) {
    // 查詢用戶角色和三類點數
    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, daily_points, task_points, permanent_points')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw new Error('無法查詢用戶資料');

    // admin 免費
    if (profile?.role === 'admin') return { free: true, cost: 0, remaining: -1 };

    const cost = POINTS_COST[action] || 5;
    let daily = profile?.daily_points || 0;
    let task = profile?.task_points || 0;
    let permanent = profile?.permanent_points || 0;
    const total = daily + task + permanent;

    if (total < cost) {
        return { insufficient: true, cost, current: total };
    }

    // 按順序扣除：daily → task → permanent
    let remaining = cost;
    if (daily > 0) {
        const deduct = Math.min(daily, remaining);
        daily -= deduct;
        remaining -= deduct;
    }
    if (remaining > 0 && task > 0) {
        const deduct = Math.min(task, remaining);
        task -= deduct;
        remaining -= deduct;
    }
    if (remaining > 0 && permanent > 0) {
        const deduct = Math.min(permanent, remaining);
        permanent -= deduct;
        remaining -= deduct;
    }

    // 更新三類點數
    const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ daily_points: daily, task_points: task, permanent_points: permanent })
        .eq('user_id', userId);

    if (updateErr) throw new Error('扣除點數失敗');

    // 記錄交易
    const actionLabels = {
        generate: 'AI 生成', outline: '大綱生成', critique: '文章點評',
        briefing: '章節簡報', character: '角色生成', worldview: '世界觀生成',
        'locate-issues': '問題定位', 'update-character': '角色更新',
        'wizard/levels': '等級體系', 'wizard/races': '種族生成',
        'wizard/factions': '陣營生成', 'wizard/title': '書名生成',
    };
    await logPointsTransaction(userId, 'spend', cost, action, actionLabels[action] || action);

    return { success: true, cost, remaining: daily + task + permanent };
}

// GET /api/user/points-cost - 查詢各操作點數消耗
app.get('/api/user/points-cost', (req, res) => {
    res.json({ costs: POINTS_COST });
});

// --- Chat Routes (New AI ChatBox) ---
// Pass supabase client to request for use in routes
app.use('/api/chat', (req, res, next) => {
    req.supabase = supabase;
    next();
}, require('./routes/chat'));

// 建構 System Prompt — AI 的角色人設與寫作規範（動態規則注入）
const buildSystemPrompt = (params) => {
    const { settings } = params;
    const defaultPersona = `你是一位擁有二十年經驗的頂尖華語小說家，精通敘事節奏、人物心理刻畫與場景構建。
你的文風兼具文學性與可讀性，能讓讀者一旦開始閱讀就欲罷不能。
你深諳「展示而非告知(Show, Don't Tell)」的敘事原則，善用衝突、懸念與情感張力驅動故事。`;
    const systemPersona = settings.systemPersona && settings.systemPersona.trim() !== '' ? settings.systemPersona : defaultPersona;

    // 動態匹配類型規則
    const genreCategory = matchGenre(settings.genre);
    const universalRules = getUniversalRulesText();
    const genreRules = genreCategory ? getGenreRulesText(genreCategory) : '';

    // 寫作風格規則（預設風格 or 自定義）
    const isPresetStyle = settings.writingStyleMode !== 'custom';
    const styleRules = isPresetStyle ? getStyleRulesText(settings.style) : '';
    const customStyleText = !isPresetStyle && settings.style ? `\n【自定義寫作風格】\n${settings.style}` : '';

    // 去AI味規則（永遠注入）
    const antiAIRules = getAntiAIRulesText();

    return `${systemPersona}

【你正在創作的小說】
- 標題: 《${settings.title}》
- 類型: ${settings.genre}
- 風格: ${settings.style || "正統小說風格"}
- 基調: ${settings.tone}
${settings.worldview ? `
【世界觀與背景設定】
以下是這部小說的世界觀核心設定，你在寫作時必須嚴格遵守這些規則與設定，確保故事的一致性：
${settings.worldview}
` : ''}
【專業寫作規範 — 核心創作引擎】
${universalRules}
${genreRules ? `\n【${genreCategory}專屬寫作規範】\n${genreRules}` : ''}
${styleRules}${customStyleText}

【去AI味寫作規範 — 基於69本網文原文研究，最高優先級】
${antiAIRules}`;
};

// 建構 User Prompt — 具體的寫作任務與上下文
const buildUserPrompt = (params) => {
    const { chapter, characters, vocabularies, settings, instructions, requirements, relations, previousContext, memoryContext } = params;

    // 角色區塊：靜態資料 + 動態當前狀態合併
    const characterContext = characters && characters.length > 0
        ? characters.map(c => {
            let line = `> **${c.name}** (${c.gender === 'male' ? '男' : c.gender === 'female' ? '女' : '其他'} | ${c.role})
     - 性格特徵: ${c.traits}
     - 當前狀態: ${c.status}
     - 等級/能力: ${c.level || '未知'}`;
            // 動態狀態（由記憶系統回寫）
            const dynamic = [];
            if (c.currentLocation) dynamic.push(`位置: ${c.currentLocation}`);
            if (c.currentPowerLevel) dynamic.push(`實力: ${c.currentPowerLevel}`);
            if (c.currentEmotionalState) dynamic.push(`情緒: ${c.currentEmotionalState}`);
            if (c.currentInjuries) dynamic.push(`傷勢: ${c.currentInjuries}`);
            if (c.currentPossessions) dynamic.push(`持有: ${c.currentPossessions}`);
            if (dynamic.length > 0) {
                line += `\n     - 最新動態: ${dynamic.join('，')}`;
            }
            return line;
        }).join('\n')
        : "無特定登場角色，請根據上下文自由發揮。";

    const vocabContext = vocabularies && vocabularies.length > 0
        ? vocabularies.map(v => `> **${v.name}** [${v.category}]: ${v.description}`).join('\n')
        : "無特定詞條";

    const previousContentText = chapter.content ? chapter.content.slice(-6000) : "(本章尚未有內容，這是開頭)";

    // 記憶區塊（由 /api/memory/context 提供）
    let memoryBlock = '';
    if (memoryContext && (memoryContext.unresolvedForeshadow || memoryContext.relevantEvents || memoryContext.characterEvents)) {
        const parts = [];
        if (memoryContext.relevantEvents) parts.push(`【近期重要事件】\n${memoryContext.relevantEvents}`);
        if (memoryContext.characterEvents) parts.push(`【相關角色事件】\n${memoryContext.characterEvents}`);
        if (memoryContext.unresolvedForeshadow) parts.push(`【未回收伏筆】\n${memoryContext.unresolvedForeshadow}`);
        memoryBlock = `\n═══ 記憶系統（僅供參考，不要主動展開） ═══
以下資訊用於保持一致性，不是寫作指令。
- 優先遵守用戶的大綱和指令
- 不要主動回收伏筆，除非大綱明確要求
- 記憶中的角色狀態用於避免矛盾，不是劇情方向

${parts.join('\n\n')}
═══ 記憶結束 ═══\n`;
    }

    return `【本章環境與場景氛圍】
${settings.background || "請根據劇情自動構建場景，注重氛圍渲染與情景交融。"}

【登場角色檔案】
請務必還原角色的性格、說話語氣與行為邏輯，讓每個人物「活」起來：
${characterContext}

【相關專有名詞與世界觀設定】
在行文中自然融入以下設定，讓讀者在不知不覺中理解世界觀，禁止生硬的百科式解釋：
${vocabContext}
${memoryBlock}
【前情回顧 — 劇情記憶】
以下是之前章節的劇情摘要，請確保新寫的內容與前文邏輯連貫、情感延續：
${previousContext || "無前情提要。"}

【特殊指令 / 角色關係變動】
${relations || "無特殊變動"}

【當前章節：${chapter.title}】
已寫內容（請從此處自然銜接）：
${previousContentText}

【本次寫作任務】
${instructions}

【額外寫作要求】
${requirements || "無特殊要求，請保持流暢自然的敘事節奏。"}
- [重要] 每個段落請務必以兩個全形空格（　　）開頭。

【強制輸出格式】
你的輸出必須嚴格按照以下格式，不可省略：
第一行：【章節標題：XX】（2-8個字，根據本章劇情核心取一個吸引人的標題）
第二行：空行
第三行起：正文內容

範例：
【章節標題：血戰長街】

　　夜色如墨，刀光乍現……`;
};

// 向後兼容：合併版 prompt（用於不支援 system 角色的場景）
const buildPrompt = (params) => {
    return buildSystemPrompt(params) + '\n\n---\n\n' + buildUserPrompt(params);
};

const getGoogleModelName = (modelSelection) => {
    const m = (modelSelection || '').toLowerCase();
    if (m.includes('pro')) return 'gemini-2.5-pro-preview-06-05';
    if (m.includes('2.5')) return 'gemini-2.5-flash';
    return 'gemini-2.5-flash';
};

app.post('/api/generate', async (req, res) => {
    try {
        // 點數檢查
        const pointsResult = await checkAndDeductPoints(req.user.id, 'generate');
        if (pointsResult.insufficient) {
            return res.status(402).json({ error: `點數不足，需要 ${pointsResult.cost} 點，目前剩餘 ${pointsResult.current} 點`, pointsRequired: pointsResult.cost, pointsCurrent: pointsResult.current });
        }

        const { model: modelSelection, temperature: reqTemperature } = req.body;
        const systemPrompt = buildSystemPrompt(req.body);
        const userPrompt = buildUserPrompt(req.body);
        const combinedPrompt = buildPrompt(req.body);
        const temperature = typeof reqTemperature === 'number' ? reqTemperature : 0.9;
        let content = "";

        if (modelSelection.startsWith('Google')) {
            const googleModel = genAI.getGenerativeModel({
                model: getGoogleModelName(modelSelection),
                systemInstruction: systemPrompt
            });
            const result = await googleModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: temperature }
            });
            content = result.response.text();
        } else if (modelSelection === 'DeepSeek R1' || modelSelection === 'DeepSeek V3.2') {
            const response = await claude.chat.completions.create({
                model: 'claude-sonnet-4-6',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection.startsWith('Qwen')) {
            if (!qwen) throw new Error("Qwen API Key not configured.");
            const qModel = modelSelection.includes('Max') ? 'qwen-max' : 'qwen-plus';
            const response = await qwen.chat.completions.create({
                model: qModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'Claude Sonnet') {
            const response = await claude.chat.completions.create({
                model: 'claude-sonnet-4-6',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'Claude Opus') {
            const response = await claude.chat.completions.create({
                model: 'claude-opus-4-6',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: temperature
            });
            content = response.choices[0].message.content;
        } else {
            throw new Error(`Unsupported model: ${modelSelection}`);
        }

        res.json({ content });
    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ═══ 世界觀生成端點 ═══
app.post('/api/worldview', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'worldview');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { prompt, model: modelSelection = 'Google Flash' } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ error: '請提供世界觀描述提示' });
        }

        const language = req.body.language || '繁體中文';
        const count = req.body.count || 1;
        const hint = req.body.hint || '';

        const baseSystemPrompt = `你是一位資深奇幻/類型小說世界觀設計師，擅長為網絡小說構建沉浸式的世界背景。

【寫作要求】
- 用流暢、有畫面感的段落敘述，像在向讀者揭開一個神秘世界的面紗
- 不使用標題、編號、列表或 emoji 分段
- 語氣要有代入感，讓讀者感受到這個世界的獨特氛圍
- 自然融入：時代背景、力量運作原理、歷史轉折、世界規則

【內容邊界】
- 只描述世界的「背景」與「規則」，為後續設定奠定基礎
- 不列出具體的等級名稱（如練氣、筑基）
- 不列出具體的種族或勢力名稱列表`;

        const systemPrompt = count === 9
            ? `你是資深網文世界觀設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你熟讀上萬本熱門網文，精通各類型的經典套路與創新玩法。

⚠️ 最重要的規則：你只負責「世界設定」，絕對不能涉及任何角色。不能出現「主角」「穿越者」「重生者」「少年」「少女」或任何人物描述。title 和 desc 裡只能描述世界的規則、格局、環境、氛圍。

【任務】根據用戶提供的小說類型和標籤，生成一段沉浸式敘事引導語 + 9 個風格迥異的「世界設定」方向卡片。

【敘事引導語規則】
- 用 1-2 句話回應用戶選擇的類型，營造氛圍（例如：「玄幻世界，萬族林立，大道爭鋒...」）
- 然後用一句話引出世界觀選擇（例如：「以下是九個截然不同的【世界格局】：」）
- 語氣要有沉浸感和儀式感
- 引導語中的【XX】要根據類型主題自動命名
- ⚠️ 引導語也不能提及任何角色

【卡片主題化規則】
- 所有 9 張卡片必須圍繞用戶選擇的類型深度設計
- 9 個方向的基調要有明顯差異（宏大史詩、黑暗殘酷、輕鬆日常、熱血爽文、神秘探索、經營種田、規則詭異、創新混搭等）

【輸出要求】
每個卡片：
1. title：【核心概念詞】+ 一句話世界特色（10字內，禁止提及角色）
2. desc：世界核心規則或格局（20-40字，只寫世界本身）
3. tags：2 個關鍵詞標籤

正確示例：{"title":"【靈氣復甦】現代與修煉碰撞","desc":"靈氣突然回歸現代世界，古老修煉體系重現，科技與仙術並存的新秩序","tags":["靈氣復甦","科技仙俠"]}
錯誤示例：{"title":"【廢材逆襲】被逐出宗門的少年","desc":"主角被家族拋棄後獲得神秘傳承"} ← 這是人設，不是世界觀！

【輸出格式】
嚴格按 JSON 輸出，不要有任何其他文字：
{"intro":"敘事引導語文字","cards":[{"title":"【XX】XXXX","desc":"XXXXXXXX","tags":["XX","XX"]}]}

【語言】請使用 ${language} 撰寫`
            : count >= 5
            ? `${baseSystemPrompt}

【任務】根據用戶提供的小說類型和描述，創作 5 個風格各異的世界觀背景描述。
每個描述 100-200 字，風格要有明顯差異（例如：宏大史詩、輕鬆日常、黑暗壓抑、神秘奇幻、熱血爽文）。
不要加編號或標題，直接輸出段落文字。

【重要格式要求】
每個描述之間必須用單獨一行的三個連字符 --- 分隔，格式如下：
（第一個描述內容）

---

（第二個描述內容）

---

（第三個描述內容）

---

（第四個描述內容）

---

（第五個描述內容）

【語言】請使用 ${language} 撰寫`
            : `${baseSystemPrompt}
- 字數控制在 200-400 字

【語言】請使用 ${language} 撰寫`;

        const hintLine = hint ? `\n用戶想法：${hint}（請參考此方向生成）` : '';
        const seed = Math.random().toString(36).substring(2, 8);
        const userPrompt = `請根據以下描述生成世界觀設定：\n\n${prompt}${hintLine}\n\n（隨機種子：${seed}，請確保每次生成完全不同的結果）`;
        let content = '';
        const temperature = 0.8;

        if (modelSelection.startsWith('Google') || modelSelection.startsWith('Gemini')) {
            const googleModel = genAI.getGenerativeModel({
                model: getGoogleModelName(modelSelection),
                systemInstruction: systemPrompt
            });
            const result = await googleModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: { temperature }
            });
            content = result.response.text();
        } else if (modelSelection.startsWith('DeepSeek') || modelSelection === 'DeepSeek R1') {
            const response = await claude.chat.completions.create({
                model: 'claude-sonnet-4-6',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'Claude Sonnet') {
            const response = await claude.chat.completions.create({
                model: 'claude-sonnet-4-6',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature
            });
            content = response.choices[0].message.content;
        } else {
            // 預設使用 Claude Sonnet 4.6
            const response = await claude.chat.completions.create({
                model: 'claude-sonnet-4-6',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            });
            content = response.choices[0].message.content;
        }

        if (count === 9) {
            // JSON {intro, cards} 格式
            try {
                const objMatch = content.match(/\{[\s\S]*\}/);
                const parsed = JSON.parse(objMatch ? objMatch[0] : content);
                if (parsed.intro && parsed.cards) {
                    res.json({ intro: parsed.intro, cards: parsed.cards });
                } else if (Array.isArray(parsed)) {
                    res.json({ intro: '', cards: parsed });
                } else {
                    const arrMatch = content.match(/\[[\s\S]*\]/);
                    const cards = JSON.parse(arrMatch ? arrMatch[0] : '[]');
                    res.json({ intro: '', cards });
                }
            } catch (e) {
                console.error('JSON parse failed, raw:', content);
                res.status(500).json({ error: '生成格式解析失敗，請重試' });
            }
        } else if (count >= 5) {
            const splitContents = content.split(/\n?-{3,}\n?/).map(s => s.trim()).filter(Boolean);
            const contents = splitContents.length >= 2 ? splitContents : content.split(/\n{3,}/).map(s => s.trim()).filter(Boolean);
            res.json({ contents });
        } else {
            res.json({ content });
        }
    } catch (error) {
        console.error("Worldview Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ═══ 嚮導專用 AI 生成端點（使用 Claude Sonnet 4.6） ═══

// 生成等級體系
app.post('/api/wizard/levels', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/levels');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, worldview, language = '繁體中文', count = 1, hint = '' } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const hintLine = hint ? `\n用戶想法：${hint}（請參考此方向生成）` : '';

        const systemPrompt = count >= 3
            ? `你是資深網文力量體系設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你研究過上千套經典等級體系，從凡人修仙到異能覺醒，深知什麼樣的等級命名能讓讀者有代入感和升級期待。你擅長在經典框架上做出差異化創新，讓每套體系都有獨特的記憶點。

【任務】根據以下小說設定，設計 3 套風格各異的等級體系。

【設計邏輯】
- 等級命名必須與世界觀的力量來源一致（靈氣修煉 → 修仙術語，魔力 → 法師階位，武道 → 武者境界）
- 每個等級之間要有「質變感」，不是簡單的數字遞增，而是力量本質的蛻變
- 前期等級間距小（讓讀者快速獲得升級爽感），後期間距大（營造史詩感和突破期待）
- 等級名稱要有文化厚度和畫面感，讀者看到名字就能感受到力量層次

【網文實戰規則】
- 每套 8-12 個等級，太少缺乏升級節奏，太多容易水文
- 每個等級名暗示一個故事階段（瓶頸、天劫、蛻變、飛升）
- 避免純數字等級（1級、2級）或過於抽象的命名
- 關鍵等級要有「門檻感」：讓讀者期待主角突破的那一刻
- 最高等級要有「天花板感」：讓人覺得遙不可及但又充滿嚮往
- 3 套之間風格要有明顯差異，不要只是換個名字

【重要格式要求】
每套只輸出等級名稱，每行一個，從最低到最高排列，不加任何編號、說明或標點。
每套之間必須用單獨一行的三個連字符 --- 分隔，格式如下：
（第一套等級名稱，每行一個）

---

（第二套等級名稱，每行一個）

---

（第三套等級名稱，每行一個）

【語言】請使用 ${language} 撰寫`
            : `你是資深網文力量體系設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你研究過上千套經典等級體系，從凡人修仙到異能覺醒，深知什麼樣的等級命名能讓讀者有代入感和升級期待。

【任務】根據以下小說設定，設計一套符合世界觀的等級體系。

【設計邏輯】
- 等級命名必須與世界觀的力量來源一致
- 每個等級之間要有「質變感」，力量本質的蛻變
- 前期間距小（升級爽感），後期間距大（史詩感）
- 等級名稱要有文化厚度和畫面感

【網文實戰規則】
- 8-12 個等級，不要超過 12 個
- 關鍵等級要有「門檻感」，最高等級要有「天花板感」
- 避免純數字等級或過於抽象的命名

【輸出格式】
只輸出等級名稱，每行一個，從最低到最高排列，不加任何編號、說明或標點

【語言】請使用 ${language} 撰寫`;

        const userPrompt = `類型：${genres.join(' + ')}
世界觀：${worldview || '未提供'}${hintLine}

請生成等級體系：`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8
        });

        const content = response.choices[0].message.content;
        if (count >= 3) {
            const splitContents = content.split(/\n?-{3,}\n?/).map(s => s.trim()).filter(Boolean);
            const contents = splitContents.length >= 2 ? splitContents : content.split(/\n{3,}/).map(s => s.trim()).filter(Boolean);
            res.json({ contents });
        } else {
            res.json({ content });
        }
    } catch (error) {
        console.error("Wizard Levels Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 生成種族
app.post('/api/wizard/races', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/races');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, worldview, levels, language = '繁體中文', count = 1, hint = '' } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const hintLine = hint ? `\n用戶想法：${hint}（請參考此方向生成）` : '';

        const systemPrompt = count >= 3
            ? `你是資深網文種族體系設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你熟悉各類網文中的種族設定，從修仙世界的人妖魔到西幻的精靈矮人，深知種族間的差異和衝突是推動劇情的核心動力。你擅長設計有辨識度、有故事張力的種族組合。

【任務】根據以下小說的世界觀和等級體系，設計 3 套風格各異的種族組合。

【設計邏輯】
- 每個種族必須有明確的身份定位和在世界權力格局中的角色
- 種族之間要有天然的衝突點和合作可能（推動劇情的核心動力）
- 考慮種族生態位：主導種族、被壓迫種族、神秘遠古種族、新興崛起種族
- 種族特性要與等級體系掛鉤（某些種族在特定等級有天然優勢或劣勢）

【網文實戰規則】
- 每套 3-8 個種族，與世界規模匹配
- 每個種族名稱要有辨識度，一看就知道是什麼定位
- 必須有至少一對天然對立的種族（製造核心衝突）
- 主角所屬種族不能太強也不能太弱（太強沒有逆襲空間，太弱缺乏代入感）
- 避免照搬其他作品的種族名（精靈矮人獸人除非世界觀本身就是西幻）
- 每個種族暗示一條潛在的劇情線
- 3 套之間風格要有明顯差異

【重要格式要求】
每套只輸出種族名稱，每行一個，不加任何編號、說明或標點。
每套之間必須用單獨一行的三個連字符 --- 分隔，格式如下：
（第一套種族名稱，每行一個）

---

（第二套種族名稱，每行一個）

---

（第三套種族名稱，每行一個）

【語言】請使用 ${language} 撰寫`
            : `你是資深網文種族體系設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你熟悉各類網文中的種族設定，深知種族間的差異和衝突是推動劇情的核心動力。

【任務】根據以下小說的世界觀和等級體系，設計符合世界邏輯的種族。

【設計邏輯】
- 每個種族必須有明確的身份定位和在世界權力格局中的角色
- 種族之間要有天然的衝突點和合作可能
- 種族特性要與等級體系掛鉤

【網文實戰規則】
- 3-8 個種族，與世界規模匹配
- 必須有至少一對天然對立的種族
- 每個種族名稱要有辨識度

【輸出格式】
只輸出種族名稱，每行一個，不加任何編號、說明或標點

【語言】請使用 ${language} 撰寫`;

        const userPrompt = `類型：${genres.join(' + ')}
世界觀：${worldview || '未提供'}
等級體系：${levels || '未提供'}${hintLine}

請生成種族列表：`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8
        });

        const content = response.choices[0].message.content;
        if (count >= 3) {
            const splitContents = content.split(/\n?-{3,}\n?/).map(s => s.trim()).filter(Boolean);
            const contents = splitContents.length >= 2 ? splitContents : content.split(/\n{3,}/).map(s => s.trim()).filter(Boolean);
            res.json({ contents });
        } else {
            res.json({ content });
        }
    } catch (error) {
        console.error("Wizard Races Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 生成勢力
app.post('/api/wizard/factions', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/factions');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, worldview, levels, races, language = '繁體中文', count = 1, hint = '' } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const hintLine = hint ? `\n用戶想法：${hint}（請參考此方向生成）` : '';

        const systemPrompt = count >= 3
            ? `你是資深網文勢力格局設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你分析過上千本熱門網文的勢力佈局，深知什麼樣的陣營對立能製造最大的劇情張力和爽點空間。你擅長構建有層次感的勢力格局，讓每個勢力都有存在的理由和衝突的必然。

【任務】根據以下小說的世界觀、等級體系和種族設定，設計 3 套風格各異的陣營勢力組合。

【設計邏輯】
- 勢力格局要形成「多方博弈」的網狀結構，不是簡單的正邪二元
- 每個勢力必須有清晰的動機和目標（能驅動劇情的那種）
- 勢力之間的權力平衡要微妙：沒有絕對霸主（製造張力），但有相對強弱（製造壓迫感）
- 勢力要與種族和等級體系關聯（某勢力掌控某種族，某勢力壟斷某等級的修煉資源）

【網文實戰規則】
- 每套 4-8 個勢力，構成有層次的格局
- 勢力類型要多元：政治/宗教/軍事/地下/學術/商業
- 名稱要一眼看出立場和特色（「血月教」vs「天道盟」立刻知道正邪）
- 必須有一個讓主角初期感到壓迫的強大勢力（製造爽點空間）
- 必須有一個主角可以依附或加入的勢力（給讀者歸屬感）
- 預留「隱藏勢力」的空間（後期劇情反轉用）
- 3 套之間格局風格要有明顯差異

【重要格式要求】
每套只輸出勢力名稱，每行一個，不加任何編號、說明或標點。
每套之間必須用單獨一行的三個連字符 --- 分隔，格式如下：
（第一套勢力名稱，每行一個）

---

（第二套勢力名稱，每行一個）

---

（第三套勢力名稱，每行一個）

【語言】請使用 ${language} 撰寫`
            : `你是資深網文勢力格局設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你分析過上千本熱門網文的勢力佈局，深知什麼樣的陣營對立能製造最大的劇情張力和爽點空間。

【任務】根據以下小說的世界觀、等級體系和種族設定，設計陣營勢力。

【設計邏輯】
- 勢力格局要形成「多方博弈」的網狀結構，不是簡單的正邪二元
- 每個勢力必須有清晰的動機和目標
- 勢力要與種族和等級體系關聯

【網文實戰規則】
- 4-8 個勢力，構成有層次的格局
- 名稱要一眼看出立場和特色
- 必須有壓迫主角的強大勢力和可依附的勢力

【輸出格式】
只輸出勢力名稱，每行一個，不加任何編號、說明或標點

【輸出格式】
只輸出勢力名稱，每行一個，不加任何編號、說明或標點

【語言】請使用 ${language} 撰寫`;

        const userPrompt = `類型：${genres.join(' + ')}
世界觀：${worldview || '未提供'}
等級體系：${levels || '未提供'}
種族：${races || '未提供'}${hintLine}

請生成勢力列表：`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8
        });

        const content = response.choices[0].message.content;
        if (count >= 3) {
            const splitContents = content.split(/\n?-{3,}\n?/).map(s => s.trim()).filter(Boolean);
            const contents = splitContents.length >= 2 ? splitContents : content.split(/\n{3,}/).map(s => s.trim()).filter(Boolean);
            res.json({ contents });
        } else {
            res.json({ content });
        }
    } catch (error) {
        console.error("Wizard Factions Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 生成主角人設方向卡片（9張）
app.post('/api/wizard/character', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/character');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, tags, worldview, language = '繁體中文', hint = '' } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const hintLine = hint ? `\n用戶想法：${hint}（請參考此方向生成）` : '';

        const systemPrompt = `你是資深網文角色設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你研究過上千個經典網文主角形象，深知什麼樣的主角身份能讓讀者產生代入感和期待感。

【任務】根據用戶選擇的類型、標籤和世界觀，生成一段沉浸式敘事引導語 + 9 個高度主題化的主角身份方向卡片。

【敘事引導語規則】
- 先用 1-2 句話回應用戶選擇的世界觀，表現出驚嘆和認可（例如：「好一個"詭道修仙界"！在這個詭異橫行的世界裡...」）
- 然後用一句話引出身份選擇（例如：「請選擇你的【天崩開局】身份：」）
- 語氣要像遊戲開場白，有沉浸感和儀式感
- 引導語中的【XX】要根據世界觀主題自動命名（不要固定用「天崩開局」）

【卡片主題化規則 - 最重要】
- ⚠️ 所有 9 張卡片必須深度圍繞已選世界觀的主題設計
- 例如世界觀是「詭異修仙」→ 卡片應該是：殮屍鋪學徒、鎮魔司獄卒、陰陽先生後人、禁地守墓人等
- 例如世界觀是「靈氣復甦」→ 卡片應該是：覺醒失敗者、靈能研究員、異獸馴養師、靈氣汙染區倖存者等
- 不要出現與世界觀無關的通用身份（如「普通學生」「退伍軍人」）
- 每個身份都要帶有這個世界觀的「味道」和「氛圍」

【設計邏輯】
- 身份起點要有「反差感」：當前處境與未來潛力的巨大落差
- 每個身份暗示一條清晰的成長路線和核心衝突
- 每個身份要有獨特的「爽點入口」：被看不起→打臉、被背叛→復仇、被低估→震驚全場
- 9 個方向的基調要有明顯差異，避免雷同

【卡片風格 — 參考範例】
title: 「苟道散修·穩健流」
desc: 「資質平平，性格極度謹慎。在這個資源匱乏的世界，絕不冒頭，把'活得久'作為最高準則。」
tags: [「凡人流經典」,「穩健」]

title: 「戰場收屍人·摸金流」
desc: 「專職在宗門火拼後打掃戰場。在這個連斷劍都有人搶的時代，你靠撿破爛和摸屍體發家。」
tags: [「底層崛起」,「撿漏」]

【輸出格式】
嚴格按 JSON 輸出，不要有任何其他文字：
{"intro":"敘事引導語文字","cards":[{"title":"XX·XX流","desc":"XXXXXXXX","tags":["XX","XX"]}]}

每個卡片：
1. title：身份名稱·流派風格（如「苟道散修·穩健流」「魔頭重生·技術流」），簡潔有力，10字內
2. desc：2-3句話，只寫身份定位和核心行為邏輯。不要寫性格分析、不要寫成長路線、不要寫金手指（這些後面的步驟會處理）。語氣要像在跟朋友安利一本書，口語化、有畫面感。30-50字。
3. tags：2 個關鍵詞標籤，一個描述流派（如「凡人流經典」「底層崛起」），一個描述核心玩法（如「穩健」「撿漏」「暴力」「經營」）

【語言】請使用 ${language} 撰寫`;

        const seed = Math.random().toString(36).substring(2, 8);
        const userPrompt = `類型：${(genres || []).join(' + ')}
標籤：${(tags || []).join('、')}
世界觀：${worldview || '未提供'}${hintLine}

請生成 9 個主角身份方向卡片（隨機種子：${seed}，請確保每次生成完全不同的身份方向）：`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.9
        });

        const content = response.choices[0].message.content;
        try {
            // 嘗試解析 {intro, cards} 格式
            const objMatch = content.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(objMatch ? objMatch[0] : content);
            if (parsed.intro && parsed.cards) {
                res.json({ intro: parsed.intro, cards: parsed.cards });
            } else if (Array.isArray(parsed)) {
                res.json({ intro: '', cards: parsed });
            } else {
                const arrMatch = content.match(/\[[\s\S]*\]/);
                const cards = JSON.parse(arrMatch ? arrMatch[0] : '[]');
                res.json({ intro: '', cards });
            }
        } catch (e) {
            console.error('Character cards JSON parse failed, raw:', content);
            res.status(500).json({ error: '生成格式解析失敗，請重試' });
        }
    } catch (error) {
        console.error("Wizard Character Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 生成外掛/金手指方向卡片（9張）
app.post('/api/wizard/goldenfinger', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/goldenfinger');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, tags, worldview, characterDesc, language = '繁體中文', hint = '' } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const hintLine = hint ? `\n用戶想法：${hint}（請參考此方向生成）` : '';

        const systemPrompt = `你是資深網文金手指設計師，同時也是番茄小說/起點中文網的金牌內容策劃。你研究過上千種網文外掛設定，深知什麼樣的金手指能讓讀者欲罷不能。

【任務】根據用戶選擇的類型、標籤、世界觀和主角身份，生成一段沉浸式敘事引導語 + 9 個高度主題化的金手指/外掛方向卡片。

【敘事引導語規則】
- 先用 1-2 句話回應用戶選擇的主角身份和世界觀，表現出認可（例如：「一個殮屍鋪學徒，在詭異橫行的修仙界...」）
- 然後用一句話引出外掛選擇（例如：「命運為你準備了這些【逆天機緣】：」）
- 語氣要像遊戲開場白，有沉浸感
- 引導語中的【XX】要根據世界觀和人設主題自動命名

【卡片主題化規則 - 最重要】
- ⚠️ 所有 9 張卡片必須深度圍繞已選世界觀和主角身份設計
- 例如世界觀是「詭異修仙」+ 主角是「殮屍鋪學徒」→ 卡片應該是：屍解仙傳承、詭異圖鑑、陰陽棺材板、鎮魂鈴等
- 不要出現與世界觀無關的通用外掛（如「萬能系統」「無限抽獎」）
- 每個外掛都要帶有這個世界觀的「味道」

【設計邏輯】
- 每個外掛要有清晰的「成長曲線」：初期有用但不逆天，後期越來越強
- 外掛要能製造「爽點」：讓主角在關鍵時刻翻盤、震驚眾人
- 考慮外掛的「限制條件」：有代價或限制才有戲劇張力
- 9 個方向的類型和基調要有明顯差異

【輸出格式】
嚴格按 JSON 輸出，不要有任何其他文字：
{"intro":"敘事引導語文字","cards":[{"title":"【XX】XXXX","desc":"XXXXXXXX","tags":["XX","XX"]}]}

每個卡片：
1. title：【核心概念詞】+ 一句話外掛描述（10字內）
2. desc：核心機制和爽點（20-40字）
3. tags：2 個關鍵詞標籤

【語言】請使用 ${language} 撰寫`;

        const seed = Math.random().toString(36).substring(2, 8);
        const userPrompt = `類型：${(genres || []).join(' + ')}
標籤：${(tags || []).join('、')}
世界觀：${worldview || '未提供'}
主角身份：${characterDesc || '未提供'}${hintLine}

請生成 9 個金手指/外掛方向卡片（隨機種子：${seed}，請確保每次生成完全不同的外掛方向）：`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.9
        });

        const content = response.choices[0].message.content;
        try {
            const objMatch = content.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(objMatch ? objMatch[0] : content);
            if (parsed.intro && parsed.cards) {
                res.json({ intro: parsed.intro, cards: parsed.cards });
            } else if (Array.isArray(parsed)) {
                res.json({ intro: '', cards: parsed });
            } else {
                const arrMatch = content.match(/\[[\s\S]*\]/);
                const cards = JSON.parse(arrMatch ? arrMatch[0] : '[]');
                res.json({ intro: '', cards });
            }
        } catch (e) {
            console.error('GoldenFinger cards JSON parse failed, raw:', content);
            res.status(500).json({ error: '生成格式解析失敗，請重試' });
        }
    } catch (error) {
        console.error("Wizard GoldenFinger Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 生成書名建議
app.post('/api/wizard/title', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/title');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, tags, goldenFinger, worldview, levels, races, factions, language = '繁體中文', count = 1 } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const systemPrompt = `你是一位資深網絡小說書名策劃師，深諳各類型讀者的審美偏好。

【任務】根據以下小說的完整設定，生成 5 個吸引人的書名建議。

【書名標準】
- 符合類型調性：玄幻要有氣勢、言情要有情感張力、懸疑要有神秘感
- 長度 4-10 字，朗朗上口，易於記憶
- 暗示主角特質、核心衝突或世界特色
- 避免過於平庸或已被大量使用的書名模式

【輸出格式】
只輸出書名，每行一個，共 5 個，不加任何編號、說明或標點

【語言】請使用 ${language} 撰寫`;

        const userPrompt = `類型：${genres.join(' + ')}
標籤：${(tags || []).join('、')}
金手指：${goldenFinger || '未設定'}
世界觀：${worldview ? worldview.substring(0, 300) : '未提供'}
等級體系：${levels || '未提供'}
種族：${races || '未提供'}
勢力：${factions || '未提供'}

請生成 5 個書名建議：`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.9
        });

        const content = response.choices[0].message.content;
        const titles = content.split('\n').filter(line => line.trim()).map(line => line.trim().replace(/^[\d\.\、\-\*]+\s*/, ''));
        res.json({ titles });
    } catch (error) {
        console.error("Wizard Title Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/wizard/brief', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'wizard/brief');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { genres, tags, worldview, characterDesc, goldenFinger, language = '繁體中文', field } = req.body;

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const baseContext = `類型：${genres.join(' + ')}
標籤：${(tags || []).join('、')}
世界觀方向：${worldview || '未提供'}
主角人設方向：${characterDesc || '未提供'}
外掛/金手指方向：${goldenFinger || '未提供'}`;

        // 單欄位重新生成
        if (field) {
            const fieldPrompts = {
                titles: `根據以下素材，生成 3 個吸引人的書名，符合類型調性，4-10字，每行一個，不加編號或說明。\n\n${baseContext}`,
                genre_position: `根據以下素材，用一句話概括本書的類型賣點和市場定位（30-50字）。只輸出定位文字，不加標題。\n\n${baseContext}`,
                worldview_full: `根據以下素材，擴展為 150-250 字的完整世界觀描述，包含世界規則、格局、核心衝突。只輸出世界觀描述，不加標題。\n\n${baseContext}`,
                character_full: `根據以下素材，擴展為 100-200 字的主角人設，包含身份、性格、初始處境、核心動機。只輸出人設描述，不加標題。\n\n${baseContext}`,
                goldenfinger_full: `根據以下素材，擴展為 100-150 字的外掛設定，包含能力描述、成長路線、限制條件。只輸出外掛描述，不加標題。\n\n${baseContext}`,
                selling_points: `根據以下素材，列出 3-5 個核心賣點，每個一句話，說明本書最吸引讀者的地方。每行一個，不加編號。\n\n${baseContext}`,
                opening: `根據以下素材，寫 50-100 字的開局構想，描述故事的開場場景和初始衝突。只輸出開局描述，不加標題。\n\n${baseContext}`
            };
            const prompt = fieldPrompts[field];
            if (!prompt) return res.status(400).json({ error: '無效的欄位' });

            const response = await claude.chat.completions.create({
                model: 'claude-sonnet-4-6',
                messages: [
                    { role: "system", content: `你是資深網文策劃編輯，番茄小說/起點中文網金牌內容策劃。語言精煉有力，突出網文爽點和商業價值。請使用 ${language} 撰寫。` },
                    { role: "user", content: prompt }
                ],
                temperature: 0.8
            });
            return res.json({ content: response.choices[0].message.content.trim() });
        }

        // 完整生成：返回結構化 JSON
        const systemPrompt = `你是資深網文策劃編輯，同時也是番茄小說/起點中文網的金牌內容策劃。

【任務】根據作者提供的素材，生成結構化的小說立項書。

【輸出格式】嚴格按 JSON 輸出，不要有任何其他文字、解釋或 markdown 標記：
{
  "titles": "書名1\\n書名2\\n書名3",
  "genre_position": "一句話類型定位（30-50字）",
  "worldview_full": "完整世界觀描述（150-250字，包含世界規則、格局、核心衝突）",
  "character_full": "完整主角設定（100-200字，包含身份、性格、初始處境、核心動機）",
  "goldenfinger_full": "完整外掛設定（100-150字，包含能力描述、成長路線、限制條件）",
  "selling_points": "賣點1\\n賣點2\\n賣點3",
  "opening": "開局構想（50-100字，開場場景和初始衝突）"
}

【要求】
- 各部分之間要有邏輯連貫性，世界觀、人設、外掛要互相呼應
- 語言精煉有力，像真正的商業企劃書
- 突出網文的爽點和商業價值
- JSON 字串內用 \\n 換行

【語言】請使用 ${language} 撰寫`;

        const userPrompt = `請根據以下素材生成結構化立項書：\n\n${baseContext}`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8
        });

        const content = response.choices[0].message.content;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const brief = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            res.json({ brief });
        } catch (e) {
            console.error('Brief JSON parse failed, raw:', content);
            res.status(500).json({ error: '生成格式解析失敗，請重試' });
        }
    } catch (error) {
        console.error("Wizard Brief Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/outline', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'outline');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { chapter, characters, settings, previousContext, model: modelSelection } = req.body;

        const characterList = characters && characters.length > 0
            ? characters.map(c => `- ${c.name} (${c.role}): ${c.traits} | 狀態: ${c.status}`).join('\n')
            : "無特定角色";

        const prompt = `你是一位資深網文結構顧問，擅長規劃能讓讀者欲罷不能的章節結構。請為小說《${settings.title}》的章節《${chapter.title}》生成一份專業的章節大綱。

【小說類型】${settings.genre}
【風格基調】${settings.style || "正統小說風格"} / ${settings.tone}

【登場角色】
${characterList}

【前文摘要】
${previousContext || "這是第一章，沒有前文。"}

【本章已有內容】
${chapter.content ? chapter.content.slice(-2000) : "(尚無內容)"}

【生成要求】
請生成一份結構化的網文章節大綱，包含：

1. **核心衝突** 
   - 本章的主要矛盾或張力是什麼？
   - 衝突如何逐步升級？

2. **爽點規劃** ⭐ 
   - 本章安排哪些爽點？（打臉、裝逼、扮豬吃老虎、碾壓、反殺、翻盤等）
   - 爽點出現的時機和方式
   - 預期讀者爽感程度

3. **場景列表** 
   按順序列出 3-5 個場景，每個場景包含：
   - 場景地點與氛圍
   - 參與角色
   - 關鍵事件與轉折
   - 情緒基調
   - 此場景的功能（鋪墊/衝突/高潮/緩和）

4. **角色塑造** 
   - 主角在本章的表現（性格展現、能力展示）
   - 配角如何烘托主角
   - 角色關係變動

5. **懸念鉤子** ⭐
   - 章節開頭如何抓住讀者？
   - 章末留給讀者什麼懸念？
   - 讓讀者非點下一章不可的理由

6. **伏筆建議** 
   - 可以在本章埋下的伏筆
   - 為後續劇情做的鋪墊

7. **節奏控制**
   - 本章預計字數與節奏分配
   - 哪裡加快節奏（短句、衝突）
   - 哪裡放慢節奏（描寫、鋪墊）

請使用簡潔有力的語句，直接輸出大綱內容，不要加額外說明。使用繁體中文。`;

        // 注入類型特有的大綱指引
        const genreCategory = matchGenre(settings.genre);
        const outlineExtra = genreCategory ? getOutlineExtra(genreCategory) : '';
        const finalPrompt = outlineExtra ? prompt + `\n\n【${genreCategory}大綱重點】\n${outlineExtra}` : prompt;

        const model = genAI.getGenerativeModel({ model: getGoogleModelName(modelSelection) });
        const result = await model.generateContent(finalPrompt);
        res.json({ content: result.response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/character', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'character');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { description, settings, model: modelSelection } = req.body;
        let resultData;

        // Default to Qwen3-Plus behavior for this endpoint as requested for DB character creation
        if (modelSelection === 'Qwen3-Plus' || !modelSelection) {
            if (!qwen) throw new Error("Qwen API Key not configured.");
            const prompt = `請根據以下描述，為小說《${settings.title}》創建一個結構化的角色卡資料。
            描述：${description}
            
            請嚴格以 JSON 格式返回，包含以下欄位：
            {
              "name": "角色姓名",
              "gender": "male" | "female" | "other",
              "role": "主角" | "反派" | "配角" | "路人" | "勢力主",
              "traits": "性格特徵簡述",
              "status": "初始狀態簡述",
              "level": "初始等級/境界 (如有)"
            }
            使用繁體中文。`;

            const response = await qwen.chat.completions.create({
                model: 'qwen-plus',
                messages: [
                    { role: "system", content: "你是一位資深小說設定集編輯，擅長將零散描述轉化為結構化的角色檔案。" },
                    { role: "user", content: prompt }
                ],
                response_format: { type: 'json_object' }
            });
            const raw = response.choices[0].message.content;
            resultData = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
        } else if (modelSelection.startsWith('Google')) {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const prompt = `根據描述創建角色卡JSON: ${description}`;
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });
            resultData = JSON.parse(result.response.text());
        } else {
            throw new Error(`Unsupported model for character creation: ${modelSelection}`);
        }

        res.json(resultData);
    } catch (error) {
        console.error("Character Creation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ═══ 記憶系統 API ═══

// 提取章節記憶（手動觸發或 briefing 後自動調用）
app.post('/api/memory/extract', async (req, res) => {
    try {
        const { chapterContent, chapterTitle, chapterIndex, chapterId,
                novelId, existingCharacters, novelTitle, genre, customLevels } = req.body;

        if (!claude) throw new Error("Claude API not configured.");
        if (!chapterContent || chapterContent.length < 50) {
            return res.status(400).json({ error: '章節內容過短，無法提取記憶。' });
        }

        const extracted = await extractChapterMemory(claude, {
            chapterContent, chapterTitle, chapterIndex,
            existingCharacters: existingCharacters || [],
            novelTitle: novelTitle || '未命名小說',
            genre: genre || '一般',
            customLevels: customLevels || []
        });

        // 先清除該章節的舊記憶（避免重複提取）
        await supabase.from('chapter_events').delete().eq('chapter_id', chapterId);
        await supabase.from('character_timeline').delete().eq('chapter_id', chapterId);

        // 寫入新記憶
        await saveExtractedMemory(supabase, {
            novelId, chapterId, chapterIndex, extracted
        });

        res.json({ success: true, extracted });
    } catch (error) {
        console.error("Memory Extract Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 儲存用戶確認後的記憶（前端彈窗確認後調用）
app.post('/api/memory/save', async (req, res) => {
    try {
        const { novelId, chapterId, chapterIndex, extracted } = req.body;
        console.log("[Memory Save] Received request:", { novelId, chapterId, chapterIndex, events: extracted?.events?.length, snapshots: extracted?.character_snapshots?.length });
        if (!novelId || !chapterId || !extracted) {
            return res.status(400).json({ error: '缺少必要參數' });
        }

        // 清除該章節的舊記憶
        const { error: delEvtErr } = await supabase.from('chapter_events').delete().eq('chapter_id', chapterId);
        if (delEvtErr) console.warn("[Memory Save] Delete events warning:", delEvtErr.message);
        const { error: delTlErr } = await supabase.from('character_timeline').delete().eq('chapter_id', chapterId);
        if (delTlErr) console.warn("[Memory Save] Delete timeline warning:", delTlErr.message);

        // 寫入用戶確認後的記憶
        await saveExtractedMemory(supabase, {
            novelId, chapterId, chapterIndex, extracted
        });

        console.log("[Memory Save] Success for chapter", chapterIndex);
        res.json({ success: true });
    } catch (error) {
        console.error("Memory Save Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 取得智能上下文（生成時調用）
app.post('/api/memory/context', async (req, res) => {
    try {
        const { novelId, currentChapterIndex, selectedCharacterNames } = req.body;

        const context = await getSmartContext(supabase, {
            novelId,
            currentChapterIndex: currentChapterIndex || 1,
            selectedCharacterNames: selectedCharacterNames || []
        });

        res.json(context);
    } catch (error) {
        console.error("Memory Context Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 取得事件列表（前端顯示用）
app.get('/api/memory/events/:novelId', async (req, res) => {
    try {
        const { novelId } = req.params;
        const { data, error } = await supabase
            .from('chapter_events')
            .select('*')
            .eq('novel_id', novelId)
            .order('chapter_index', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error("Memory Events Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/briefing', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'briefing');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { content, title, chapterId, chapterIndex, novelId, existingCharacters, novelTitle, genre, customLevels } = req.body;

        if (!claude) {
            throw new Error("Claude API not configured.");
        }

        // 簡報 prompt — 專注敘事銜接（角色變化和伏筆交給記憶系統）
        const prompt = `請為以下章節撰寫一份敘事銜接簡報。章節標題是《${title}》。
        內容如下：
        ${content}

        撰寫要求（控制在 200-400 字）：
        1. 概述本章核心情節走向和氛圍基調。
        2. 描述本章結尾的場景狀態和懸念。
        3. 列出下一章需要銜接的要點（未完成的對話、行動、場景轉換）。
        4. 使用繁體中文。

        注意：不需要記錄角色狀態變化或伏筆，這些由其他系統處理。只專注於幫助下一章銜接文風和劇情。`;

        const response = await claude.chat.completions.create({
            model: "claude-sonnet-4-6",
            messages: [
                { role: "system", content: "你是一位資深編輯，擅長撰寫精簡的章節銜接簡報，幫助作者順暢地續寫下一章。" },
                { role: "user", content: prompt }
            ]
        });

        const briefingContent = response.choices[0].message.content;

        // 同步提取記憶，回傳給前端讓用戶確認後再儲存
        let extracted = null;
        if (chapterId && novelId && content && content.length >= 50) {
            try {
                extracted = await extractChapterMemory(claude, {
                    chapterContent: content,
                    chapterTitle: title,
                    chapterIndex: chapterIndex || 1,
                    existingCharacters: existingCharacters || [],
                    novelTitle: novelTitle || '未命名小說',
                    genre: genre || '一般',
                    customLevels: customLevels || []
                });
                console.log(`Memory extracted for chapter ${chapterIndex}: ${extracted.events?.length || 0} events, ${extracted.character_snapshots?.length || 0} snapshots`);
            } catch (err) {
                console.error("Memory extraction failed:", err.message);
            }
        }

        res.json({ content: briefingContent, extracted });
    } catch (error) {
        console.error("Claude Briefing Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/critique', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'critique');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { chapter, settings, characters, vocabularies } = req.body;

        if (!claude) {
            throw new Error("Claude API not configured.");
        }

        const characterInfo = characters && characters.length > 0
            ? `\n【登場角色】\n${characters.map(c => `${c.name}（${c.role}）：${c.traits}`).join('\n')}`
            : '';

        const prompt = `你是一位資深網文編輯，擁有十年以上的網文審稿經驗。請對小說《${settings.title}》的章節《${chapter.title}》進行專業點評。

【小說類型】${settings.genre}
【風格基調】${settings.style || '正統小說'} / ${settings.tone}${characterInfo}

【章節內容】
${chapter.content}

請從以下維度進行專業點評：

═══ 一、網文基礎檢查 ═══

1. **劇情節奏**
   - 本章節奏是否流暢？有無拖沓或過於倉促的地方？
   - 矛盾衝突密度是否足夠？衝突是否有效推動劇情發展？
   - 評分（1-10）：___

2. **爽點設計**
   - 有無經典網文爽點（打臉、裝逼、扮豬吃老虎、碾壓、翻盤等）？
   - 爽點設置是否自然？讀者爽感是否足夠？
   - 評分（1-10）：___

3. **懸念鉤子**
   - 章節開頭是否吸引人？能否激發讀者繼續閱讀的慾望？
   - 章節結尾是否留下懸念或衝突高潮？
   - 評分（1-10）：___

4. **對話質量**
   - 人物對話是否自然、直白、有力？
   - 對話是否符合角色性格？有無文縐縐或生硬之處？
   - 評分（1-10）：___

5. **水文檢測**
   - 有無無意義的字數堆砌或重複描寫？
   - 每一句話是否都在推動劇情或塑造角色？
   - 評分（1-10）：___

═══ 二、人物塑造 ═══

6. **主角形象**
   - 主角是否有立體感？有無接地氣的特點？
   - 主角行為是否符合邏輯和動機？
   - 建議：___

7. **配角功能**
   - 配角是否有效烘托主角？
   - 配角是否僅為功能性存在，缺乏生動性？
   - 建議：___

═══ 三、場景與細節 ═══

8. **場景真實感**
   - 場景描寫是否具體可感？讀者能否在腦海中構建畫面？
   - 建議：___

9. **設定融入**
   - 世界觀設定、專有名詞是否自然融入劇情？
   - 有無生硬的說教式解釋？
   - 建議：___

═══ 四、商業價值評估 ═══

10. **付費意願**
    - 作為讀者，你願意為這一章付費嗎？（願意/勉強/不願意）
    - 原因：___

11. **讀者黏性**
    - 讀者看完本章後，會想立即看下一章嗎？
    - 本章的吸引力主要來自哪裡？

═══ 五、具體修改建議 ═══

請針對本章最需要改進的 3 個問題，給出具體的修改建議（可包含示例）。

═══ 六、總體評價 ═══

- 本章亮點：___
- 主要問題：___
- 總體評分（1-10）：___
- 一句話總結：___

請使用繁體中文，保持專業但不失犀利的評論風格。`;

        // 注入類型特有的點評維度
        const genreCategory = matchGenre(settings.genre);
        const critiqueExtra = genreCategory ? getCritiqueExtra(genreCategory) : '';
        const finalPrompt = critiqueExtra ? prompt + `\n\n═══ 七、${genreCategory}專項評估 ═══\n${critiqueExtra}` : prompt;

        const response = await claude.chat.completions.create({
            model: "claude-sonnet-4-6",
            messages: [
                { role: "system", content: "你是一位資深網文編輯，擁有十年審稿經驗。你的點評專業、犀利、實用，能夠直指問題核心並提供可執行的改進方案。你深諳網文讀者心理，知道什麼樣的內容能讓讀者付費追更。" },
                { role: "user", content: finalPrompt }
            ],
            temperature: 0.7
        });

        res.json({ content: response.choices[0].message.content });
    } catch (error) {
        console.error("Claude Critique Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== AI味檢測 ====================
app.post('/api/ai-taste-check', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'ai-taste-check');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { content } = req.body;
        if (!content || content.trim().length < 50) {
            return res.status(400).json({ error: '內容過短，無法檢測' });
        }

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const antiAIRules = getAntiAIRulesText();

        const systemPrompt = `你是一位專業的網文AI味檢測專家。你的任務是根據以下去AI味規則，逐條檢查用戶提供的文本，找出所有帶有AI味的問題句子。

${antiAIRules}

【評分標準】
- 0-20分：幾乎無AI味，文筆自然流暢
- 21-40分：輕微AI味，有少量模板化表達
- 41-60分：中等AI味，多處使用禁用詞或模板結構
- 61-80分：嚴重AI味，大量禁用詞、節奏單一、缺乏口語化
- 81-100分：極重AI味，幾乎每段都有問題

【輸出格式】
嚴格按 JSON 輸出，不要有任何其他文字：
{"score":數字,"summary":"一句話總評","issues":[{"text":"原文問題句子","reason":"違反了哪條規則、為什麼有AI味","fix":"建議改法"}]}

issues 最多列出 10 個最嚴重的問題。每個 issue 的 text 必須是原文中的完整句子。`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `請檢測以下文本的AI味程度：\n\n${content}` }
            ],
            temperature: 0.3
        });

        const raw = response.choices[0].message.content;
        try {
            const objMatch = raw.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(objMatch ? objMatch[0] : raw);
            res.json(parsed);
        } catch (e) {
            console.error('AI taste check JSON parse failed, raw:', raw);
            res.status(500).json({ error: '檢測結果解析失敗，請重試' });
        }
    } catch (error) {
        console.error("AI Taste Check Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 去AI味改寫 ====================
app.post('/api/ai-taste-rewrite', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'ai-taste-rewrite');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { content, issues } = req.body;
        if (!content || content.trim().length < 50) {
            return res.status(400).json({ error: '內容過短，無法改寫' });
        }

        if (!claude) {
            return res.status(500).json({ error: 'Claude API 未配置' });
        }

        const antiAIRules = getAntiAIRulesText();
        const issuesList = (issues || []).map((i, idx) => `${idx + 1}. 「${i.text}」→ ${i.reason}`).join('\n');

        const systemPrompt = `你是一位頂尖網文改稿師，專門負責去除AI生成文本的機械感，讓文字讀起來像真人作者寫的。

【去AI味規則 — 必須嚴格遵守】
${antiAIRules}

【改寫原則】
1. 只修改有AI味的部分，保留原文的劇情、設定、角色行為完全不變
2. 不要增刪劇情內容，不要改變故事走向
3. 改寫後的字數應與原文相近（允許±15%浮動）
4. 重點改善：禁用詞替換、句式節奏變化、內心獨白口語化、對話差異化、增加感官細節

${issuesList ? `【已檢測到的問題】\n${issuesList}\n\n請重點針對以上問題進行改寫。` : ''}

【輸出要求】
直接輸出改寫後的完整正文，不要加任何說明、標題或前後綴。`;

        const response = await claude.chat.completions.create({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `請改寫以下文本，去除AI味：\n\n${content}` }
            ],
            temperature: 0.9
        });

        const rewritten = response.choices[0].message.content;
        res.json({ content: rewritten });
    } catch (error) {
        console.error("AI Taste Rewrite Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/update-character', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'update-character');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { chapterContent, character, model: modelSelection } = req.body;

        if (!claude) {
            throw new Error("Claude API not configured.");
        }

        const prompt = `請根據以下小說章節內容，分析角色「${character.name}」的最新狀態、性格變動與等級提升（如有）。
        
        章節內容：
        ${chapterContent}
        
        該角色目前的檔案如下：
        - 性格特徵: ${character.traits}
        - 目前等級/境界: ${character.level || '無'}
        - 目前狀態: ${character.status}
        
        請分析後返回該角色更新後的檔案。要求：
        1. 僅返回更新後的值，若無變動則保留原值。
        2. 以 JSON 格式返回，包含 traits, level, status 三個欄位。
        3. 性格特徵請簡潔描述。
        4. 等級請根據原文情節判斷是否突破或升級。
        5. 狀態請根據本章結束時的情面（受傷、中毒、心情愉悅等）更新。
        6. 使用繁體中文。`;

        const response = await claude.chat.completions.create({
            model: "claude-sonnet-4-6",
            messages: [
                { role: "system", content: "你是一位資深小說評論員與系統分析師，擅長精準捕捉角色在情節中的成長與狀態變化。請嚴格返回 JSON 格式。" },
                { role: "user", content: prompt }
            ],
            response_format: { type: 'json_object' }
        });

        const raw = response.choices[0].message.content;
        console.log("Raw Update Char Output:", raw);
        const result = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
        res.json(result);
    } catch (error) {
        console.error("Update Character AI Error:", error);
        res.status(500).json({ error: error.message });
    }
});



// SPA Fallback: All non-API routes serve index.html
// AI 輔助修改：根據點評建議生成改進版本
// AI 問題定位：根據點評建議找出問題段落
app.post('/api/locate-issues', async (req, res) => {
    try {
        const pts = await checkAndDeductPoints(req.user.id, 'locate-issues');
        if (pts.insufficient) return res.status(402).json({ error: `點數不足，需要 ${pts.cost} 點，剩餘 ${pts.current} 點`, pointsRequired: pts.cost, pointsCurrent: pts.current });

        const { suggestion, chapterContent, settings } = req.body;

        if (!suggestion || !chapterContent) {
            return res.status(400).json({ error: "Missing suggestion or chapter content" });
        }

        if (!claude) {
            throw new Error("Claude API not configured.");
        }

        // 構建定位提示詞
        const prompt = `你是專業的小說編輯。請根據以下點評建議，在章節內容中找出具體的問題段落。

【小說信息】
- 標題：《${settings.title}》
- 類型：${settings.genre}

【點評建議】
${suggestion}

【章節內容】
${chapterContent}

【任務要求】
1. 請在章節中找出 1-3 個最符合該建議的問題段落。
2. 引用原文必須**完全精確**，與章節內容一字不差（不要省略或修改），以便我在前端進行匹配。
3. 簡要說明為什麼這段落需要修改。
4. 嚴格以 JSON 格式返回，格式如下：
{
  "issues": [
    {
      "quote": "原文段落（必須精確匹配）",
      "reason": "問題說明（簡短有力）"
    }
  ]
}
5. 使用繁體中文。`;

        const response = await claude.chat.completions.create({
            model: "claude-sonnet-4-6", // Claude for extraction
            messages: [
                { role: "system", content: "你是一位精準的文本分析師，擅長定位小說中的問題段落。請只返回 JSON。" },
                { role: "user", content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3 // Lower temperature for precision quoting
        });

        const raw = response.choices[0].message.content;
        const result = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
        res.json(result);

    } catch (error) {
        console.error("AI Locate Issues Error:", error);
        res.status(500).json({ error: error.message || "定位問題時發生錯誤" });
    }
});


// ==================== Admin API Routes ====================

// Admin Middleware - 驗證管理員身份
const requireAdmin = async (req, res, next) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', req.user.id)
            .single();
        if (error || !data || data.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

// POST /api/user/heartbeat - 更新最後登入時間
app.post('/api/user/heartbeat', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });
        await supabase.from('user_profiles').update({ last_sign_in: new Date().toISOString() }).eq('user_id', user.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/user/profile - 取得用戶個人資料（含靈石、邀請碼）
app.get('/api/user/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });

        const { data: profile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileErr) throw profileErr;

        // 如果沒有邀請碼，自動生成一個
        if (profile && !profile.invite_code) {
            const code = user.id.slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
            await supabase.from('user_profiles').update({ invite_code: code }).eq('user_id', user.id);
            profile.invite_code = code;
        }

        // 計算總點數
        if (profile) {
            profile.spirit_stones = (profile.daily_points || 0) + (profile.task_points || 0) + (profile.permanent_points || 0);
        }

        res.json({ profile: profile || {} });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/user/points-history - 用戶點數記錄
app.get('/api/user/points-history', async (req, res) => {
    try {
        const { limit = 20, offset = 0, type } = req.query;
        let query = supabase
            .from('points_transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user.id);

        if (type === 'earn' || type === 'spend') {
            query = query.eq('type', type);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) throw error;
        res.json({ transactions: data || [], total: count || 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/user/redeem-invite - 註冊時兌換邀請碼（一次性，註冊後立即調用）
app.post('/api/user/redeem-invite', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });

        const { code } = req.body;
        if (!code) return res.status(400).json({ error: '請輸入邀請碼' });

        // 查找邀請碼擁有者
        const { data: inviter, error: inviterErr } = await supabase
            .from('user_profiles')
            .select('user_id, permanent_points')
            .eq('invite_code', code.toUpperCase())
            .maybeSingle();

        if (inviterErr) throw inviterErr;
        if (!inviter) return res.status(400).json({ error: '無效的邀請碼' });
        if (inviter.user_id === user.id) return res.status(400).json({ error: '不能使用自己的邀請碼' });

        // 檢查是否已兌換過
        const { data: myProfile } = await supabase
            .from('user_profiles')
            .select('redeemed_invite, permanent_points')
            .eq('user_id', user.id)
            .maybeSingle();

        if (myProfile?.redeemed_invite) {
            return res.status(400).json({ error: '你已經兌換過邀請碼了' });
        }

        const reward = 50; // 雙方各得 50 永久點數

        // 給兌換者加永久點數 + 標記已兌換
        await supabase.from('user_profiles').update({
            permanent_points: (myProfile?.permanent_points || 0) + reward,
            redeemed_invite: code.toUpperCase(),
        }).eq('user_id', user.id);

        // 給邀請者加永久點數
        await supabase.from('user_profiles').update({
            permanent_points: (inviter.permanent_points || 0) + reward,
        }).eq('user_id', inviter.user_id);

        // 記錄雙方交易
        await logPointsTransaction(user.id, 'earn', reward, 'invite_reward', '兌換邀請碼獎勵');
        await logPointsTransaction(inviter.user_id, 'earn', reward, 'invite_reward', '邀請碼被兌換獎勵');

        const newTotal = (myProfile?.permanent_points || 0) + reward;
        res.json({ success: true, reward, newBalance: newTotal });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/stats - 平台總覽統計
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const { count: userCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
        const { count: novelCount } = await supabase.from('novels').select('*', { count: 'exact', head: true });
        const { count: chapterCount } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
        const { count: volumeCount } = await supabase.from('volumes').select('*', { count: 'exact', head: true });

        // 今日新增用戶
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayUsers } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
        const { count: todayNovels } = await supabase.from('novels').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());

        // 角色分佈
        const { data: roleData } = await supabase.from('user_profiles').select('role, daily_points, task_points, permanent_points');
        const roleCounts = {};
        let totalPoints = 0;
        (roleData || []).forEach(r => {
            const role = r.role || 'user';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            totalPoints += (r.daily_points || 0) + (r.task_points || 0) + (r.permanent_points || 0);
        });

        res.json({
            users: { total: userCount || 0, today: todayUsers || 0, roles: roleCounts },
            novels: { total: novelCount || 0, today: todayNovels || 0 },
            chapters: { total: chapterCount || 0 },
            volumes: { total: volumeCount || 0 },
            points: { total: totalPoints },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/users - 用戶列表
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { search, role, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase.from('user_profiles').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,display_name.ilike.%${search}%`);
        }
        if (role && role !== 'all') {
            query = query.eq('role', role);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        // 為每個用戶附加小說數量 + 計算總點數
        const usersWithStats = await Promise.all((data || []).map(async (user) => {
            const { count: novelCount } = await supabase.from('novels').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id);
            return {
                ...user,
                novelCount: novelCount || 0,
                spirit_stones: (user.daily_points || 0) + (user.task_points || 0) + (user.permanent_points || 0),
            };
        }));

        res.json({ users: usersWithStats, total: count || 0, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/users/:userId/role - 變更用戶角色
app.put('/api/admin/users/:userId/role', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const validRoles = ['user', 'tester', 'senior_tester'];

        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }
        // 不能修改自己的角色
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .update({ role })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/users/:userId - 用戶詳情
app.get('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // 用戶基本資料
        const { data: user, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (userError) throw userError;

        // 該用戶的小說列表（含章節數）
        const { data: novels } = await supabase
            .from('novels')
            .select('id, title, genre, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        const novelsWithChapters = await Promise.all((novels || []).map(async (novel) => {
            const { count } = await supabase.from('chapters')
                .select('*, volumes!inner(novel_id)', { count: 'exact', head: true })
                .eq('volumes.novel_id', novel.id);
            return { ...novel, chapterCount: count || 0 };
        }));

        // 總章節數
        let totalChapters = 0;
        for (const n of novelsWithChapters) totalChapters += n.chapterCount;

        // 操作日誌（最近 20 筆）
        const { data: logs } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .eq('target_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        res.json({
            ...user,
            spirit_stones: (user.daily_points || 0) + (user.task_points || 0) + (user.permanent_points || 0),
            novels: novelsWithChapters,
            novelCount: novelsWithChapters.length,
            totalChapters,
            auditLogs: logs || [],
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/users/:userId/status - 停用/啟用帳號
app.put('/api/admin/users/:userId/status', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active must be a boolean' });
        }
        // 不能停用自己
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own account status' });
        }
        // 不能停用其他 admin
        const { data: target } = await supabase
            .from('user_profiles').select('role').eq('user_id', userId).single();
        if (target?.role === 'admin') {
            return res.status(400).json({ error: 'Cannot change admin account status' });
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .update({ is_active })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        await logAdminAction(req.user.id, is_active ? 'enable_user' : 'disable_user', userId, {});
        res.json({ success: true, user: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/users/:userId/points - 調整用戶點數（支援指定類型）
app.put('/api/admin/users/:userId/points', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount, reason, type = 'permanent' } = req.body;

        if (typeof amount !== 'number' || amount === 0) {
            return res.status(400).json({ error: '點數數量必須為非零數字' });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: '請填寫調整原因' });
        }
        const validTypes = ['daily', 'task', 'permanent'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: '無效的點數類型' });
        }

        const field = type + '_points'; // daily_points, task_points, permanent_points

        const { data: user, error: userError } = await supabase
            .from('user_profiles')
            .select('daily_points, task_points, permanent_points, username, email')
            .eq('user_id', userId)
            .maybeSingle();

        if (userError || !user) return res.status(404).json({ error: '找不到用戶' });

        const oldValue = user[field] || 0;
        const newValue = oldValue + amount;
        if (newValue < 0) {
            return res.status(400).json({ error: `${type} 點數不足，目前 ${oldValue}，無法扣除 ${Math.abs(amount)}` });
        }

        const { error: updateErr } = await supabase
            .from('user_profiles')
            .update({ [field]: newValue })
            .eq('user_id', userId);

        if (updateErr) throw updateErr;

        const newTotal = (type === 'daily' ? newValue : (user.daily_points || 0))
            + (type === 'task' ? newValue : (user.task_points || 0))
            + (type === 'permanent' ? newValue : (user.permanent_points || 0));

        await logAdminAction(req.user.id, 'adjust_points', userId, {
            amount, type, reason: reason.trim(), oldValue, newValue, newTotal,
        });

        // 記錄點數交易
        await logPointsTransaction(userId, amount > 0 ? 'earn' : 'spend', Math.abs(amount), 'admin_adjust', `管理員調整${type}點數: ${reason.trim()}`);

        res.json({ success: true, oldValue, newValue, newBalance: newTotal });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/novels - 小說列表（管理員視角）
app.get('/api/admin/novels', requireAdmin, async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase.from('novels').select('id, title, genre, user_id, created_at, updated_at', { count: 'exact' });

        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        query = query.order('updated_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        // 附加作者資訊和章節統計
        const novelsWithStats = await Promise.all((data || []).map(async (novel) => {
            const { data: author } = await supabase.from('user_profiles').select('display_name, username, email').eq('user_id', novel.user_id).single();
            const { count: chapterCount } = await supabase.from('chapters')
                .select('*, volumes!inner(novel_id)', { count: 'exact', head: true })
                .eq('volumes.novel_id', novel.id);
            return {
                ...novel,
                authorName: author?.display_name || author?.username || author?.email || 'Unknown',
                chapterCount: chapterCount || 0,
            };
        }));

        res.json({ novels: novelsWithStats, total: count || 0, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== 會員管理 API ====================

// GET /api/admin/members - 會員列表（支援等級篩選、到期日排序）
app.get('/api/admin/members', requireAdmin, async (req, res) => {
    try {
        const { role, sort_by = 'created_at', sort_order = 'desc', search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase.from('user_profiles').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,display_name.ilike.%${search}%`);
        }
        if (role && role !== 'all') {
            query = query.eq('role', role);
        }

        // 排序：支援 subscription_end（到期日）、created_at（註冊日）
        const validSorts = ['created_at', 'subscription_end', 'updated_at'];
        const sortField = validSorts.includes(sort_by) ? sort_by : 'created_at';
        query = query.order(sortField, { ascending: sort_order === 'asc', nullsFirst: false });
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        // 附加小說數量
        const members = await Promise.all((data || []).map(async (u) => {
            const { count: novelCount } = await supabase.from('novels').select('*', { count: 'exact', head: true }).eq('user_id', u.user_id);
            return { ...u, novelCount: novelCount || 0 };
        }));

        res.json({ members, total: count || 0, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/members/:userId/upgrade - 手動升級/降級用戶等級
app.put('/api/admin/members/:userId/upgrade', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const validRoles = ['user', 'tester', 'senior_tester'];

        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const { error: updateErr } = await supabase
            .from('user_profiles')
            .update({ role })
            .eq('user_id', userId);

        if (updateErr) throw updateErr;
        await logAdminAction(req.user.id, 'change_role', userId, { role });
        res.json({ success: true, role, userId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/members/check-expiry - 到期自動降級（手動觸發）
app.post('/api/admin/members/check-expiry', requireAdmin, async (req, res) => {
    try {
        const now = new Date().toISOString();

        // 找出所有已到期的付費會員
        const { data: expired, error: fetchError } = await supabase
            .from('user_profiles')
            .select('user_id, email, display_name, username, role, subscription_end')
            .in('role', ['pro', 'vip'])
            .lt('subscription_end', now);

        if (fetchError) throw fetchError;

        // 批次降級為 user
        const downgraded = [];
        for (const member of (expired || [])) {
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ role: 'user', subscription_start: null, subscription_end: null })
                .eq('user_id', member.user_id);

            if (!updateError) {
                downgraded.push({
                    user_id: member.user_id,
                    name: member.display_name || member.username || member.email,
                    previous_role: member.role,
                    expired_at: member.subscription_end,
                });
            }
        }

        res.json({ success: true, checked: (expired || []).length, downgraded: downgraded.length, details: downgraded });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/members/stats - 會員統計
app.get('/api/admin/members/stats', requireAdmin, async (req, res) => {
    try {
        // 全部用戶角色分佈
        const { data: allUsers } = await supabase.from('user_profiles').select('role, subscription_start, subscription_end, created_at');

        const users = allUsers || [];
        const total = users.length;
        const roleCounts = {};
        let activeSubscriptions = 0;
        let expiringSoon = 0; // 7 天內到期
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);

        // 月度新增統計（最近 6 個月）
        const monthlyNew = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyNew[key] = { total: 0, paid: 0 };
        }

        users.forEach(u => {
            const role = u.role || 'user';
            roleCounts[role] = (roleCounts[role] || 0) + 1;

            if (['pro', 'vip'].includes(role) && u.subscription_end) {
                const endDate = new Date(u.subscription_end);
                if (endDate > now) {
                    activeSubscriptions++;
                    if (endDate <= sevenDaysLater) expiringSoon++;
                }
            }

            // 月度統計
            if (u.created_at) {
                const created = new Date(u.created_at);
                const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyNew[key]) {
                    monthlyNew[key].total++;
                    if (['pro', 'vip'].includes(u.role)) monthlyNew[key].paid++;
                }
            }
        });

        const paidCount = (roleCounts['pro'] || 0) + (roleCounts['vip'] || 0);
        const conversionRate = total > 0 ? ((paidCount / total) * 100).toFixed(1) : '0.0';

        res.json({
            total,
            roleCounts,
            paidCount,
            activeSubscriptions,
            expiringSoon,
            conversionRate: parseFloat(conversionRate),
            monthlyNew,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== 審計日誌輔助函數 =====
async function logAdminAction(adminId, action, targetUserId, details = {}) {
    try {
        await supabase.from('admin_audit_logs').insert({
            admin_id: adminId,
            action,
            target_user_id: targetUserId,
            details,
        });
    } catch (e) {
        console.error('Failed to write audit log:', e.message);
    }
}

// DELETE /api/admin/users/:userId - 刪除用戶帳號
app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        // 確認用戶存在且非 admin
        const { data: target } = await supabase
            .from('user_profiles').select('role, email, display_name').eq('user_id', userId).maybeSingle();
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin account' });

        // 刪除用戶相關資料（章節 → 卷 → 小說 → 設定 → profile）
        const { data: novels } = await supabase.from('novels').select('id').eq('user_id', userId);
        if (novels && novels.length > 0) {
            const novelIds = novels.map(n => n.id);
            const { data: volumes } = await supabase.from('volumes').select('id').in('novel_id', novelIds);
            if (volumes && volumes.length > 0) {
                await supabase.from('chapters').delete().in('volume_id', volumes.map(v => v.id));
            }
            await supabase.from('volumes').delete().in('novel_id', novelIds);
            await supabase.from('characters').delete().in('novel_id', novelIds);
            await supabase.from('vocabularies').delete().in('novel_id', novelIds);
            await supabase.from('novel_settings').delete().in('novel_id', novelIds);
            await supabase.from('novels').delete().in('id', novelIds);
        }
        await supabase.from('user_profiles').delete().eq('user_id', userId);

        await logAdminAction(req.user.id, 'delete_user', userId, {
            email: target.email, name: target.display_name, role: target.role
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/users/batch - 批量操作
app.post('/api/admin/users/batch', requireAdmin, async (req, res) => {
    try {
        const { userIds, action, value } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'No users selected' });
        }
        // 排除自己
        const ids = userIds.filter(id => id !== req.user.id);
        if (ids.length === 0) return res.status(400).json({ error: 'Cannot perform batch action on yourself' });

        // 排除 admin 用戶
        const { data: admins } = await supabase
            .from('user_profiles').select('user_id').in('user_id', ids).eq('role', 'admin');
        const adminIds = new Set((admins || []).map(a => a.user_id));
        const safeIds = ids.filter(id => !adminIds.has(id));
        if (safeIds.length === 0) return res.status(400).json({ error: 'No eligible users for this action' });

        let result = {};
        if (action === 'change_role') {
            const validRoles = ['user', 'tester', 'senior_tester'];
            if (!validRoles.includes(value)) return res.status(400).json({ error: 'Invalid role' });
            const { error } = await supabase.from('user_profiles').update({ role: value }).in('user_id', safeIds);
            if (error) throw error;
            result = { updated: safeIds.length, role: value };
            for (const uid of safeIds) await logAdminAction(req.user.id, 'batch_change_role', uid, { role: value });
        } else if (action === 'disable') {
            const { error } = await supabase.from('user_profiles').update({ is_active: false }).in('user_id', safeIds);
            if (error) throw error;
            result = { updated: safeIds.length, is_active: false };
            for (const uid of safeIds) await logAdminAction(req.user.id, 'batch_disable', uid, {});
        } else if (action === 'enable') {
            const { error } = await supabase.from('user_profiles').update({ is_active: true }).in('user_id', safeIds);
            if (error) throw error;
            result = { updated: safeIds.length, is_active: true };
            for (const uid of safeIds) await logAdminAction(req.user.id, 'batch_enable', uid, {});
        } else if (action === 'delete') {
            for (const uid of safeIds) {
                const { data: novels } = await supabase.from('novels').select('id').eq('user_id', uid);
                if (novels && novels.length > 0) {
                    const novelIds = novels.map(n => n.id);
                    const { data: volumes } = await supabase.from('volumes').select('id').in('novel_id', novelIds);
                    if (volumes && volumes.length > 0) {
                        await supabase.from('chapters').delete().in('volume_id', volumes.map(v => v.id));
                    }
                    await supabase.from('volumes').delete().in('novel_id', novelIds);
                    await supabase.from('characters').delete().in('novel_id', novelIds);
                    await supabase.from('vocabularies').delete().in('novel_id', novelIds);
                    await supabase.from('novel_settings').delete().in('novel_id', novelIds);
                    await supabase.from('novels').delete().in('id', novelIds);
                }
                await supabase.from('user_profiles').delete().eq('user_id', uid);
                await logAdminAction(req.user.id, 'batch_delete', uid, {});
            }
            result = { deleted: safeIds.length };
        } else if (action === 'add_points') {
            const points = parseInt(value);
            if (isNaN(points) || points <= 0) return res.status(400).json({ error: '點數必須為正整數' });
            const { data: users } = await supabase.from('user_profiles').select('user_id, permanent_points').in('user_id', safeIds);
            for (const u of users || []) {
                const newBal = (u.permanent_points || 0) + points;
                await supabase.from('user_profiles').update({ permanent_points: newBal }).eq('user_id', u.user_id);
                await logAdminAction(req.user.id, 'batch_add_points', u.user_id, { amount: points, type: 'permanent', oldBalance: u.permanent_points || 0, newBalance: newBal });
                await logPointsTransaction(u.user_id, 'earn', points, 'admin_adjust', '管理員批量加點');
            }
            result = { updated: safeIds.length, pointsAdded: points };
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/ai-status - AI 服務狀態
app.get('/api/admin/ai-status', requireAdmin, async (req, res) => {
    const services = [
        { name: 'Google Gemini', available: !!apiKey, key: 'GOOGLE_API_KEY' },
        { name: 'DeepSeek', available: !!deepseekApiKey, key: 'DEEPSEEK_API_KEY' },
        { name: 'Qwen', available: !!qwenApiKey, key: 'QWEN_API_KEY' },
    ];
    res.json({ services, rateLimit: { windowMs: 15 * 60 * 1000, max: 100 } });
});

// Global Error Handler for API
app.use('/api', (err, req, res, next) => {
    console.error(err.stack);
    // Explicitly handle body-parser errors (like malformed JSON)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: "Invalid JSON format" });
    }

    // Hide stack trace in production
    const errorMsg = process.env.NODE_ENV === 'production' ? "Internal Server Error" : err.message;
    res.status(err.status || 500).json({ error: errorMsg });
});
app.get('*', (req, res) => {
    // Check if it's an API call or a file request
    if (req.path.startsWith('/api')) return;
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const server = app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Serving static files from: ${distPath}`);
});

// Increase timeout to 10 minutes (600000ms) for reasoning models
server.setTimeout(600000);

