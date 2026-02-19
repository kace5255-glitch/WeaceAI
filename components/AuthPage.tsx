
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, Loader2, PlayCircle, User, Calendar, UserCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState('');
    const [loginIdentifier, setLoginIdentifier] = useState(''); // 用於登入的帳號或郵箱
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Helper to generate IDs
    const emailId = "auth-email";
    const passwordId = "auth-password";

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'signup') {
                // 檢查用戶名是否已存在
                const { data: existingUser } = await supabase
                    .from('user_profiles')
                    .select('username')
                    .eq('username', username)
                    .single();

                if (existingUser) {
                    throw new Error('此用戶名已被使用，請選擇其他用戶名。');
                }

                // 註冊新用戶
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                            display_name: displayName || username,
                            birthday,
                            gender,
                        }
                    }
                });

                if (signUpError) throw signUpError;

                // 創建用戶資料
                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('user_profiles')
                        .insert({
                            user_id: authData.user.id,
                            username,
                            display_name: displayName || username,
                            email,
                            birthday,
                            gender,
                        });

                    if (profileError) {
                        console.error('創建用戶資料失敗:', profileError);
                    }
                }

                setMessage({ type: 'success', text: '註冊成功！請檢查您的信箱以驗證帳號。' });
            } else {
                // 登入邏輯：支持用戶名或郵箱登入
                let loginEmail = loginIdentifier;

                // 如果輸入的不是郵箱格式，嘗試用用戶名查找郵箱
                if (!loginIdentifier.includes('@')) {
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('email')
                        .eq('username', loginIdentifier)
                        .single();

                    if (profile) {
                        loginEmail = profile.email;
                    } else {
                        throw new Error('找不到此用戶名，請檢查您的帳號。');
                    }
                }

                const { error } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password,
                });
                if (error) throw error;
                // Sign in successful, session state will update automatically via onAuthStateChange in App.tsx
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '發生錯誤，請稍後再試。' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-violet-100 overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600 text-white mb-4 shadow-lg shadow-violet-200">
                            <Sparkles size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">知靈AI</h1>
                        <p className="text-slate-500 mt-2 text-sm">您的 AI 協作小說創作平台</p>
                    </div>

                    {message && (
                        <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {mode === 'signin' ? (
                            // 登入表單
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">帳號或郵箱</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={loginIdentifier}
                                            onChange={(e) => setLoginIdentifier(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                            placeholder="用戶名或 email"
                                            autoComplete="username"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">密碼</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                            placeholder="••••••••"
                                            minLength={6}
                                            autoComplete="current-password"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            // 註冊表單
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">用戶名 *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                            placeholder="設定您的用戶名"
                                            pattern="[a-zA-Z0-9_]{3,20}"
                                            title="3-20個字元，只能包含英文、數字和底線"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 ml-1">用於登入，3-20個字元</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">顯示名稱</label>
                                    <div className="relative">
                                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                            placeholder="顯示在介面上的名稱（可選）"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">密碼 *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                            placeholder="至少6個字元"
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">生日</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={birthday}
                                            onChange={(e) => setBirthday(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                      />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">性別</label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                    >
                                        <option value="">請選擇（可選）</option>
                                        <option value="male">男性</option>
                                        <option value="female">女性</option>
                                        <option value="other">其他</option>
                                        <option value="prefer_not_to_say">不願透露</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    {mode === 'signin' ? '登入' : '註冊'} <PlayCircle size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-500">
                            {mode === 'signin' ? "還沒有帳號？" : "已經有帳號了？"}
                            <button
                                onClick={() => {
                                    setMode(mode === 'signin' ? 'signup' : 'signin');
                                    setMessage(null);
                                }}
                                className="ml-1 font-bold text-violet-600 hover:text-violet-700 transition-colors"
                            >
                                {mode === 'signin' ? "立即註冊" : "登入"}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Demo Mode Button (Optional) */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">目前處於開發模式，需要設定 Supabase 環境變數才能登入。</p>
                </div>
            </div>
        </div>
    );
};
