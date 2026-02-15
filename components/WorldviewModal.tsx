import React, { useState } from 'react';
import { X, Globe, Wand2, Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { NovelSettings } from '../types';

interface WorldviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: NovelSettings;
    onUpdateSettings: (settings: NovelSettings) => void;
    onGenerateWorldview?: (prompt: string, model: string) => Promise<string>;
}

export const WorldviewModal: React.FC<WorldviewModalProps> = ({
    isOpen,
    onClose,
    settings,
    onUpdateSettings,
    onGenerateWorldview
}) => {
    // 本地編輯 state（開啟時從 settings 載入）
    const [localWorldview, setLocalWorldview] = useState(settings.worldview || '');
    const [genPrompt, setGenPrompt] = useState('');
    const [genResult, setGenResult] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModel, setSelectedModel] = useState('DeepSeek V3.2');
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);

    // AI 生成器進階設定
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [customGenre, setCustomGenre] = useState('');
    const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
    const [customRace, setCustomRace] = useState('');
    const [selectedTones, setSelectedTones] = useState<string[]>(['正統小說風格']);
    const [customTone, setCustomTone] = useState('');
    const [supplementaryInfo, setSupplementaryInfo] = useState('');
    const [detailLevel, setDetailLevel] = useState(3); // 1-5

    // 每次開啟時同步 settings
    React.useEffect(() => {
        if (isOpen) {
            setLocalWorldview(settings.worldview || '');
            setSaved(false);
        }
    }, [isOpen, settings.worldview]);

    if (!isOpen) return null;

    // 儲存世界觀
    const handleSave = () => {
        onUpdateSettings({ ...settings, worldview: localWorldview });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // AI 生成世界觀
    const handleGenerate = async () => {
        if (!genPrompt.trim() || !onGenerateWorldview) return;
        setIsGenerating(true);
        setGenResult('');
        try {
            // 組合完整 prompt
            let fullPrompt = genPrompt;

            // 加入主題標籤
            if (selectedGenres.length > 0) {
                fullPrompt += `\n\n【主題類型】${selectedGenres.join('、')}`;
            }
            if (customGenre.trim()) {
                fullPrompt += ` + ${customGenre}`;
            }

            // 加入標籤
            if (selectedRaces.length > 0) {
                fullPrompt += `\n【特色標籤】${selectedRaces.join('、')}`;
            }
            if (customRace.trim()) {
                fullPrompt += (selectedRaces.length > 0 ? ' + ' : '\n【特色標籤】') + customRace;
            }

            // 加入風格指令
            if (selectedTones.length > 0) {
                fullPrompt += `\n【全域風格】${selectedTones.join('、')}`;
            }
            if (customTone.trim()) {
                fullPrompt += ` + ${customTone}`;
            }

            // 加入補充信息
            if (supplementaryInfo.trim()) {
                fullPrompt += `\n【補充信息】${supplementaryInfo}`;
            }

            // 加入詳細程度
            const detailLevelText = ['極簡', '簡略', '適中', '詳細', '極詳盡'][detailLevel - 1];
            fullPrompt += `\n【詳細程度】${detailLevelText}（${detailLevel}/5）`;

            const result = await onGenerateWorldview(fullPrompt, selectedModel);
            setGenResult(result);
        } catch (error: any) {
            setGenResult(`❌ 生成失敗：${error.message || '未知錯誤'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 套用生成結果
    const handleApplyResult = () => {
        if (localWorldview.trim()) {
            setLocalWorldview(prev => prev + '\n\n' + genResult);
        } else {
            setLocalWorldview(genResult);
        }
        setGenResult('');
    };

    // 複製生成結果
    const handleCopyResult = () => {
        navigator.clipboard.writeText(genResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

                {/* 標題列 */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
                            <Globe size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">世界觀設定</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">定義小說的世界架構，AI 將在所有章節中遵循此設定</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 主內容區 — 左右分欄 */}
                <div className="flex flex-1 overflow-hidden">

                    {/* 左側：世界觀編輯區 */}
                    <div className="flex-1 flex flex-col border-r border-gray-100 dark:border-gray-800">
                        <div className="px-5 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">📝 世界觀內容</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{localWorldview.length} 字</span>
                        </div>
                        <textarea
                            value={localWorldview}
                            onChange={(e) => setLocalWorldview(e.target.value)}
                            placeholder={`在這裡描述你的小說世界觀，例如：

🌍 世界背景
本故事設定在「九州大陸」，分為東、西、南、北、中五大疆域...

⚔️ 修煉體系
分為九大境界：練氣、築基、金丹、元嬰、化神、合體、大乘、渡劫、大能
每個境界分為初期、中期、後期、巔峰四個小階段...

🏰 勢力分佈
三大門派：青雲劍宗、天機閣、萬獸谷
兩大王朝：大乾帝國、南楚皇朝...

📜 歷史大事件
千年前的「仙魔之戰」奠定了如今的格局...

🔮 特殊規則
靈氣濃度由東向西遞減...`}
                            className="flex-1 w-full p-5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 resize-none focus:outline-none placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
                        />
                    </div>

                    {/* 右側：AI 世界觀生成器 */}
                    <div className="w-[480px] flex flex-col bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles size={12} className="text-amber-500" />
                                AI 世界觀生成器
                            </span>
                        </div>

                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                            {/* 模型選擇 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">模型</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-violet-400 transition-colors"
                                >
                                    <option>DeepSeek R1</option>
                                    <option>DeepSeek V3.2</option>
                                    <option>Claude Sonnet 4.5</option>
                                    <option>Claude Opus 4.6</option>
                                    <option>Qwen3-Max</option>
                                    <option>Qwen3-Plus</option>
                                    <option>Kimi</option>
                                </select>
                            </div>

                            {/* 提示詞輸入 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">描述你的世界觀需求</label>
                                <textarea
                                    value={genPrompt}
                                    onChange={(e) => setGenPrompt(e.target.value)}
                                    placeholder={`例如：\n• 現代都市修仙世界，隱藏在普通人社會中\n• 西方奇幻，有精靈、矮人、龍族\n• 末世廢土風格，有變異生物和避難所`}
                                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-200 h-28 resize-none focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                                />
                            </div>

                            {/* 世界觀類型標籤 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">確定主題</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {['修仙', '女頻女主', '玄幻', '都市', '國人', '歷史', '懸疑', '末世', '科幻', '奇幻', '武俠', '仙俠'].map(genre => (
                                        <button
                                            key={genre}
                                            onClick={() => {
                                                if (selectedGenres.includes(genre)) {
                                                    setSelectedGenres(prev => prev.filter(g => g !== genre));
                                                } else {
                                                    setSelectedGenres(prev => [...prev, genre]);
                                                }
                                            }}
                                            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${selectedGenres.includes(genre)
                                                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-800'
                                                }`}
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={customGenre}
                                    onChange={(e) => setCustomGenre(e.target.value)}
                                    placeholder="或自定義主題，例如：玄幻 + 商戰"
                                    className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors mt-1.5"
                                />
                            </div>

                            {/* 選擇標籤 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">選擇標籤</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {['傳統', '脫俗', '穿越', '重生', '系統', '神秘', '特種', '樂天', '開局'].map(race => (
                                        <button
                                            key={race}
                                            onClick={() => {
                                                if (selectedRaces.includes(race)) {
                                                    setSelectedRaces(prev => prev.filter(r => r !== race));
                                                } else {
                                                    setSelectedRaces(prev => [...prev, race]);
                                                }
                                            }}
                                            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${selectedRaces.includes(race)
                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-800'
                                                }`}
                                        >
                                            {race}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={customRace}
                                    onChange={(e) => setCustomRace(e.target.value)}
                                    placeholder="或自定義標籤，例如：金手指、爽文、逆襲"
                                    className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition-colors mt-1.5"
                                />
                            </div>

                            {/* 選擇全域主指令 - 改為多選 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center justify-between">
                                    <span>選擇全域主指令</span>
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500">多選</span>
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { label: '正統小說', value: '正統小說風格' },
                                        { label: '輕鬆幽默', value: '輕鬆幽默風格' },
                                        { label: '嚴肅史詩', value: '嚴肅史詩風格' },
                                        { label: '懸疑驚悚', value: '懸疑驚悚風格' },
                                        { label: '浪漫唯美', value: '浪漫唯美風格' },
                                        { label: '熱血戰鬥', value: '熱血戰鬥風格' }
                                    ].map(tone => (
                                        <button
                                            key={tone.value}
                                            onClick={() => {
                                                if (selectedTones.includes(tone.value)) {
                                                    setSelectedTones(prev => prev.filter(t => t !== tone.value));
                                                } else {
                                                    setSelectedTones(prev => [...prev, tone.value]);
                                                }
                                            }}
                                            className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all text-left ${selectedTones.includes(tone.value)
                                                ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-400 dark:border-violet-700 text-violet-700 dark:text-violet-300 font-bold'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-violet-300 dark:hover:border-violet-800'
                                                }`}
                                        >
                                            {tone.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={customTone}
                                    onChange={(e) => setCustomTone(e.target.value)}
                                    placeholder="或自定義風格，例如：詩意流深沪"
                                    className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-400 transition-colors mt-1.5"
                                />
                            </div>

                            {/* 補充信息 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">補充信息</label>
                                <input
                                    type="text"
                                    value={supplementaryInfo}
                                    onChange={(e) => setSupplementaryInfo(e.target.value)}
                                    placeholder="例如：書名，簡介，核心賣點"
                                    className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-400 transition-colors"
                                />
                            </div>

                            {/* 詳細程度 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center justify-between">
                                    <span>詳細程度</span>
                                    <span className="text-violet-500 dark:text-violet-400 font-mono">{detailLevel}/5</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={detailLevel}
                                    onChange={(e) => setDetailLevel(Number(e.target.value))}
                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                />
                                <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500 mt-1">
                                    <span>簡略</span>
                                    <span>詳盡</span>
                                </div>
                            </div>

                            {/* 生成按鈕 */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !genPrompt.trim()}
                                className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200 dark:shadow-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>生成中...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} />
                                        <span>AI 生成世界觀</span>
                                    </>
                                )}
                            </button>

                            {/* 生成結果 */}
                            {genResult && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">生成結果</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleCopyResult}
                                                className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                                            >
                                                {copied ? <Check size={10} /> : <Copy size={10} />}
                                                {copied ? '已複製' : '複製'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                        {genResult}
                                    </div>
                                    <button
                                        onClick={handleApplyResult}
                                        className="w-full py-2 px-4 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                    >
                                        ✅ 套用到世界觀
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 底部操作列 */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        此設定會套用到所有章節的 AI 生成
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-md shadow-violet-200 dark:shadow-none transition-all flex items-center gap-1.5"
                        >
                            {saved ? (
                                <>
                                    <Check size={14} />
                                    已儲存
                                </>
                            ) : (
                                '💾 儲存世界觀'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
