
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { AssistantPanel } from './components/AssistantPanel';
import { AiReviewModal } from './components/AiReviewModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ChapterReviewModal } from './components/ChapterReviewModal';
import { AuthPage } from './components/AuthPage';
import { supabase } from './lib/supabase';
import { generateStoryContent, generateOutline, generateCharacterProfile, generateChapterBriefing, generateCritique } from './services/geminiService';
import { Chapter, Character, NovelSettings, Volume, Vocabulary, AIRequestParams, EditorActionType } from './types';
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

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
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
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Hook handles data loading & syncing
  const {
    loading: isDataLoading,
    settings, updateSettings,
    volumes, updateVolumeTitle, addVolume, deleteVolume,
    addChapter, updateChapter, deleteChapter,
    characters, addCharacter, updateCharacter, deleteCharacter,
    vocabularies, addVocabulary, updateVocabulary, deleteVocabulary
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
  const buildContextFromChapters = (chapters: Chapter[]): string => {
    if (chapters.length === 0) return "無前情提要。";
    return chapters.map(chap => {
      return chap.briefing
        ? `[${chap.title} 簡報]:\n${chap.briefing}`
        : chap.outline
          ? `[${chap.title} 大綱]:\n${chap.outline}`
          : `[${chap.title} 內容片段]:\n${chap.content.slice(0, 1000)}...`;
    }).join('\n\n');
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

    // 1. Prepare Reference Chapters
    const allChapters = volumes.flatMap(v => v.chapters);
    let refChapters = allChapters.filter(c => selectedRefChapterIds.includes(c.id));

    // 2. Intelligent Context: Check for missing briefings and generate on-the-fly
    const chaptersNeedingBriefing = refChapters.filter(c => !c.briefing && c.content && c.content.length > 50);

    if (chaptersNeedingBriefing.length > 0) {
      try {
        const newBriefingsData = await Promise.all(chaptersNeedingBriefing.map(async (c) => {
          const briefing = await generateChapterBriefing(c.content, c.title, model);
          return { id: c.id, briefing };
        }));

        // Update local state and DB via hook
        newBriefingsData.forEach(nb => {
          updateChapter(nb.id, { briefing: nb.briefing });
        });

        // Update local ref list for this call
        refChapters = refChapters.map(c => {
          const update = newBriefingsData.find(nb => nb.id === c.id);
          return update ? { ...c, briefing: update.briefing } : c;
        });

      } catch (e) {
        console.error("Auto-generation of briefings failed, proceeding with raw content.", e);
      }
    }

    // 3. Build Context
    const storyContext = refChapters.length > 0
      ? buildContextFromChapters(refChapters)
      : "未選擇參考章節 (無前情提要)";

    const params: AIRequestParams = {
      chapter: currentChapter,
      characters: activeCharacters,
      vocabularies: activeVocab,
      settings: settings,
      instructions: instruction,
      requirements: requirements,
      relations: relations,
      previousContext: storyContext,
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
      const briefing = await generateChapterBriefing(currentChapter.content, currentChapter.title, "Gemini 2.5");
      setReviewContent(briefing);
      updateChapter(currentChapter.id, { briefing: briefing });
    } catch (e: any) {
      setReviewContent(getFriendlyErrorMessage(e));
    } finally {
      setIsReviewLoading(false);
    }
  };

  const performCritiqueGeneration = async () => {
    if (!currentChapter) return;
    if (!currentChapter.content || currentChapter.content.length < 50) {
      alert("章節內容過少，無法生成點評。");
      return;
    }
    setIsReviewLoading(true);
    setReviewTitle('AI 文章點評');
    setReviewAction('critique');
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
    } catch (e: any) {
      setReviewContent(getFriendlyErrorMessage(e));
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleAiAction = async (action: EditorActionType) => {
    if (!currentChapter) return;

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
      model: "Gemini 2.5",
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
        params.instructions = "請根據上文，繼續撰寫接下來的劇情發展，約300-500字。";
        break;
      case 'expand':
        params.instructions = "請針對上文中最後一個場景進行「擴寫」，增加感官描寫、環境細節與心理活動，使其更具沉浸感。";
        break;
      case 'split':
        params.instructions = "請對本文進行「拆書」分析。1. 分析敘事節奏(Beat)。2. 標出關鍵情節點。3. 建議的分段點。";
        break;
      case 'fix':
        params.instructions = "請擔任校對編輯，檢查本文的錯別字、語病與邏輯矛盾。請列出修改建議，並提供一段修改後的版本。";
        break;
      case 'humanize':
        params.instructions = "請將本文內容進行「擬人化」潤飾。運用更自然且多變的句式，模擬人類作家的筆觸，以增加情感深度與不完美的真實感。請重寫上文的最後一段或相關部分。";
        break;
      default:
        return;
    }

    await performGeneration(params);
  };

  const handleAcceptAiContent = (finalContent: string) => {
    if (!currentChapter) return;
    const separator = currentChapter.content ? '\n\n' : '';
    updateChapter(currentChapter.id, { content: currentChapter.content + separator + finalContent });
    setPendingAiContent(null);
  };

  const handleRegenerate = async () => {
    if (lastGenParams) {
      await performGeneration(lastGenParams);
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
    <div className="flex h-screen bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 font-sans overflow-hidden relative transition-colors duration-200">
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
        userRole={userRole}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="flex-1 flex overflow-hidden relative">
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
        onRegenerate={() => {
          if (reviewAction === 'critique') {
            performCritiqueGeneration();
          } else {
            performBriefingGeneration();
          }
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
};

export default App;
