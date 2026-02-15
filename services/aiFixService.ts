import { supabase } from '../lib/supabase';

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

export interface LocateIssueParams {
  suggestion: string;
  chapterContent: string;
  settings: {
    title: string;
    genre: string;
  };
}

export interface IssueLocation {
  quote: string;
  reason: string;
}

export interface LocateIssueResponse {
  issues: IssueLocation[];
}

/**
 * 調用後端 API 定位問題
 */
export const locateIssues = async (params: LocateIssueParams): Promise<IssueLocation[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/locate-issues`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const data: LocateIssueResponse = await response.json();
    return data.issues || [];
  } catch (error: any) {
    if (error.message) throw error;
    throw new Error(error.toString() || "定位問題時發生錯誤");
  }
};
