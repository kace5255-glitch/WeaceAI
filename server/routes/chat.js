const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { buildChatPrompt } = require('../prompts/promptBuilder');

// --- AI Client Initialization ---

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
let deepseek = null;
if (deepseekApiKey) {
    deepseek = new OpenAI({ apiKey: deepseekApiKey, baseURL: 'https://api.deepseek.com' });
}

const qwenApiKey = process.env.QWEN_API_KEY;
let qwen = null;
if (qwenApiKey) {
    qwen = new OpenAI({ apiKey: qwenApiKey, baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' });
}

const claudeApiKey = process.env.CLAUDE_API_KEY;
let claude = null;
if (claudeApiKey) {
    claude = new OpenAI({
        apiKey: claudeApiKey,
        baseURL: process.env.CLAUDE_BASE_URL || 'https://api.penguinsaichat.dpdns.org/v1'
    });
}

// --- Model Name Mapping (thinking / standard) ---
const CLAUDE_MODEL_MAP = {
    'Claude Sonnet': { thinking: 'claude-sonnet-4-6-thinking', standard: 'claude-sonnet-4-6' },
    'Claude Opus': { thinking: 'claude-opus-4-6-thinking', standard: 'claude-opus-4-6' },
    'Claude Haiku': { thinking: 'claude-haiku-4-5-20251001', standard: 'claude-haiku-4-5-20251001' },
};

// --- Points ---
const CHAT_POINTS = { chat: 3, chat_image: 5 };

// --- Helper: model supports images ---
const supportsImages = (model) => {
    const m = (model || '').toLowerCase();
    return m.includes('google') || m.includes('gemini') || m.includes('claude');
};

// --- Helper: build OpenAI-compatible messages with optional image support ---
function buildOpenAIMessages(systemMsg, chatHistory, hasImages, imageUrls) {
    const messages = [{ role: 'system', content: systemMsg }, ...chatHistory];
    if (hasImages && imageUrls && imageUrls.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const contentParts = [{ type: 'text', text: lastMsg.content }];
        for (const url of imageUrls) {
            contentParts.push({ type: 'image_url', image_url: { url } });
        }
        messages[messages.length - 1] = { role: 'user', content: contentParts };
    }
    return messages;
}

// --- Helper: stream from OpenAI-compatible API ---
async function streamOpenAICompatible({ client, model, messages, temperature, sendSSE }) {
    const params = { model, messages, stream: true };
    if (temperature !== undefined) params.temperature = temperature;
    const stream = await client.chat.completions.create(params);
    let fullContent = '';
    for await (const chunk of stream) {
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) {
            fullContent += text;
            sendSSE({ token: text });
        }
    }
    return fullContent;
}
// ═══ CRUD 端點 ═══

// GET /conversations — 取得用戶所有對話
router.get('/conversations', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { data, error } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('user_id', req.user.id)
            .order('pinned', { ascending: false })
            .order('updated_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /conversations — 新建對話
router.post('/conversations', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { title, model } = req.body || {};
        const { data, error } = await supabase
            .from('chat_conversations')
            .insert({
                user_id: req.user.id,
                title: title || '新對話',
                model: model || 'Google Flash'
            })
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PATCH /conversations/:id — 更新對話
router.patch('/conversations/:id', async (req, res) => {
    try {
        const supabase = req.supabase;
        const updates = {};
        if (req.body.title !== undefined) updates.title = req.body.title;
        if (req.body.pinned !== undefined) updates.pinned = req.body.pinned;
        if (req.body.model !== undefined) updates.model = req.body.model;
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('chat_conversations')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /conversations/:id — 刪除對話
router.delete('/conversations/:id', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { error } = await supabase
            .from('chat_conversations')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /conversations/:id/messages — 取得對話訊息
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', req.params.id)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /messages/:id — 刪除指定訊息
router.delete('/messages/:id', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /messages/:id/after — 刪除指定訊息之後的所有訊息
router.delete('/messages/:id/after', async (req, res) => {
    try {
        const supabase = req.supabase;
        // 先取得該訊息的 created_at
        const { data: msg, error: fetchErr } = await supabase
            .from('chat_messages')
            .select('conversation_id, created_at')
            .eq('id', req.params.id)
            .single();
        if (fetchErr) throw fetchErr;

        // 刪除該對話中 created_at > 該訊息的所有訊息
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('conversation_id', msg.conversation_id)
            .gt('created_at', msg.created_at);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══ SSE 串流端點 ═══
router.post('/stream', async (req, res) => {
    const supabase = req.supabase;
    const { conversationId, message, imageUrls, model, skipSaveUser, mode, thinking } = req.body;

    if (!conversationId || typeof conversationId !== 'string') {
        return res.status(400).json({ error: '無效的對話 ID' });
    }
    if (!message || typeof message !== 'string' || message.length > 50000) {
        return res.status(400).json({ error: '訊息內容無效或超過長度限制' });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendSSE = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    // SSE 心跳（防止連線超時）
    const heartbeat = setInterval(() => {
        try { res.write(`data: ${JSON.stringify({ heartbeat: true })}\n\n`); } catch {}
    }, 15000);
    req.on('close', () => clearInterval(heartbeat));

    try {
        // 1. 點數檢查（不扣除，成功後才扣）
        const hasImages = imageUrls && imageUrls.length > 0;
        const pointAction = hasImages ? 'chat_image' : 'chat';
        const cost = CHAT_POINTS[pointAction];

        // 查詢用戶點數
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, daily_points, task_points, permanent_points')
            .eq('user_id', req.user.id)
            .maybeSingle();

        const isAdmin = profile?.role === 'admin';
        if (!isAdmin) {
            const total = (profile?.daily_points || 0) + (profile?.task_points || 0) + (profile?.permanent_points || 0);
            if (total < cost) {
                sendSSE({ error: `點數不足，需要 ${cost} 點，剩餘 ${total} 點` });
                return res.end();
            }
        }

        // 2. 儲存用戶訊息（regenerate 時跳過）
        if (!skipSaveUser) {
            await supabase.from('chat_messages').insert({
                conversation_id: conversationId,
                role: 'user',
                content: message,
                image_urls: imageUrls || [],
                model: model
            });
        }

        // 3. 載入對話歷史（最近 30 條）
        const { data: history } = await supabase
            .from('chat_messages')
            .select('role, content, image_urls')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(30);

        const chatHistory = (history || []).map(m => ({
            role: m.role,
            content: m.content
        }));
        // 4. 呼叫 AI（串流）
        const systemMsg = buildChatPrompt(mode || 'auto');
        let fullContent = '';
        const activeModel = model || 'Claude Haiku';

        if (activeModel.startsWith('Google') || activeModel.startsWith('Gemini')) {
            // Google 模型改用 Claude Haiku
            if (!claude) throw new Error('Claude API Key 未配置');
            const messages = buildOpenAIMessages(systemMsg, chatHistory, hasImages, imageUrls);
            fullContent = await streamOpenAICompatible({
                client: claude, model: 'claude-haiku-4-5-20251001', messages, temperature: 0.8, sendSSE
            });

        } else if (CLAUDE_MODEL_MAP[activeModel] || activeModel.startsWith('Claude')) {
            if (!claude) throw new Error('Claude API Key 未配置');
            const messages = buildOpenAIMessages(systemMsg, chatHistory, hasImages, imageUrls);
            const mapping = CLAUDE_MODEL_MAP[activeModel];
            const claudeModel = mapping
                ? (thinking ? mapping.thinking : mapping.standard)
                : 'claude-haiku-4-5-20251001';
            fullContent = await streamOpenAICompatible({
                client: claude, model: claudeModel, messages, temperature: 0.8, sendSSE
            });

        } else if (activeModel.startsWith('DeepSeek')) {
            if (!deepseek) throw new Error('DeepSeek API Key 未配置');
            const dsModel = thinking ? 'deepseek-reasoner' : 'deepseek-chat';
            const messages = [{ role: 'system', content: systemMsg }, ...chatHistory];
            fullContent = await streamOpenAICompatible({
                client: deepseek, model: dsModel, messages,
                temperature: thinking ? undefined : 0.8, sendSSE
            });

        } else if (activeModel.startsWith('Qwen')) {
            if (!qwen) throw new Error('Qwen API Key 未配置');
            const qModel = thinking ? 'qwen-max' : 'qwen-plus';
            const messages = [{ role: 'system', content: systemMsg }, ...chatHistory];
            fullContent = await streamOpenAICompatible({
                client: qwen, model: qModel, messages, temperature: 0.8, sendSSE
            });
        } else {
            // 預設 Claude Haiku
            if (!claude) throw new Error('Claude API Key 未配置');
            const messages = buildOpenAIMessages(systemMsg, chatHistory, false, null);
            fullContent = await streamOpenAICompatible({
                client: claude, model: 'claude-haiku-4-5-20251001', messages, temperature: 0.8, sendSSE
            });
        }

        // 5. 儲存 assistant 訊息
        const { data: aiMsg } = await supabase.from('chat_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullContent,
            model: activeModel
        }).select('id').single();

        sendSSE({ done: true, messageId: aiMsg?.id || '' });

        // 6. 成功後扣除點數
        if (!isAdmin) {
            const { data: freshProfile } = await supabase
                .from('user_profiles')
                .select('daily_points, task_points, permanent_points')
                .eq('user_id', req.user.id)
                .maybeSingle();
            let daily = freshProfile?.daily_points || 0;
            let task = freshProfile?.task_points || 0;
            let permanent = freshProfile?.permanent_points || 0;
            let rem = cost;
            if (daily > 0) { const d = Math.min(daily, rem); daily -= d; rem -= d; }
            if (rem > 0 && task > 0) { const d = Math.min(task, rem); task -= d; rem -= d; }
            if (rem > 0 && permanent > 0) { const d = Math.min(permanent, rem); permanent -= d; rem -= d; }
            await supabase.from('user_profiles')
                .update({ daily_points: daily, task_points: task, permanent_points: permanent })
                .eq('user_id', req.user.id);
        }

        // 7. 更新 conversation.updated_at
        await supabase.from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        // 8. 首次對話自動生成標題（3 秒 timeout）
        const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('role', 'user');

        if (count <= 1) {
            const titlePromise = (async () => {
                const titleClient = claude || deepseek || qwen;
                if (!titleClient) throw new Error('No AI client available for title generation');
                const titleResult = await titleClient.chat.completions.create({
                    model: claude ? 'claude-haiku-4-5-20251001' : (deepseek ? 'deepseek-chat' : 'qwen-plus'),
                    messages: [{ role: 'user', content: `根據以下用戶訊息，生成一個 5-10 字的繁體中文對話標題，只輸出標題文字，不要引號或其他符號：\n\n${message}` }],
                    max_tokens: 50
                });
                const autoTitle = (titleResult.choices[0]?.message?.content || '').trim().slice(0, 30);
                if (autoTitle) {
                    await supabase.from('chat_conversations')
                        .update({ title: autoTitle })
                        .eq('id', conversationId);
                    sendSSE({ titleUpdate: autoTitle });
                }
            })().catch(e => console.warn('自動標題生成失敗:', e.message));

            const timeout = new Promise(resolve => setTimeout(resolve, 3000));
            await Promise.race([titlePromise, timeout]);
        }

        clearInterval(heartbeat);
        res.end();
    } catch (error) {
        clearInterval(heartbeat);
        console.error('Chat stream error:', error);
        try { sendSSE({ error: error.message }); } catch {}
        res.end();
    }
});

module.exports = router;
