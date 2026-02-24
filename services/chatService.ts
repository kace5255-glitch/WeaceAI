import { ChatConversation, ChatMessage, ChatMode } from '../types';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('請先登入會員');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// ═══ 對話 CRUD ═══

export const getConversations = async (): Promise<ChatConversation[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/conversations`, { headers });
  if (!res.ok) throw new Error('取得對話列表失敗');
  return res.json();
};

export const createConversation = async (title?: string, model?: string): Promise<ChatConversation> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: 'POST', headers,
    body: JSON.stringify({ title, model })
  });
  if (!res.ok) throw new Error('建立對話失敗');
  return res.json();
};

export const updateConversation = async (id: string, updates: Partial<Pick<ChatConversation, 'title' | 'pinned' | 'model'>>): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('更新對話失敗');
};

export const deleteConversation = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
    method: 'DELETE', headers
  });
  if (!res.ok) throw new Error('刪除對話失敗');
};
// ═══ 訊息 ═══

export const getMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, { headers });
  if (!res.ok) throw new Error('取得訊息失敗');
  return res.json();
};

// ═══ 訊息操作 ═══

export const deleteMessage = async (messageId: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}`, {
    method: 'DELETE', headers
  });
  if (!res.ok) throw new Error('刪除訊息失敗');
};

export const deleteMessagesAfter = async (messageId: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}/after`, {
    method: 'DELETE', headers
  });
  if (!res.ok) throw new Error('刪除訊息失敗');
};

// ═══ 串流對話 ═══

export interface StreamChatParams {
  conversationId: string;
  message: string;
  imageUrls?: string[];
  model: string;
  skipSaveUser?: boolean;
  mode?: ChatMode;
  thinking?: boolean;
}

export async function streamChat(
  params: StreamChatParams,
  onToken: (token: string) => void,
  onDone: (messageId: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
  onTitleUpdate?: (title: string) => void
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST', headers,
    body: JSON.stringify(params),
    signal
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    onError(err.error || '串流請求失敗');
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { onError('無法讀取串流'); return; }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      try {
        const data = JSON.parse(payload);
        if (data.token) onToken(data.token);
        if (data.done) onDone(data.messageId || '');
        if (data.error) onError(data.error);
        if (data.titleUpdate && onTitleUpdate) onTitleUpdate(data.titleUpdate);
      } catch { /* skip malformed */ }
    }
  }
}
