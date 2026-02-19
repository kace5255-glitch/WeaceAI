import React from 'react';
import { Award, CheckCircle2, XCircle } from 'lucide-react';
import { CritiqueSummary, getScoreColor } from '../../utils/critiqueParser';

interface SummaryCardProps {
  summary: CritiqueSummary;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Award size={24} className="text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xl">
          總體評價
        </h3>
      </div>

      {/* 總體評分 */}
      {summary.overallScore > 0 && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              綜合得分
            </span>
            <span className={`text-3xl font-bold ${getScoreColor(summary.overallScore)}`}>
              {summary.overallScore}/10
            </span>
          </div>
        </div>
      )}

      {/* 一句話總結 */}
      {summary.oneSentence && (
        <div className="mb-5 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 leading-relaxed">
            💡 {summary.oneSentence}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* 亮點 */}
        {summary.highlights && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                本章亮點
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {summary.highlights}
              </p>
            </div>
          </div>
        )}

        {/* 問題 */}
        {summary.problems && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <XCircle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                主要問題
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {summary.problems}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 如果沒有任何內容 */}
      {!summary.highlights && !summary.problems && !summary.oneSentence && summary.overallScore === 0 && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-600">
          <p className="text-sm">暫無總體評價</p>
        </div>
      )}
    </div>
  );
};
