import { supabase } from '../lib/supabase';

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  };
};

const API_BASE = '/api/admin';

export interface AdminStats {
  users: { total: number; today: number; roles: Record<string, number> };
  novels: { total: number; today: number };
  chapters: { total: number };
  volumes: { total: number };
  points: { total: number };
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  username: string;
  display_name?: string;
  role: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_sign_in?: string;
  spirit_stones?: number;
  daily_points?: number;
  task_points?: number;
  permanent_points?: number;
  novelCount: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  novels: { id: string; title: string; genre: string; chapterCount: number; created_at: string; updated_at: string }[];
  totalChapters: number;
  auditLogs: AuditLog[];
}

export interface AdminNovel {
  id: string;
  title: string;
  genre: string;
  user_id: string;
  authorName: string;
  chapterCount: number;
  created_at: string;
  updated_at: string;
}

export interface AIServiceInfo {
  name: string;
  available: boolean;
  key: string;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/stats`, { headers });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch stats');
    return res.json();
  },

  async getUsers(params: { search?: string; role?: string; page?: number; limit?: number } = {}) {
    const headers = await getAuthHeaders();
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.role) qs.set('role', params.role);
    qs.set('page', String(params.page || 1));
    qs.set('limit', String(params.limit || 20));
    const res = await fetch(`${API_BASE}/users?${qs}`, { headers });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch users');
    return res.json() as Promise<{ users: AdminUser[]; total: number; page: number; limit: number }>;
  },

  async updateUserRole(userId: string, role: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update role');
    return res.json();
  },

  async getNovels(params: { search?: string; page?: number; limit?: number } = {}) {
    const headers = await getAuthHeaders();
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    qs.set('page', String(params.page || 1));
    qs.set('limit', String(params.limit || 20));
    const res = await fetch(`${API_BASE}/novels?${qs}`, { headers });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch novels');
    return res.json() as Promise<{ novels: AdminNovel[]; total: number; page: number; limit: number }>;
  },

  async getAIStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/ai-status`, { headers });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch AI status');
    return res.json() as Promise<{ services: AIServiceInfo[]; rateLimit: { windowMs: number; max: number } }>;
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/${userId}`, { headers });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch user detail');
    return res.json();
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update user status');
    return res.json();
  },

  // ===== 用戶操作 =====

  async upgradeMember(userId: string, role: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/members/${userId}/upgrade`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to upgrade member');
    return res.json();
  },

  async deleteUser(userId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete user');
    return res.json();
  },

  async adjustPoints(userId: string, amount: number, reason: string, type: string = 'permanent') {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/${userId}/points`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ amount, reason, type }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to adjust points');
    return res.json();
  },

  async batchAction(userIds: string[], action: string, value?: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userIds, action, value }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to perform batch action');
    return res.json();
  },
};

// 用戶登入心跳（更新 last_sign_in）
export async function sendHeartbeat() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/user/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
  } catch {}
}
