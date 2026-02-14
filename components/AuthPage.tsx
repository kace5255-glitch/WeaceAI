
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, Loader2, PlayCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: '註冊成功！請檢查您的信箱以驗證帳號。' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
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
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">幻靈寫作AI</h1>
                        <p className="text-slate-500 mt-2 text-sm">您的 AI 協作小說創作平台</p>
                    </div>

                    {message && (
                        <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="email"
                                    id={emailId}
                                    name="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                                    placeholder="name@example.com"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="password"
                                    id={passwordId}
                                    name="password"
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
