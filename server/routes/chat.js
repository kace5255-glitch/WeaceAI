const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// --- Configuration & Initialization ---
const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// DeepSeek Client (Reasoning/Logic/Briefing)
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
let deepseek = null;
if (deepseekApiKey) {
    deepseek = new OpenAI({
        apiKey: deepseekApiKey,
        baseURL: 'https://api.deepseek.com'
    });
}

// Qwen Client (Production/Creative Writing)
const qwenApiKey = process.env.QWEN_API_KEY;
let qwen = null;
if (qwenApiKey) {
    qwen = new OpenAI({
        apiKey: qwenApiKey,
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    });
}

// --- Helper Functions ---

// 1. Context Builder: The "Smart Memory" Core
// Fetches S-Level (Critical), A-Level (Volume), and Recent Briefings
async function buildChatContext(supabase, novelId, currentChapterId, mode = 'standard') {
    let context = "";

    // Safety check: if no novelId, return empty context
    if (!novelId) return "";

    try {
        // A. Load S-Level (Critical Global) Briefings
        // These are the "Core Mysteries" or "Main Plot Points" that must never be forgotten.
        const { data: sBriefings } = await supabase
            .from('chapter_briefings')
            .select(`
                content, 
                chapters:chapter_id (title, volume_id)
            `)
            .eq('priority_level', 'S')
            // Note: In real production, we'd filter by novelId more efficiently. 
            // Here assuming briefings belong to chapters of the novel.
            .limit(10); // Safety limit

        if (sBriefings && sBriefings.length > 0) {
            context += `\n【🔥 核心伏筆與主線記憶 (S-Level)】\n${sBriefings.map(b => `[${b.chapters?.title || '未知章節'}]: ${b.content}`).join('\n')}\n`;
        }

        // B. Load A-Level (Current Volume) Briefings
        if (currentChapterId) {
            const { data: currentChapter } = await supabase
                .from('chapters')
                .select('volume_id, title')
                .eq('id', currentChapterId)
                .single();

            if (currentChapter?.volume_id) {
                // Get chapters in current volume first
                const { data: volChapters } = await supabase.from('chapters').select('id').eq('volume_id', currentChapter.volume_id);
                const volChapIds = volChapters?.map(c => c.id) || [];

                if (volChapIds.length > 0) {
                    const { data: volumeBriefings } = await supabase
                        .from('chapter_briefings')
                        .select('content, priority_level')
                        .in('chapter_id', volChapIds)
                        .in('priority_level', ['A', 'B']) // Get A and B for current volume
                        .limit(20);

                    const aLevels = volumeBriefings?.filter(b => b.priority_level === 'A') || [];

                    if (aLevels.length > 0) {
                        context += `\n【📖 本卷重要事件 (A-Level)】\n${aLevels.map(b => b.content).join('\n')}\n`;
                    }
                }
            }

            // C. Current Chapter Content (Standard/Detailed Mode)
            if (mode === 'standard' || mode === 'deep') {
                const { data: fullChapter } = await supabase
                    .from('chapters')
                    .select('content')
                    .eq('id', currentChapterId)
                    .single();

                if (fullChapter?.content) {
                    const text = fullChapter.content;
                    const truncated = text.length > 2000 ? `...(前文省略)\n${text.slice(-2000)}` : text;
                    context += `\n【📍 當前撰寫內容 (片段)】\n${truncated}\n`;
                }
            }
        }

        return context;
    } catch (err) {
        console.warn("Context build warning:", err.message);
        return ""; // Fail gracefully
    }
}

// 2. System Persona Builder - The "Triple Persona" Logic & 10-15 Point Plot
function buildSystemPersona(personaType = 'editor') {
    const baseIdentity = `你是一位兼具「金主讀者」、「白金作者」與「嚴格編輯」三合一身份的超級寫作搭檔。`;

    // Output Contract (The Hard Rules)
    const outputRules = `
【輸出規範 (Output Contract)】
1. 語言：繁體中文 (Traditional Chinese)。
2. 格式：Markdown 格式，條理分明。不要使用 XML 標籤。
3. 風格：直白有力，拒絕過度修辭與解釋性廢話。
`;

    let specificInstruction = "";

    switch (personaType) {
        case 'editor': // The logic checker
            specificInstruction = `
【當前模式：🛡️ 嚴格編輯 (Editor)】
你的任務是「找碴」與「糾錯」。
- 檢查邏輯漏洞：角色行為是否符合人設？能力體系是否崩壞？
- 檢查伏筆閉環：是否有未回收的伏筆？
- 檢查節奏：是否太拖沓？
請用犀利、客觀的語氣指出問題，並給出具體修改建議。不要吹捧。`;
            break;

        case 'muse': // The creative partner
            specificInstruction = `
【當前模式：💡 熱情繆思 (Muse/Author)】
你的任務是「發散」與「共創」。
- 提供腦洞：給出 3 個以上的劇情走向建議。
- 優化爽點：建議如何讓這段劇情更「爽」。
- 豐富細節：補充環境描寫或心理活動。
語氣要熱情、充滿鼓勵，像個並肩作戰的戰友。`;
            break;

        case 'reader': // The consumer
            specificInstruction = `
【當前模式：🔥 毒舌讀者 (Reader)】
你的任務是「吐槽」與「反饋」。
- 使用者體驗：這段我不喜歡，太水了！
- 期待管理：這裡斷章斷得好，我會想買下一章。
- 真實感受：主角這裡太聖母了，看了不爽。
請模仿讀者評論區的真實語氣（包含一些網路用語）。`;
            break;

        case 'plot_architect': // 10-15 Point Dynamic Plot
            specificInstruction = `
【當前模式：🏗️ 劇情架構師 (Plot Architect)】
你的任務是生成一份「細緻化章節大綱」。
請嚴格按照以下「10-15 點動態模組」格式輸出，將章節拆解為細緻的情節點。不要只給出 3-5 點，必須拆解到 10 點以上。

常用情節元件庫（請自由組合順序）：
- 【開場/動機】(引發事件)
- 【前期準備】(心理/物資)
- 【行動過程】(潛入細節/戰鬥)
- 【遭遇障礙】(陣法/守衛/突發狀況)
- 【應對/反轉】(智取/硬闖/救援)
- 【高潮/核心】(關鍵時刻/獲得物品)
- 【環境異象】(世界觀反應/氣氛渲染)
- 【撤退/結算】(驚險逃離/戰後盤點)
- 【配角互動】(正面/側面/多人交互)
- 【結尾/伏筆】(下章預告/懸念)

輸出範例：
1. 【開場】主角...
2. 【行動】...
...
12. 【結尾】...
`;
            break;

        default:
            specificInstruction = "請靈活運用三種視角，協助作者完成創作。";
    }

    return `${baseIdentity}\n${outputRules}\n${specificInstruction}`;
}

// --- API Routes ---

// GET /api/chat/:novelId/history
router.get('/:novelId/history', async (req, res) => {
    const { novelId } = req.params;
    const { limit = 50, before } = req.query;
    const supabase = req.supabase;

    try {
        let { data: session } = await supabase.from('chat_sessions').select('id').eq('novel_id', novelId).single();
        if (!session) {
            const { data: newSession, error } = await supabase.from('chat_sessions').insert({ novel_id: novelId }).select().single();
            if (error) throw error;
            session = newSession;
        }

        let query = supabase.from('chat_messages').select('*').eq('session_id', session.id).order('created_at', { ascending: false }).limit(parseInt(limit));
        if (before) query = query.lt('created_at', before);

        const { data: messages, error } = await query;
        if (error) throw error;

        res.json({ session_id: session.id, messages: messages.reverse() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chat
router.post('/', async (req, res) => {
    const { message, novelId, currentChapterId, model = 'Qwen-Plus', intent = 'chat' } = req.body;
    const supabase = req.supabase;

    try {
        // 1. Session Init
        let { data: session } = await supabase.from('chat_sessions').select('id').eq('novel_id', novelId).single();
        if (!session) {
            const { data: newSession } = await supabase.from('chat_sessions').insert({ novel_id: novelId }).select().single();
            session = newSession;
        }

        // 2. Determine Persona & Model based on Intent
        let targetPersona = 'muse';
        let activeModel = model;

        if (intent === 'plot') {
            targetPersona = 'plot_architect'; // 10-15 point plot
            // Plot generation is complex, prefer Strong Logic (Qwen-Max or R1 or GPT-4)
            if (activeModel === 'DeepSeek V3') activeModel = 'DeepSeek R1';
        } else if (intent === 'critique') {
            targetPersona = 'editor';
            activeModel = 'DeepSeek R1'; // Logic check
        } else if (intent === 'reader_feedback') {
            targetPersona = 'reader';
            activeModel = 'DeepSeek V3'; // Fast feedback
        }

        // 3. Save User Message
        await supabase.from('chat_messages').insert({
            session_id: session.id, role: 'user', content: message,
            model_used: null, context_mode: intent
        });

        // 4. Build Context
        const contextData = await buildChatContext(supabase, novelId, currentChapterId, intent === 'plot' ? 'standard' : 'deep');
        const systemPrompt = buildSystemPersona(targetPersona);

        const fullPrompt = `
${systemPrompt}

【參考資料庫 (Briefing Brain)】
${contextData}

【用戶指令】
${message}
`;

        // 5. Model Execution
        let aiContent = "";
        let tokensIn = 0, tokensOut = 0;

        if (activeModel.includes('DeepSeek')) {
            if (!deepseek) throw new Error("DeepSeek Config Missing");
            const isReasoning = activeModel.includes('R1');
            const dsModel = isReasoning ? 'deepseek-reasoner' : 'deepseek-chat';

            const response = await deepseek.chat.completions.create({
                model: dsModel,
                messages: isReasoning
                    ? [{ role: 'user', content: fullPrompt }]
                    : [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Context:\n${contextData}\n\nUser:\n${message}` }],
                temperature: isReasoning ? undefined : 0.8
            });
            aiContent = response.choices[0].message.content;
            tokensIn = response.usage?.prompt_tokens;
            tokensOut = response.usage?.completion_tokens;

        } else if (activeModel.startsWith('Qwen')) {
            if (!qwen) throw new Error("Qwen Config Missing");
            const response = await qwen.chat.completions.create({
                model: activeModel === 'Qwen-Max' ? 'qwen-max' : 'qwen-plus',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Context:\n${contextData}\n\nQuery:\n${message}` }
                ]
            });
            aiContent = response.choices[0].message.content;
            tokensIn = response.usage?.total_tokens;
        } else {
            const googleModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await googleModel.generateContent(fullPrompt);
            aiContent = result.response.text();
        }

        // 6. Save AI Response
        const { data: aiMsg } = await supabase.from('chat_messages').insert({
            session_id: session.id, role: 'assistant', content: aiContent,
            model_used: activeModel, context_mode: intent,
            tokens_input: tokensIn, tokens_output: tokensOut
        }).select().single();

        res.json({ message: aiMsg });

    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
