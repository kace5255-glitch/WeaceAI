import React, { useState, useRef, useEffect } from 'react';
import { Users, Bot, Wand2, Plus, Trash2, Zap, Info, ChevronDown, Book, X, UserPlus, Tag, Sparkles, FileText, ChevronRight, Thermometer, Square } from 'lucide-react';
import { Character, Chapter, NovelSettings, Vocabulary, Volume } from '../types';

interface AssistantPanelProps {
    characters: Character[];
    vocabularies: Vocabulary[];
    settings: NovelSettings;
    volumes: Volume[]; // New: Need volumes to list chapters
    currentChapter: Chapter;
    isGenerating: boolean;
    onUpdateSettings: (settings: NovelSettings) => void;
    onUpdateChapter: (chapter: Chapter) => void;
    onAddCharacter: () => void;
    onAiCreateCharacter?: (description: string) => Promise<void>;
    onUpdateCharacter: (id: string, updated: Partial<Character>) => void;
    onDeleteCharacter: (id: string) => void;
    onAddVocabulary: () => void;
    onUpdateVocabulary: (id: string, updated: Partial<Vocabulary>) => void;
    onDeleteVocabulary: (id: string) => void;
    // Updated signature to include reference chapters and temperature
    onGenerate: (instruction: string, requirements: string, relations: string, selectedCharIds: string[], selectedVocabIds: string[], selectedRefChapterIds: string[], model: string, temperature: number) => void;
    onStopGeneration?: () => void; // New prop for stopping
}

// Reusable Custom Selector Component
interface CustomSelectorProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    widthClass?: string;
}

const CustomSelector: React.FC<CustomSelectorProps> = ({ value, onChange, options, placeholder = "選擇", widthClass = "w-16" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <div className="flex items-center group/input shadow-sm">
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    className={`text-xs bg-gray-50 border border-gray-200 border-r-0 focus:bg-white focus:border-violet-300 rounded-l-md py-1 pl-2 pr-0 text-center text-gray-600 focus:outline-none transition-all placeholder-gray-400 h-[26px] ${widthClass}`}
                    placeholder={placeholder}
                />
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-gray-50 border border-gray-200 border-l-0 hover:bg-gray-100 rounded-r-md py-1 px-0.5 h-[26px] flex items-center justify-center text-gray-400 hover:text-violet-600 transition-colors"
                    tabIndex={-1}
                >
                    <ChevronDown size={10} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-24 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-semibold text-gray-400 px-3 py-1.5 bg-gray-50 dark:bg-gray-750 uppercase tracking-wider">建議選項</div>
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors ${value === opt ? 'text-violet-700 dark:text-violet-300 font-medium bg-violet-50/50 dark:bg-violet-900/20' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
    characters,
    vocabularies,
    settings,
    volumes,
    currentChapter,
    isGenerating,
    onUpdateSettings,
    onUpdateChapter,
    onAddCharacter,
    onAiCreateCharacter,
    onUpdateCharacter,
    onDeleteCharacter,
    onAddVocabulary,
    onUpdateVocabulary,
    onDeleteVocabulary,
    onGenerate,
    onStopGeneration
}) => {
    const [activeTab, setActiveTab] = useState<'ai' | 'chars'>('chars');
    const [subTab, setSubTab] = useState<'roles' | 'vocab'>('roles');

    // AI Form State
    const [relations, setRelations] = useState('');
    const [writingRequirements, setWritingRequirements] = useState('');
    const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
    const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);
    const [selectedRefChapterIds, setSelectedRefChapterIds] = useState<string[]>([]); // New state
    const [selectedModel, setSelectedModel] = useState<string>('Google Flash');
    const [temperature, setTemperature] = useState<number>(0.9); // Default temperature

    // AI Create Character State
    const [isAiCharOpen, setIsAiCharOpen] = useState(false);
    const [aiCharDescription, setAiCharDescription] = useState('');
    const [isCreatingChar, setIsCreatingChar] = useState(false);

    // Pickers state
    const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);
    const charPickerRef = useRef<HTMLDivElement>(null);

    // Reference Picker State
    const [isRefPickerOpen, setIsRefPickerOpen] = useState(false);
    const refPickerRef = useRef<HTMLDivElement>(null);

    const vocabCategories = ["物品", "技能", "地點", "組織", "概念", "生物", "歷史"];
    const roleOptions = ["主角", "反派", "配角", "路人", "勢力主"];

    // Close click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (charPickerRef.current && !charPickerRef.current.contains(event.target as Node)) {
                setIsCharPickerOpen(false);
            }
            if (refPickerRef.current && !refPickerRef.current.contains(event.target as Node)) {
                setIsRefPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleCharSelection = (id: string) => {
        setSelectedCharIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        setIsCharPickerOpen(false);
    };

    const toggleRefChapterSelection = (id: string) => {
        setSelectedRefChapterIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAiCharSubmit = async () => {
        if (!aiCharDescription.trim() || !onAiCreateCharacter) return;
        setIsCreatingChar(true);
        await onAiCreateCharacter(aiCharDescription);
        setIsCreatingChar(false);
        setAiCharDescription('');
        setIsAiCharOpen(false);
    };

    const availableCharacters = characters.filter(c => !selectedCharIds.includes(c.id));

    // Flatten volumes to get all chapters for reference selection, exclude current
    const allReferenceableChapters = volumes.flatMap(v => v.chapters).filter(c => c.id !== currentChapter.id);

    return (
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full flex-shrink-0 shadow-lg shadow-gray-100 dark:shadow-none z-10 font-sans transition-colors duration-200">
            {/* Header Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                    onClick={() => setActiveTab('chars')}
                    className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all ${activeTab === 'chars' ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-violet-50/10' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                >
                    資料庫 <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full ml-1 font-mono tracking-tight">LIVE</span>
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-violet-50/10' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                >
                    <Sparkles size={14} className={activeTab === 'ai' ? "text-violet-500" : "text-slate-400"} />
                    AI 寫作助手
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-gray-900 transition-colors duration-200">

                {activeTab === 'chars' ? (
                    <div className="p-4 space-y-4">
                        {/* Sub Tabs */}
                        <div className="flex space-x-1 bg-gray-100/80 dark:bg-gray-800 p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setSubTab('roles')}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${subTab === 'roles' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                角色 ({characters.length})
                            </button>
                            <button
                                onClick={() => setSubTab('vocab')}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${subTab === 'vocab' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                詞條 ({vocabularies.length})
                            </button>
                        </div>

                        {/* Character List */}
                        {subTab === 'roles' && (
                            <div className="space-y-4">
                                {characters.map(char => (
                                    <div key={char.id} className="bg-white dark:bg-gray-750 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-4 relative group hover:border-violet-300 dark:hover:border-violet-500 hover:shadow-md transition-all duration-200">
                                        {/* Character Card Content */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-slate-400 dark:text-gray-300 flex-shrink-0 shadow-inner">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <input
                                                        value={char.name}
                                                        onChange={(e) => onUpdateCharacter(char.id, { name: e.target.value })}
                                                        className="font-bold text-slate-800 dark:text-gray-100 text-base w-24 bg-transparent focus:bg-slate-50 dark:focus:bg-gray-600 rounded px-1 -ml-1 focus:ring-2 focus:ring-violet-100 dark:focus:ring-gray-500 outline-none transition-all"
                                                    />
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/30 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-100 dark:focus-within:ring-amber-900/50 transition-all">
                                                            <Zap size={10} fill="currentColor" className="flex-shrink-0 text-amber-500" />
                                                            <input
                                                                value={char.level || ''}
                                                                onChange={(e) => onUpdateCharacter(char.id, { level: e.target.value })}
                                                                placeholder="等級/境界"
                                                                className="w-20 bg-transparent border-none outline-none text-amber-800 dark:text-amber-300 font-bold p-0 text-[10px] leading-none placeholder-amber-600/30 dark:placeholder-amber-500/30"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="flex items-center gap-1">
                                                    <CustomSelector
                                                        value={char.role}
                                                        onChange={(val) => onUpdateCharacter(char.id, { role: val })}
                                                        options={roleOptions}
                                                        placeholder="定位"
                                                        widthClass="w-16"
                                                    />
                                                    <button onClick={() => onDeleteCharacter(char.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                                </div>
                                                <select value={char.gender} onChange={(e) => onUpdateCharacter(char.id, { gender: e.target.value as any })} className="text-xs text-slate-400 dark:text-gray-500 bg-transparent border-none p-0 cursor-pointer text-right pr-7 hover:text-violet-600 dark:hover:text-violet-400 transition-colors focus:ring-0">
                                                    <option value="male">男</option>
                                                    <option value="female">女</option>
                                                    <option value="other">其他</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider"><span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-gray-600 flex items-center justify-center text-[8px] text-slate-600 dark:text-gray-300 font-bold">@</span>性格特徵</label>
                                            <input value={char.traits} onChange={(e) => onUpdateCharacter(char.id, { traits: e.target.value })} className="w-full bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-200 focus:bg-white dark:focus:bg-gray-700 focus:border-violet-300 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-50 dark:focus:ring-violet-900/20 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-emerald-500 flex items-center justify-center relative">
                                                        <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    </div>
                                                    當前狀態 (Status)
                                                </label>
                                                <button
                                                    onClick={async () => {
                                                        if (!currentChapter.content.trim()) {
                                                            alert("請先在編輯器錄入章節內容，以便 AI 進行分析");
                                                            return;
                                                        }
                                                        try {
                                                            const { updateCharacterProfile } = await import('../services/geminiService');
                                                            const btn = document.getElementById(`db-ai-update-${char.id}`);
                                                            if (btn) btn.classList.add('animate-spin');

                                                            const updates = await updateCharacterProfile(currentChapter.content, char, selectedModel);
                                                            onUpdateCharacter(char.id, updates);

                                                            if (btn) btn.classList.remove('animate-spin');
                                                        } catch (e) {
                                                            console.error(e);
                                                            alert("AI 更新失敗");
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-[10px] font-bold"
                                                    title={`根據當前章節《${currentChapter.title}》更新`}
                                                >
                                                    <Sparkles id={`db-ai-update-${char.id}`} size={10} />
                                                    AI 更新
                                                </button>
                                            </div>
                                            <textarea value={char.status} onChange={(e) => onUpdateCharacter(char.id, { status: e.target.value })} className="w-full bg-emerald-50/40 dark:bg-emerald-900/30 border border-emerald-100/60 dark:border-emerald-800/50 rounded-lg px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300 focus:bg-white dark:focus:bg-gray-800 focus:border-emerald-300 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 outline-none resize-none h-16 leading-relaxed" />
                                        </div>
                                    </div>
                                ))}

                                {/* Character Creation Actions */}
                                <div className="flex gap-2">
                                    {isAiCharOpen ? (
                                        <div className="w-full bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-800 rounded-xl p-3 shadow-md animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                                                    <Sparkles size={12} fill="currentColor" />
                                                    AI 角色生成
                                                </label>
                                                <button onClick={() => setIsAiCharOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14} /></button>
                                            </div>
                                            <textarea
                                                value={aiCharDescription}
                                                onChange={(e) => setAiCharDescription(e.target.value)}
                                                placeholder="例：一個喜歡吃甜食的冷酷殺手，銀髮紅瞳，隨身帶著一把名為「斷罪」的長刀..."
                                                className="w-full text-xs p-2 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg mb-2 h-20 resize-none focus:outline-none focus:border-violet-400 text-slate-700 dark:text-gray-200 placeholder-slate-400"
                                            />
                                            <button
                                                onClick={handleAiCharSubmit}
                                                disabled={isCreatingChar || !aiCharDescription.trim()}
                                                className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                                            >
                                                {isCreatingChar ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        生成中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 size={12} />
                                                        立即生成
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={onAddCharacter} className="flex-1 py-3 border border-dashed border-slate-300 dark:border-gray-500 rounded-xl text-slate-500 dark:text-gray-300 text-sm font-medium hover:bg-white dark:hover:bg-gray-700 hover:border-slate-400 dark:hover:border-gray-400 hover:text-slate-700 dark:hover:text-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm bg-slate-50/50 dark:bg-gray-800/50">
                                                <Plus size={16} /><span>手動新增</span>
                                            </button>
                                            <button onClick={() => setIsAiCharOpen(true)} className="flex-1 py-3 border border-dashed border-violet-200 dark:border-violet-600 rounded-xl text-violet-600 dark:text-violet-300 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-500 transition-colors flex items-center justify-center gap-2 shadow-sm bg-white dark:bg-gray-800">
                                                <Sparkles size={16} /><span>AI 創建</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Vocabulary List */}
                        {subTab === 'vocab' && (
                            <div className="space-y-4">
                                {vocabularies.map(vocab => (
                                    <div key={vocab.id} className="bg-white dark:bg-gray-750 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-4 relative group hover:border-violet-300 dark:hover:border-violet-500 hover:shadow-md transition-all duration-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-300 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100 dark:border-blue-800/30"><Book size={18} /></div>
                                                <div>
                                                    <input value={vocab.name} onChange={(e) => onUpdateVocabulary(vocab.id, { name: e.target.value })} className="font-bold text-slate-800 dark:text-gray-100 text-base w-32 bg-transparent focus:bg-slate-50 dark:focus:bg-gray-600 rounded px-1 -ml-1 focus:ring-2 focus:ring-violet-100 dark:focus:ring-gray-500 outline-none" />
                                                    <div className="h-0.5"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CustomSelector value={vocab.category} onChange={(val) => onUpdateVocabulary(vocab.id, { category: val })} options={vocabCategories} placeholder="分類" widthClass="w-16" />
                                                <button onClick={() => onDeleteVocabulary(vocab.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/60 dark:bg-gray-800/50 rounded-lg p-2 border border-transparent focus-within:bg-white dark:focus-within:bg-gray-700 focus-within:border-blue-200 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/20 transition-all">
                                            <textarea value={vocab.description} onChange={(e) => onUpdateVocabulary(vocab.id, { description: e.target.value })} className="w-full bg-transparent border-none text-sm text-slate-600 dark:text-gray-300 focus:outline-none resize-none h-16 leading-relaxed placeholder-slate-400" placeholder="輸入詞條描述..." />
                                        </div>
                                    </div>
                                ))}
                                <button onClick={onAddVocabulary} className="w-full py-3 border border-dashed border-violet-200 dark:border-violet-600 rounded-xl text-violet-600 dark:text-violet-300 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-500 transition-colors flex items-center justify-center gap-2 shadow-sm bg-white dark:bg-gray-800"><Plus size={16} /><span>新增詞條</span></button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 space-y-4">

                        {/* API Configuration Section */}
                        {/* Model & Temperature Selector */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">選擇模型</label>
                                <div className="relative group">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full appearance-none bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 font-medium py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50/50 dark:focus:ring-violet-900/20 text-xs shadow-sm transition-all cursor-pointer hover:border-violet-300 dark:hover:border-violet-500"
                                    >
                                        <option value="Google Flash">Gemini 3</option>
                                        <option value="Google Pro">Gemini 3 Pro (Exp)</option>
                                        <option value="DeepSeek R1">DeepSeek R1</option>
                                        <option value="DeepSeek V3.2">DeepSeek V3.2</option>
                                        <option value="OpenRouter Sonnet 4.5">Claude Sonnet 4.5</option>
                                        <option value="OpenRouter Opus 4.6">Claude Opus 4.6</option>
                                        <option value="Qwen3-Max">Qwen3-Max</option>
                                        <option value="Qwen3-Plus">Qwen3-Plus</option>
                                        <option value="Kimi">Kimi</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 group-hover:text-violet-500 transition-colors">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>

                            {/* Temperature Slider */}
                            <div className="space-y-1.5 px-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                        <Thermometer size={12} /> 創意度 (Temperature)
                                    </label>
                                    <span className="text-xs font-mono font-bold text-violet-600 bg-violet-50 px-1.5 rounded">{temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="2.0"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-600 hover:accent-violet-500 transition-all"
                                />
                                <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                                    <span>嚴謹 (0.0)</span>
                                    <span>平衡 (1.0)</span>
                                    <span>奔放 (2.0)</span>
                                </div>
                            </div>
                        </div>

                        {/* System Persona Section (New) */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                    <Bot size={12} /> AI 人設 (System Persona)
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-300">{(settings.systemPersona || '').length}</span>
                                    <button
                                        onClick={() => onUpdateSettings({ ...settings, systemPersona: '' })}
                                        className="text-[9px] text-slate-400 hover:text-red-500 underline"
                                        title="重置為預設"
                                    >
                                        重置
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={settings.systemPersona || ''}
                                onChange={(e) => onUpdateSettings({ ...settings, systemPersona: e.target.value })}
                                placeholder="預設：你是一位擁有豐富想像力和精湛文筆的資深小說家..."
                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-20 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 shadow-sm transition-all"
                            />
                        </div>

                        {/* Writing Style Section */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-600">寫作風格</label>
                            </div>
                            <div>
                                <textarea
                                    value={settings.style}
                                    onChange={(e) => onUpdateSettings({ ...settings, style: e.target.value })}
                                    placeholder="請輸入寫作風格"
                                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-20 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 shadow-sm transition-all"
                                />
                                <div className="text-right mt-1">
                                    <div className="text-right mt-1">
                                        <span className="text-[10px] text-slate-300">{settings.style.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Writing Requirements Section */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-600">寫作要求</label>
                            </div>
                            <div>
                                <textarea
                                    value={writingRequirements}
                                    onChange={(e) => setWritingRequirements(e.target.value)}
                                    placeholder="請輸入寫作要求"
                                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-20 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 shadow-sm transition-all"
                                />
                                <div className="text-right mt-1">
                                    <div className="text-right mt-1">
                                        <span className="text-[10px] text-slate-300">{writingRequirements.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">本章背景</label>
                                <span className="text-[10px] text-slate-400 bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-gray-600">{settings.background.length}</span>
                            </div>
                            <textarea
                                value={settings.background}
                                onChange={(e) => onUpdateSettings({ ...settings, background: e.target.value })}
                                placeholder="描述本章發生的地點、天氣、氛圍..."
                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-16 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 shadow-sm transition-all"
                            />
                        </div>

                        {/* Outline */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex gap-1">
                                    本章大綱 <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[10px] text-slate-300">{currentChapter.outline.length}</span>
                            </div>
                            <textarea
                                value={currentChapter.outline}
                                onChange={(e) => onUpdateChapter({ ...currentChapter, outline: e.target.value })}
                                placeholder="輸入劇情大綱..."
                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-24 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 shadow-sm transition-all"
                            />
                        </div>

                        {/* Reference Chapters Selection (New Feature) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
                                    <FileText size={14} className="text-blue-500" />
                                    參考章節 ({selectedRefChapterIds.length})
                                </label>
                            </div>

                            <div className="relative" ref={refPickerRef}>
                                <button onClick={() => setIsRefPickerOpen(!isRefPickerOpen)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 flex items-center justify-between bg-white dark:bg-gray-750 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-sm text-xs text-slate-600 dark:text-gray-300">
                                    <span className="truncate">
                                        {selectedRefChapterIds.length > 0
                                            ? `已選 ${selectedRefChapterIds.length} 章`
                                            : "未選擇 (不參考前文)"}
                                    </span>
                                    <ChevronDown size={12} className={`transition-transform ${isRefPickerOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isRefPickerOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95">
                                        <div className="text-[10px] text-slate-400 px-3 py-2 bg-slate-50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700 font-medium">
                                            勾選希望 AI 參考的章節
                                        </div>
                                        {volumes.map(vol => (
                                            <div key={vol.id} className="border-b border-gray-50 last:border-0">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-50/50 uppercase">{vol.title}</div>
                                                {vol.chapters.map(chap => {
                                                    if (chap.id === currentChapter.id) return null; // Don't allow selecting self
                                                    const isSelected = selectedRefChapterIds.includes(chap.id);
                                                    return (
                                                        <div
                                                            key={chap.id}
                                                            onClick={() => toggleRefChapterSelection(chap.id)}
                                                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-xs ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-slate-700'}`}
                                                        >
                                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                                                {isSelected && <CheckIcon />}
                                                            </div>
                                                            <span className="truncate flex-1">{chap.title}</span>
                                                            {chap.briefing && <span title="已有簡報"><Tag size={10} className="text-emerald-500" /></span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                        {allReferenceableChapters.length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400">無其他章節可供參考</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Appearing Characters */}
                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-violet-600 uppercase tracking-wide flex items-center gap-1.5">
                                    <Users size={14} className="text-violet-500" />
                                    登場角色 ({selectedCharIds.length})
                                </label>
                                <button
                                    onClick={() => setActiveTab('chars')}
                                    className="text-[10px] text-slate-400 hover:text-violet-600 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm transition-colors"
                                >
                                    管理 <ChevronDown size={10} className="-rotate-90" />
                                </button>
                            </div>

                            {/* Characters detailed list */}
                            {selectedCharIds.length > 0 && (
                                <div className="space-y-2">
                                    {selectedCharIds.map(id => {
                                        const char = characters.find(c => c.id === id);
                                        if (!char) return null;
                                        return (
                                            <div key={id} className="bg-white dark:bg-gray-750 border border-slate-200 dark:border-gray-600 rounded-lg p-2.5 shadow-sm relative group hover:border-violet-300 dark:hover:border-violet-500 transition-all">
                                                <button onClick={() => toggleCharSelection(id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><X size={12} /></button>

                                                <div className="flex items-start gap-2.5">
                                                    {/* Avatar */}
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 border border-violet-100 dark:border-violet-800/30 flex items-center justify-center text-violet-600 dark:text-violet-300 text-xs font-bold shrink-0 mt-0.5">
                                                        {char.name.charAt(0)}
                                                    </div>

                                                    <div className="flex-1 min-w-0 pr-4">
                                                        {/* Header: Name + Role + Level */}
                                                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-gray-100 leading-none">{char.name}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-600 text-slate-500 dark:text-gray-300 font-medium leading-none">{char.role}</span>
                                                            {char.level && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-none flex items-center gap-0.5"><Zap size={8} className="fill-current" /> {char.level}</span>}
                                                        </div>

                                                        {/* Traits (Data) */}
                                                        {char.traits && (
                                                            <div className="text-[10px] text-slate-500 mb-1.5 flex items-start gap-1">
                                                                <span className="font-medium text-slate-400 shrink-0">特徵:</span>
                                                                <span className="truncate">{char.traits}</span>
                                                            </div>
                                                        )}

                                                        {/* Status */}
                                                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/30 border border-emerald-100/50 dark:border-emerald-800/50 rounded px-2 py-1.5 leading-relaxed relative">
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                    <span className="font-bold text-emerald-600 text-[9px]">STATUS</span>
                                                                </div>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            // Import service dynamically or use passed prop if preferred, but here we can just use the exported function
                                                                            const { updateCharacterProfile } = await import('../services/geminiService');
                                                                            const btn = document.getElementById(`ai-update-${id}`);
                                                                            if (btn) btn.classList.add('animate-spin');

                                                                            const updates = await updateCharacterProfile(currentChapter.content, char, selectedModel);
                                                                            onUpdateCharacter(id, updates);

                                                                            if (btn) btn.classList.remove('animate-spin');
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            alert("AI 更新失敗");
                                                                        }
                                                                    }}
                                                                    className="p-1 hover:bg-emerald-100 rounded-md text-emerald-600 transition-colors"
                                                                    title="AI 分析更新"
                                                                >
                                                                    <Sparkles id={`ai-update-${id}`} size={12} />
                                                                </button>
                                                            </div>
                                                            {char.status || "無特殊狀態"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="relative" ref={charPickerRef}>
                                <button onClick={() => setIsCharPickerOpen(!isCharPickerOpen)} className="w-full border border-dashed border-slate-300 rounded-xl p-2 flex items-center justify-center gap-2 bg-slate-50/50 hover:bg-white hover:border-violet-400 hover:text-violet-600 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-violet-500 text-xs font-bold uppercase tracking-wide"><Plus size={12} />添加角色</div>
                                </button>
                                {isCharPickerOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                        {availableCharacters.map(char => (
                                            <button key={char.id} onClick={() => toggleCharSelection(char.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-violet-50 dark:hover:bg-gray-600 flex items-center gap-2 text-slate-700 dark:text-gray-200 transition-colors border-b border-gray-50 dark:border-gray-600/50">
                                                <span className="font-medium">{char.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Relations */}
                        <div className="space-y-1.5 mt-4">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">關係變動</label>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">關係變動</label>
                                <span className="text-[10px] text-slate-300">{relations.length}</span>
                            </div>
                            <textarea
                                value={relations}
                                onChange={(e) => setRelations(e.target.value)}
                                placeholder="描述變動..."
                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-14 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 shadow-sm transition-all"
                            />
                        </div>

                    </div>
                )}
            </div>

            {/* Footer Action */}
            {activeTab === 'ai' && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-20">
                    {isGenerating ? (
                        <button
                            onClick={onStopGeneration}
                            className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-white shadow-lg transition-all duration-300 text-sm bg-rose-500 hover:bg-rose-600 hover:shadow-rose-200 active:translate-y-0.5 animate-in fade-in"
                        >
                            <Square size={16} fill="currentColor" className="text-white" />
                            <span>停止生成</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => onGenerate(currentChapter.outline, writingRequirements, relations, selectedCharIds, selectedVocabIds, selectedRefChapterIds, selectedModel, temperature)}
                            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-white shadow-lg transition-all duration-300 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0`}
                        >
                            <Wand2 size={16} fill="currentColor" className="text-violet-200" />
                            <span>開始生成</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Tiny SVG Helper
const CheckIcon = () => (
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
