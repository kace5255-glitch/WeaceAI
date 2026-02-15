/**
 * 生成內容的哈希值，用於檢測內容是否變更
 */
export function generateContentHash(content: string): string {
  if (!content) return '';
  
  // 使用簡單但有效的哈希算法
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 檢查內容是否發生變化
 */
export function hasContentChanged(
  currentContent: string,
  savedHash: string | null | undefined
): boolean {
  if (!savedHash) return true;
  if (!currentContent) return false;
  return generateContentHash(currentContent) !== savedHash;
}
