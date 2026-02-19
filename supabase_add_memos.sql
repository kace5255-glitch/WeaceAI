-- Add memos table for storing novel ideas/notes
CREATE TABLE IF NOT EXISTS memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_memos_novel_id ON memos(novel_id);

-- Enable RLS
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage memos of their novels" ON memos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM novels 
            WHERE novels.id = memos.novel_id 
            AND novels.user_id = auth.uid()
        )
    );
