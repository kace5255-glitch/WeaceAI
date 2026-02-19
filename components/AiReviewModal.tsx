import React, { useState, useEffect } from 'react';
import { X, Check, RefreshCw, Trash2, Edit3, Sparkles, Square, FileText } from 'lucide-react';

interface AiReviewModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  content: string;
  onAccept: (finalContent: string) => void;
  onDiscard: () => void;
  onRegenerate: () => void;
}

export const AiReviewModal: React.FC<AiReviewModalProps> = ({
  isOpen,
  isGenerating,
  content,
  onAccept,
  onDiscard,
  onRegenerate
}) => {
  const [editedContent, setEditedContent] = useState(content);

  // Sync local state when prop content changes (e.g. after regeneration)
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border border-violet-100 dark:border-violet-900/50 ring-4 ring-violet-500/10 dark:ring-violet-500/20 transition-colors">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
            <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">AI 生成預覽</h3>
            {!isGenerating && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-600 ml-2">
                <FileText size={12} />
                <span>{editedContent.length} 字</span>
              </div>
            )}
          </div>
          <button
            onClick={onDiscard}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-gray-900 transition-colors">
          {isGenerating ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-200 border-t-violet-600"></div>
              <p className="text-sm font-medium animate-pulse">正在重新生成中...</p>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 flex items-center gap-1 pointer-events-none">
                <Edit3 size={12} /> 可直接編輯
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-64 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 leading-relaxed resize-y focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/20 focus:border-violet-400 dark:focus:border-violet-500 outline-none shadow-sm font-serif text-lg transition-all placeholder-gray-400 dark:placeholder-gray-600"
                placeholder="生成內容將顯示於此..."
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4 transition-colors">
          <div className="flex gap-2">
            {isGenerating ? (
              <button
                onClick={onDiscard}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex items-center gap-2 text-sm"
              >
                <Square size={16} fill="currentColor" />
                停止生成
              </button>
            ) : (
              <button
                onClick={onDiscard}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} />
                放棄
              </button>
            )}

            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800/50 text-violet-600 dark:text-violet-400 font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
              重新生成
            </button>
          </div>

          <button
            onClick={() => onAccept(editedContent)}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            確認加入文章
          </button>
        </div>
      </div>
    </div>
  );
};