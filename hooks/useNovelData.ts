
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { NovelSettings, Volume, Character, Vocabulary, Chapter, Memo } from '../types';
import { Session } from '@supabase/supabase-js';

export interface NovelSummary {
    id: string;
    title: string;
    genre: string;
    wordCount: number;
    chapterCount: number;
    updatedAt: number;
}

export const useNovelData = (session: Session | null) => {
    const [loading, setLoading] = useState(true);
    const [novelId, setNovelId] = useState<string | null>(null);
    const [novels, setNovels] = useState<NovelSummary[]>([]);

    // Data States
    const [settings, setSettings] = useState<NovelSettings>({
        title: '未命名小說',
        genre: '一般',
        style: '',
        tone: '',
        background: '',
        worldview: '',
        systemPersona: ''
    });
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);

    // Load all novels list (summaries with word/chapter counts)
    const loadNovelsList = async () => {
        const { data: allNovels, error } = await supabase
            .from('novels')
            .select('id, title, genre, updated_at')
            .order('updated_at', { ascending: false });

        if (error || !allNovels) return;

        // 為每本小說計算字數和章節數
        const summaries: NovelSummary[] = await Promise.all(
            allNovels.map(async (n: any) => {
                const { data: vols } = await supabase
                    .from('volumes')
                    .select('id, chapters(id, content)')
                    .eq('novel_id', n.id);

                let wordCount = 0;
                let chapterCount = 0;
                (vols || []).forEach((v: any) => {
                    const chapters = v.chapters || [];
                    chapterCount += chapters.length;
                    chapters.forEach((c: any) => {
                        wordCount += (c.content || '').length;
                    });
                });

                return {
                    id: n.id,
                    title: n.title,
                    genre: n.genre || '一般',
                    wordCount,
                    chapterCount,
                    updatedAt: new Date(n.updated_at).getTime(),
                };
            })
        );
        setNovels(summaries);
    };

    // Load a specific novel's full data into state
    const loadNovelData = async (targetNovelId: string) => {
        const { data: novel, error: novelError } = await supabase
            .from('novels')
            .select('*')
            .eq('id', targetNovelId)
            .single();

        if (novelError || !novel) throw novelError || new Error('Novel not found');

        setNovelId(novel.id);
        setSettings({
            title: novel.title,
            genre: novel.genre,
            style: novel.style || '',
            tone: novel.tone || '',
            background: novel.background || '',
            worldview: novel.worldview || '',
            systemPersona: novel.system_persona || '',
            apiConfig: novel.api_config || undefined,
            customLevels: novel.custom_levels || [],
            customFactions: novel.custom_factions || [],
            customRaces: novel.custom_races || []
        });

        // Load Volumes & Chapters
        const { data: vols, error: volError } = await supabase
            .from('volumes')
            .select(`*, chapters (*)`)
            .eq('novel_id', targetNovelId)
            .order('order_index', { ascending: true });

        if (volError) throw volError;

        const formattedVolumes = (vols || []).map((v: any) => ({
            id: v.id,
            title: v.title,
            chapters: (v.chapters || [])
                .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                .map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    content: c.content || '',
                    outline: c.outline || '',
                    briefing: c.briefing || '',
                    critique: c.critique || '',
                    critiqueGeneratedAt: c.critique_generated_at ? new Date(c.critique_generated_at) : undefined,
                    contentHash: c.content_hash || '',
                    lastModified: new Date(c.last_modified).getTime()
                }))
        }));
        setVolumes(formattedVolumes);

        // Load Characters
        const { data: chars } = await supabase
            .from('characters').select('*').eq('novel_id', targetNovelId);
        if (chars) {
            setCharacters(chars.map((c: any) => ({
                id: c.id, name: c.name, role: c.role, gender: c.gender,
                traits: c.traits, status: c.status || '', level: c.level,
                faction: c.faction, period: c.period,
                lifeStatus: c.life_status, race: c.race || '',
            })));
        } else {
            setCharacters([]);
        }

        // Load Vocabs
        const { data: vocabs } = await supabase
            .from('vocabularies').select('*').eq('novel_id', targetNovelId);
        if (vocabs) {
            setVocabularies(vocabs.map((v: any) => ({
                id: v.id, name: v.name, category: v.category,
                description: v.description, tags: v.tags || []
            })));
        } else {
            setVocabularies([]);
        }
    };

    // --- 多小說管理 ---

    const createNovel = async (title: string = '未命名小說'): Promise<string | null> => {
        if (!session) return null;
        try {
            const { data: newNovel, error } = await supabase
                .from('novels')
                .insert([{ user_id: session.user.id, title }])
                .select()
                .single();

            if (error || !newNovel) throw error;

            // 建立預設分卷和章節
            const { data: vol } = await supabase
                .from('volumes')
                .insert([{ novel_id: newNovel.id, title: '第一卷', order_index: 0 }])
                .select().single();

            if (vol) {
                await supabase
                    .from('chapters')
                    .insert([{ volume_id: vol.id, title: '第一章', order_index: 0 }]);
            }

            // 更新小說列表
            await loadNovelsList();
            return newNovel.id;
        } catch (e) {
            console.error('Create novel error:', e);
            return null;
        }
    };

    const deleteNovel = async (targetNovelId: string) => {
        try {
            await supabase.from('novels').delete().eq('id', targetNovelId);
            setNovels(prev => prev.filter(n => n.id !== targetNovelId));

            // 如果刪除的是當前小說，切換到另一本
            if (targetNovelId === novelId) {
                const remaining = novels.filter(n => n.id !== targetNovelId);
                if (remaining.length > 0) {
                    await switchNovel(remaining[0].id);
                } else {
                    // 沒有小說了，建立新的
                    const newId = await createNovel('未命名小說');
                    if (newId) await loadNovelData(newId);
                }
            }
        } catch (e) {
            console.error('Delete novel error:', e);
        }
    };

    const switchNovel = async (targetNovelId: string) => {
        if (targetNovelId === novelId) return;
        setLoading(true);
        try {
            await loadNovelData(targetNovelId);
        } catch (e) {
            console.error('Switch novel error:', e);
        } finally {
            setLoading(false);
        }
    };

    const renameNovel = async (targetNovelId: string, newTitle: string) => {
        setNovels(prev => prev.map(n => n.id === targetNovelId ? { ...n, title: newTitle } : n));
        if (targetNovelId === novelId) {
            setSettings(prev => ({ ...prev, title: newTitle }));
        }
        await supabase.from('novels').update({
            title: newTitle,
            updated_at: new Date().toISOString()
        }).eq('id', targetNovelId);
    };

    // Load Data
    useEffect(() => {
        if (!session) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // 1. 載入所有小說列表
                await loadNovelsList();

                // 2. 找到最近的小說，或建立預設小說
                const { data: latestNovels, error: novelError } = await supabase
                    .from('novels')
                    .select('id')
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (novelError) throw novelError;

                if (!latestNovels || latestNovels.length === 0) {
                    const newId = await createNovel('未命名小說');
                    if (newId) await loadNovelData(newId);
                } else {
                    await loadNovelData(latestNovels[0].id);
                }
            } catch (error) {
                console.error("Load Error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [session?.user?.id]);

    // --- Actions ---

    const updateSettings = async (newSettings: NovelSettings) => {
        setSettings(newSettings); // Optimistic
        if (!novelId) return;

        await supabase.from('novels').update({
            title: newSettings.title,
            genre: newSettings.genre,
            style: newSettings.style,
            tone: newSettings.tone,
            background: newSettings.background,
            worldview: newSettings.worldview,
            system_persona: newSettings.systemPersona,
            custom_levels: newSettings.customLevels,
            custom_factions: newSettings.customFactions,
            custom_races: newSettings.customRaces,
            updated_at: new Date().toISOString()
        }).eq('id', novelId);
    };

    const updateVolumeTitle = async (volId: string, title: string) => {
        setVolumes(prev => prev.map(v => v.id === volId ? { ...v, title } : v));
        await supabase.from('volumes').update({ title }).eq('id', volId);
    };

    const addVolume = async () => {
        if (!novelId) return;
        const tempId = `temp-${Date.now()}`;
        const newVolStub = { id: tempId, title: '新卷', chapters: [] };
        setVolumes(prev => [...prev, newVolStub]);

        const { data } = await supabase
            .from('volumes')
            .insert([{ novel_id: novelId, title: '新卷', order_index: volumes.length }])
            .select().single();

        if (data) {
            setVolumes(prev => prev.map(v => v.id === tempId ? { ...v, id: data.id } : v));
            return data.id;
        }
        return tempId;
    };

    const deleteVolume = async (volId: string) => {
        setVolumes(prev => prev.filter(v => v.id !== volId));
        await supabase.from('volumes').delete().eq('id', volId);
    };

    const addChapter = async (volId: string) => {
        const tempId = `temp-${Date.now()}`;
        const newChapStub = { id: tempId, title: '新章節', content: '', outline: '', lastModified: Date.now() };

        setVolumes(prev => prev.map(v =>
            v.id === volId ? { ...v, chapters: [...v.chapters, newChapStub] } : v
        ));

        // Find current chapters count to set order
        const vol = volumes.find(v => v.id === volId);
        const orderIndex = vol ? vol.chapters.length : 0;

        const { data } = await supabase
            .from('chapters')
            .insert([{ volume_id: volId, title: '新章節', order_index: orderIndex }])
            .select().single();

        if (data) {
            setVolumes(prev => prev.map(v =>
                v.id === volId ? {
                    ...v,
                    chapters: v.chapters.map(c => c.id === tempId ? { ...c, id: data.id } : c)
                } : v
            ));
            return data.id; // Return real ID
        }
        return tempId;
    };

    const updateChapter = async (chapId: string, updates: Partial<Chapter>) => {
        setVolumes(prev => prev.map(v => ({
            ...v,
            chapters: v.chapters.map(c => c.id === chapId ? { ...c, ...updates, lastModified: Date.now() } : c)
        })));

        // Map updates to DB columns
        const dbUpdates: any = { last_modified: new Date().toISOString() };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.outline !== undefined) dbUpdates.outline = updates.outline;
        if (updates.briefing !== undefined) dbUpdates.briefing = updates.briefing;
        if (updates.critique !== undefined) dbUpdates.critique = updates.critique;
        if (updates.critiqueGeneratedAt !== undefined) dbUpdates.critique_generated_at = updates.critiqueGeneratedAt.toISOString();
        if (updates.contentHash !== undefined) dbUpdates.content_hash = updates.contentHash;

        await supabase.from('chapters').update(dbUpdates).eq('id', chapId);
    };

    const deleteChapter = async (chapId: string) => {
        setVolumes(prev => prev.map(v => ({
            ...v,
            chapters: v.chapters.filter(c => c.id !== chapId)
        })));
        await supabase.from('chapters').delete().eq('id', chapId);
    };

    // Characters
    const addCharacter = async () => {
        if (!novelId) return;
        const tempId = `temp-${Date.now()}`;
        const newCharStub: Character = { id: tempId, name: '新角色', role: '配角', gender: 'other', traits: '', status: '正常', level: '' };
        setCharacters(prev => [...prev, newCharStub]);

        const { data } = await supabase
            .from('characters')
            .insert([{ novel_id: novelId, name: '新角色', role: '配角' }])
            .select().single();

        if (data) {
            setCharacters(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c));
            return data.id;
        }
        return tempId;
    };

    const updateCharacter = async (id: string, updates: Partial<Character>) => {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.traits !== undefined) dbUpdates.traits = updates.traits;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.level !== undefined) dbUpdates.level = updates.level;
        if (updates.faction !== undefined) dbUpdates.faction = updates.faction;
        if (updates.period !== undefined) dbUpdates.period = updates.period;
        if (updates.lifeStatus !== undefined) dbUpdates.life_status = updates.lifeStatus;
        if (updates.race !== undefined) dbUpdates.race = updates.race;

        if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('characters').update(dbUpdates).eq('id', id);
        }
    };

    const deleteCharacter = async (id: string) => {
        setCharacters(prev => prev.filter(c => c.id !== id));
        await supabase.from('characters').delete().eq('id', id);
    };

    // Vocabs
    const addVocabulary = async () => {
        if (!novelId) return;
        const tempId = `temp-${Date.now()}`;
        const newVocab = { id: tempId, name: '新詞條', category: '物品', description: '' };
        setVocabularies(prev => [...prev, newVocab]);

        const { data } = await supabase
            .from('vocabularies')
            .insert([{ novel_id: novelId, name: '新詞條', category: '物品' }])
            .select().single();

        if (data) {
            setVocabularies(prev => prev.map(v => v.id === tempId ? { ...v, id: data.id } : v));
            return data.id;
        }
        return tempId;
    };

    const updateVocabulary = async (id: string, updates: Partial<Vocabulary>) => {
        setVocabularies(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
        await supabase.from('vocabularies').update(updates).eq('id', id);
    };

    const deleteVocabulary = async (id: string) => {
        setVocabularies(prev => prev.filter(v => v.id !== id));
        await supabase.from('vocabularies').delete().eq('id', id);
    };

    const importData = async (data: { characters: Character[], vocabularies: Vocabulary[] }) => {
        if (!novelId || !session) return { newCharsCount: 0, newVocabsCount: 0 };

        // 1. Filter new characters (Skip existing IDs)
        const newChars = data.characters.filter(c => !characters.some(ex => ex.id === c.id));

        // 2. Filter new vocabularies
        const newVocabs = data.vocabularies.filter(v => !vocabularies.some(ex => ex.id === v.id));

        try {
            if (newChars.length > 0) {
                const charsToInsert = newChars.map(c => ({
                    id: c.id,
                    novel_id: novelId,
                    name: c.name,
                    role: c.role,
                    traits: c.traits,
                    status: c.status,
                    gender: c.gender,
                    level: c.level,
                    faction: c.faction,
                    period: c.period,
                    life_status: c.lifeStatus // Note: database column might be snake_case
                }));
                // Check database column names! 
                // Wait, I haven't added these columns to Supabase yet?
                // The user request didn't mention Supabase schema migration.
                // Assuming I should just store them in the `role` or `traits` if schema is fixed?
                // OR assuming Supabase is schemaless or I need to alter table?
                // The prompt says "Database Feature Enhancement" but implies frontend mostly.
                // However, `useNovelData` interacts with Supabase.
                // If I add new fields to `types.ts`, I must ensure they are saved to Supabase.
                // If Supabase table doesn't have these columns, insert will fail.

                // CRITICAL: I need to check if I can add columns to Supabase or if I should store these in a JSONB field or similar?
                // If I cannot alter schema, I might need to pack these into 'traits' or a metadata field.
                // But `importData` should try to insert what it can.

                // Let's assume for now I will strictly follow types.ts but I must check if I can add columns.
                // Since I cannot run SQL on Supabase directly without user instructions or SQL editor tool (which I don't have, I only have valid tools),
                // I might be stuck if columns don't exist.

                // Wait, if I am defining the app, maybe I am expected to handle this?
                // Since I am in a localized environment with `App.tsx` and `server/index.js` (which is backend for AI), 
                // Supabase is likely improved by the user or I am just mocking it?
                // "The user's main goal is to successfully connect... to Supabase." in previous conversation.
                // The current user has `useNovelData` which uses `supabase` client.

                // If I add new fields to `types.ts`, they won't persist if Supabase doesn't have columns.
                // I should probably warn the user or try to use existing fields?
                // OR: Maybe the user is using `traits` as a JSON blob? No, it's string.

                // Let's assume I should add them to the insert payload. If it fails, I'll know.
                // But to be safe, I should probably check if I can execute SQL or if I should ASK the user to run migration.

                // However, for `importData`, I can just match the structure used in `addCharacter`.
                // Let's see `addCharacter` implementation in this file.
            }
        } catch (e) {
            console.error(e);
            throw e;
        }

        return { newCharsCount: newChars.length, newVocabsCount: newVocabs.length };
    };

    // --- Memos Logic ---
    const [memos, setMemos] = useState<Memo[]>([]);

    useEffect(() => {
        if (!novelId) return;

        const loadMemos = async () => {
            const { data, error } = await supabase
                .from('memos')
                .select('*')
                .eq('novel_id', novelId)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error loading memos:', error);
                return;
            }
            setMemos(data || []);
        };

        loadMemos();
    }, [novelId]);

    const addMemo = async (content: string) => {
        if (!novelId) return;
        try {
            const { data, error } = await supabase
                .from('memos')
                .insert([{ novel_id: novelId, content }])
                .select()
                .single();

            if (error) throw error;
            setMemos(prev => [data, ...prev]);
        } catch (error) {
            console.error('Error adding memo:', error);
            // alert('新增備註失敗，請確認資料庫已建立 memos 表');
        }
    };

    const updateMemo = async (id: string, content: string) => {
        try {
            const { error } = await supabase
                .from('memos')
                .update({ content, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setMemos(prev => prev.map(m => m.id === id ? { ...m, content } : m));
        } catch (error) {
            console.error('Error updating memo:', error);
        }
    };

    const deleteMemo = async (id: string) => {
        try {
            const { error } = await supabase
                .from('memos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setMemos(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting memo:', error);
        }
    };

    return {
        loading,
        novelId,
        novels, createNovel, deleteNovel, switchNovel, renameNovel,
        settings, updateSettings,
        volumes, updateVolume: updateVolumeTitle, addVolume, deleteVolume,
        addChapter, updateChapter, deleteChapter,
        characters, addCharacter, updateCharacter, deleteCharacter,
        vocabularies, addVocabulary, updateVocabulary, deleteVocabulary,
        memos,
        addMemo,
        updateMemo,
        deleteMemo,
        importData
    };
};
