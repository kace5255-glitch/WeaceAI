import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

interface SecuritySettingsProps {
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onChangePassword }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // 密碼強度計算
    const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong', label: string, color: string } => {
        if (password.length === 0) return { strength: 'weak', label: '', color: '' };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 2) return { strength: 'weak', label: '弱', color: 'text-red-500' };
        if (score <= 3) return { strength: 'medium', label: '中', color: 'text-amber-500' };
        return { strength: 'strong', label: '強', color: 'text-emerald-500' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // 驗證
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: '新密碼至少需要 6 個字元' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: '新密碼與確認密碼不符' });
            return;
        }

        if (currentPassword === newPassword) {
            setMessage({ type: 'error', text: '新密碼不能與當前密碼相同' });
            return;
        }

        setLoading(true);
        try {
            await onChangePassword(currentPassword, newPassword);
            setMessage({ type: 'success', text: '密碼修改成功！' });
            // 清空表單
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '密碼修改失敗，請檢查當前密碼是否正確' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 為了您的帳號安全，建議使用包含大小寫字母、數字和特殊符號的強密碼。
                </p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border ${
                    message.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}>
                    <div className="flex items-center gap-2">
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 當前密碼 */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        當前密碼 *
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                            placeholder="輸入當前密碼"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* 新密碼 */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        新密碼 *
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                            placeholder="至少 6 個字元"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {newPassword && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        passwordStrength.strength === 'weak' ? 'w-1/3 bg-red-500' :
                                        passwordStrength.strength === 'medium' ? 'w-2/3 bg-amber-500' :
                                        'w-full bg-emerald-500'
                                    }`}
                                />
                            </div>
                            <span className={`text-xs font-medium ${passwordStrength.color}`}>
                                {passwordStrength.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* 確認新密碼 */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        確認新密碼 *
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                            placeholder="再次輸入新密碼"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            密碼不符
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            處理中...
                        </>
                    ) : (
                        <>
                            <Lock size={18} />
                            修改密碼
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
