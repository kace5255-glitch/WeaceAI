-- ================================================
-- 添加點評功能與簡報所需字段
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本
-- ================================================

ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS critique TEXT,
ADD COLUMN IF NOT EXISTS critique_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
-- 解決 400 Bad Request 的關鍵字段：
ADD COLUMN IF NOT EXISTS briefing TEXT;

-- 驗證字段是否成功添加
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'chapters'
    AND column_name IN ('critique', 'critique_generated_at', 'content_hash', 'briefing');
