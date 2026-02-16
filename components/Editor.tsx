import React, { useEffect, useRef, useState } from 'react';
import {
    Wand2, List, Scissors, CheckCircle, Ghost,
    Expand, Feather, FileText, Presentation, Undo, Redo, MessageSquarePlus
} from 'lucide-react';
import { Chapter, EditorActionType } from '../types';

interface EditorProps {
    chapter: Chapter;
    onUpdate: (updated: Partial<Chapter>) => void;
    onAiAction: (action: EditorActionType) => void;
}

const MAX_HISTORY = 50;

export const Editor: React.FC<EditorProps> = ({ chapter, onUpdate, onAiAction }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // -- History State for Undo/Redo --
    const [history, setHistory] = useState<string[]>([chapter.content]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Track if the change originated from user typing/undo/redo to distinguish from external AI updates
    const isInternalChange = useRef(false);
    const lastChapterId = useRef(chapter.id);

    // Sync external changes (e.g. from Sidebar switching chapters or AI generation) to history
    React.useLayoutEffect(() => {
        // 1. Chapter Switch detected
        if (chapter.id !== lastChapterId.current) {
            setHistory([chapter.content]);
            setHistoryIndex(0);
            lastChapterId.current = chapter.id;
            adjustHeight();
            return;
        }

        // 2. Content changed externally (e.g. AI generated content)
        if (chapter.content !== history[historyIndex]) {
            if (!isInternalChange.current) {
                // This is an external change
                // Push it to history so user can Undo the AI generation
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(chapter.content);
                if (newHistory.length > MAX_HISTORY) newHistory.shift();

                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
                adjustHeight();
            }
        }

        // 3. Window resize handling
        const handleResize = () => {
            requestAnimationFrame(() => adjustHeight());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [chapter.content, chapter.id]);

    // CRITICAL: Always adjust height when content changes or on initial mount
    // The above useLayoutEffect may skip adjustHeight when conditions don't match
    // (e.g., initial load where chapter.id matches and content matches history[0])
    useEffect(() => {
        // Use requestAnimationFrame to ensure DOM is ready
        const rafId = requestAnimationFrame(() => {
            adjustHeight();
        });
        return () => cancelAnimationFrame(rafId);
    }, [chapter.content, chapter.id]);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to allow precise scrollHeight measurement (handling shrinking too)
            textarea.style.height = '0px';
            const scrollHeight = textarea.scrollHeight;

            // Set new height with generous buffer to prevent clipping (100px buffer)
            textarea.style.height = (scrollHeight + 100) + 'px';
        }
    };

    // Handle content changes
    const handleContentChange = (newContent: string) => {
        isInternalChange.current = true;
        onUpdate({ content: newContent });

        // Update History
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);

        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
        }

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Adjust height with animation frame for smoother update
        requestAnimationFrame(() => adjustHeight());
    };

    // -- Text Manipulation Helpers --

    const insertText = (textToInsert: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        const newText = text.substring(0, start) + textToInsert + text.substring(end);

        handleContentChange(newText);

        // Restore cursor
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = start + textToInsert.length;
            textarea.selectionEnd = start + textToInsert.length;
        }, 0);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const prevContent = history[prevIndex];

            isInternalChange.current = true;
            setHistoryIndex(prevIndex);
            onUpdate({ content: prevContent });
            setTimeout(adjustHeight, 0);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            const nextContent = history[nextIndex];

            isInternalChange.current = true;
            setHistoryIndex(nextIndex);
            onUpdate({ content: nextContent });
            setTimeout(adjustHeight, 0);
        }
    };

    // Keyboard Shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Tab for Indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            insertText('　　'); // Insert 2 full-width spaces
        }

        // Undo / Redo Shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
        }
    };

    const wordCount = chapter.content ? chapter.content.length : 0;

    return (
        <div className="flex-1 bg-gray-50 flex flex-col h-full relative">
            {/* Toolbar */}
            <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 z-10 gap-2 relative transition-colors duration-200">

                {/* Left: Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px] md:max-w-[200px] flex items-center gap-2" title={chapter.title}>
                        {chapter.title || '未命名'}
                    </span>
                    <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                        <FileText size={12} />
                        <span>{wordCount} 字</span>
                    </div>
                </div>

                {/* Middle: Tools (Scrollable Area) */}
                <div className="flex-1 flex items-center justify-end overflow-hidden">
                    <div className="flex items-center gap-1.5 overflow-x-auto px-1 py-1 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style>{`
                    /* Hide scrollbar for Chrome, Safari and Opera */
                    div::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>


                        {/* AI Groups - Hiding unlaunched features */}
                        {/* 
                        <div className="flex items-center bg-violet-50 dark:bg-violet-900/20 p-1 rounded-lg gap-1 flex-shrink-0">
                            <ToolbarButton onClick={() => onAiAction('continue')} icon={<Feather size={14} />} label="續寫" colorClass="text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40" />
                            <ToolbarButton onClick={() => onAiAction('expand')} icon={<Expand size={14} />} label="擴寫" colorClass="text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40" />
                        </div>

                        <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 p-1 rounded-lg gap-1 flex-shrink-0">
                            <ToolbarButton onClick={() => onAiAction('outline')} icon={<List size={14} />} label="章綱" colorClass="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40" />
                            <ToolbarButton onClick={() => onAiAction('split')} icon={<Scissors size={14} />} label="拆書" colorClass="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40" />
                        </div>
                        */}

                        <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/20 p-1 rounded-lg gap-1 flex-shrink-0">
                            {/* 
                            <ToolbarButton onClick={() => onAiAction('fix')} icon={<CheckCircle size={14} />} label="糾錯" colorClass="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" />
                            <ToolbarButton onClick={() => onAiAction('humanize')} icon={<Ghost size={14} />} label="潤飾" colorClass="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" />
                            */}
                            <ToolbarButton onClick={() => onAiAction('critique')} icon={<MessageSquarePlus size={14} />} label="點評" colorClass="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" />
                        </div>

                        {/* Briefing */}
                        <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/20 p-1 rounded-lg gap-1 flex-shrink-0">
                            <ToolbarButton onClick={() => onAiAction('briefing')} icon={<Presentation size={14} />} label="簡報" colorClass="text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40" />
                        </div>
                    </div>
                </div>

                {/* Right: Fixed History Controls (Pinned) */}
                <div className="flex items-center gap-1 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1 bg-white dark:bg-gray-800 z-20 transition-colors duration-200">
                    <IconButton
                        onClick={handleUndo}
                        icon={<Undo size={16} />}
                        disabled={historyIndex <= 0}
                        title="復原 (Ctrl+Z)"
                    />
                    <IconButton
                        onClick={handleRedo}
                        icon={<Redo size={16} />}
                        disabled={historyIndex >= history.length - 1}
                        title="重做 (Ctrl+Shift+Z)"
                    />
                </div>
            </div>

            {/* Editor Surface */}
            <div className="flex-1 overflow-y-auto scroll-smooth bg-gray-50 dark:bg-gray-700 transition-colors duration-200 relative">
                <div className="min-h-full flex flex-col items-center p-8">
                    {/* Paper Container - Discord Style: Darker Gray (gray-800 is #36393f) */}
                    <div className="w-full max-w-3xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 min-h-[800px] p-12 rounded-lg relative flex flex-col h-fit transition-all duration-200">
                        {/* Dotted grid background effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                            style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        <input
                            type="text"
                            value={chapter.title}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            placeholder="輸入章節標題..."
                            className="w-full text-4xl font-bold text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-none outline-none text-center mb-10 bg-transparent font-serif z-10 transition-colors"
                        />

                        <textarea
                            ref={textareaRef}
                            value={chapter.content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="開始您的創作... (按 Tab 縮排)"
                            className="w-full resize-none border-none outline-none leading-relaxed text-gray-700 dark:text-gray-300 bg-transparent placeholder-gray-300 dark:placeholder-gray-600 font-serif z-10 min-h-[500px] text-lg transition-colors overflow-hidden"
                            spellCheck={false}
                        />


                        {/* Inline AI Prompt Hint - Hidden for now */}
                        {/* 
                        <div className="mt-8 flex justify-center opacity-40 hover:opacity-100 transition-opacity z-10 pb-8">
                            <button
                                onClick={() => onAiAction('continue')}
                                className="flex items-center gap-2 text-violet-400 text-sm hover:text-violet-600 transition-colors px-4 py-2 rounded-full hover:bg-violet-50 cursor-pointer border border-transparent hover:border-violet-100"
                            >
                                <Wand2 size={14} />
                                <span>AI 續寫提示: 點擊此處讓 AI 根據上文繼續創作...</span>
                            </button>
                        </div>
                        */}
                    </div>

                    {/* Explicit Scroll Spacer */}
                    <div className="h-[50vh] w-full flex-shrink-0" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const ToolbarButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; colorClass?: string }> = ({ onClick, icon, label, colorClass = "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${colorClass}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const IconButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title?: string;
    disabled?: boolean;
    colorClass?: string;
}> = ({ onClick, icon, title, disabled, colorClass = "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        // Change: Instead of opacity-30, use specific text color for disabled state to ensure visibility
        className={`p-1.5 rounded transition-colors ${disabled ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : colorClass}`}
    >
        {icon}
    </button>
);
