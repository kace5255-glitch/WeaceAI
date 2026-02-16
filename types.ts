
export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'pro' | 'admin';
  username?: string;
  avatar_url?: string;
}

export interface Character {
  id: string;
  name: string;
  role: string; // Changed to string for custom roles
  traits: string; // "Personality Traits" (性格特徵)
  status: string; // "Current Status" (當前狀態)
  gender: 'male' | 'female' | 'other';
  level?: string; // Changed to string to allow "SS Rank", "Empty", etc.
  faction?: string; // 陣營 (正派/反派/中立)
  period?: string; // 時期 (前期/中期/後期)
  lifeStatus?: string; // 生存狀態 (活躍/隱退/已故)
  race?: string; // 種族 (人類/精靈/妖獸)
}

export interface Vocabulary {
  id: string;
  name: string;
  category: string; // Changed to string to allow custom categories
  description: string;
  tags?: string[]; // 自定義標籤
}

export interface Memo {
  id: string;
  novel_id: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  outline: string;
  briefing?: string; // New: Stores the AI generated presentation/summary
  critique?: string; // AI 點評內容
  critiqueGeneratedAt?: Date; // 點評生成時間
  contentHash?: string; // 內容哈希值，用於檢測變更
  lastModified: number;
}

export interface Volume {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface ApiConfiguration {
  provider: 'google' | 'openai' | 'custom';
  apiKey?: string;
  baseUrl?: string; // For custom providers like Ollama or DeepSeek
  modelName?: string; // To override the dropdown selection
}

export interface NovelSettings {
  title: string;
  genre: string;
  style: string; // e.g., "Hemingway", "Dark Fantasy", "Wuxia"
  tone: string; // e.g., "Melancholic", "Upbeat"
  background: string; // World building context
  worldview?: string; // 世界觀設定：修煉體系、地理、勢力、歷史等全局背景
  systemPersona?: string; // New: Custom AI System Instruction/Persona
  apiConfig?: ApiConfiguration; // New: API Connection settings
  customLevels?: string[]; // 自定義等級體系
  customFactions?: string[]; // 自定義陣營/勢力
  customRaces?: string[]; // 自定義種族
}

export interface AIRequestParams {
  chapter: Chapter;
  characters: Character[];
  vocabularies: Vocabulary[];
  settings: NovelSettings;
  instructions: string; // This is primarily the Outline now
  requirements: string; // New: Specific writing requirements (e.g. "More dialogue")
  relations?: string; // New: Character relations/temp characters
  previousContext?: string; // New: Summary of previous chapters
  model: string; // 模型選擇
  temperature?: number; // 溫度控制
  signal?: AbortSignal; // 取消信號
}

export type EditorActionType = 'rewrite' | 'continue' | 'expand' | 'outline' | 'split' | 'fix' | 'humanize' | 'briefing' | 'critique';
