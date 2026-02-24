import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("請先登入會員");
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const safeFetch = async (url: string, options: RequestInit) => {
  console.log('[WizardAI] 發送請求:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    console.log('[WizardAI] 回應狀態:', response.status);

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        const text = await response.text().catch(() => '');
        errorMsg = text || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('[WizardAI] 回應成功:', Object.keys(data));
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('請求超時（60秒），請確認後端伺服器是否正在運行');
    }
    throw err;
  }
};

// 生成世界觀（使用 Deepseek R1）
export const generateWizardWorldview = async (
  genres: string[],
  tags: string[],
  customInput: string,
  language: string = '繁體中文'
): Promise<string> => {
  const headers = await getAuthHeaders();

  const prompt = `類型：${genres.join(' + ')}
標籤：${tags.join('、')}
用戶描述：${customInput || '請根據類型和標籤生成合適的世界觀'}`;

  const data = await safeFetch(`${API_BASE_URL}/worldview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      model: 'DeepSeek R1',
      language
    })
  });

  return data.content;
};

// 生成等級體系（使用 Deepseek V3）
export const generateWizardLevels = async (
  genres: string[],
  worldview: string,
  language: string = '繁體中文'
): Promise<string> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/levels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, worldview, language })
  });

  return data.content;
};

// 生成種族（使用 Deepseek V3）
export const generateWizardRaces = async (
  genres: string[],
  worldview: string,
  levels: string,
  language: string = '繁體中文'
): Promise<string> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/races`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, worldview, levels, language })
  });

  return data.content;
};

// 生成勢力（使用 Deepseek V3）
export const generateWizardFactions = async (
  genres: string[],
  worldview: string,
  levels: string,
  races: string,
  language: string = '繁體中文'
): Promise<string> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/factions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, worldview, levels, races, language })
  });

  return data.content;
};

// 世界觀方向卡片介面
export interface WorldviewCard {
  title: string;
  desc: string;
  tags: string[];
}

// 卡片生成結果（含敘事引導語）
export interface CardGenerationResult {
  intro: string;
  cards: WorldviewCard[];
}

// 生成世界觀方向卡片（9張）
export const generateWizardWorldviewOptions = async (
  genres: string[],
  tags: string[],
  hint: string,
  language: string = '繁體中文'
): Promise<CardGenerationResult> => {
  const headers = await getAuthHeaders();

  const prompt = `類型：${genres.join(' + ')}
標籤：${tags.join('、')}
用戶描述：請根據類型和標籤生成合適的世界觀`;

  const data = await safeFetch(`${API_BASE_URL}/worldview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      model: 'DeepSeek R1',
      language,
      count: 9,
      hint
    })
  });

  return { intro: data.intro || '', cards: data.cards || [] };
};

// 生成主角人設方向卡片（9張）
export const generateWizardCharacterOptions = async (
  genres: string[],
  tags: string[],
  worldview: string,
  hint: string,
  language: string = '繁體中文'
): Promise<CardGenerationResult> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/character`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, tags, worldview, hint, language })
  });

  return { intro: data.intro || '', cards: data.cards || [] };
};

// 生成外掛/金手指方向卡片（9張）
export const generateWizardGoldenFingerOptions = async (
  genres: string[],
  tags: string[],
  worldview: string,
  characterDesc: string,
  hint: string,
  language: string = '繁體中文'
): Promise<CardGenerationResult> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/goldenfinger`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, tags, worldview, characterDesc, hint, language })
  });

  return { intro: data.intro || '', cards: data.cards || [] };
};

// 生成等級體系選項（3張卡片，使用 Deepseek V3）
export const generateWizardLevelsOptions = async (
  genres: string[],
  worldview: string,
  hint: string,
  language: string = '繁體中文'
): Promise<string[]> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/levels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, worldview, language, count: 3, hint })
  });

  return data.contents || [];
};

// 生成種族選項（3張卡片，使用 Deepseek V3）
export const generateWizardRacesOptions = async (
  genres: string[],
  worldview: string,
  levels: string,
  hint: string,
  language: string = '繁體中文'
): Promise<string[]> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/races`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, worldview, levels, language, count: 3, hint })
  });

  return data.contents || [];
};

// 生成勢力選項（3張卡片，使用 Deepseek V3）
export const generateWizardFactionsOptions = async (
  genres: string[],
  worldview: string,
  levels: string,
  races: string,
  hint: string,
  language: string = '繁體中文'
): Promise<string[]> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/factions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, worldview, levels, races, language, count: 3, hint })
  });

  return data.contents || [];
};
export const generateWizardTitle = async (
  genres: string[],
  tags: string[],
  goldenFinger: string,
  worldview: string,
  levels: string,
  races: string,
  factions: string,
  language: string = '繁體中文'
): Promise<string[]> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/title`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, tags, goldenFinger, worldview, levels, races, factions, language })
  });

  return data.titles;
};

export const generateWizardTitleOptions = async (
  genres: string[],
  tags: string[],
  goldenFinger: string,
  worldview: string,
  levels: string,
  races: string,
  factions: string,
  language: string = '繁體中文'
): Promise<string[]> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/title`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, tags, goldenFinger, worldview, levels, races, factions, language, count: 5 })
  });

  return data.titles;
};

// 立項書結構化介面
export interface BriefData {
  titles: string;
  genre_position: string;
  worldview_full: string;
  character_full: string;
  goldenfinger_full: string;
  selling_points: string;
  opening: string;
}

export type BriefField = keyof BriefData;

// 生成完整立項書（使用 Deepseek V3）
export const generateWizardBrief = async (
  genres: string[],
  tags: string[],
  worldview: string,
  characterDesc: string,
  goldenFinger: string,
  language: string = '繁體中文'
): Promise<BriefData> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/brief`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, tags, worldview, characterDesc, goldenFinger, language })
  });

  return data.brief;
};

// 單欄位重新生成
export const regenerateWizardBriefField = async (
  field: BriefField,
  genres: string[],
  tags: string[],
  worldview: string,
  characterDesc: string,
  goldenFinger: string,
  language: string = '繁體中文'
): Promise<string> => {
  const headers = await getAuthHeaders();

  const data = await safeFetch(`${API_BASE_URL}/wizard/brief`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ genres, tags, worldview, characterDesc, goldenFinger, language, field })
  });

  return data.content;
};
