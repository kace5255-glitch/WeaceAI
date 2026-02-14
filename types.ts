
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
}

export interface Vocabulary {
  id: string;
  name: string;
  category: string; // Changed to string to allow custom categories
  description: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  outline: string;
  briefing?: string; // New: Stores the AI generated presentation/summary
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
  systemPersona?: string; // New: Custom AI System Instruction/Persona
  apiConfig?: ApiConfiguration; // New: API Connection settings
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
  model: string; // New: Model selection
  temperature?: number; // New: Temperature control
  signal?: AbortSignal; // New: For cancellation
}

export type EditorActionType = 'rewrite' | 'continue' | 'expand' | 'outline' | 'split' | 'fix' | 'humanize' | 'briefing' | 'critique';
