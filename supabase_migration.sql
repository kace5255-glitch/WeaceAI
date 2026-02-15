-- MuseAI 點評功能數據庫遷移腳本
-- 執行日期: 2026-02-15
-- 功能: 為 chapters 表添加點評與簡報持久化字段

-- 1. 添加點評相關字段 (Critique & Hash)
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS critique TEXT,
ADD COLUMN IF NOT EXISTS critique_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 2. 添加簡報字段 (Briefing) - 解決 400 Bad Request 錯誤
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS briefing TEXT;

-- 驗證字段是否添加成功
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chapters' 
  AND column_name IN ('critique', 'critique_generated_at', 'content_hash', 'briefing');
