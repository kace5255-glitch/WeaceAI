// 調試腳本：檢查點評緩存是否正常工作
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nslghvnmeglovihvuamc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbGdodm5tZWdsb3ZpaHZ1YW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDYzNjksImV4cCI6MjA4NjU4MjM2OX0.04jOTWKdmLMaoiO8YM7qONIAr1oGAEnjmSAjszptwIg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n🔍 檢查數據庫結構...\n');

  try {
    // 1. 檢查是否能查詢 chapters 表
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, critique, critique_generated_at, content_hash')
      .limit(5);

    if (chaptersError) {
      console.error('❌ 查詢失敗:', chaptersError.message);
      console.log('\n💡 可能原因：');
      console.log('   1. chapters 表不存在');
      console.log('   2. critique, critique_generated_at, content_hash 字段不存在');
      console.log('\n📝 解決方案：');
      console.log('   請在 Supabase SQL Editor 執行以下 SQL:');
      console.log('\n   ALTER TABLE chapters');
      console.log('   ADD COLUMN IF NOT EXISTS critique TEXT,');
      console.log('   ADD COLUMN IF NOT EXISTS critique_generated_at TIMESTAMP,');
      console.log('   ADD COLUMN IF NOT EXISTS content_hash TEXT;');
      return;
    }

    console.log('✅ 數據庫查詢成功！\n');
    console.log(`📊 找到 ${chapters.length} 個章節:\n`);

    chapters.forEach((chapter, index) => {
      console.log(`${index + 1}. 章節: ${chapter.title || '(無標題)'}`);
      console.log(`   - ID: ${chapter.id}`);
      console.log(`   - 已有點評: ${chapter.critique ? '✅ 是' : '❌ 否'}`);
      console.log(`   - 點評時間: ${chapter.critique_generated_at || '(無)'}`);
      console.log(`   - 內容哈希: ${chapter.content_hash || '(無)'}`);
      console.log('');
    });

    if (chapters.length === 0) {
      console.log('⚠️  沒有找到任何章節。請先創建章節後再測試點評功能。\n');
    } else {
      const hasAnyCritique = chapters.some(c => c.critique);
      if (!hasAnyCritique) {
        console.log('💡 提示：所有章節都沒有點評記錄。');
        console.log('   這是正常的，生成第一次點評後會自動保存。\n');
      }
    }

  } catch (error) {
    console.error('❌ 發生錯誤:', error.message);
  }
}

checkDatabase();
