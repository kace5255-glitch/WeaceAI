import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CritiqueScore, getScoreColor, getScoreBgColor, getScoreWidth } from '../../utils/critiqueParser';

interface ScoreOverviewProps {
  scores: CritiqueScore[];
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ scores }) => {
  if (!scores || scores.length === 0) {
    return null;
  }

  // 計算平均分
  const avgScore = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
  const avgRounded = Math.round(avgScore * 10) / 10;

  return (
    <div className="space-y-4">
      {/* 總體評分卡片 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">整體評分</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{avgRounded}</span>
              <span className="text-lg text-gray-500 dark:text-gray-400">/ 10</span>
            </div>
          </div>
          <div className="text-right">
            {avgScore >= 8 ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">優秀</span>
              </div>
            ) : avgScore >= 6 ? (
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <Minus size={20} />
                <span className="text-sm font-medium">良好</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown size={20} />
                <span className="text-sm font-medium">需改進</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 評分詳情 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {scores.map((score, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border transition-all hover:shadow-md ${getScoreBgColor(score.value)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {score.name}
              </span>
              <span className={`text-2xl font-bold ${getScoreColor(score.value)}`}>
                {score.value}
              </span>
            </div>
            
            {/* 進度條 */}
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${getScoreWidth(score.value)}%` }}
              />
            </div>
            
            {/* 評級標籤 */}
            <div className="mt-2 text-right">
              <span className={`text-xs font-medium ${getScoreColor(score.value)}`}>
                {score.value >= 8 ? '優秀' : score.value >= 6 ? '良好' : score.value >= 4 ? '及格' : '待改進'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
