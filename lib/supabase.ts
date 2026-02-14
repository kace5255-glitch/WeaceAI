
import { createClient } from '@supabase/supabase-js';

// 這些環境變數需要在 .env 檔案中設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL 或 Anon Key 未設定，資料庫功能將無法使用。');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
