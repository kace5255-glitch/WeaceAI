import { generateContentHash, hasContentChanged } from './contentHash';

/**
 * 點評緩存管理器 - 使用 localStorage 本地緩存
 * 無需數據庫遷移即可工作
 */

interface CachedCritique {
  critique: string;
  contentHash: string;
  generatedAt: string; // ISO string
}

const CACHE_PREFIX = 'critique_cache_';

/**
 * 獲取緩存的點評
 */
export function getCachedCritique(chapterId: string): CachedCritique | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + chapterId);
    if (!raw) return null;
    return JSON.parse(raw) as CachedCritique;
  } catch {
    return null;
  }
}

/**
 * 保存點評到緩存
 */
export function saveCritiqueToCache(chapterId: string, critique: string, content: string): void {
  try {
    const cached: CachedCritique = {
      critique,
      contentHash: generateContentHash(content),
      generatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_PREFIX + chapterId, JSON.stringify(cached));
  } catch {
    // localStorage 可能已滿，忽略錯誤
    console.warn('Failed to save critique to localStorage');
  }
}

/**
 * 檢查是否有有效的緩存點評（內容未變更）
 * 返回: { hasCachedCritique, contentChanged, critique }
 */
export function checkCritiqueCache(chapterId: string, currentContent: string): {
  hasCachedCritique: boolean;
  contentChanged: boolean;
  critique: string;
} {
  const cached = getCachedCritique(chapterId);

  if (!cached || !cached.critique) {
    return { hasCachedCritique: false, contentChanged: false, critique: '' };
  }

  const contentChanged = hasContentChanged(currentContent, cached.contentHash);

  return {
    hasCachedCritique: true,
    contentChanged,
    critique: cached.critique,
  };
}

/**
 * 清除指定章節的點評緩存
 */
export function clearCritiqueCache(chapterId: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + chapterId);
  } catch {
    // 忽略錯誤
  }
}
