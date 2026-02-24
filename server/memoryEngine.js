/**
 * 記憶引擎 — 結構化事件提取 + 智能上下文組裝
 * 使用 Claude Haiku 4.5 進行章節記憶提取
 */

/**
 * 從章節內容提取結構化記憶
 * @param {Object} claude - OpenAI 兼容客戶端（指向 Claude API）
 * @param {Object} params - 提取參數
 * @returns {Object} { events, character_snapshots, foreshadow_callbacks }
 */
async function extractChapterMemory(claude, {
    chapterContent, chapterTitle, chapterIndex,
    existingCharacters, novelTitle, genre, customLevels
}) {
    // 組裝已知角色資訊
    const charInfo = existingCharacters && existingCharacters.length > 0
        ? existingCharacters.map(c => `${c.name}（${c.role}${c.level ? '，' + c.level : ''}）`).join('、')
        : '暫無';

    // 等級體系
    const levelSystem = customLevels && customLevels.length > 0
        ? `\n【等級體系】${customLevels.join(' → ')}\n注意：power_level 必須使用上述等級體系中的具體等級，例如「${customLevels[0]}」「${customLevels[Math.min(2, customLevels.length - 1)]}」，不要用模糊描述。`
        : '';

    const prompt = `你是小說《${novelTitle}》（${genre}）的編輯助手。
請從第${chapterIndex}章「${chapterTitle}」中提取結構化記憶資訊。

【已知角色】${charInfo}
${levelSystem}
【章節內容】
${chapterContent}

請輸出以下 JSON（嚴格遵守格式）：
{
  "events": [
    {
      "event_type": "plot|foreshadow|character_change|power_up|relationship|worldbuilding|conflict|resolution",
      "summary": "50-100字的事件摘要，要包含具體的人名、地名、事件",
      "involved_characters": ["角色名1", "角色名2"],
      "tags": ["主線", "感情線", "伏筆:某某事件"],
      "importance": 1到10的整數
    }
  ],
  "character_snapshots": [
    {
      "name": "角色名",
      "role": "主角|女主|重要配角|配角|龍套",
      "location": "當前所在地",
      "power_level": "具體等級（如練氣三層、築基初期），不要用模糊描述",
      "emotional_state": "當前情緒/心理狀態",
      "relationships": {"對象名": "關係描述"},
      "injuries": null,
      "possessions": null,
      "key_action": "本章最關鍵的一個行為"
    }
  ],
  "foreshadow_callbacks": [
    {
      "keyword": "被回收伏筆的關鍵詞",
      "description": "如何回收的"
    }
  ]
}

規則：
- events 數量控制在 3-8 條，只記錄有意義的事件
- importance: 主線轉折=9-10, 重要伏筆=7-8, 一般劇情=5-6, 日常=3-4
- 伏筆類型(foreshadow)的 tags 必須包含 "伏筆:具體描述"
- character_snapshots 只記錄本章有出場且狀態有變化的角色
- name 必須與【已知角色】中的名字完全一致，新角色才用新名字
- role：根據角色在故事中的重要程度判斷，已知角色沿用其身份
- power_level：必須寫具體等級，不要寫「實力強大」「修為不凡」等模糊描述
- 如果本章回收了之前的伏筆，填寫 foreshadow_callbacks
- 無傷勢或無新物品時填 null
- 只輸出 JSON，不要其他文字。`;

    const response = await claude.chat.completions.create({
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
    });

    const text = response.choices[0].message.content.trim();
    // 嘗試提取 JSON（可能被 markdown code block 包裹）
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    return JSON.parse(jsonMatch[1].trim());
}

/**
 * 將提取的記憶寫入資料庫，並回寫角色卡動態狀態
 */
async function saveExtractedMemory(supabase, {
    novelId, chapterId, chapterIndex, extracted
}) {
    // 1. 寫入 chapter_events
    if (extracted.events && extracted.events.length > 0) {
        const eventRows = extracted.events.map(e => ({
            novel_id: novelId,
            chapter_id: chapterId,
            chapter_index: chapterIndex,
            event_type: e.event_type,
            summary: e.summary,
            involved_characters: e.involved_characters || [],
            tags: e.tags || [],
            importance: e.importance || 5,
            resolved: false,
        }));
        const { error: evtErr } = await supabase.from('chapter_events').insert(eventRows);
        if (evtErr) console.error("[MemoryEngine] Insert chapter_events failed:", evtErr.message);
        else console.log(`[MemoryEngine] Inserted ${eventRows.length} events`);
    }

    // 2. 寫入 character_timeline + 回寫角色卡
    if (extracted.character_snapshots && extracted.character_snapshots.length > 0) {
        for (const snap of extracted.character_snapshots) {
            // 寫入 timeline
            const { error: tlErr } = await supabase.from('character_timeline').insert({
                novel_id: novelId,
                character_name: snap.name,
                chapter_id: chapterId,
                chapter_index: chapterIndex,
                location: snap.location || null,
                power_level: snap.power_level || null,
                emotional_state: snap.emotional_state || null,
                relationships: snap.relationships || {},
                injuries: snap.injuries || null,
                possessions: snap.possessions || null,
                key_action: snap.key_action || null,
            });
            if (tlErr) console.error(`[MemoryEngine] Insert timeline for ${snap.name} failed:`, tlErr.message);
            else console.log(`[MemoryEngine] Inserted timeline for ${snap.name}`);

            // 回寫角色卡動態狀態
            const updates = {};
            if (snap.location) updates.current_location = snap.location;
            if (snap.power_level) updates.current_power_level = snap.power_level;
            if (snap.emotional_state) updates.current_emotional_state = snap.emotional_state;
            if (snap.injuries !== undefined) updates.current_injuries = snap.injuries;
            if (snap.possessions !== undefined) updates.current_possessions = snap.possessions;
            if (snap.relationships) updates.current_relationships = snap.relationships;
            updates.status_updated_at_chapter = chapterIndex;

            if (Object.keys(updates).length > 1) {
                const { data: updData, error: updErr } = await supabase
                    .from('characters')
                    .update(updates)
                    .eq('novel_id', novelId)
                    .eq('name', snap.name)
                    .select('id, name');
                if (updErr) console.error(`[MemoryEngine] Update character ${snap.name} failed:`, updErr.message);
                else console.log(`[MemoryEngine] Updated character ${snap.name}:`, updData?.length ? 'matched' : 'NO MATCH (name mismatch?)');
            }
        }
    }

    // 3. 標記已回收的伏筆
    if (extracted.foreshadow_callbacks && extracted.foreshadow_callbacks.length > 0) {
        for (const cb of extracted.foreshadow_callbacks) {
            // 模糊匹配：找到 summary 包含關鍵詞的未回收伏筆
            const { data: matches } = await supabase
                .from('chapter_events')
                .select('id')
                .eq('novel_id', novelId)
                .eq('event_type', 'foreshadow')
                .eq('resolved', false)
                .ilike('summary', `%${cb.keyword}%`)
                .limit(1);

            if (matches && matches.length > 0) {
                await supabase
                    .from('chapter_events')
                    .update({
                        resolved: true,
                        resolved_at_chapter: chapterIndex
                    })
                    .eq('id', matches[0].id);
            }
        }
    }
}

/**
 * 智能上下文組裝 — 從各層記憶中檢索相關資訊
 */
async function getSmartContext(supabase, {
    novelId, currentChapterIndex, selectedCharacterNames
}) {
    const context = {};

    // 1. 未回收伏筆（按重要度排序，最多 15 條）
    const { data: foreshadows } = await supabase
        .from('chapter_events')
        .select('chapter_index, summary, importance')
        .eq('novel_id', novelId)
        .eq('event_type', 'foreshadow')
        .eq('resolved', false)
        .order('importance', { ascending: false })
        .limit(15);

    context.unresolvedForeshadow = foreshadows && foreshadows.length > 0
        ? foreshadows.map(f => `- [第${f.chapter_index}章|重要度${f.importance}] ${f.summary}`).join('\n')
        : '';

    // 2. 近 20 章的高重要度事件
    const { data: recentEvents } = await supabase
        .from('chapter_events')
        .select('chapter_index, event_type, summary')
        .eq('novel_id', novelId)
        .gte('chapter_index', Math.max(1, currentChapterIndex - 20))
        .gte('importance', 6)
        .order('chapter_index', { ascending: false })
        .limit(20);

    context.relevantEvents = recentEvents && recentEvents.length > 0
        ? recentEvents.map(e => `[第${e.chapter_index}章|${e.event_type}] ${e.summary}`).join('\n')
        : '';

    // 3. 涉及選中角色的近期事件（補充）
    if (selectedCharacterNames && selectedCharacterNames.length > 0) {
        const { data: charEvents } = await supabase
            .from('chapter_events')
            .select('chapter_index, event_type, summary')
            .eq('novel_id', novelId)
            .overlaps('involved_characters', selectedCharacterNames)
            .gte('importance', 5)
            .order('chapter_index', { ascending: false })
            .limit(10);

        if (charEvents && charEvents.length > 0) {
            const existingSet = new Set((recentEvents || []).map(e => e.summary));
            const extra = charEvents.filter(e => !existingSet.has(e.summary));
            if (extra.length > 0) {
                context.characterEvents = extra
                    .map(e => `[第${e.chapter_index}章|${e.event_type}] ${e.summary}`)
                    .join('\n');
            }
        }
    }

    return context;
}

module.exports = {
    extractChapterMemory,
    saveExtractedMemory,
    getSmartContext,
};
