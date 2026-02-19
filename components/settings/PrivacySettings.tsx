import React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { UserProfile } from '../../types';

interface PrivacySettingsProps {
    profile: UserProfile;
    onUpdate: (data: Partial<UserProfile>) => void;
}

type VisibilityOption = 'public' | 'friends' | 'private';

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ profile, onUpdate }) => {
    const visibilityOptions: { value: VisibilityOption; label: string; icon: React.ReactNode }[] = [
        { value: 'public', label: '公開', icon: <Eye size={16} /> },
        { value: 'friends', label: '好友可見', icon: <Eye size={16} /> },
        { value: 'private', label: '僅自己', icon: <EyeOff size={16} /> }
    ];

    const handleVisibilityChange = (field: 'birthday_visible' | 'gender_visible' | 'email_visible', value: VisibilityOption) => {
        onUpdate({ [field]: value });
    };

    const VisibilitySelector = ({
        label,
        field,
        currentValue
    }: {
        label: string;
        field: 'birthday_visible' | 'gender_visible' | 'email_visible';
        currentValue: VisibilityOption
    }) => (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
                <Lock size={16} className="text-slate-400" />
            </div>
            <div className="flex gap-2">
                {visibilityOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => handleVisibilityChange(field, option.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            currentValue === option.value
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-none'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-1">
                            {option.icon}
                            <span>{option.label}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    🔒 控制您的個人資料對其他用戶的可見性。「公開」表示所有人可見，「好友可見」表示僅好友可見，「僅自己」表示只有您能看到。
                </p>
            </div>

            <div className="space-y-4">
                <VisibilitySelector
                    label="生日可見性"
                    field="birthday_visible"
                    currentValue={(profile.birthday_visible || 'private') as VisibilityOption}
                />

                <VisibilitySelector
                    label="性別可見性"
                    field="gender_visible"
                    currentValue={(profile.gender_visible || 'private') as VisibilityOption}
                />

                <VisibilitySelector
                    label="Email 可見性"
                    field="email_visible"
                    currentValue={(profile.email_visible || 'private') as VisibilityOption}
                />
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ 注意：即使設為「公開」，您的 Email 也不會在公開頁面直接顯示，僅用於系統通知和好友申請。
                </p>
            </div>
        </div>
    );
};
