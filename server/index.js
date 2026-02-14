require('dotenv').config({ path: '../.env.local' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Serve Static Files from Vite build
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// API Root
app.get('/api', (req, res) => {
    res.json({ status: 'running', message: '幻靈寫作AI Backend is running.' });
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again later." }
});
app.use('/api/', limiter);

const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;
if (!apiKey) {
    console.error("CRITICAL: API Key not found in environment variables.");
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


const buildPrompt = (params) => {
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
    const previousContentText = chapter.content ? chapter.content.slice(-4000) : "(本章尚未有內容，這是開頭)";
    const defaultPersona = "你是一位擁有豐富想像力和精湛文筆的資深小說家。你的任務是根據提供的設定與大綱，撰寫或續寫精彩的小說正文。";
    const systemPersona = settings.systemPersona && settings.systemPersona.trim() !== '' ? settings.systemPersona : defaultPersona;

    return `
      【角色扮演指令 (System Persona)】
      ${systemPersona}
      【小說核心設定】
      - 標題: 《${settings.title}》
      - 類型: ${settings.genre}
      - 風格 (Style): ${settings.style || "正統小說風格"}
      - 基調 (Tone): ${settings.tone}
      【本章環境與場景氛圍 (Environment)】
      ${settings.background || "請根據劇情自動構建場景，注重氛圍渲染。"}
      【登場角色檔案 (Characters)】
      請務必還原角色的性格、說話語氣與行為邏輯：
      ${characterContext}
      【相關專有名詞 (Vocabulary)】
      請在行文中自然融入以下設定，不要生硬解釋：
      ${vocabContext}
      【歷史章節回顧 (Memory / Story So Far)】
      以下是之前章節的劇情摘要，請確保新寫的內容與前文邏輯連貫：
      ${previousContext || "無前情提要。"}
      【特殊指令 / 角色關係變動】
      ${relations || "無特殊變動"}
      【當前章節資訊】
      - 章節標題: ${chapter.title}
      - 本章當前已寫內容 (Context):
      ${previousContentText}
      【本次寫作任務：劇情大綱 (Outline)】
      請根據以下指示發展劇情，將大綱轉化為具體的文學描寫：
      ${instructions}
      【寫作具體要求 (Requirements)】
      請嚴格遵守以下寫作指導：
      ${requirements || "無特殊要求，請保持流暢。"}
      【撰寫要求】
      1. **沈浸感**: 多運用感官描寫來構建場景。
      2. **角色驅動**: 透過對話和行動推動劇情。
      3. **邏輯性**: 符合行為設定。
      4. **輸出格式**: 直接輸出小說正文，不包含回覆語。
      5. **禁止事項**: **絕對不要**在開頭重複章節標題、章節號碼或任何 Markdown 標題 (如 # 第一章)。直接從正文段落開始寫。
    `;
};

const getGoogleModelName = (modelSelection) => {
    const m = (modelSelection || '').toLowerCase();
    if (m.includes('pro')) return 'gemini-2.0-pro-exp-02-05';
    return 'gemini-2.0-flash';
};

app.post('/api/generate', async (req, res) => {
    try {
        const { model: modelSelection } = req.body;
        const prompt = buildPrompt(req.body);
        let content = "";

        if (modelSelection.startsWith('Google')) {
            const googleModel = genAI.getGenerativeModel({ model: getGoogleModelName(modelSelection) });
            const result = await googleModel.generateContent(prompt);
            content = result.response.text();
        } else if (modelSelection === 'DeepSeek R1' || modelSelection === 'DeepSeek V3.2') {
            if (!deepseek) throw new Error("DeepSeek API Key not configured.");
            const dsModel = modelSelection === 'DeepSeek R1' ? 'deepseek-reasoner' : 'deepseek-chat';
            const response = await deepseek.chat.completions.create({
                model: dsModel,
                messages: [{ role: "user", content: prompt }]
            });
            content = response.choices[0].message.content;
        } else if (modelSelection.startsWith('Qwen')) {
            if (!qwen) throw new Error("Qwen API Key not configured.");
            const qModel = modelSelection.includes('Max') ? 'qwen-max' : 'qwen-plus';
            const response = await qwen.chat.completions.create({
                model: qModel,
                messages: [{ role: "user", content: prompt }]
            });
            content = response.choices[0].message.content;
        } else if (modelSelection === 'Kimi') {
            if (!kimi) throw new Error("Kimi API Key not configured.");
            const response = await kimi.chat.completions.create({
                model: 'moonshot-v1-8k',
                messages: [{ role: "user", content: prompt }]
            });
            content = response.choices[0].message.content;
        } else if (modelSelection.startsWith('OpenRouter')) {
            if (!openRouter) throw new Error("OpenRouter API Key not configured.");

            let orModel = 'anthropic/claude-4.5-sonnet'; // Default fallback to latest Sonnet

            // Map user selections to OpenRouter IDs
            if (modelSelection.includes('Opus 4.6')) {
                orModel = 'anthropic/claude-opus-4.6';
            } else if (modelSelection.includes('Sonnet 4.5')) {
                orModel = 'anthropic/claude-4.5-sonnet';
            }

            const response = await openRouter.chat.completions.create({
                model: orModel,
                messages: [{ role: "user", content: prompt }]
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

app.post('/api/outline', async (req, res) => {
    try {
        const { chapter, settings, model: modelSelection } = req.body;
        const prompt = `為小說《${settings.title}》章節 ${chapter.title} 生成大綱。`;
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
            resultData = JSON.parse(response.choices[0].message.content);
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
        const { chapter, settings } = req.body;

        if (!deepseek) {
            throw new Error("DeepSeek API Key not configured.");
        }

        const prompt = `請對小說《${settings.title}》的章節《${chapter.title}》進行深度點評（Critique）。
        章節內容如下：
        ${chapter.content}
        
        撰寫要求：
        1. 從敘事節奏、角色動機、氛圍渲染三個維度分析。
        2. 點出寫得精彩的地方，以及建議修改或強化的細節。
        3. 提供一小段建議的風格修正方案。
        4. 使用繁體中文。`;

        const response = await deepseek.chat.completions.create({
            model: "deepseek-reasoner",
            messages: [
                { role: "system", content: "你是一位毒舌但專業的小說評論家，你的點評能直指核心並提供具體改善建議。" },
                { role: "user", content: prompt }
            ]
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

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);
    } catch (error) {
        console.error("Update Character AI Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// SPA Fallback: All non-API routes serve index.html
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

