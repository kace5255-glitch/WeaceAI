-- 創建用戶資料表
-- 在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 1. 創建 user_profiles 資料表
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    birthday DATE,
    gender VARCHAR(20),
    bio TEXT,
    avatar_url TEXT,
    birthday_visible VARCHAR(20) DEFAULT 'private',
    gender_visible VARCHAR(20) DEFAULT 'private',
    email_visible VARCHAR(20) DEFAULT 'private',
    last_username_change TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 3. 啟用 Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. 創建 RLS 政策
-- 允許用戶讀取所有用戶資料（用於顯示其他用戶資訊）
CREATE POLICY "允許所有用戶讀取用戶資料" ON public.user_profiles
    FOR SELECT
    USING (true);

-- 允許用戶插入自己的資料
CREATE POLICY "允許用戶創建自己的資料" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 允許用戶更新自己的資料
CREATE POLICY "允許用戶更新自己的資料" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 允許用戶刪除自己的資料
CREATE POLICY "允許用戶刪除自己的資料" ON public.user_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. 創建自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. 創建自動創建用戶資料的觸發器（可選）
-- 當新用戶註冊時，自動創建對應的 user_profiles 記錄
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username, display_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'User'),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 註：如果你想要自動創建用戶資料，請取消下面這行的註解
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();

-- 完成！現在你可以使用增強版的註冊系統了
