-- MuseAI 完整數據庫架構創建腳本
-- 執行日期: 2026-02-15
-- 說明: 創建所有必需的表和關係

-- 1. 檢查現有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 如果上面沒有顯示 novels, volumes, chapters 等表，請繼續執行以下腳本：

-- 2. 創建 novels 表（小說基本信息）
CREATE TABLE IF NOT EXISTS novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '未命名小說',
    genre TEXT DEFAULT '一般',
    style TEXT,
    tone TEXT,
    background TEXT,
    worldview TEXT,
    system_persona TEXT,
    api_config JSONB,
    custom_levels TEXT[],
    custom_factions TEXT[],
    custom_races TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 創建 volumes 表（卷）
CREATE TABLE IF NOT EXISTS volumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 創建 chapters 表（章節）- 包含點評字段
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volume_id UUID REFERENCES volumes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    outline TEXT DEFAULT '',
    briefing TEXT,
    critique TEXT,
    critique_generated_at TIMESTAMP,
    content_hash TEXT,
    order_index INTEGER DEFAULT 0,
    last_modified TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 創建 characters 表（角色）
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    gender TEXT,
    traits TEXT,
    status TEXT,
    level TEXT,
    faction TEXT,
    period TEXT,
    life_status TEXT,
    race TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 創建 vocabularies 表（詞彙庫）
CREATE TABLE IF NOT EXISTS vocabularies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. 創建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_volumes_novel_id ON volumes(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);
CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters(novel_id);
CREATE INDEX IF NOT EXISTS idx_vocabularies_novel_id ON vocabularies(novel_id);

-- 8. 啟用行級安全策略 (Row Level Security)
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabularies ENABLE ROW LEVEL SECURITY;

-- 9. 創建安全策略（用戶只能訪問自己的數據）
CREATE POLICY "Users can manage their own novels" ON novels
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage volumes of their novels" ON volumes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM novels 
            WHERE novels.id = volumes.novel_id 
            AND novels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage chapters of their novels" ON chapters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM volumes 
            JOIN novels ON novels.id = volumes.novel_id
            WHERE volumes.id = chapters.volume_id 
            AND novels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage characters of their novels" ON characters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM novels 
            WHERE novels.id = characters.novel_id 
            AND novels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage vocabularies of their novels" ON vocabularies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM novels 
            WHERE novels.id = vocabularies.novel_id 
            AND novels.user_id = auth.uid()
        )
    );

-- 10. 驗證創建結果
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('novels', 'volumes', 'chapters', 'characters', 'vocabularies')
ORDER BY table_name;
