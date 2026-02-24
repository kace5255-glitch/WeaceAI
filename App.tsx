
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { AssistantPanel } from './components/AssistantPanel';
import { AiReviewModal } from './components/AiReviewModal';
import { ConfirmModal } from './components/ConfirmModal';
import { MemoryConfirmModal } from './components/MemoryConfirmModal';
import { ChapterReviewModal } from './components/ChapterReviewModal';
import { BackgroundModal } from './components/BackgroundModal';
import { NovelSettingsModal } from './components/NovelSettingsModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { NovelSetupWizard } from './components/NovelSetupWizard';
import { HomePage } from './components/HomePage';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatPage } from './components/ChatPage';
import { AuthPage } from './components/AuthPage';
import { supabase } from './lib/supabase';
import { generateStoryContent, generateOutline, generateCharacterProfile, generateChapterBriefing, generateCritique, checkAiTaste, rewriteAntiAi } from './services/geminiService';
import { getSmartContext, saveConfirmedMemory } from './services/memoryService';
import { Chapter, Character, NovelSettings, Volume, Vocabulary, AIRequestParams, EditorActionType, MemoryExtractionResult } from './types';
import { Session } from '@supabase/supabase-js';
import { useNovelData } from './hooks/useNovelData';

// Error Helper
const getFriendlyErrorMessage = (error: any): string => {
  const msg = error?.message || String(error);
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return "⚠️ API 配額已滿 (429 Error)\n\nGoogle Gemini 免費版 API 可能已達到每分鐘限制，請稍後再試，或更換其他模型/API Key。";
  }
  if (msg.includes('API Key')) {
    return "⚠️ 尚未配置 API Key\n\n您選擇了自定義模型，請在「AI 寫作助手」面板中點擊「配置 API」並輸入您的金鑰。";
  }
  return `生成發生錯誤: ${msg}`;
};

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // View State - 控制顯示主頁、編輯器或管理後台
  const [currentView, setCurrentView] = useState<'home' | 'editor' | 'admin' | 'chat'>('home');

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (data && data.role) {
        setUserRole(data.role);
      }
    } catch (e) {
      console.error("Failed to fetch role", e);
    }
  };

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // 在切換前啟用全域過渡，確保所有元素同步變色
    root.classList.add('theme-transitioning');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    // 過渡結束後移除，避免干擾 hover/focus 等互動動畫
    const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 250);
    return () => clearTimeout(timer);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Hook handles data loading & syncing
  const {
    loading: isDataLoading,
    novelId,
    novels, createNovel, deleteNovel, switchNovel, renameNovel,
    settings, updateSettings,
    volumes, updateVolume: updateVolumeTitle, addVolume, deleteVolume,
    addChapter, updateChapter, deleteChapter,
    characters, addCharacter, updateCharacter, deleteCharacter,
    vocabularies, addVocabulary, updateVocabulary, deleteVocabulary,
    memos, addMemo, updateMemo, deleteMemo,
    importData
  } = useNovelData(session);

  const [currentChapterId, setCurrentChapterId] = useState<string>('1');

  // Update currentChapterId when volumes load
  useEffect(() => {
    if (!isDataLoading && volumes.length > 0) {
      const allChapIds = volumes.flatMap(v => v.chapters).map(c => c.id);
      if (!allChapIds.includes(currentChapterId)) {
        if (allChapIds.length > 0) setCurrentChapterId(allChapIds[0]);
      }
    }
  }, [volumes, isDataLoading, currentChapterId]);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingAiContent, setPendingAiContent] = useState<string | null>(null);
  const [lastGenParams, setLastGenParams] = useState<AIRequestParams | null>(null);

  // Abort Controller Ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);
        // 更新最後登入時間
        fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        }).catch(() => {});
      } else {
        setUserRole('user');
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Review/Briefing/Critique State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewTitle, setReviewTitle] = useState('章節智能簡報');
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewAction, setReviewAction] = useState<'briefing' | 'critique'>('briefing');

  // AI味檢測 State
  const [isAiTasteModalOpen, setIsAiTasteModalOpen] = useState(false);
  const [aiTasteLoading, setAiTasteLoading] = useState(false);
  const [aiTasteRewriting, setAiTasteRewriting] = useState(false);
  const [aiTasteResult, setAiTasteResult] = useState<{ score: number; summary: string; issues: { text: string; reason: string; fix: string }[] } | null>(null);

  // 記憶確認彈窗 State
  const [memoryConfirmOpen, setMemoryConfirmOpen] = useState(false);
  const [memoryConfirmData, setMemoryConfirmData] = useState<MemoryExtractionResult | null>(null);
  const [memoryConfirmChapterIndex, setMemoryConfirmChapterIndex] = useState(1);
  const [memoryConfirmChapterId, setMemoryConfirmChapterId] = useState('');
  const [memoryConfirmSaving, setMemoryConfirmSaving] = useState(false);


  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDestructive: false
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // User Settings Modal State
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);

  // Novel Setup Wizard State
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // Derived state: Find current chapter object
  const currentChapter = useMemo(() => {
    for (const vol of volumes) {
      const found = vol.chapters.find(c => c.id === currentChapterId);
      if (found) return found;
    }
    // Fallback if not found
    return volumes[0]?.chapters[0] || null;
  }, [volumes, currentChapterId]);

  // Helper: Get formatted context string from a list of chapters
  // 前情提要：只取前 1 章的 briefing + 尾段（記憶系統覆蓋全書上下文）
  const buildContextFromChapters = (chapters: Chapter[]): string => {
    if (chapters.length === 0) return "無前情提要。";
    // 只取最後一章（最接近當前章的）
    const prevChap = chapters[chapters.length - 1];
    const parts: string[] = [];
    if (prevChap.briefing) {
      parts.push(`[${prevChap.title} 簡報]:\n${prevChap.briefing}`);
    }
    if (prevChap.content && prevChap.content.length > 0) {
      const tail = prevChap.content.slice(-1000);
      parts.push(`[${prevChap.title} 結尾片段]:\n${tail}`);
    }
    if (parts.length === 0 && prevChap.outline) {
      parts.push(`[${prevChap.title} 大綱]:\n${prevChap.outline}`);
    }
    return parts.join('\n');
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      setPendingAiContent(null);
    }
  };

  // Centralized generation logic
  const performGeneration = async (params: AIRequestParams) => {
    if (!currentChapter) return;

    // Setup Abort Controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setLastGenParams(params);

    try {
      const generatedText = await generateStoryContent({
        ...params,
        signal: abortControllerRef.current.signal
      });
      setPendingAiContent(generatedText);
    } catch (error: any) {
      if (error.message === 'Aborted' || error.message.includes('使用者已取消')) {
        console.log('Generation cancelled by user');
        return;
      }
      console.error(error);
      alert(getFriendlyErrorMessage(error));
    } finally {
      if (abortControllerRef.current?.signal.aborted) {
        // Already handled
      } else {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleGenerate = async (
    instruction: string,
    requirements: string,
    relations: string = '',
    selectedCharIds: string[] = [],
    selectedVocabIds: string[] = [],
    selectedRefChapterIds: string[] = [],
    model: string = 'Google Flash',
    temperature: number = 0.9
  ) => {
    if (!currentChapter) return;
    if (isGenerating) return;

    setIsGenerating(true);

    const activeCharacters = characters.filter(c => selectedCharIds.includes(c.id));
    const activeVocab = vocabularies.filter(v => selectedVocabIds.includes(v.id));

    // 1. 前情提要：只取前 1 章
    const allChapters = volumes.flatMap(v => v.chapters);
    const currentIndex = allChapters.findIndex(c => c.id === currentChapter.id);
    let prevChapter: Chapter | null = currentIndex > 0 ? allChapters[currentIndex - 1] : null;

    // 如果前一章缺 briefing，自動生成
    if (prevChapter && !prevChapter.briefing && prevChapter.content && prevChapter.content.length > 50) {
      try {
        const result = await generateChapterBriefing(prevChapter.content, prevChapter.title, model,
          novelId ? {
            chapterId: prevChapter.id,
            chapterIndex: currentIndex - 1,
            novelId,
            existingCharacters: characters.map(c => ({ name: c.name, role: c.role, level: c.level })),
            novelTitle: settings.title,
            genre: settings.genre,
            customLevels: settings.customLevels
          } : undefined
        );
        updateChapter(prevChapter.id, { briefing: result.content });
        prevChapter = { ...prevChapter, briefing: result.content };
        // 自動生成的 briefing 也提取了記憶，靜默儲存（不彈窗）
        if (result.extracted && novelId) {
          saveConfirmedMemory({
            novelId, chapterId: prevChapter.id,
            chapterIndex: currentIndex - 1, extracted: result.extracted
          }).catch(e => console.error("Auto memory save failed:", e.message));
        }
      } catch (e) {
        console.error("Auto-generation of briefing failed.", e);
      }
    }

    const storyContext = prevChapter
      ? buildContextFromChapters([prevChapter])
      : "無前情提要。";

    // 2. 智能上下文（記憶系統）
    let memoryContext: any = {};
    if (novelId) {
      try {
        memoryContext = await getSmartContext({
          novelId,
          currentChapterIndex: currentIndex + 1,
          selectedCharacterNames: activeCharacters.map(c => c.name)
        });
      } catch (e) {
        console.error("Failed to get smart context, proceeding without memory.", e);
      }
    }

    const params: AIRequestParams = {
      chapter: currentChapter,
      characters: activeCharacters,
      vocabularies: activeVocab,
      settings: settings,
      instructions: instruction,
      requirements: requirements,
      relations: relations,
      previousContext: storyContext,
      memoryContext: memoryContext,
      model: model,
      temperature: temperature
    };

    performGeneration(params);
  };

  const performBriefingGeneration = async () => {
    if (!currentChapter) return;
    if (!currentChapter.content || currentChapter.content.length < 50) {
      alert("章節內容過少，無法生成簡報。");
      return;
    }
    setIsReviewLoading(true);
    setReviewTitle('章節智能簡報');
    setReviewAction('briefing');
    try {
      // 計算當前章節序號
      const allChapters = volumes.flatMap(v => v.chapters);
      const chapterIndex = allChapters.findIndex(c => c.id === currentChapter.id) + 1;

      const result = await generateChapterBriefing(
        currentChapter.content, currentChapter.title, "Gemini 2.5",
        novelId ? {
          chapterId: currentChapter.id,
          chapterIndex,
          novelId,
          existingCharacters: characters.map(c => ({ name: c.name, role: c.role, level: c.level })),
          novelTitle: settings.title,
          genre: settings.genre,
          customLevels: settings.customLevels
        } : undefined
      );
      setReviewContent(result.content);
      updateChapter(currentChapter.id, { briefing: result.content });

      // 如果有提取到記憶，彈出確認面板
      if (result.extracted && novelId) {
        setMemoryConfirmData(result.extracted);
        setMemoryConfirmChapterIndex(chapterIndex);
        setMemoryConfirmChapterId(currentChapter.id);
        setMemoryConfirmOpen(true);
      }
    } catch (e: any) {
      setReviewContent(getFriendlyErrorMessage(e));
    } finally {
      setIsReviewLoading(false);
    }
  };

  const performCritiqueGeneration = async (forceRegenerate = false) => {
    if (!currentChapter) return;
    if (!currentChapter.content || currentChapter.content.length < 50) {
      alert("章節內容過少，無法生成點評。");
      return;
    }

    // 檢查是否已有點評且內容未變更
    if (!forceRegenerate && currentChapter.critique) {
      const { hasContentChanged } = await import('./utils/contentHash');
      const contentChanged = hasContentChanged(
        currentChapter.content,
        currentChapter.contentHash
      );

      if (!contentChanged) {
        // 直接使用已保存的點評
        setReviewContent(currentChapter.critique);
        setReviewTitle('AI 文章點評');
        setReviewAction('critique');
        setIsReviewModalOpen(true);
        return;
      } else {
        // 內容已變更，提示用戶
        const shouldRegenerate = confirm(
          "檢測到章節內容已修改，是否重新生成點評？\n點擊「取消」將顯示舊的點評內容。"
        );
        if (!shouldRegenerate) {
          setReviewContent(currentChapter.critique);
          setReviewTitle('AI 文章點評');
          setReviewAction('critique');
          setIsReviewModalOpen(true);
          return;
        }
      }
    }

    // 生成新點評
    setIsReviewLoading(true);
    setReviewTitle('AI 文章點評');
    setReviewAction('critique');
    setIsReviewModalOpen(true);

    try {
      const params: AIRequestParams = {
        chapter: currentChapter,
        characters: characters,
        vocabularies: vocabularies,
        settings: settings,
        instructions: "",
        requirements: "",
        relations: "",
        previousContext: "",
        model: "Gemini 2.5",
        temperature: 0.7
      };
      const critique = await generateCritique(params);
      setReviewContent(critique);

      // 保存點評到數據庫
      const { generateContentHash } = await import('./utils/contentHash');
      const newHash = generateContentHash(currentChapter.content);
      await updateChapter(currentChapter.id, {
        critique: critique,
        critiqueGeneratedAt: new Date(),
        contentHash: newHash
      });

    } catch (e: any) {
      setReviewContent(getFriendlyErrorMessage(e));
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleAiAction = async (action: EditorActionType) => {
    if (!currentChapter) return;

    if (action === 'ai-taste') {
      if (!currentChapter.content || currentChapter.content.length < 50) {
        alert("章節內容過少，無法檢測AI味。");
        return;
      }
      setAiTasteResult(null);
      setAiTasteLoading(true);
      setIsAiTasteModalOpen(true);
      try {
        const result = await checkAiTaste(currentChapter.content);
        setAiTasteResult(result);
      } catch (error: any) {
        alert(`AI味檢測失敗：${error.message}`);
        setIsAiTasteModalOpen(false);
      } finally {
        setAiTasteLoading(false);
      }
      return;
    }

    if (action === 'briefing') {
      setIsReviewModalOpen(true);
      setReviewContent('');
      setReviewTitle('章節智能簡報');

      if (currentChapter.briefing && currentChapter.briefing.trim().length > 0) {
        setReviewContent(currentChapter.briefing);
        setReviewAction('briefing');
      } else {
        await performBriefingGeneration();
      }
      return;
    }

    if (action === 'critique') {
      setIsReviewModalOpen(true);
      setReviewContent('');
      setReviewTitle('AI 文章點評');
      await performCritiqueGeneration();
      return;
    }

    let toolbarContext = "無前情提要。";
    const allChapters = volumes.flatMap(v => v.chapters);
    const currentIndex = allChapters.findIndex(c => c.id === currentChapter.id);
    if (currentIndex > 0) {
      const prevChap = allChapters[currentIndex - 1];
      toolbarContext = buildContextFromChapters([prevChap]);
    }

    const params: AIRequestParams = {
      chapter: currentChapter,
      characters: characters,
      vocabularies: vocabularies,
      settings: settings,
      instructions: "",
      requirements: "",
      model: "Google Flash",
      relations: "",
      previousContext: toolbarContext,
      temperature: 0.9
    };

    if (action === 'outline') {
      setIsGenerating(true);
      try {
        const result = await generateOutline(params);
        const newOutline = currentChapter.outline ? currentChapter.outline + '\n\n[AI 建議]\n' + result : result;
        updateChapter(currentChapter.id, { outline: newOutline });
        alert("章綱已生成並更新至側邊欄設定中。");
      } catch (e) {
        console.error(e);
        alert(getFriendlyErrorMessage(e));
      }
      setIsGenerating(false);
      return;
    }

    switch (action) {
      case 'continue':
        params.instructions = `請根據上文的敘事節奏、角色情感走向和場景氛圍，自然地延續劇情。

要求：
- 保持與上文一致的人稱視角和時態
- 銜接上文的情緒基調，不要突兀地轉換氛圍
- 至少包含一個微懸念或轉折，讓讀者想繼續讀
- 如有對話，確保每個角色的語氣與性格一致
- 運用感官描寫（至少兩種感官）構建場景
- 約 500-800 字，以一個自然的段落結尾`;
        break;
      case 'expand':
        params.instructions = `請針對上文中最後一個場景進行深度擴寫，使其更具文學性和沉浸感。

擴寫方向：
- 增加五感描寫：視覺色彩、聽覺音效、觸覺質感、嗅覺氣味
- 深化心理描寫：角色面對當前情境的內心波動、猶豫、慾望
- 豐富環境細節：天氣、光影、物件擺設等與情感映射的環境描寫
- 強化動作分解：將關鍵動作拆分為更細膩的連續動作，增加畫面感
- 保持敘事節奏不被拖慢，擴寫應增加深度而非冗長`;
        break;
      case 'split':
        params.instructions = `請對本章內容進行專業的「拆書」結構分析。

分析項目：
1. **敘事節奏分析 (Story Beats)** — 列出每個關鍵情節節點，標注其功能（鋪墊/衝突/高潮/緩和）
2. **張力曲線** — 描述全章的情緒張力走向，標出高峰和低谷
3. **場景轉換點** — 標出適合分段或分場景的位置
4. **節奏問題診斷** — 指出拖沓或過於倉促的段落
5. **改善建議** — 提供具體的結構調整方案`;
        break;
      case 'fix':
        params.instructions = `請擔任資深編輯，對本文進行全面的文字品質檢查。

檢查項目：
1. **語言錯誤** — 錯別字、語病、贅詞、用詞不當
2. **邏輯矛盾** — 時間線、人物位置、因果關係是否一致
3. **角色一致性** — 對話語氣與角色設定是否匹配
4. **標點符號** — 是否正確使用中文標點（「」對話、——破折號、……省略號）
5. **修改建議** — 每個問題都給出具體的修改方案

請先列出問題清單，再提供修改後的完整版本。`;
        break;
      case 'humanize':
        params.instructions = `請對上文最後 2-3 段進行「文學潤飾」，提升至專業小說水準。

潤飾重點：
- 消除 AI 痕跡：去除過於工整對稱的句式、公式化的轉折詞（然而/但是/與此同時）
- 增加人類作家的不完美美感：偶爾的口語化、省略、跳躍式聯想
- 強化文學性：運用新穎比喻、通感手法、意識流片段
- 豐富節奏變化：打破均勻的句式長度，製造自然的閱讀呼吸感
- 保留核心劇情不變，只提升文字品質`;
        break;
      default:
        return;
    }

    await performGeneration(params);
  };

  const handleAcceptAiContent = (finalContent: string) => {
    if (!currentChapter) return;

    // 解析 AI 生成的章節標題（格式：【章節標題：XXX】）
    let content = finalContent;
    let newTitle: string | undefined;
    const titleMatch = content.match(/【章節標題[：:](.{2,8})】/);
    if (titleMatch) {
      const aiTitle = titleMatch[1].trim();
      // 移除標題行
      content = content.replace(/【章節標題[：:].{2,8}】\n?/, '').trimStart();

      // 計算當前章節是第幾章
      const allChapters = volumes.flatMap(v => v.chapters);
      const chapterIndex = allChapters.findIndex(c => c.id === currentChapter.id);
      const chapterNum = chapterIndex >= 0 ? chapterIndex + 1 : 1;
      const numMap = ['一','二','三','四','五','六','七','八','九','十',
        '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
        '二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八','二十九','三十',
        '三十一','三十二','三十三','三十四','三十五','三十六','三十七','三十八','三十九','四十',
        '四十一','四十二','四十三','四十四','四十五','四十六','四十七','四十八','四十九','五十'];
      const chapterNumStr = chapterNum <= 50 ? numMap[chapterNum - 1] : String(chapterNum);
      newTitle = `第${chapterNumStr}章 ${aiTitle}`;

      // 只在章節標題是默認值時才更新
      if (!currentChapter.title.match(/^(第.+章|新章節|Chapter|未命名)/) && currentChapter.title.trim()) {
        newTitle = undefined;
      }
    }

    const separator = currentChapter.content ? '\n\n' : '';
    const updates: Partial<typeof currentChapter> = {
      content: currentChapter.content + separator + content,
    };
    if (newTitle) {
      updates.title = newTitle;
    }
    updateChapter(currentChapter.id, updates);
    setPendingAiContent(null);
  };

  const handleRegenerate = async () => {
    if (lastGenParams) {
      await performGeneration(lastGenParams);
    }
  };

  // AI味改寫 Handler
  const handleAiTasteRewrite = async () => {
    if (!currentChapter || !currentChapter.content || !aiTasteResult) return;
    setAiTasteRewriting(true);
    try {
      const rewritten = await rewriteAntiAi(currentChapter.content, aiTasteResult.issues);
      updateChapter(currentChapter.id, { content: rewritten });
      setIsAiTasteModalOpen(false);
      setAiTasteResult(null);
    } catch (error: any) {
      alert(`去AI味改寫失敗：${error.message}`);
    } finally {
      setAiTasteRewriting(false);
    }
  };

  // AI Character Creation Handler
  const handleAiCreateCharacter = async (description: string) => {
    if (!description.trim()) return;
    try {
      const generatedChar = await generateCharacterProfile(settings, description, 'Qwen3-Plus');

      // Parse JSON if needed (service might return stringified json)
      // Assuming service returns string similar to previous impl pattern, need to check service signature.
      // previous usage: generateCharacterProfile(description, settings) -> reversed?
      // Hook usage: generateCharacterProfile(settings, desc, model, temp)

      let newCharData: Partial<Character> = {
        name: 'AI 生成角色',
        role: '配角',
        gender: 'other',
        status: '初登場',
        level: '未知',
        traits: typeof generatedChar === 'string' ? generatedChar : JSON.stringify(generatedChar)
      };

      try {
        if (typeof generatedChar === 'string') {
          const jsonMatch = (generatedChar as string).match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            newCharData = { ...newCharData, ...parsed };
          }
        } else if (generatedChar && typeof generatedChar === 'object') {
          newCharData = { ...newCharData, ...generatedChar };
        }
      } catch (e) {
        console.warn("Failed to parse AI char", e);
      }

      const newId = await addCharacter();
      if (newId && typeof newId === 'string') { // Checking just in case
        updateCharacter(newId, newCharData);
      }

    } catch (error) {
      alert(getFriendlyErrorMessage(error));
    }
  };

  // Check Auth State
  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  if (isDataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading Novel Data...</div>;
  }

  // 管理後台視圖
  if (currentView === 'admin' && userRole === 'admin') {
    return (
      <AdminDashboard
        onBack={() => setCurrentView('home')}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // AI 對話視圖
  if (currentView === 'chat') {
    return (
      <ChatPage
        onBack={() => setCurrentView('home')}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // 顯示主頁面
  if (currentView === 'home') {
    // 統計數據從 novels 列表彙總
    const totalWords = novels.reduce((sum, n) => sum + n.wordCount, 0);
    const totalChapters = novels.reduce((sum, n) => sum + n.chapterCount, 0);

    return (
      <>
        <HomePage
          novels={novels}
          onCreateNovel={() => setIsSetupWizardOpen(true)}
          onOpenNovel={async (novelId) => {
            await switchNovel(novelId);
            setCurrentView('editor');
          }}
          onDeleteNovel={deleteNovel}
          onRenameNovel={renameNovel}
          userName={session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'Writer'}
          userRole={userRole}
          userEmail={session?.user?.email || ''}
          userId={session?.user?.id || ''}
          accessToken={session?.access_token || ''}
          stats={{
            totalWords,
            totalChapters,
            writingStreak: 0,
            achievements: 0
          }}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={() => supabase.auth.signOut()}
          onOpenUserSettings={() => setIsUserSettingsOpen(true)}
          onOpenAdmin={() => setCurrentView('admin')}
          onOpenChat={() => setCurrentView('chat')}
        />

        {/* Novel Setup Wizard */}
        <NovelSetupWizard
          isOpen={isSetupWizardOpen}
          onClose={() => setIsSetupWizardOpen(false)}
          onComplete={async (wizardSettings) => {
            try {
              const newId = await createNovel(wizardSettings.title || '未命名小說', wizardSettings);
              if (newId) {
                await switchNovel(newId);
                setCurrentView('editor');
                setIsSetupWizardOpen(false);
              } else {
                throw new Error('創建小說失敗，請檢查網路連線或重試');
              }
            } catch (err: any) {
              console.error('[App] createNovel failed:', err);
              throw err;
            }
          }}
        />

        {/* User Settings Modal */}
        {session?.user && (
          <UserSettingsModal
            isOpen={isUserSettingsOpen}
            onClose={() => setIsUserSettingsOpen(false)}
            userId={session.user.id}
          />
        )}
      </>
    );
  }

  // 編輯器視圖
  if (!currentChapter && volumes.length === 0) {
    // Handle edge case where no chapters exist (and no volumes)
    return (
      <div className="flex h-screen bg-white text-slate-800 font-sans items-center justify-center">
        <div className="text-center">
          <p className="mb-4">尚無章節</p>
          <button onClick={() => addVolume()} className="px-4 py-2 bg-violet-600 text-white rounded">建立第一卷</button>
        </div>
      </div>
    );
  }

  // Safe fallback if currentChapter is null but volumes exist (e.g. invalid ID)
  // The useEffect above should handle this, but for render safety:
  const safeChapter = currentChapter || { id: 'dummy', title: '', content: '', outline: '', lastModified: 0 };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 font-sans overflow-hidden relative transition-colors duration-200">
      <Sidebar
        theme={theme}
        toggleTheme={toggleTheme}
        volumes={volumes}
        currentChapterId={currentChapterId}
        onSelectChapter={setCurrentChapterId}
        onAddChapter={async (volId) => {
          const newId = await addChapter(volId);
          if (newId) setCurrentChapterId(newId);
        }}
        onAddVolume={addVolume}
        onUpdateVolume={(id, title) => updateVolumeTitle(id, title)}
        onDeleteVolume={(volId) => {
          setConfirmModal({
            isOpen: true,
            title: "刪除分卷",
            message: "確定要刪除此分卷及其所有章節嗎？此動作無法復原。",
            isDestructive: true,
            onConfirm: async () => {
              await deleteVolume(volId);
            }
          });
        }}
        onDeleteChapter={(chapterId) => {
          setConfirmModal({
            isOpen: true,
            title: "刪除章節",
            message: "確定要刪除此章節嗎？此動作無法復原，請確認。",
            isDestructive: true,
            onConfirm: async () => {
              await deleteChapter(chapterId);
              if (chapterId === currentChapterId) {
                const allChapters = volumes.flatMap(v => v.chapters);
                // After deletion, the state updates. We try to find a safe fallback.
                // Since this runs before re-render, we look at current snapshot.
                const remaining = allChapters.filter(c => c.id !== chapterId);
                if (remaining.length > 0) {
                  setCurrentChapterId(remaining[0].id);
                } else {
                  // No chapters left? logic handled by render
                }
              }
            }
          });
        }}
        userEmail={session?.user?.email}
        userName={session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'Writer'}
        userRole={userRole}
        userId={session?.user?.id || ''}
        accessToken={session?.access_token || ''}
        onLogout={() => supabase.auth.signOut()}
        onOpenBackground={() => setIsBackgroundOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUserSettings={() => setIsUserSettingsOpen(true)}
        onBackToHome={() => setCurrentView('home')}
        novelTitle={settings.title}
      />

      <main className="flex-1 flex relative">
        {currentChapter ? (
          <Editor
            chapter={currentChapter}
            onUpdate={(updated) => updateChapter(currentChapter.id, updated)}
            onAiAction={handleAiAction}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">請選擇章節</div>
        )}

        <AssistantPanel
          characters={characters}
          vocabularies={vocabularies}
          settings={settings}
          volumes={volumes}
          currentChapter={currentChapter || safeChapter as Chapter}
          isGenerating={isGenerating}
          onUpdateSettings={updateSettings}
          onUpdateChapter={(c) => updateChapter(c.id, c)}
          onAddCharacter={addCharacter}
          onAiCreateCharacter={handleAiCreateCharacter}
          onUpdateCharacter={updateCharacter}
          onDeleteCharacter={deleteCharacter}
          onAddVocabulary={addVocabulary}
          onUpdateVocabulary={updateVocabulary}
          onDeleteVocabulary={deleteVocabulary}
          onGenerate={handleGenerate}
          onStopGeneration={handleStopGeneration}
          onImportData={importData}
        />
      </main>

      {/* AI Review Modal */}
      <AiReviewModal
        isOpen={!!pendingAiContent || (isGenerating && !!lastGenParams)}
        isGenerating={isGenerating}
        content={pendingAiContent || ''}
        onAccept={handleAcceptAiContent}
        onDiscard={() => {
          if (isGenerating) {
            handleStopGeneration();
          } else {
            setPendingAiContent(null);
          }
        }}
        onRegenerate={handleRegenerate}
      />

      {/* Chapter Briefing/Critique Modal */}
      <ChapterReviewModal
        isOpen={isReviewModalOpen}
        title={reviewTitle}
        content={reviewContent}
        isLoading={isReviewLoading}
        onClose={() => setIsReviewModalOpen(false)}
        onRegenerate={(force = false) => {
          if (reviewAction === 'critique') {
            performCritiqueGeneration(force);
          } else {
            performBriefingGeneration();
          }
        }}
        displayMode={reviewAction === 'critique' ? 'structured' : 'plain'}
        editableContent={currentChapter?.content || ''}
        onContentChange={(newContent) => {
          if (currentChapter) {
            updateChapter(currentChapter.id, { content: newContent });
          }
        }}
        chapterTitle={currentChapter?.title || ''}
        settings={settings}
      />


      {/* AI味檢測 Modal */}
      {isAiTasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border border-emerald-100 dark:border-emerald-900/50">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">AI味檢測</h3>
                {aiTasteResult && (
                  <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold ${
                    aiTasteResult.score <= 30 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    aiTasteResult.score <= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>{aiTasteResult.score} 分</span>
                )}
              </div>
              <button onClick={() => { setIsAiTasteModalOpen(false); setAiTasteResult(null); }} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-gray-900">
              {aiTasteLoading ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600"></div>
                  <p className="text-sm font-medium animate-pulse">正在檢測AI味...</p>
                </div>
              ) : aiTasteResult ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className={`p-4 rounded-xl border ${
                    aiTasteResult.score <= 30 ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' :
                    aiTasteResult.score <= 60 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800' :
                    'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                  }`}>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{aiTasteResult.summary}</p>
                  </div>

                  {/* Issues */}
                  {aiTasteResult.issues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">檢測到 {aiTasteResult.issues.length} 個問題：</p>
                      {aiTasteResult.issues.map((issue, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1.5">
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">「{issue.text}」</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{issue.reason}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">→ {issue.fix}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            {aiTasteResult && (
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <button
                  onClick={() => { setIsAiTasteModalOpen(false); setAiTasteResult(null); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >關閉</button>
                <button
                  onClick={handleAiTasteRewrite}
                  disabled={aiTasteRewriting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {aiTasteRewriting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>改寫中...</>
                  ) : (
                    <>✨ 一鍵去AI味</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Background Modal */}
      <BackgroundModal
        isOpen={isBackgroundOpen}
        onClose={() => setIsBackgroundOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      <NovelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* User Settings Modal */}
      {session?.user && (
        <UserSettingsModal
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          userId={session.user.id}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
      />

      {/* 記憶提取確認彈窗 */}
      {memoryConfirmData && (
        <MemoryConfirmModal
          isOpen={memoryConfirmOpen}
          extracted={memoryConfirmData}
          chapterIndex={memoryConfirmChapterIndex}
          isSaving={memoryConfirmSaving}
          onConfirm={async (edited) => {
            console.log("[MemoryConfirm] onConfirm called, novelId:", novelId, "chapterId:", memoryConfirmChapterId);
            if (!novelId) {
              console.error("[MemoryConfirm] novelId is null, aborting save");
              alert("無法儲存：novelId 為空");
              return;
            }
            setMemoryConfirmSaving(true);
            try {
              console.log("[MemoryConfirm] Calling saveConfirmedMemory...");
              await saveConfirmedMemory({
                novelId,
                chapterId: memoryConfirmChapterId,
                chapterIndex: memoryConfirmChapterIndex,
                extracted: edited
              });
              console.log("[MemoryConfirm] Save success, updating character cards...");
              // 更新前端角色卡（找不到則自動建立）
              if (edited.character_snapshots) {
                for (const snap of edited.character_snapshots) {
                  const char = characters.find(c => c.name === snap.name);
                  const dynamicFields = {
                    currentLocation: snap.location || undefined,
                    currentPowerLevel: snap.power_level || undefined,
                    currentEmotionalState: snap.emotional_state || undefined,
                    currentInjuries: snap.injuries || undefined,
                    currentPossessions: snap.possessions || undefined,
                    statusUpdatedAtChapter: memoryConfirmChapterIndex,
                  };
                  if (char) {
                    updateCharacter(char.id, dynamicFields);
                  } else {
                    await addCharacter({
                      name: snap.name,
                      role: snap.role || '配角',
                      level: snap.power_level || '',
                      ...dynamicFields,
                    });
                  }
                }
              }
            } catch (e: any) {
              console.error("儲存記憶失敗:", e.message);
              alert("儲存記憶失敗: " + e.message);
            } finally {
              setMemoryConfirmSaving(false);
              setMemoryConfirmOpen(false);
              setMemoryConfirmData(null);
            }
          }}
          onSkip={() => {
            setMemoryConfirmOpen(false);
            setMemoryConfirmData(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
