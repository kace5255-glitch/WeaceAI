
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
        
        const text = await response.text();
        
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status}`;
            try {
                if (text) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const err = JSON.parse(text);
                        errorMessage = err.error || errorMessage;
                    } else {
                        errorMessage = text.substring(0, 200);
                    }
                }
            } catch (parseError) {
                // If JSON parsing fails, use the status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
        }
        
        const data = JSON.parse(text);
        return data.content || '';
    } catch (error: any) {
        if (error.name === 'AbortError') throw new Error("使用者已取消生成");
        if (error.message) throw error;
        throw new Error(error.toString() || "生成發生錯誤");
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
        
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status}`;
            try {
                const text = await response.text();
                if (text) {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                }
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        return data.content || '';
    } catch (e: any) {
        if (e.name === 'AbortError') throw new Error("使用者已取消生成");
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
        
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status}`;
            try {
                const text = await response.text();
                if (text) {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                }
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        return JSON.parse(text);
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
        
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status}`;
            try {
                const text = await response.text();
                if (text) {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                }
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        return data.content || '';
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
        
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status}`;
            try {
                const text = await response.text();
                if (text) {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                }
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        return data.content || '';
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
        
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status}`;
            try {
                const text = await response.text();
                if (text) {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                }
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        return JSON.parse(text);
    } catch (e: any) {
        throw new Error(e.message || "無法更新角色檔案");
    }
};

// 世界觀 AI 生成
export const generateWorldview = async (prompt: string, model?: string): Promise<string> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/worldview`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ prompt, model })
        });
        
        if (!response.ok) {
            let errorMessage = "伺服器錯誤";
            try {
                const text = await response.text();
                if (text) {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                }
            } catch {
                errorMessage = response.statusText || `Server Error: ${response.status}`;
            }
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        return data.content || '';
    } catch (e: any) {
        throw new Error(e.message || "無法生成世界觀");
    }
};
