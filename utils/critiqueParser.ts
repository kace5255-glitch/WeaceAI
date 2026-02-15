export interface CritiqueScore {
  name: string;
  value: number;
  category: string;
}

export interface CritiqueSection {
  title: string;
  content: string;
  rating?: number;
}

export interface CritiqueSummary {
  highlights: string;
  problems: string;
  overallScore: number;
  oneSentence: string;
}

export interface CritiqueData {
  scores: CritiqueScore[];
  sections: CritiqueSection[];
  suggestions: string[];
  summary: CritiqueSummary;
  rawContent: string;
}

/**
 * 解析 AI 點評內容，提取結構化數據
 */
export function parseCritique(content: string): CritiqueData | null {
  if (!content || content.trim().length === 0) {
    return null;
  }

  try {
    const scores: CritiqueScore[] = [];
    const sections: CritiqueSection[] = [];
    const suggestions: string[] = [];
    let summary: CritiqueSummary = {
      highlights: '',
      problems: '',
      overallScore: 0,
      oneSentence: ''
    };

    // 提取評分 (格式: 評分（1-10）：___ 或 - 評分（1-10）：___)
    const scorePatterns = [
      { name: '劇情節奏', key: 'pacing', pattern: /劇情節奏.*?評分[（(]1-10[)）][：:]\s*(\d+)/i },
      { name: '爽點設計', key: 'coolPoints', pattern: /爽點設計.*?評分[（(]1-10[)）][：:]\s*(\d+)/i },
      { name: '懸念鉤子', key: 'hooks', pattern: /懸念鉤子.*?評分[（(]1-10[)）][：:]\s*(\d+)/i },
      { name: '對話質量', key: 'dialogue', pattern: /對話質量.*?評分[（(]1-10[)）][：:]\s*(\d+)/i },
      { name: '水文檢測', key: 'filler', pattern: /水文檢測.*?評分[（(]1-10[)）][：:]\s*(\d+)/i },
    ];

    scorePatterns.forEach(({ name, key, pattern }) => {
      const match = content.match(pattern);
      if (match && match[1]) {
        const value = parseInt(match[1], 10);
        if (!isNaN(value) && value >= 1 && value <= 10) {
          scores.push({ name, value, category: key });
        }
      }
    });

    // 提取區塊 (格式: ═══ 標題 ═══)
    const sectionRegex = /═══\s*([^═]+?)\s*═══([\s\S]*?)(?=═══|$)/g;
    let sectionMatch;
    
    while ((sectionMatch = sectionRegex.exec(content)) !== null) {
      const title = sectionMatch[1].trim();
      const sectionContent = sectionMatch[2].trim();
      
      // 嘗試提取該區塊的評分
      const ratingMatch = sectionContent.match(/評分[（(]1-10[)）][：:]\s*(\d+)/);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;
      
      sections.push({
        title,
        content: sectionContent,
        rating: rating && !isNaN(rating) ? rating : undefined
      });
    }

    // 提取修改建議 (通常在"具體修改建議"區塊中)
    const suggestionSection = sections.find(s => s.title.includes('修改建議') || s.title.includes('五'));
    if (suggestionSection) {
      // 提取編號列表 (1. 2. 3. 或 - )
      const suggestionLines = suggestionSection.content.split('\n');
      suggestionLines.forEach(line => {
        const trimmed = line.trim();
        // 匹配 "1. xxx" 或 "- xxx" 格式
        if (/^(\d+\.|[-•])\s+.+/.test(trimmed) && trimmed.length > 5) {
          suggestions.push(trimmed.replace(/^(\d+\.|[-•])\s+/, ''));
        }
      });
    }

    // 提取總體評價
    const summarySection = sections.find(s => s.title.includes('總體評價') || s.title.includes('六'));
    if (summarySection) {
      const summaryLines = summarySection.content.split('\n');
      
      summaryLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes('亮點') || trimmed.includes('本章亮點')) {
          summary.highlights = trimmed.replace(/.*[：:]\s*/, '').trim();
        } else if (trimmed.includes('問題') || trimmed.includes('主要問題')) {
          summary.problems = trimmed.replace(/.*[：:]\s*/, '').trim();
        } else if (trimmed.includes('總體評分')) {
          const scoreMatch = trimmed.match(/(\d+)/);
          if (scoreMatch) {
            summary.overallScore = parseInt(scoreMatch[1], 10);
          }
        } else if (trimmed.includes('一句話總結') || trimmed.includes('總結')) {
          summary.oneSentence = trimmed.replace(/.*[：:]\s*/, '').trim();
        }
      });
    }

    // 如果沒有提取到評分，嘗試整體搜索
    if (scores.length === 0) {
      const overallScoreMatch = content.match(/總體評分.*?[：:]\s*(\d+)/i);
      if (overallScoreMatch) {
        summary.overallScore = parseInt(overallScoreMatch[1], 10);
      }
    }

    // 如果總體評分為0，計算平均分
    if (summary.overallScore === 0 && scores.length > 0) {
      const avg = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
      summary.overallScore = Math.round(avg);
    }

    return {
      scores,
      sections,
      suggestions,
      summary,
      rawContent: content
    };
  } catch (error) {
    console.error('Failed to parse critique:', error);
    return null;
  }
}

/**
 * 獲取評分對應的顏色
 */
export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 4) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * 獲取評分對應的背景色
 */
export function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  if (score >= 6) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  if (score >= 4) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
  return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
}

/**
 * 獲取評分的進度條寬度百分比
 */
export function getScoreWidth(score: number): number {
  return Math.max(0, Math.min(100, score * 10));
}
