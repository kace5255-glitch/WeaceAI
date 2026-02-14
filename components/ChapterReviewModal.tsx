import React, { useState } from 'react';
import { X, FileText, Copy, Check, RefreshCw, MessageSquare } from 'lucide-react';

interface ChapterReviewModalProps {
  isOpen: boolean;
  title?: string; // Optional custom title
  content: string;
  isLoading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

export const ChapterReviewModal: React.FC<ChapterReviewModalProps> = ({
  isOpen,
  title = "章節智能簡報",
  content,
  isLoading,
  onClose,
  onRegenerate
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden border border-indigo-100 dark:border-indigo-900/50 ring-4 ring-indigo-500/10 dark:ring-indigo-500/20 transition-colors">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-50/50 dark:bg-gray-800/80 transition-colors">
          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              {title.includes('點評') ? <MessageSquare size={20} className="text-indigo-600 dark:text-indigo-400" /> : <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />}
            </div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-gray-900 transition-colors">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 dark:border-t-indigo-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 bg-indigo-600 dark:bg-indigo-500 rounded-full"></div>
                </div>
              </div>
              <p className="text-sm font-medium animate-pulse text-indigo-400">AI 正在分析內容並製作報告...</p>
            </div>
          ) : (
            <div className="prose prose-indigo dark:prose-invert max-w-none">
              <div className="bg-slate-50 dark:bg-gray-800 p-6 rounded-xl border border-slate-100 dark:border-gray-700 text-slate-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans text-sm md:text-base transition-colors">
                {content}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-3 transition-colors">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            重新生成
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-2 text-sm"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? "已複製" : "複製內容"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 text-sm"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
