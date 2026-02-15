import DiffMatchPatch from 'diff-match-patch';

export interface DiffParagraph {
  index: number;
  original: string;
  improved: string;
  hasChanges: boolean;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
}

/**
 * 將內容拆分為段落並分析差異
 */
export function analyzeDifferences(
  originalContent: string,
  improvedContent: string
): DiffParagraph[] {
  // 按段落分割（換行符）
  const originalParagraphs = originalContent.split(/\n+/).filter(p => p.trim());
  const improvedParagraphs = improvedContent.split(/\n+/).filter(p => p.trim());
  
  const dmp = new DiffMatchPatch();
  const paragraphs: DiffParagraph[] = [];
  
  const maxLength = Math.max(originalParagraphs.length, improvedParagraphs.length);
  
  for (let i = 0; i < maxLength; i++) {
    const original = originalParagraphs[i] || '';
    const improved = improvedParagraphs[i] || '';
    
    // 計算相似度
    const diffs = dmp.diff_main(original, improved);
    dmp.diff_cleanupSemantic(diffs);
    
    // 判斷是否有變化
    const hasChanges = diffs.length > 1 || (diffs.length === 1 && diffs[0][0] !== 0);
    
    // 判斷變化類型
    let changeType: DiffParagraph['changeType'] = 'unchanged';
    if (!original && improved) {
      changeType = 'added';
    } else if (original && !improved) {
      changeType = 'removed';
    } else if (hasChanges) {
      changeType = 'modified';
    }
    
    paragraphs.push({
      index: i,
      original,
      improved,
      hasChanges,
      changeType
    });
  }
  
  return paragraphs;
}

/**
 * 合併段落：根據選中的索引決定使用原文還是改進版
 */
export function mergeParagraphs(
  originalContent: string,
  improvedContent: string,
  selectedIndices: number[]
): string {
  const originalParagraphs = originalContent.split(/\n+/).filter(p => p.trim());
  const improvedParagraphs = improvedContent.split(/\n+/).filter(p => p.trim());
  
  const mergedParagraphs = originalParagraphs.map((orig, idx) => {
    if (selectedIndices.includes(idx)) {
      return improvedParagraphs[idx] || orig;
    }
    return orig;
  });
  
  // 處理新增的段落
  for (let i = originalParagraphs.length; i < improvedParagraphs.length; i++) {
    if (selectedIndices.includes(i)) {
      mergedParagraphs.push(improvedParagraphs[i]);
    }
  }
  
  return mergedParagraphs.join('\n\n');
}
