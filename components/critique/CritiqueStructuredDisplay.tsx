import React from 'react';
import { CritiqueData } from '../../utils/critiqueParser';
import { ScoreOverview } from './ScoreOverview';
import { CollapsibleSection } from './CollapsibleSection';
import { SuggestionList } from './SuggestionList';
import { SummaryCard } from './SummaryCard';

interface CritiqueStructuredDisplayProps {
  content: CritiqueData;
  onLocateSuggestion?: (suggestion: string, index: number) => void;
}

export const CritiqueStructuredDisplay: React.FC<CritiqueStructuredDisplayProps> = ({ content, onLocateSuggestion }) => {
  return (
    <div className="space-y-6">
      {/* 評分總覽 */}
      {content.scores && content.scores.length > 0 && (
        <ScoreOverview scores={content.scores} />
      )}

      {/* 詳細評估區塊 */}
      {content.sections && content.sections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            詳細評估
          </h3>
          {content.sections.map((section, idx) => (
            <CollapsibleSection
              key={idx}
              section={section}
              defaultExpanded={idx < 2} // 默認展開前兩個
            />
          ))}
        </div>
      )}

      {/* 修改建議 */}
      {content.suggestions && content.suggestions.length > 0 && (
        <SuggestionList
          suggestions={content.suggestions}
          onLocateClick={onLocateSuggestion}
        />
      )}

      {/* 總體評價 */}
      {content.summary && (
        <SummaryCard summary={content.summary} />
      )}
    </div>
  );
};
