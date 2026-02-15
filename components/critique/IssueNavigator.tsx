import React from 'react';
import { AlertCircle, Target, ArrowRight } from 'lucide-react';
import { IssueLocation } from '../../services/aiFixService';

interface IssueNavigatorProps {
    issues: IssueLocation[];
    onNavigate: (quote: string) => void;
    isLoading: boolean;
    onClose: () => void;
}

export const IssueNavigator: React.FC<IssueNavigatorProps> = ({
    issues,
    onNavigate,
    isLoading,
    onClose
}) => {
    if (isLoading) {
        return (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-900 shadow-lg animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 bg-indigo-200 dark:bg-indigo-800 rounded-full"></div>
                    <div className="h-4 w-32 bg-indigo-200 dark:bg-indigo-800 rounded"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!issues || issues.length === 0) return null;

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-900 shadow-xl flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                    <Target size={18} />
                    <span>發現 {issues.length} 個相關段落</span>
                </div>
                <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">
                    關閉
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {issues.map((issue, idx) => (
                    <div
                        key={idx}
                        onClick={() => onNavigate(issue.quote)}
                        className="group cursor-pointer p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                    >
                        {/* 引用文字 */}
                        <div className="relative pl-3 border-l-2 border-gray-300 dark:border-gray-500 mb-2 group-hover:border-indigo-500 transition-colors">
                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic font-serif">
                                "{issue.quote}"
                            </p>
                        </div>

                        {/* 問題說明 */}
                        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{issue.reason}</span>
                        </div>

                        <div className="mt-2 text-right hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full flex items-center justify-end gap-1 w-fit ml-auto">
                                跳轉至此 <ArrowRight size={10} />
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
