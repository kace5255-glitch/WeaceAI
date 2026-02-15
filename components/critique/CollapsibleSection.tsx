import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CritiqueSection, getScoreColor } from '../../utils/critiqueParser';

interface CollapsibleSectionProps {
  section: CritiqueSection;
  defaultExpanded?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  section,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all">
      {/* 標題欄 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-800 dark:text-gray-100">
            {section.title}
          </span>
          {section.rating !== undefined && (
            <span className={`text-lg font-bold ${getScoreColor(section.rating)}`}>
              {section.rating}/10
            </span>
          )}
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* 內容區 */}
      {isExpanded && (
        <div className="px-5 py-4 bg-white dark:bg-gray-900 animate-in slide-in-from-top-2 duration-200">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
