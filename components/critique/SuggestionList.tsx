import React from 'react';
import { Lightbulb, AlertCircle, Target } from 'lucide-react';

interface SuggestionListProps {
  suggestions: string[];
  onLocateClick?: (suggestion: string, index: number) => void;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({ suggestions, onLocateClick }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Lightbulb size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
          具體修改建議
        </h3>
      </div>

      <div className="space-y-4">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {idx + 1}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {suggestion}
              </p>
            </div>
            {/* AI 定位按鈕 */}
            {onLocateClick && (
              <button
                onClick={() => onLocateClick && onLocateClick(suggestion, idx)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-all opacity-0 group-hover:opacity-100"
                title="讓 AI 根據此建議自動改進章節"
              >
                <Target size={14} />
                定位問題
              </button>
            )}
          </div>
        ))}
      </div>

      {suggestions.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <AlertCircle size={16} />
          <span>暫無具體建議</span>
        </div>
      )}
    </div>
  );
};
