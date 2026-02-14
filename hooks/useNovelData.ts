
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { NovelSettings, Volume, Character, Vocabulary, Chapter } from '../types';
import { Session } from '@supabase/supabase-js';

export const useNovelData = (session: Session | null) => {
    const [loading, setLoading] = useState(true);
    const [novelId, setNovelId] = useState<string | null>(null);

    // Data States
    const [settings, setSettings] = useState<NovelSettings>({
        title: '未命名小說',
        genre: '一般',
        style: '',
        tone: '',
        background: '',
        systemPersona: ''
    });
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);

    // Load Data
    useEffect(() => {
        if (!session) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Get User's Novel (Create if not exists)
                let { data: novels, error: novelError } = await supabase
                    .from('novels')
                    .select('*')
                    .limit(1);

                if (novelError) throw novelError;

                let currentNovelId = '';

                if (!novels || novels.length === 0) {
                    // Create Default Novel
                    const { data: newNovel, error: createError } = await supabase
                        .from('novels')
                        .insert([{
                            user_id: session.user.id,
                            title: '未命名小說'
                        }])
                        .select()
                        .single();

                    if (createError) throw createError;
                    currentNovelId = newNovel.id;
                    setNovelId(currentNovelId);

                    // Create Default Volume & Chapter
                    const { data: stringVol, error: volErr } = await supabase
                        .from('volumes')
                        .insert([{ novel_id: currentNovelId, title: '第一卷', order_index: 0 }])
                        .select()
                        .single();

                    if (stringVol) {
                        const { data: stringChap } = await supabase
                            .from('chapters')
                            .insert([{ volume_id: stringVol.id, title: '第一章', order_index: 0 }])
                            .select()
                            .single();

                        setVolumes([{
                            id: stringVol.id,
                            title: stringVol.title,
                            chapters: stringChap ? [{
                                id: stringChap.id,
                                title: stringChap.title,
                                content: '',
                                outline: '',
                                lastModified: Date.now()
                            }] : []
                        }]);
                    }

                } else {
                    const novel = novels[0];
                    currentNovelId = novel.id;
                    setNovelId(novel.id);
                    setSettings({
                        title: novel.title,
                        genre: novel.genre,
                        style: novel.style || '',
                        tone: novel.tone || '',
                        background: novel.background || '',
                        systemPersona: novel.system_persona || ''
                    });

                    // Load Volumes & Chapters
                    const { data: vols, error: volError } = await supabase
                        .from('volumes')
                        .select(`*, chapters (*)`)
                        .eq('novel_id', currentNovelId)
                        .order('order_index', { ascending: true });

                    if (volError) throw volError;

                    // Sort chapters properly in JS as well
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
                                lastModified: new Date(c.last_modified).getTime()
                            }))
                    }));
                    setVolumes(formattedVolumes);

                    // Load Characters
                    const { data: chars } = await supabase
                        .from('characters').select('*').eq('novel_id', currentNovelId);
                    if (chars) {
                        setCharacters(chars.map((c: any) => ({
                            id: c.id,
                            name: c.name,
                            role: c.role,
                            gender: c.gender,
                            traits: c.traits,
                            status: c.status,
                            level: c.level,
                            avatarUrl: c.avatar_url
                        })));
                    }

                    // Load Vocabs
                    const { data: vocabs } = await supabase
                        .from('vocabularies').select('*').eq('novel_id', currentNovelId);
                    if (vocabs) {
                        setVocabularies(vocabs.map((v: any) => ({
                            id: v.id,
                            name: v.name,
                            category: v.category,
                            description: v.description
                        })));
                    }
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

        // Debounce could be handled here or by caller, strictly passing to DB:
        await supabase.from('novels').update({
            title: newSettings.title,
            genre: newSettings.genre,
            style: newSettings.style,
            tone: newSettings.tone,
            background: newSettings.background,
            system_persona: newSettings.systemPersona,
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
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.gender) dbUpdates.gender = updates.gender;
        if (updates.traits) dbUpdates.traits = updates.traits;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.level) dbUpdates.level = updates.level;

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

    return {
        loading,
        settings, updateSettings,
        volumes, updateVolumeTitle, addVolume, deleteVolume,
        addChapter, updateChapter, deleteChapter,
        characters, addCharacter, updateCharacter, deleteCharacter,
        vocabularies, addVocabulary, updateVocabulary, deleteVocabulary
    };
};
