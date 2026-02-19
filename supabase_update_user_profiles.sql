-- 更新現有的 user_profiles 資料表，添加缺失的欄位
-- 在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 1. 添加 last_username_change 欄位（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'last_username_change'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN last_username_change TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. 添加其他可能缺失的欄位
DO $$
BEGIN
    -- 檢查並添加 birthday_visible
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'birthday_visible'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN birthday_visible VARCHAR(20) DEFAULT 'private';
    END IF;

    -- 檢查並添加 gender_visible
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'gender_visible'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN gender_visible VARCHAR(20) DEFAULT 'private';
    END IF;

    -- 檢查並添加 email_visible
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'email_visible'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN email_visible VARCHAR(20) DEFAULT 'private';
    END IF;

    -- 檢查並添加 bio
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN bio TEXT;
    END IF;

    -- 檢查並添加 avatar_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN avatar_url TEXT;
    END IF;

    -- 檢查並添加 birthday
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'birthday'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN birthday DATE;
    END IF;

    -- 檢查並添加 gender
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN gender VARCHAR(20);
    END IF;
END $$;

-- 3. 驗證所有欄位
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 完成！資料表結構已更新
