import React from 'react';
import { Diff } from 'diff-match-patch';

interface DiffHighlightProps {
  diffs: Diff[];
  type: 'original' | 'improved';
}

/**
 * 字詞級別的差異高亮顯示組件
 * 用於在 ImprovementPreviewModal 中精確顯示文本變化
 */
export const DiffHighlight: React.FC<DiffHighlightProps> = ({ diffs, type }) => {
  return (
    <span>
      {diffs.map((diff, index) => {
        const [operation, text] = diff;
        
        // operation: -1 = 刪除, 0 = 不變, 1 = 新增
        
        if (type === 'original') {
          // 原始版本：顯示刪除的內容（紅色高亮）和不變的內容
          if (operation === -1) {
            // 被刪除的文字
            return (
              <span
                key={index}
                className="bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through decoration-2 px-0.5 rounded"
                title="此部分在改進版本中被刪除"
              >
                {text}
              </span>
            );
          } else if (operation === 0) {
            // 未變化的文字
            return <span key={index}>{text}</span>;
          } else {
            // 新增的文字（在原始版本中不顯示）
            return null;
          }
        } else {
          // 改進版本：顯示新增的內容（綠色高亮）和不變的內容
          if (operation === 1) {
            // 新增的文字
            return (
              <span
                key={index}
                className="bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-medium px-0.5 rounded"
                title="此部分在改進版本中新增"
              >
                {text}
              </span>
            );
          } else if (operation === 0) {
            // 未變化的文字
            return <span key={index}>{text}</span>;
          } else {
            // 刪除的文字（在改進版本中不顯示）
            return null;
          }
        }
      })}
    </span>
  );
};
