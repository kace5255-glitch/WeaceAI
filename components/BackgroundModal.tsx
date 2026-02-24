import React, { useState, useEffect } from 'react';
import { X, BookMarked, Check, RefreshCw, Loader2 } from 'lucide-react';
import { NovelSettings } from '../types';
import { regenerateWizardBriefField, BriefField } from '../services/wizardAIService';

interface BackgroundModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: NovelSettings;
    onUpdateSettings: (settings: NovelSettings) => void;
}

interface BackgroundFields {
    titles: string;
    genre_position: string;
    worldview_full: string;
    character_full: string;
    goldenfinger_full: string;
    selling_points: string;
    opening: string;
}

type FieldKey = keyof BackgroundFields;

const FIELD_CONFIG: { key: FieldKey; label: string; icon: string; placeholder: string; rows: number }[] = [
    { key: 'titles', label: '書名建議', icon: '📖', placeholder: '輸入書名建議，每行一個...', rows: 3 },
    { key: 'genre_position', label: '類型定位', icon: '🏷️', placeholder: '輸入類型定位...', rows: 2 },
    { key: 'selling_points', label: '核心賣點', icon: '🔥', placeholder: '輸入核心賣點...', rows: 4 },
    { key: 'opening', label: '開局構想', icon: '📋', placeholder: '輸入開局構想...', rows: 4 },
];

// 解析現有 background 字串為結構化欄位
const parseBackground = (bg: string): BackgroundFields => {
    const empty: BackgroundFields = { titles: '', genre_position: '', worldview_full: '', character_full: '', goldenfinger_full: '', selling_points: '', opening: '' };
    if (!bg) return empty;

    const sectionMap: Record<string, FieldKey> = {
        '書名建議': 'titles',
        '類型定位': 'genre_position',
        '世界觀設定': 'worldview_full',
        '主角設定': 'character_full',
        '金手指/外掛設定': 'goldenfinger_full',
        '金手指': 'goldenfinger_full',
        '核心賣點': 'selling_points',
        '開局構想': 'opening',
    };

    const fields = { ...empty };
    // 嘗試用 emoji 標記分段解析
    const pattern = /(?:📖|🌍|👤|⚡|🔥|🏷️|📋)\s*([^：:]+)[：:]\s*/g;
    const parts = bg.split(pattern);

    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i += 2) {
            const label = parts[i]?.trim();
            const content = parts[i + 1]?.trim() || '';
            const key = sectionMap[label];
            if (key) fields[key] = content;
        }
    } else {
        // 無法解析，全部放到 worldview_full
        fields.worldview_full = bg;
    }
    return fields;
};

const fieldsToString = (fields: BackgroundFields): string => {
    const parts: string[] = [];
    if (fields.titles) parts.push(`📖 書名建議：\n${fields.titles}`);
    if (fields.genre_position) parts.push(`🏷️ 類型定位：${fields.genre_position}`);
    if (fields.worldview_full) parts.push(`🌍 世界觀設定：\n${fields.worldview_full}`);
    if (fields.character_full) parts.push(`👤 主角設定：\n${fields.character_full}`);
    if (fields.goldenfinger_full) parts.push(`⚡ 金手指/外掛設定：\n${fields.goldenfinger_full}`);
    if (fields.selling_points) parts.push(`🔥 核心賣點：\n${fields.selling_points}`);
    if (fields.opening) parts.push(`📋 開局構想：\n${fields.opening}`);
    return parts.join('\n\n');
};

export const BackgroundModal: React.FC<BackgroundModalProps> = ({
    isOpen, onClose, settings, onUpdateSettings
}) => {
    const [fields, setFields] = useState<BackgroundFields>(() => parseBackground(settings.background || ''));
    const [saved, setSaved] = useState(false);
    const [loadingField, setLoadingField] = useState<FieldKey | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFields(parseBackground(settings.background || ''));
            setSaved(false);
        }
    }, [isOpen, settings.background]);

    if (!isOpen) return null;

    const updateField = (key: FieldKey, value: string) => {
        setFields(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onUpdateSettings({ ...settings, background: fieldsToString(fields) });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleRegenerate = async (key: FieldKey) => {
        setLoadingField(key);
        try {
            const genre = settings.genre || '';
            const content = await regenerateWizardBriefField(
                key as BriefField,
                [genre], [], fields.worldview_full, fields.character_full, fields.goldenfinger_full
            );
            setFields(prev => ({ ...prev, [key]: content }));
        } catch (err: any) {
            alert(`重新生成失敗：${err.message}`);
        } finally {
            setLoadingField(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                            <BookMarked size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">全局背景設定</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">小說的背景構思與核心設定</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Fields */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* 已選設定（同嚮導 Step 5） */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">已選設定</p>

                        {/* 賽道與類型 */}
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-200">🏷️ 賽道與類型</label>
                          <div className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                            {settings.genre ? settings.genre.split(/\s*-\s*/).map((part, i) => (
                              <span key={i} className="inline-block bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded text-xs font-medium mr-2">{part.trim()}</span>
                            )) : <span className="text-gray-400 text-xs">尚未選擇</span>}
                          </div>
                        </div>

                        {/* 世界觀 */}
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-200">🌍 世界觀設定</label>
                          <textarea
                            value={fields.worldview_full}
                            onChange={(e) => updateField('worldview_full', e.target.value)}
                            placeholder="世界觀設定..."
                            rows={4}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none resize-y leading-relaxed"
                          />
                        </div>

                        {/* 主角人設 */}
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-200">👤 主角人設</label>
                          <textarea
                            value={fields.character_full}
                            onChange={(e) => updateField('character_full', e.target.value)}
                            placeholder="主角人設描述..."
                            rows={4}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none resize-y leading-relaxed"
                          />
                        </div>

                        {/* 金手指 */}
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-200">⚡ 金手指/外掛</label>
                          <textarea
                            value={fields.goldenfinger_full}
                            onChange={(e) => updateField('goldenfinger_full', e.target.value)}
                            placeholder="金手指/外掛設定..."
                            rows={3}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none resize-y leading-relaxed"
                          />
                        </div>
                    </div>

                    {/* 立項書欄位（可重新生成） */}
                    {FIELD_CONFIG.map(({ key, label, icon, placeholder, rows }) => (
                        <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                    <span>{icon}</span> {label}
                                </label>
                                <button
                                    onClick={() => handleRegenerate(key)}
                                    disabled={loadingField !== null}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loadingField === key ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    {loadingField === key ? '生成中...' : '重新生成'}
                                </button>
                            </div>
                            <textarea
                                value={fields[key]}
                                onChange={(e) => updateField(key, e.target.value)}
                                placeholder={placeholder}
                                rows={rows}
                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl p-3 text-sm text-gray-800 dark:text-gray-100 resize-y focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 focus:border-amber-400 dark:focus:border-amber-500 placeholder-gray-400 dark:placeholder-gray-500 transition-all leading-relaxed"
                            />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs text-gray-400">此設定會套用到所有章節的 AI 生成</span>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            取消
                        </button>
                        <button onClick={handleSave} className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-lg shadow-md shadow-amber-200 dark:shadow-none transition-all flex items-center gap-1.5">
                            {saved ? (<><Check size={14} /> 已儲存</>) : '💾 儲存背景'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
