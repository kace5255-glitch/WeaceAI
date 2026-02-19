-- 啟用自動創建用戶資料的觸發器
-- 在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 創建觸發器（如果尚未創建）
CREATE TRIGGER IF NOT EXISTS on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 驗證觸發器是否已創建
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
