import React, { useState, useEffect } from 'react';
import { X, User, Lock, Shield, Check, AlertCircle, Save } from 'lucide-react';
import { UserProfile } from '../types';
import { ProfileSettings } from './settings/ProfileSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { supabase } from '../lib/supabase';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

type TabType = 'profile' | 'security' | 'privacy';

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose, userId }) => {
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [canSave, setCanSave] = useState(false);

    // 載入用戶資料
    useEffect(() => {
        if (isOpen && userId) {
            loadProfile();
        }
    }, [isOpen, userId]);

    // 監聽子組件的變更狀態
    useEffect(() => {
        const checkChanges = () => {
            const profileHasChanges = (window as any).__profileSettingsHasChanges || false;
            const profileUsernameError = (window as any).__profileSettingsUsernameError || '';
            setHasChanges(profileHasChanges);
            setCanSave(profileHasChanges && !profileUsernameError);
        };

        const interval = setInterval(checkChanges, 100);
        return () => clearInterval(interval);
    }, [activeTab]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                // 如果找不到資料（PGRST116 錯誤），嘗試自動創建
                if (error.code === 'PGRST116') {
                    console.log('用戶資料不存在，正在創建...');
                    await createUserProfile();
                    return;
                }
                throw error;
            }
            setProfile(data);
        } catch (error: any) {
            console.error('載入用戶資料失敗:', error);
            setMessage({ type: 'error', text: `載入用戶資料失敗: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    // 創建用戶資料
    const createUserProfile = async () => {
        try {
            // 獲取當前用戶信息
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('無法獲取用戶信息');

            // 創建預設用戶資料
            const newProfile: Partial<UserProfile> = {
                user_id: user.id,
                email: user.email || '',
                username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
                display_name: user.user_metadata?.display_name || user.user_metadata?.username || 'User',
                birthday: user.user_metadata?.birthday || undefined,
                gender: user.user_metadata?.gender || undefined,
            };

            const { data, error } = await supabase
                .from('user_profiles')
                .insert(newProfile)
                .select()
                .single();

            if (error) throw error;

            setProfile(data);
            setMessage({ type: 'success', text: '用戶資料已自動創建！' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('創建用戶資料失敗:', error);
            setMessage({ type: 'error', text: `創建用戶資料失敗: ${error.message}` });
        }
    };

    // 更新用戶資料
    const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
        if (!profile) return;

        try {
            // 如果更新用戶名，檢查是否可以修改
            if (updates.username && updates.username !== profile.username) {
                if (profile.last_username_change) {
                    const lastChange = new Date(profile.last_username_change);
                    const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysSinceChange < 30) {
                        setMessage({ type: 'error', text: '用戶名每 30 天只能修改一次' });
                        return;
                    }
                }
                updates.last_username_change = new Date().toISOString();
            }

            const { error } = await supabase
                .from('user_profiles')
                .update(updates)
                .eq('user_id', userId);

            if (error) throw error;

            setProfile({ ...profile, ...updates });
            setMessage({ type: 'success', text: '資料更新成功！' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('更新用戶資料失敗:', error);
            setMessage({ type: 'error', text: error.message || '更新失敗' });
        }
    };

    // 修改密碼
    const handleChangePassword = async (currentPassword: string, newPassword: string) => {
        try {
            // 先驗證當前密碼
            const { data: user } = await supabase.auth.getUser();
            if (!user.user?.email) throw new Error('無法獲取用戶信息');

            // 嘗試用當前密碼重新登入以驗證
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.user.email,
                password: currentPassword
            });

            if (signInError) throw new Error('當前密碼不正確');

            // 更新密碼
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setMessage({ type: 'success', text: '密碼修改成功！' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            throw new Error(error.message || '密碼修改失敗');
        }
    };

    const tabs = [
        { id: 'profile' as TabType, label: '個人資料', icon: User },
        { id: 'security' as TabType, label: '安全設定', icon: Lock },
        { id: 'privacy' as TabType, label: '隱私設定', icon: Shield }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">用戶設定</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`mx-6 mt-4 p-4 rounded-xl border ${
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

                {/* Tabs */}
                <div className="flex gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-700">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 font-medium rounded-t-xl transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border-b-2 border-violet-600'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                          >
                                <Icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : profile ? (
                        <>
                            {activeTab === 'profile' && (
                                <ProfileSettings profile={profile} onUpdate={handleUpdateProfile} />
                            )}
                            {activeTab === 'security' && (
                                <SecuritySettings onChangePassword={handleChangePassword} />
                            )}
                            {activeTab === 'privacy' && (
                                <PrivacySettings profile={profile} onUpdate={handleUpdateProfile} />
                            )}
                        </>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                            無法載入用戶資料
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                    {activeTab === 'profile' && (
                        <button
                            onClick={() => {
                                const saveFn = (window as any).__profileSettingsSave;
                                if (saveFn) saveFn();
                            }}
                            disabled={!canSave}
                            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Save size={18} />
                            保存變更
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
};
