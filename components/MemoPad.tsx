import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, FileText, Calendar, Search, Lightbulb, PenLine, Clock } from 'lucide-react';
import { Memo } from '../types';

interface MemoPadProps {
    isOpen: boolean;
    onClose: () => void;
    memos: Memo[];
    onAddMemo: (content: string) => void;
    onUpdateMemo: (id: string, content: string) => void;
    onDeleteMemo: (id: string) => void;
}

const MemoPad: React.FC<MemoPadProps> = ({
    isOpen,
    onClose,
    memos,
    onAddMemo,
    onUpdateMemo,
    onDeleteMemo
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [localContent, setLocalContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filter memos
    const filteredMemos = useMemo(() => {
        return memos.filter(m =>
            m.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [memos, searchQuery]);

    // Select first memo on open if none selected
    useEffect(() => {
        if (isOpen && !selectedId && memos.length > 0) {
            setSelectedId(memos[0].id);
        }
    }, [isOpen, memos, selectedId]); // Added memos and selectedId to dependencies

    // Sync content when selection changes
    useEffect(() => {
        if (selectedId) {
            const memo = memos.find(m => m.id === selectedId);
            if (memo) {
                setLocalContent(memo.content);
            }
        } else {
            setLocalContent('');
        }
    }, [selectedId, memos]);

    const handleAdd = () => {
        // Optimistic UI updates are hard if we don't have the ID immediately.
        // For now, call addMemo and let the props update.
        // The new memo will appear at global top (memos is ordered by updated_at desc usually).
        onAddMemo('新靈感...');
        // We can't auto-select the new one easily without return value hook,
        // but user will see it at top.
    };

    const handleSave = () => {
        if (selectedId && localContent) {
            setIsSaving(true);
            onUpdateMemo(selectedId, localContent);
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('確定要刪除這條靈感嗎？')) {
            onDeleteMemo(id);
            if (selectedId === id) {
                setSelectedId(null);
            }
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('zh-TW', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

                {/* 標題列 */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
                            <Lightbulb size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">靈感儲存庫</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">隨時捕捉、整理你的創作點子</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 主內容區 - 左右分欄 */}
                <div className="flex flex-1 overflow-hidden">

                    {/* 左側：列表區 */}
                    <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-800/30">
                        {/* 搜尋與新增 */}
                        <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-800">
                            <button
                                onClick={handleAdd}
                                className="w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white text-sm bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-100 dark:shadow-none transition-all active:translate-y-0.5"
                            >
                                <Plus size={16} />
                                <span>新增靈感</span>
                            </button>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="搜尋靈感..."
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-amber-400 transition-colors"
                                />
                            </div>
                        </div>

                        {/* 列表 */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {filteredMemos.length === 0 && (
                                <div className="text-center py-10 text-gray-400">
                                    <p className="text-xs">沒有找到相關靈感</p>
                                </div>
                            )}
                            {filteredMemos.map(memo => (
                                <div
                                    key={memo.id}
                                    onClick={() => setSelectedId(memo.id)}
                                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${selectedId === memo.id
                                            ? 'bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-600/50 shadow-sm'
                                            : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 line-clamp-2 mb-1">
                                        {memo.content || '未命名靈感'}
                                    </h3>
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            {formatDate(memo.updated_at || memo.created_at)}
                                        </span>
                                    </div>

                                    {/* 刪除按鈕 (Hover 顯示) */}
                                    <button
                                        onClick={(e) => handleDelete(memo.id, e)}
                                        className="absolute right-2 top-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 右側：編輯區 */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
                        {selectedId ? (
                            <>
                                <div className="px-6 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                                        <PenLine size={12} />
                                        編輯內容
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {isSaving ? '儲存中...' : '已自動儲存'}
                                        </span>
                                        <button
                                            onClick={handleSave}
                                            className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                        >
                                            <Save size={12} /> 立即儲存
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={localContent}
                                    onChange={(e) => setLocalContent(e.target.value)}
                                    // Auto-save on blur or periodic?
                                    // For now, let's just create a debounce effect or rely on button.
                                    // Actually, adding onBlur might be good.
                                    onBlur={handleSave}
                                    placeholder="在此輸入你的靈感..."
                                    className="flex-1 w-full p-6 text-base text-gray-800 dark:text-gray-100 bg-transparent resize-none focus:outline-none leading-relaxed placeholder-gray-300"
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                                <Lightbulb size={64} className="mb-4 opacity-50" />
                                <p className="text-sm">選擇一個靈感開始編輯</p>
                                <p className="text-xs mt-1">或者點擊左側「新增靈感」</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemoPad;
