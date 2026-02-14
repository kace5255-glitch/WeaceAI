
import { AIRequestParams, Character } from "../types";

import { supabase } from "../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Helper to get Auth Headers
const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("請先登入會員");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const generateStoryContent = async (params: AIRequestParams): Promise<string> => {
    const { signal } = params;
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(params),
            signal
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Server Error: ${response.status}`);
        }
        const data = await response.json();
        return data.content;
    } catch (error: any) {
        if (error.name === 'AbortError') throw new Error("使用者已取消生成");
        throw error;
    }
};

export const generateOutline = async (params: AIRequestParams): Promise<string> => {
    const { signal } = params;
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/outline`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(params),
            signal
        });
        if (!response.ok) throw new Error("Server Error");
        const data = await response.json();
        return data.content;
    } catch (e: any) {
        throw new Error(e.message || "無法生成大綱");
    }
};

export const suggestPlotPoints = async (currentContent: string, genre: string): Promise<string[]> => {
    return ["建議 1: ...", "建議 2: ...", "建議 3: ... (功能遷移中)"];
}

export const generateCharacterProfile = async (settings: any, description: string, model?: string): Promise<Omit<Character, 'id'>> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/character`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ description, settings, model })
        });
        if (!response.ok) throw new Error("Server Error");
        return await response.json();
    } catch (e: any) {
        throw new Error(e.message || "無法生成角色");
    }
};

export const generateChapterBriefing = async (content: string, title: string, model: string): Promise<string> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/briefing`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ content, title, model })
        });
        if (!response.ok) throw new Error("Server Error");
        const data = await response.json();
        return data.content;
    } catch (e: any) {
        throw new Error(e.message || "無法生成簡報");
    }
};

export const generateCritique = async (params: AIRequestParams): Promise<string> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/critique`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(params)
        });
        if (!response.ok) throw new Error("Server Error");
        const data = await response.json();
        return data.content;
    } catch (e: any) {
        throw new Error(e.message || "無法生成點評");
    }
};
export const updateCharacterProfile = async (chapterContent: string, character: Character, model?: string): Promise<Partial<Character>> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/update-character`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ chapterContent, character, model })
        });
        if (!response.ok) throw new Error("Server Error");
        return await response.json();
    } catch (e: any) {
        throw new Error(e.message || "無法更新角色檔案");
    }
};
