import { ChapterEvent, MemoryExtractionResult } from "../types";
import { supabase } from "../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("請先登入會員");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

/** 手動觸發記憶提取 */
export const extractMemory = async (params: {
    chapterContent: string;
    chapterTitle: string;
    chapterIndex: number;
    chapterId: string;
    novelId: string;
    existingCharacters: { name: string; role: string; level?: string }[];
    novelTitle: string;
    genre: string;
    customLevels?: string[];
}): Promise<MemoryExtractionResult> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/memory/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || 'Memory extraction failed');
    }
    const data = await response.json();
    return data.extracted;
};

/** 取得智能上下文（生成時調用） */
export const getSmartContext = async (params: {
    novelId: string;
    currentChapterIndex: number;
    selectedCharacterNames: string[];
}): Promise<{
    unresolvedForeshadow?: string;
    relevantEvents?: string;
    characterEvents?: string;
}> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/memory/context`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
    });
    if (!response.ok) {
        console.error('Failed to get smart context, proceeding without memory');
        return {};
    }
    return response.json();
};

/** 取得事件列表 */
export const getChapterEvents = async (novelId: string): Promise<ChapterEvent[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/memory/events/${novelId}`, {
        headers
    });
    if (!response.ok) return [];
    return response.json();
};

/** 儲存用戶確認後的記憶 */
export const saveConfirmedMemory = async (params: {
    novelId: string;
    chapterId: string;
    chapterIndex: number;
    extracted: MemoryExtractionResult;
}): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/memory/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || '儲存記憶失敗');
    }
};
