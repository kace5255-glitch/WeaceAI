import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, Trash2, GripVertical, Save, Check } from 'lucide-react';
import { NovelSettings } from '../types';

interface NovelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: NovelSettings;
    onUpdateSettings: (settings: NovelSettings) => void;
}

export const NovelSettingsModal: React.FC<NovelSettingsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onUpdateSettings
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'levels' | 'factions' | 'races'>('general');
    const [localSettings, setLocalSettings] = useState<NovelSettings>(settings);
    const [saved, setSaved] = useState(false);

    // Sync when opening
    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
            setSaved(false);
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleSave = () => {
        onUpdateSettings(localSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const updateList = (field: 'customLevels' | 'customFactions' | 'customRaces', newList: string[]) => {
        setLocalSettings(prev => ({ ...prev, [field]: newList }));
    };

    const addToList = (field: 'customLevels' | 'customFactions' | 'customRaces', value: string) => {
        if (!value.trim()) return;
        const list = localSettings[field] || [];
        if (!list.includes(value.trim())) {
            updateList(field, [...list, value.trim()]);
        }
    };

    const removeFromList = (field: 'customLevels' | 'customFactions' | 'customRaces', index: number) => {
        const list = localSettings[field] || [];
        updateList(field, list.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                            <Settings size={20} />
                        </div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">小說設定</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-3 space-y-1">
                        <TabButton id="general" label="一般設定" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2 mx-2" />
                        <TabButton id="levels" label="等級體系" active={activeTab === 'levels'} onClick={() => setActiveTab('levels')} />
                        <TabButton id="factions" label="陣營勢力" active={activeTab === 'factions'} onClick={() => setActiveTab('factions')} />
                        <TabButton id="races" label="種族類別" active={activeTab === 'races'} onClick={() => setActiveTab('races')} />
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900">
                        {activeTab === 'general' && (
                            <div className="space-y-6 max-w-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">小說標題</label>
                                    <input
                                        type="text"
                                        value={localSettings.title}
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">類型</label>
                                        <input
                                            type="text"
                                            value={localSettings.genre}
                                            onChange={(e) => setLocalSettings(prev => ({ ...prev, genre: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">風格</label>
                                        <input
                                            type="text"
                                            value={localSettings.style}
                                            onChange={(e) => setLocalSettings(prev => ({ ...prev, style: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">基調</label>
                                    <input
                                        type="text"
                                        value={localSettings.tone}
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, tone: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'levels' && (
                            <ListEditor
                                title="自定義等級/境界"
                                description="設定小說中的修煉等級體系，將用於角色卡片與AI生成。"
                                items={localSettings.customLevels || []}
                                onAdd={(val) => addToList('customLevels', val)}
                                onRemove={(idx) => removeFromList('customLevels', idx)}
                                placeholder="例如：練氣、築基、金丹..."
                            />
                        )}

                        {activeTab === 'factions' && (
                            <ListEditor
                                title="自定義陣營/勢力"
                                description="設定主要的三大陣營或多方勢力，用於角色分類。"
                                items={localSettings.customFactions || []}
                                onAdd={(val) => addToList('customFactions', val)}
                                onRemove={(idx) => removeFromList('customFactions', idx)}
                                placeholder="例如：青雲門、魔教、散修..."
                                defaultItems={['正派', '反派', '中立']}
                            />
                        )}

                        {activeTab === 'races' && (
                            <ListEditor
                                title="自定義種族"
                                description="設定小說中出現的種族類別。"
                                items={localSettings.customRaces || []}
                                onAdd={(val) => addToList('customRaces', val)}
                                onRemove={(idx) => removeFromList('customRaces', idx)}
                                placeholder="例如：人類、精靈、獸人..."
                                defaultItems={['人類', '妖族', '魔族']}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-lg shadow-violet-200 dark:shadow-none flex items-center gap-2 transition-all active:scale-95"
                    >
                        {saved ? <Check size={16} /> : <Save size={16} />}
                        {saved ? '已儲存' : '儲存變更'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ id: string, label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${active
            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
    >
        {label}
    </button>
);

const ListEditor: React.FC<{
    title: string;
    description: string;
    items: string[];
    onAdd: (val: string) => void;
    onRemove: (idx: number) => void;
    placeholder: string;
    defaultItems?: string[];
}> = ({ title, description, items, onAdd, onRemove, placeholder, defaultItems }) => {
    const [input, setInput] = useState('');

    return (
        <div className="max-w-xl">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 mb-4">{description}</p>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onAdd(input);
                            setInput('');
                        }
                    }}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                    onClick={() => {
                        onAdd(input);
                        setInput('');
                    }}
                    disabled={!input.trim()}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="space-y-2">
                {items.length === 0 && defaultItems && (
                    <div className="p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 text-center text-sm">
                        當前使用預設：{defaultItems.join('、')}
                    </div>
                )}
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg group hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-gray-300 cursor-move" />
                            <span className="text-gray-700 dark:text-gray-200">{item}</span>
                        </div>
                        <button
                            onClick={() => onRemove(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
