import React, { useState, useRef, useEffect } from 'react';
import { Users, Bot, Wand2, Plus, Trash2, Zap, Info, ChevronDown, Book, X, UserPlus, Tag, Sparkles, FileText, ChevronRight, Thermometer, Square, Check, Download, Upload, Copy } from 'lucide-react';
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
    onStopGeneration?: () => void;
    onImportData: (data: { characters: Character[], vocabularies: Vocabulary[] }) => Promise<{ newCharsCount: number, newVocabsCount: number }>;
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
                    className={`text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 border-r-0 focus:bg-white dark:focus:bg-gray-600 focus:border-violet-300 dark:focus:border-violet-500 rounded-l-md py-1 pl-2 pr-0 text-center text-gray-600 dark:text-gray-200 focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 h-[26px] ${widthClass}`}
                    placeholder={placeholder}
                />
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 border-l-0 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-md py-1 px-0.5 h-[26px] flex items-center justify-center text-gray-400 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
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
    characters, vocabularies, settings, volumes, currentChapter, isGenerating,
    onUpdateSettings, onUpdateChapter, onAddCharacter, onAiCreateCharacter, onUpdateCharacter, onDeleteCharacter,
    onAddVocabulary, onUpdateVocabulary, onDeleteVocabulary, onGenerate, onStopGeneration, onImportData
}) => {
    const [activeTab, setActiveTab] = useState<'chars' | 'ai'>('chars');
    const [subTab, setSubTab] = useState<'roles' | 'vocab'>('roles');

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Copy Feedback State
    const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopyFeedbackId(id);
            setTimeout(() => setCopyFeedbackId(null), 2000);
        });
    };

    const formatCharacter = (char: Character) => {
        return `【角色】${char.name}\n身份：${char.role}\n性格：${char.traits}\n狀態：${char.status}${char.lifeStatus ? ` (${char.lifeStatus})` : ''}\n陣營：${char.faction || '無'} | 時期：${char.period || '無'}`;
    };

    const formatVocabulary = (vocab: Vocabulary) => {
        return `【詞彙】${vocab.name}\n分類：${vocab.category}\n描述：${vocab.description}\n標籤：${(vocab.tags || []).map(t => `#${t}`).join(' ')}`;
    };

    // Import/Export Handlers
    const handleExportData = () => {
        const data = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            data: {
                characters,
                vocabularies
            }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `writing-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!json.data || !Array.isArray(json.data.characters) || !Array.isArray(json.data.vocabularies)) {
                    alert('無效的備份檔案格式');
                    return;
                }

                if (window.confirm(`準備匯入資料。\n\n現有資料若 ID 重複將被保留（不會覆蓋）。\n確定要繼續嗎？`)) {
                    const result = await onImportData(json.data);
                    alert(`匯入完成！\n新增角色: ${result.newCharsCount}\n新增詞條: ${result.newVocabsCount}`);
                    // Refresh or reload is handled by React state updates in parent
                }
            } catch (err) {
                console.error(err);
                alert('匯入失敗：檔案格式錯誤');
            }
            if (e.target) e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    // Search & Filter State
    const [charSearchQuery, setCharSearchQuery] = useState('');
    const [charFilterGender, setCharFilterGender] = useState<'all' | 'male' | 'female' | 'other'>('all');
    const [charFilterLevel, setCharFilterLevel] = useState<string>('all');
    const [charFilterFaction, setCharFilterFaction] = useState<string>('all');
    const [charFilterPeriod, setCharFilterPeriod] = useState<string>('all');
    const [charFilterLifeStatus, setCharFilterLifeStatus] = useState<string>('all');

    const [vocabSearchQuery, setVocabSearchQuery] = useState('');
    const [vocabFilterCategory, setVocabFilterCategory] = useState<string>('all');

    // Batch Selection State
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchSelectedCharIds, setBatchSelectedCharIds] = useState<string[]>([]);
    const [batchSelectedVocabIds, setBatchSelectedVocabIds] = useState<string[]>([]);

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

    // Batch Selection Handlers
    const toggleBatchCharSelection = (id: string) => {
        setBatchSelectedCharIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleBatchVocabSelection = (id: string) => {
        setBatchSelectedVocabIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBatchDeleteChars = () => {
        if (batchSelectedCharIds.length === 0) return;
        const count = batchSelectedCharIds.length;
        if (window.confirm(`確定要刪除 ${count} 個角色嗎？此操作無法復原。`)) {
            batchSelectedCharIds.forEach(id => onDeleteCharacter(id));
            setBatchSelectedCharIds([]);
            setIsBatchMode(false);
        }
    };

    const handleBatchDeleteVocabs = () => {
        if (batchSelectedVocabIds.length === 0) return;
        const count = batchSelectedVocabIds.length;
        if (window.confirm(`確定要刪除 ${count} 個詞條嗎？此操作無法復原。`)) {
            batchSelectedVocabIds.forEach(id => onDeleteVocabulary(id));
            setBatchSelectedVocabIds([]);
            setIsBatchMode(false);
        }
    };



    const availableCharacters = characters.filter(c => !selectedCharIds.includes(c.id));

    // Flatten volumes to get all chapters for reference selection, exclude current
    const allReferenceableChapters = volumes.flatMap(v => v.chapters).filter(c => c.id !== currentChapter.id);

    // Filter characters based on search and filters
    const filteredCharacters = characters.filter(char => {
        const matchesSearch = !charSearchQuery ||
            char.name.toLowerCase().includes(charSearchQuery.toLowerCase()) ||
            char.role.toLowerCase().includes(charSearchQuery.toLowerCase());

        const matchesGender = charFilterGender === 'all' || char.gender === charFilterGender;
        const matchesLevel = charFilterLevel === 'all' || char.level === charFilterLevel;
        const matchesFaction = charFilterFaction === 'all' || char.faction === charFilterFaction;
        const matchesPeriod = charFilterPeriod === 'all' || char.period === charFilterPeriod;
        const matchesLifeStatus = charFilterLifeStatus === 'all' || char.lifeStatus === charFilterLifeStatus;

        return matchesSearch && matchesGender && matchesLevel && matchesFaction && matchesPeriod && matchesLifeStatus;
    });

    // Filter vocabularies based on search and category
    const filteredVocabularies = vocabularies.filter(vocab => {
        // Search filter
        const matchesSearch = !vocabSearchQuery ||
            vocab.name.toLowerCase().includes(vocabSearchQuery.toLowerCase()) ||
            vocab.description.toLowerCase().includes(vocabSearchQuery.toLowerCase()) ||
            (vocab.tags || []).some(t => t.toLowerCase().includes(vocabSearchQuery.toLowerCase()));

        // Category filter
        const matchesCategory = vocabFilterCategory === 'all' || vocab.category === vocabFilterCategory;

        return matchesSearch && matchesCategory;
    });

    // Get unique levels and categories for filter dropdowns
    const uniqueLevels = ['all', ...Array.from(new Set(characters.map(c => c.level).filter(Boolean)))];
    const uniqueCategories = ['all', ...Array.from(new Set(vocabularies.map(v => v.category).filter(Boolean)))];

    // Custom Settings Options
    const levelOptions = settings.customLevels && settings.customLevels.length > 0 ? settings.customLevels : [];
    const factionOptions = settings.customFactions && settings.customFactions.length > 0 ? settings.customFactions : ['正派', '反派', '中立'];
    const raceOptions = settings.customRaces && settings.customRaces.length > 0 ? settings.customRaces : ['人類', '妖族', '魔族'];

    return (
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full flex-shrink-0 shadow-lg shadow-gray-100 dark:shadow-none z-10 font-sans transition-colors duration-200">
            {/* Header Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                    onClick={() => setActiveTab('chars')}
                    className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all ${activeTab === 'chars' ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-violet-50/10 dark:bg-violet-900/10' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                >
                    資料庫 <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full ml-1 font-mono tracking-tight">LIVE</span>
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-violet-50/10 dark:bg-violet-900/10' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                >
                    <Sparkles size={14} className={activeTab === 'ai' ? "text-violet-500" : "text-slate-400"} />
                    AI 寫作助手
                </button>

            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-gray-900/50 transition-colors duration-200">

                {activeTab === 'chars' && (
                    <div className="p-4 space-y-4">
                        {/* Sub Tabs */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 flex space-x-1 bg-gray-100/80 dark:bg-gray-900 p-1 rounded-lg">
                                <button
                                    onClick={() => setSubTab('roles')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${subTab === 'roles' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    角色 ({availableCharacters.length})
                                </button>
                                <button
                                    onClick={() => setSubTab('vocab')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${subTab === 'vocab' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    詞條 ({vocabularies.length})
                                </button>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={handleExportData}
                                    title="匯出資料庫 (JSON)"
                                    className="p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 transition-all shadow-sm"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="匯入資料庫 (JSON)"
                                    className="p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 transition-all shadow-sm"
                                >
                                    <Upload size={16} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImportData}
                                    accept=".json"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Character List */}
                        {subTab === 'roles' && (
                            <div className="space-y-3">
                                {/* Batch Mode Controls */}
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => {
                                            setIsBatchMode(!isBatchMode);
                                            setBatchSelectedCharIds([]);
                                        }}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isBatchMode
                                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {isBatchMode ? '✓ 批次模式' : '批次操作'}
                                    </button>
                                    {isBatchMode && batchSelectedCharIds.length > 0 && (
                                        <button
                                            onClick={handleBatchDeleteChars}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <Trash2 size={12} />
                                            刪除 ({batchSelectedCharIds.length})
                                        </button>
                                    )}
                                </div>
                                {/* Search and Filter Bar */}
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="🔍 搜尋角色名稱或身份..."
                                        value={charSearchQuery}
                                        onChange={(e) => setCharSearchQuery(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                    <div className="flex gap-2 flex-wrap">
                                        <select
                                            value={charFilterGender}
                                            onChange={(e) => setCharFilterGender(e.target.value as any)}
                                            className="flex-1 min-w-[80px] px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200"
                                        >
                                            <option value="all">全部性別</option>
                                            <option value="male">男性</option>
                                            <option value="female">女性</option>
                                            <option value="other">其他</option>
                                        </select>
                                        <select
                                            value={charFilterLevel}
                                            onChange={(e) => setCharFilterLevel(e.target.value)}
                                            className="flex-1 min-w-[80px] px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200"
                                        >
                                            <option value="all">全部等級</option>
                                            {uniqueLevels.filter(l => l !== 'all').map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={charFilterFaction}
                                            onChange={(e) => setCharFilterFaction(e.target.value)}
                                            className="flex-1 min-w-[80px] px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200"
                                        >
                                            <option value="all">全部陣營</option>
                                            <option value="正派">正派</option>
                                            <option value="反派">反派</option>
                                            <option value="中立">中立</option>
                                        </select>
                                        <select
                                            value={charFilterPeriod}
                                            onChange={(e) => setCharFilterPeriod(e.target.value)}
                                            className="flex-1 min-w-[80px] px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200"
                                        >
                                            <option value="all">全部時期</option>
                                            <option value="前期">前期</option>
                                            <option value="中期">中期</option>
                                            <option value="後期">後期</option>
                                            <option value="回憶">回憶</option>
                                        </select>
                                        <select
                                            value={charFilterLifeStatus}
                                            onChange={(e) => setCharFilterLifeStatus(e.target.value)}
                                            className="flex-1 min-w-[80px] px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200"
                                        >
                                            <option value="all">全部狀態</option>
                                            <option value="活躍">活躍</option>
                                            <option value="隱退">隱退</option>
                                            <option value="已故">已故</option>
                                            <option value="未知">未知</option>
                                        </select>
                                    </div>
                                    {(charSearchQuery || charFilterGender !== 'all' || charFilterLevel !== 'all' || charFilterFaction !== 'all' || charFilterPeriod !== 'all' || charFilterLifeStatus !== 'all') && (
                                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                                            <span>找到 {filteredCharacters.length} / {availableCharacters.length} 個角色</span>
                                            <button
                                                onClick={() => {
                                                    setCharSearchQuery('');
                                                    setCharFilterGender('all');
                                                    setCharFilterLevel('all');
                                                    setCharFilterFaction('all');
                                                    setCharFilterPeriod('all');
                                                    setCharFilterLifeStatus('all');
                                                }}
                                                className="text-violet-600 dark:text-violet-400 hover:underline"
                                            >
                                                清除篩選
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {filteredCharacters.map(char => (
                                    <div key={char.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 relative group hover:shadow-md transition-all duration-200 ${isBatchMode && batchSelectedCharIds.includes(char.id)
                                        ? 'border-violet-500 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-900/10'
                                        : 'border-slate-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600'
                                        }`}>
                                        {/* Character Card Content */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {isBatchMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={batchSelectedCharIds.includes(char.id)}
                                                        onChange={() => toggleBatchCharSelection(char.id)}
                                                        className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 focus:ring-2 cursor-pointer"
                                                    />
                                                )}
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-slate-400 dark:text-gray-300 flex-shrink-0 shadow-inner border border-white/50 dark:border-gray-600/50">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <input
                                                        value={char.name}
                                                        onChange={(e) => onUpdateCharacter(char.id, { name: e.target.value })}
                                                        className="font-bold text-slate-800 dark:text-gray-100 text-base w-24 bg-transparent focus:bg-slate-50 dark:focus:bg-gray-700 rounded px-1 -ml-1 focus:ring-2 focus:ring-violet-100 dark:focus:ring-gray-600 outline-none transition-all"
                                                    />
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/30 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-100 dark:focus-within:ring-amber-900/50 transition-all">
                                                            <Zap size={10} fill="currentColor" className="flex-shrink-0 text-amber-500" />
                                                            <input
                                                                value={char.level || ''}
                                                                onChange={(e) => onUpdateCharacter(char.id, { level: e.target.value })}
                                                                placeholder="等級/境界"
                                                                list={`level-options-${char.id}`}
                                                                className="w-20 bg-transparent border-none outline-none text-amber-800 dark:text-amber-300 font-bold p-0 text-[10px] leading-none placeholder-amber-600/30 dark:placeholder-amber-500/30"
                                                            />
                                                            <datalist id={`level-options-${char.id}`}>
                                                                {levelOptions.map(l => <option key={l} value={l} />)}
                                                            </datalist>
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
                                                    <button
                                                        onClick={() => handleCopy(formatCharacter(char), char.id)}
                                                        className="p-1.5 text-slate-300 hover:text-violet-500 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/30 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="複製角色資料"
                                                    >
                                                        {copyFeedbackId === char.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                    </button>
                                                    <button onClick={() => onDeleteCharacter(char.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                                </div>
                                                <select value={char.gender} onChange={(e) => onUpdateCharacter(char.id, { gender: e.target.value as any })} className="text-xs text-slate-400 dark:text-gray-500 bg-transparent border-none p-0 cursor-pointer text-right pr-7 hover:text-violet-600 dark:hover:text-violet-400 transition-colors focus:ring-0">
                                                    <option value="male">男</option>
                                                    <option value="female">女</option>
                                                    <option value="other">其他</option>
                                                </select>
                                            </div>
                                        </div>
                                        {/* Tags Row */}
                                        <div className="flex gap-2 mb-3">
                                            <select
                                                value={char.faction || ''}
                                                onChange={(e) => onUpdateCharacter(char.id, { faction: e.target.value })}
                                                className={`text-[10px] px-2 py-1 rounded border outline-none cursor-pointer transition-colors ${char.faction === '正派' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                    char.faction === '反派' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                        char.faction === '中立' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                                            'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                                    }`}
                                            >
                                                <option value="">選擇陣營</option>
                                                {factionOptions.map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={char.race || ''}
                                                onChange={(e) => onUpdateCharacter(char.id, { race: e.target.value })}
                                                className="text-[10px] px-2 py-1 rounded border border-purple-100 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 outline-none cursor-pointer"
                                            >
                                                <option value="">選擇種族</option>
                                                {raceOptions.map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={char.period || ''}
                                                onChange={(e) => onUpdateCharacter(char.id, { period: e.target.value })}
                                                className="text-[10px] px-2 py-1 rounded border border-blue-100 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 outline-none cursor-pointer"
                                            >
                                                <option value="">選擇時期</option>
                                                <option value="前期">前期</option>
                                                <option value="中期">中期</option>
                                                <option value="後期">後期</option>
                                                <option value="回憶">回憶</option>
                                            </select>

                                            <select
                                                value={char.lifeStatus || ''}
                                                onChange={(e) => onUpdateCharacter(char.id, { lifeStatus: e.target.value })}
                                                className={`text-[10px] px-2 py-1 rounded border outline-none cursor-pointer transition-colors ${char.lifeStatus === '已故' ? 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' :
                                                    char.lifeStatus === '隱退' ? 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                                    }`}
                                            >
                                                <option value="">生存狀態</option>
                                                <option value="活躍">活躍</option>
                                                <option value="隱退">隱退</option>
                                                <option value="已故">已故</option>
                                                <option value="未知">未知</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider"><span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-gray-600 flex items-center justify-center text-[8px] text-slate-600 dark:text-gray-300 font-bold">@</span>性格特徵</label>
                                            <input value={char.traits} onChange={(e) => onUpdateCharacter(char.id, { traits: e.target.value })} className="w-full bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-200 focus:bg-white dark:focus:bg-gray-700 focus:border-violet-300 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-50 dark:focus:ring-violet-900/20 outline-none transition-all" />
                                        </div>
                                        {/* 記憶系統動態狀態區塊 */}
                                        <div className="mt-2 p-2.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/60 dark:border-blue-900/30 rounded-lg">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2 tracking-wider">
                                                <div className="w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[8px]">📍</div>
                                                記憶系統動態{char.statusUpdatedAtChapter ? ` (第${char.statusUpdatedAtChapter}章)` : ''}
                                            </label>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-blue-500 dark:text-blue-400 w-10 shrink-0">位置</span>
                                                    <input value={char.currentLocation || ''} onChange={(e) => onUpdateCharacter(char.id, { currentLocation: e.target.value })} placeholder="—" className="flex-1 text-[11px] bg-transparent border-b border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 outline-none px-1 py-0.5 placeholder-gray-300 dark:placeholder-gray-600" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-blue-500 dark:text-blue-400 w-10 shrink-0">實力</span>
                                                    <input value={char.currentPowerLevel || ''} onChange={(e) => onUpdateCharacter(char.id, { currentPowerLevel: e.target.value })} placeholder="—" className="flex-1 text-[11px] bg-transparent border-b border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 outline-none px-1 py-0.5 placeholder-gray-300 dark:placeholder-gray-600" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-blue-500 dark:text-blue-400 w-10 shrink-0">情緒</span>
                                                    <input value={char.currentEmotionalState || ''} onChange={(e) => onUpdateCharacter(char.id, { currentEmotionalState: e.target.value })} placeholder="—" className="flex-1 text-[11px] bg-transparent border-b border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 outline-none px-1 py-0.5 placeholder-gray-300 dark:placeholder-gray-600" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-red-500 dark:text-red-400 w-10 shrink-0">傷勢</span>
                                                    <input value={char.currentInjuries || ''} onChange={(e) => onUpdateCharacter(char.id, { currentInjuries: e.target.value || null })} placeholder="—" className="flex-1 text-[11px] bg-transparent border-b border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 outline-none px-1 py-0.5 placeholder-gray-300 dark:placeholder-gray-600" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-amber-500 dark:text-amber-400 w-10 shrink-0">持有</span>
                                                    <input value={char.currentPossessions || ''} onChange={(e) => onUpdateCharacter(char.id, { currentPossessions: e.target.value || null })} placeholder="—" className="flex-1 text-[11px] bg-transparent border-b border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 outline-none px-1 py-0.5 placeholder-gray-300 dark:placeholder-gray-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Character Creation Actions */}
                                <div className="flex gap-2">
                                    {isAiCharOpen ? (
                                        <div className="w-full bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-900/50 rounded-xl p-3 shadow-md animate-in fade-in slide-in-from-bottom-2">
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
                                                className="w-full text-xs p-2 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-lg mb-2 h-20 resize-none focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500"
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
                                            <button onClick={onAddCharacter} className="flex-1 py-3 border border-dashed border-slate-300 dark:border-gray-600 rounded-xl text-slate-500 dark:text-gray-400 text-sm font-medium hover:bg-white dark:hover:bg-gray-800/80 hover:border-slate-400 dark:hover:border-gray-500 hover:text-slate-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center gap-2 shadow-sm bg-slate-50/50 dark:bg-gray-800/30">
                                                <Plus size={16} /><span>手動新增</span>
                                            </button>
                                            <button onClick={() => setIsAiCharOpen(true)} className="flex-1 py-3 border border-dashed border-violet-200 dark:border-violet-800 rounded-xl text-violet-600 dark:text-violet-400 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-600 transition-colors flex items-center justify-center gap-2 shadow-sm bg-white dark:bg-gray-800/50">
                                                <Sparkles size={16} /><span>AI 創建</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Vocabulary List */}
                        {subTab === 'vocab' && (
                            <div className="space-y-3">
                                {/* Batch Mode Controls */}
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => {
                                            setIsBatchMode(!isBatchMode);
                                            setBatchSelectedVocabIds([]);
                                        }}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isBatchMode
                                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {isBatchMode ? '✓ 批次模式' : '批次操作'}
                                    </button>
                                    {isBatchMode && batchSelectedVocabIds.length > 0 && (
                                        <button
                                            onClick={handleBatchDeleteVocabs}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <Trash2 size={12} />
                                            刪除 ({batchSelectedVocabIds.length})
                                        </button>
                                    )}
                                </div>
                                {/* Search and Filter Bar */}
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="🔍 搜尋名稱或描述..."
                                        value={vocabSearchQuery}
                                        onChange={(e) => setVocabSearchQuery(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                    <select
                                        value={vocabFilterCategory}
                                        onChange={(e) => setVocabFilterCategory(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 text-gray-700 dark:text-gray-200"
                                    >
                                        {uniqueCategories.map(category => (
                                            <option key={category} value={category}>
                                                {category === 'all' ? '全部分類' : category}
                                            </option>
                                        ))}
                                    </select>
                                    {(vocabSearchQuery || vocabFilterCategory !== 'all') && (
                                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                                            <span>找到 {filteredVocabularies.length} / {vocabularies.length} 個詞條</span>
                                            <button
                                                onClick={() => {
                                                    setVocabSearchQuery('');
                                                    setVocabFilterCategory('all');
                                                }}
                                                className="text-violet-600 dark:text-violet-400 hover:underline"
                                            >
                                                清除篩選
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {filteredVocabularies.map(vocab => (
                                    <div key={vocab.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 relative group hover:shadow-md transition-all duration-200 ${isBatchMode && batchSelectedVocabIds.includes(vocab.id)
                                        ? 'border-violet-500 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-900/10'
                                        : 'border-slate-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600'
                                        }`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {isBatchMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={batchSelectedVocabIds.includes(vocab.id)}
                                                        onChange={() => toggleBatchVocabSelection(vocab.id)}
                                                        className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 focus:ring-2 cursor-pointer"
                                                    />
                                                )}
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-300 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100 dark:border-blue-800/30"><Book size={18} /></div>
                                                <div>
                                                    <input value={vocab.name} onChange={(e) => onUpdateVocabulary(vocab.id, { name: e.target.value })} className="font-bold text-slate-800 dark:text-gray-100 text-base w-32 bg-transparent focus:bg-slate-50 dark:focus:bg-gray-700 rounded px-1 -ml-1 focus:ring-2 focus:ring-violet-100 dark:focus:ring-gray-600 outline-none" />
                                                    <div className="h-0.5"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CustomSelector value={vocab.category} onChange={(val) => onUpdateVocabulary(vocab.id, { category: val })} options={vocabCategories} placeholder="分類" widthClass="w-16" />
                                                <button
                                                    onClick={() => handleCopy(formatVocabulary(vocab), vocab.id)}
                                                    className="p-1.5 text-slate-300 hover:text-violet-500 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/30 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="複製詞條資料"
                                                >
                                                    {copyFeedbackId === vocab.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                </button>
                                                <button onClick={() => onDeleteVocabulary(vocab.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/60 dark:bg-gray-900/50 rounded-lg p-2 border border-transparent focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:border-blue-200 dark:focus-within:border-blue-800 focus-within:ring-2 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/20 transition-all">
                                            <textarea value={vocab.description} onChange={(e) => onUpdateVocabulary(vocab.id, { description: e.target.value })} className="w-full bg-transparent border-none text-sm text-slate-600 dark:text-gray-300 focus:outline-none resize-none h-16 leading-relaxed placeholder-slate-400" placeholder="輸入詞條描述..." />
                                        </div>
                                        {/* Tags Input */}
                                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                            {(vocab.tags || []).map((tag, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300 text-[10px] border border-violet-100 dark:border-violet-800">
                                                    #{tag}
                                                    <button
                                                        onClick={() => {
                                                            const newTags = (vocab.tags || []).filter((_, i) => i !== idx);
                                                            onUpdateVocabulary(vocab.id, { tags: newTags });
                                                        }}
                                                        className="hover:text-red-500"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                placeholder="+ 標籤"
                                                className="bg-transparent border-none outline-none text-[10px] w-16 focus:w-24 transition-all placeholder-slate-400 text-slate-600 dark:text-gray-300"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val && !(vocab.tags || []).includes(val)) {
                                                            onUpdateVocabulary(vocab.id, { tags: [...(vocab.tags || []), val] });
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <button onClick={onAddVocabulary} className="w-full py-3 border border-dashed border-violet-200 dark:border-violet-800 rounded-xl text-violet-600 dark:text-violet-400 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-600 transition-colors flex items-center justify-center gap-2 shadow-sm bg-white dark:bg-gray-800/50"><Plus size={16} /><span>新增詞條</span></button>
                            </div>
                        )}
                    </div>
                )}



                {activeTab === 'ai' && (
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
                                        className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 font-medium py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-50/50 dark:focus:ring-violet-900/20 text-xs shadow-sm transition-all cursor-pointer hover:border-violet-300 dark:hover:border-violet-500"
                                    >
                                        <option value="Google Flash">Gemini 3</option>
                                        {/* <option value="Google Pro">Gemini 3 Pro (Exp)</option> */}
                                        <option value="DeepSeek R1">DeepSeek R1</option>
                                        <option value="DeepSeek V3.2">DeepSeek V3.2</option>
                                        <option value="Claude Sonnet">Claude Sonnet 4.6</option>
                                        <option value="Claude Opus">Claude Opus 4.6</option>
                                        <option value="Qwen3-Max">Qwen3-Max</option>
                                        <option value="Qwen3-Plus">Qwen3-Plus</option>
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
                                    <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 rounded">{temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="2.0"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:accent-violet-500 hover:accent-violet-500 dark:hover:accent-violet-400 transition-all"
                                />
                                <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                                    <span>嚴謹 (0.0)</span>
                                    <span>平衡 (1.0)</span>
                                    <span>奔放 (2.0)</span>
                                </div>
                            </div>
                        </div>

                        {/* Writing Style Section */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">寫作風格</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const isCustom = settings.writingStyleMode === 'custom';
                                            onUpdateSettings({
                                                ...settings,
                                                writingStyleMode: isCustom ? 'preset' : 'custom',
                                                style: isCustom ? '簡潔明快' : settings.style,
                                            });
                                        }}
                                        className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${settings.writingStyleMode === 'custom' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400'}`}
                                    >
                                        {settings.writingStyleMode === 'custom' ? '✎ 自定義中' : '✎ 自定義'}
                                    </button>
                                </div>
                            </div>
                            {settings.writingStyleMode === 'custom' ? (
                                <div>
                                    <textarea
                                        value={settings.style}
                                        onChange={(e) => onUpdateSettings({ ...settings, style: e.target.value })}
                                        placeholder="描述你想要的寫作風格，例如：文筆華麗、善用比喻、節奏緊湊、對話幽默..."
                                        className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-20 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 dark:placeholder-gray-500 shadow-sm transition-all"
                                    />
                                    <div className="text-right mt-1">
                                        <span className="text-[10px] text-slate-300 dark:text-slate-500">{settings.style.length}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { value: '簡潔明快', desc: '精煉有力・快節奏' },
                                        { value: '華麗細膩', desc: '意境優美・細膩' },
                                        { value: '幽默吐槽', desc: '輕鬆搞笑・反差' },
                                        { value: '沉穩厚重', desc: '大氣考究・厚重' },
                                        { value: '畫面感鏡頭', desc: '電影分鏡・視覺' },
                                        { value: '口語化直白', desc: '接地氣・自然' },
                                    ].map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => onUpdateSettings({ ...settings, style: s.value })}
                                            className={`text-left px-3 py-2 rounded-lg border transition-all text-xs ${settings.style === s.value
                                                ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 shadow-sm'
                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 text-slate-600 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10'
                                            }`}
                                        >
                                            <div className="font-medium">{s.value}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">{s.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Writing Requirements Section */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-600">寫作要求</label>
                                <span className="text-[10px] text-slate-300">{writingRequirements.length}</span>
                            </div>
                            <textarea
                                value={writingRequirements}
                                onChange={(e) => setWritingRequirements(e.target.value)}
                                placeholder="請輸入寫作要求"
                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-100 h-20 resize-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 placeholder-slate-400 dark:placeholder-gray-500 shadow-sm transition-all"
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
                                            <div key={vol.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-50/50 dark:bg-gray-700/30 uppercase">{vol.title}</div>
                                                {vol.chapters.map(chap => {
                                                    if (chap.id === currentChapter.id) return null; // Don't allow selecting self
                                                    const isSelected = selectedRefChapterIds.includes(chap.id);
                                                    return (
                                                        <div
                                                            key={chap.id}
                                                            onClick={() => toggleRefChapterSelection(chap.id)}
                                                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-xs ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300'}`}
                                                        >
                                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-gray-500 bg-white dark:bg-gray-700'}`}>
                                                                {isSelected && <Check size={10} className="text-white" />}
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
                            className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-white shadow-lg transition-all duration-200 text-sm bg-rose-500 hover:bg-rose-600 hover:shadow-rose-200 active:translate-y-0.5 animate-in fade-in"
                        >
                            <Square size={16} fill="currentColor" className="text-white" />
                            <span>停止生成</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => onGenerate(currentChapter.outline, writingRequirements, relations, selectedCharIds, selectedVocabIds, selectedRefChapterIds, selectedModel, temperature)}
                            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-white shadow-lg shadow-violet-200 dark:shadow-none transition-all duration-200 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-200 dark:hover:shadow-violet-900/30 hover:-translate-y-0.5 active:translate-y-0`}
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


