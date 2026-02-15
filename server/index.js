require('dotenv').config({ path: '../.env.local' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 8080; // Zeabur default is often 8080, fallback to 8080

console.log(`Starting server with NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Port detected: ${process.env.PORT} (using ${port})`);

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("WARNING: Supabase URL or Anon Key missing. Auth features will fail.");
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

// Initialize Kimi (Moonshot compatible API)
const kimiApiKey = process.env.KIMI_API_KEY;
let kimi;
if (kimiApiKey) {
    kimi = new OpenAI({
        apiKey: kimiApiKey,
        baseURL: 'https://api.moonshot.cn/v1'
    });
}

// Initialize OpenRouter (Anthropic/Other models)
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
let openRouter;
if (openRouterApiKey) {
    openRouter = new OpenAI({
        apiKey: openRouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
            "HTTP-Referer": "http://localhost:3000", // Optional, for including your app on openrouter.ai rankings.
            "X-Title": "MuseAI", // Optional. Shows in rankings on openrouter.ai.
        }
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


// 建構 System Prompt — AI 的角色人設與寫作規範
const buildSystemPrompt = (params) => {
    const { settings } = params;
    const defaultPersona = `你是一位擁有二十年經驗的頂尖華語小說家，精通敘事節奏、人物心理刻畫與場景構建。
你的文風兼具文學性與可讀性，能讓讀者一旦開始閱讀就欲罷不能。
你深諳「展示而非告知(Show, Don't Tell)」的敘事原則，善用衝突、懸念與情感張力驅動故事。`;
    const systemPersona = settings.systemPersona && settings.systemPersona.trim() !== '' ? settings.systemPersona : defaultPersona;

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

★ 敘事技巧：
1. 開頭即入戲 — 用衝突、懸念或強烈感官畫面開場，禁止平鋪直敘或概述
2. 場景結構 — 每個場景遵循「觸發事件→衝突升級→轉折或懸念」的節奏
3. 長短句交替 — 渲染氛圍時用長句鋪陳，緊張時用短句加速，營造呼吸感
4. 伏筆藝術 — 適時埋下細節線索，為後續揭曉做鋪墊，增加重讀價值

★ 角色塑造：
5. Show Don't Tell — 用行動、對話、微表情、下意識動作展現性格，嚴禁「他是個善良的人」這類直述
6. 角色弧光 — 角色每次出場都要有微妙的成長、動搖或變化
7. 語言即性格 — 每個角色的語氣、用詞習慣、句式長短必須有鮮明辨識度
8. 內心刻畫 — 在關鍵抉擇時展現角色的內心掙扎、矛盾與慾望

★ 文學品質：
9. 五感沉浸 — 視、聽、觸、嗅、味至少交叉運用兩種以上，構建立體場景
10. 環境映射情緒 — 場景描寫必須反映或對比角色的內在情感（情景交融）
11. 意象創新 — 運用新穎的比喻與意象，絕對避免「月光如水」「心如刀割」等陳腔濫調
12. 留白與暗示 — 適度留白讓讀者自行想像，不要過度解釋角色情感或事件意義

★ 成癮機制：
13. 微懸念鉤子 — 每段落結尾留下一個小疑問或期待感，讓讀者想繼續讀
14. 情感投資 — 讓讀者深度共情角色，為他們的命運揪心
15. 衝突升級 — 隨著篇幅推進，衝突層次應逐步加深，不要早早化解張力

★ 網文節奏控制：
16. 避免劇情拖沓 — 若感覺節奏變慢，立即增加人物矛盾衝突，讓劇情跌宕起伏
17. 爽點設置 — 適時安排打臉、裝逼、扮豬吃老虎、主角碾壓等經典網文橋段，給讀者爽感
18. 對話直白 — 人物對話要符合性格，避免文縐縐的古言，讓話語直白、有力、接地氣
19. 章節鉤子 — 每章結尾必須留下懸念或衝突高潮，讓讀者欲罷不能、忍不住點下一章
20. 邏輯一致 — 嚴格把握劇情邏輯，前後設定不矛盾，人物行動符合性格與動機

★ 格式規範：
21. 直接輸出小說正文，不包含任何回覆語、解釋、元資訊或「以下是...」等開場白
22. 絕對不要在開頭重複章節標題、章節號碼或任何 Markdown 標題（如 # 第一章）
23. 使用正確的中文標點：「」用於對話、——用作破折號、……用作省略號，禁止使用英文標點
24. 【強制格式】每個段落的開頭必須有兩個全形空格（　　），這是中文排版的硬性規定。不要使用 Markdown 的列表符號。`;
};

// 建構 User Prompt — 具體的寫作任務與上下文
const buildUserPrompt = (params) => {
    const { chapter, characters, vocabularies, settings, instructions, requirements, relations, previousContext } = params;

    const characterContext = characters && characters.length > 0
        ? characters.map(c => `> **${c.name}** (${c.gender === 'male' ? '男' : c.gender === 'female' ? '女' : '其他'} | ${c.role})
     - 性格特徵: ${c.traits}
     - 當前狀態: ${c.status}
     - 等級/能力: ${c.level || '未知'}`).join('\n')
        : "無特定登場角色，請根據上下文自由發揮。";

    const vocabContext = vocabularies && vocabularies.length > 0
        ? vocabularies.map(v => `> **${v.name}** [${v.category}]: ${v.description}`).join('\n')
        : "無特定詞條";

    const previousContentText = chapter.content ? chapter.content.slice(-6000) : "(本章尚未有內容，這是開頭)";

    return `【本章環境與場景氛圍】
${settings.background || "請根據劇情自動構建場景，注重氛圍渲染與情景交融。"}

【登場角色檔案】
請務必還原角色的性格、說話語氣與行為邏輯，讓每個人物「活」起來：
${characterContext}

【相關專有名詞與世界觀設定】
在行文中自然融入以下設定，讓讀者在不知不覺中理解世界觀，禁止生硬的百科式解釋：
${vocabContext}

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
- [重要] 每個段落請務必以兩個全形空格（　　）開頭。`;
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
            if (!deepseek) throw new Error("DeepSeek API Key not configured.");
            const dsModel = modelSelection === 'DeepSeek R1' ? 'deepseek-reasoner' : 'deepseek-chat';
            const messages = dsModel === 'deepseek-reasoner'
                ? [{ role: "user", content: combinedPrompt }]
                : [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }];
            const response = await deepseek.chat.completions.create({
                model: dsModel,
                messages: messages,
                temperature: dsModel === 'deepseek-reasoner' ? undefined : temperature
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
        } else if (modelSelection === 'Kimi') {
            if (!kimi) throw new Error("Kimi API Key not configured.");
            const response = await kimi.chat.completions.create({
                model: 'moonshot-v1-8k',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection.startsWith('OpenRouter')) {
            if (!openRouter) throw new Error("OpenRouter API Key not configured.");

            let orModel = 'anthropic/claude-4.5-sonnet';
            if (modelSelection.includes('Opus 4.6')) {
                orModel = 'anthropic/claude-opus-4.6';
            } else if (modelSelection.includes('Sonnet 4.5')) {
                orModel = 'anthropic/claude-4.5-sonnet';
            }

            const response = await openRouter.chat.completions.create({
                model: orModel,
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
        const { prompt, model: modelSelection = 'Google Flash' } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ error: '請提供世界觀描述提示' });
        }

        const systemPrompt = `你是一位專業的小說世界觀架構師。請根據用戶的描述，生成一份結構完整、詳細的世界觀設定文件。

請使用以下結構組織內容（使用純文字格式，用 emoji 作為區段標題）：

🌍 世界背景
（世界的基本架構、時代背景、核心概念）

⚔️ 力量體系
（修煉/魔法/科技體系、等級劃分、突破條件）

🏰 勢力分佈
（主要門派/國家/組織、勢力關係、政治格局）

👥 種族與物種
（主要種族、特殊生物、種族特性）

📜 歷史大事件
（重要歷史節點、影響深遠的事件）

🔮 特殊規則
（世界獨特的運行規則、禁忌、天道法則）

📍 重要地點
（關鍵地理、標誌性場所）

要求：
1. 內容豐富且具有內在邏輯一致性
2. 每個區段 3-5 個要點
3. 使用繁體中文
4. 總字數控制在 800-1500 字`;

        const userPrompt = `請根據以下描述生成世界觀設定：\n\n${prompt}`;
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
        } else if (modelSelection.startsWith('DeepSeek')) {
            if (!deepseek) throw new Error("DeepSeek API Key not configured.");
            const response = await deepseek.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'Kimi') {
            if (!kimi) throw new Error("Kimi API Key not configured.");
            const response = await kimi.chat.completions.create({
                model: 'moonshot-v1-8k',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'Claude Sonnet') {
            if (!openRouter) throw new Error("OpenRouter API Key not configured.");
            const response = await openRouter.chat.completions.create({
                model: 'anthropic/claude-sonnet-4',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'GPT-4o') {
            if (!openRouter) throw new Error("OpenRouter API Key not configured.");
            const response = await openRouter.chat.completions.create({
                model: 'openai/gpt-4o',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature
            });
            content = response.choices[0].message.content;
        } else {
            // 預設用 Google Flash
            const googleModel = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction: systemPrompt
            });
            const result = await googleModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: { temperature }
            });
            content = result.response.text();
        }

        res.json({ content });
    } catch (error) {
        console.error("Worldview Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/outline', async (req, res) => {
    try {
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

        const model = genAI.getGenerativeModel({ model: getGoogleModelName(modelSelection) });
        const result = await model.generateContent(prompt);
        res.json({ content: result.response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/character', async (req, res) => {
    try {
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

app.post('/api/briefing', async (req, res) => {
    try {
        const { content, title } = req.body;

        if (!deepseek) {
            throw new Error("DeepSeek API Key not configured.");
        }

        const prompt = `請為以下章節撰寫一份簡報（Briefing）。章節標題是《${title}》。
        內容如下：
        ${content}
        
        撰寫要求：
        1. 摘要本章核心情節。
        2. 紀錄角色成長或關係變動。
        3. 標記關鍵伏筆或重要資訊。
        4. 使用繁體中文。`;

        const response = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "你是一位資深編輯，擅長撰寫小說章節簡報。" },
                { role: "user", content: prompt }
            ]
        });

        res.json({ content: response.choices[0].message.content });
    } catch (error) {
        console.error("DeepSeek Briefing Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/critique', async (req, res) => {
    try {
        const { chapter, settings, characters, vocabularies } = req.body;

        if (!deepseek) {
            throw new Error("DeepSeek API Key not configured.");
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

        const response = await deepseek.chat.completions.create({
            model: "deepseek-reasoner",
            messages: [
                { role: "system", content: "你是一位資深網文編輯，擁有十年審稿經驗。你的點評專業、犀利、實用，能夠直指問題核心並提供可執行的改進方案。你深諳網文讀者心理，知道什麼樣的內容能讓讀者付費追更。" },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        });

        res.json({ content: response.choices[0].message.content });
    } catch (error) {
        console.error("DeepSeek Critique Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/update-character', async (req, res) => {
    try {
        const { chapterContent, character, model: modelSelection } = req.body;

        if (!deepseek) {
            throw new Error("DeepSeek API Key not configured.");
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

        const response = await deepseek.chat.completions.create({
            model: "deepseek-reasoner",
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
        const { suggestion, chapterContent, settings } = req.body;

        if (!suggestion || !chapterContent) {
            return res.status(400).json({ error: "Missing suggestion or chapter content" });
        }

        if (!deepseek) {
            throw new Error("DeepSeek API Key not configured.");
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

        const response = await deepseek.chat.completions.create({
            model: "deepseek-chat", // Or reasoner if needed, but chat should be enough for extraction
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

