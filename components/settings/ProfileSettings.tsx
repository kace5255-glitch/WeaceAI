import React, { useState, useEffect } from 'react';
import { User, UserCircle, Mail, Calendar, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface ProfileSettingsProps {
    profile: UserProfile;
    onUpdate: (data: Partial<UserProfile>) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onUpdate }) => {
    const [username, setUsername] = useState(profile.username || '');
    const [displayName, setDisplayName] = useState(profile.display_name || '');
    const [birthday, setBirthday] = useState(profile.birthday || '');
    const [gender, setGender] = useState(profile.gender || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [usernameError, setUsernameError] = useState('');
    const [canChangeUsername, setCanChangeUsername] = useState(true);
    const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // 暴露變更狀態給父組件
    useEffect(() => {
        (window as any).__profileSettingsHasChanges = hasChanges;
        (window as any).__profileSettingsUsernameError = usernameError;
    }, [hasChanges, usernameError]);

    useEffect(() => {
        // 檢查用戶名修改限制（30天）
        if (profile.last_username_change) {
            const lastChange = new Date(profile.last_username_change);
            const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
            setCanChangeUsername(daysSinceChange >= 30);
        }
    }, [profile.last_username_change]);

    // 檢測是否有變更
    useEffect(() => {
        const changed =
            username !== profile.username ||
            displayName !== (profile.display_name || '') ||
            birthday !== (profile.birthday || '') ||
            gender !== (profile.gender || '') ||
            bio !== (profile.bio || '');
        setHasChanges(changed);
    }, [username, displayName, birthday, gender, bio, profile]);

    const handleUsernameChange = (value: string) => {
        setUsername(value);

        // 驗證用戶名格式
        if (value.length < 3 || value.length > 20) {
            setUsernameError('用戶名必須為 3-20 個字元');
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            setUsernameError('只能包含英文、數字和底線');
        } else {
            setUsernameError('');
        }
    };

    const handleSave = () => {
        console.log('handleSave called', { username, displayName, birthday, gender, bio, usernameError });

        if (usernameError) {
            console.log('Username error, not saving');
            return;
        }

        // 如果用戶名有變更，顯示確認對話框
        if (username !== profile.username) {
            console.log('Username changed, showing confirm dialog');
            setShowUsernameConfirm(true);
            return;
        }

        // 沒有用戶名變更，直接保存
        console.log('Saving profile updates');
        onUpdate({
            username,
            display_name: displayName,
            birthday,
            gender,
            bio
        });
    };

    const confirmUsernameChange = () => {
        console.log('Username change confirmed');
        setShowUsernameConfirm(false);
        onUpdate({
            username,
            display_name: displayName,
            birthday,
            gender,
            bio
        });
    };

    // 暴露內部狀態給父組件 - 移到這裡確保 handleSave 已定義
    useEffect(() => {
        console.log('Setting up window.__profileSettingsSave');
        (window as any).__profileSettingsSave = handleSave;
        return () => {
            delete (window as any).__profileSettingsSave;
        };
    }, [username, displayName, birthday, gender, bio, usernameError, profile, onUpdate]);

    const bioLength = bio.length;
    const bioMaxLength = 500;

    return (
        <div className="space-y-6">
            {/* 用戶名變更確認對話框 */}
            {showUsernameConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertCircle className="text-amber-600 dark:text-amber-400" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">確認修改用戶名</h3>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-slate-600 dark:text-slate-300">
                                您即將將用戶名從 <span className="font-bold text-violet-600 dark:text-violet-400">{profile.username}</span> 修改為 <span className="font-bold text-violet-600 dark:text-violet-400">{username}</span>
                            </p>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">⚠️ 重要提醒：</p>
                                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                                    <li>用戶名每 30 天只能修改一次</li>
                                    <li>修改後將無法在 30 天內再次更改</li>
                                    <li>用戶名用於登入系統</li>
                                    <li>請確保新用戶名正確無誤</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUsernameConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                取消
                            </button>
                            <button
                          onClick={confirmUsernameChange}
                                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 dark:shadow-none transition-all active:scale-[0.98]"
                            >
                                確定修改
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 頭像區塊 */}
            <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-3xl font-bold text-violet-600 dark:text-violet-300">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span>{(profile.display_name || profile.username || 'U')[0].toUpperCase()}</span>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">個人頭像</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">頭像上傳功能即將推出</p>
                </div>
            </div>

            {/* 基本資料 */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        用戶名 *
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            disabled={!canChangeUsername}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="設定您的用戶名"
                        />
                    </div>
                    {usernameError && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {usernameError}
                        </p>
                    )}
                    {!canChangeUsername && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            用戶名每 30 天只能修改一次
                        </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">用於登入，3-20個字元</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        顯示名稱
                    </label>
                    <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                            placeholder="顯示在介面上的名稱"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Email 修改功能即將推出</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        生日
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        性別
                    </label>
                    <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                    >
                        <option value="">請選擇</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                        <option value="other">其他</option>
                        <option value="prefer_not_to_say">不願透露</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        個人簡介
                    </label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, bioMaxLength))}
                        rows={4}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 dark:text-slate-200 resize-none"
                        placeholder="介紹一下自己..."
                    />
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-400">最多 500 字元</p>
                        <p className={`text-xs ${bioLength > bioMaxLength * 0.9 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {bioLength} / {bioMaxLength}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
