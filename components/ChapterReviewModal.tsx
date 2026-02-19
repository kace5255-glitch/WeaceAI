import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Copy, Check, RefreshCw, MessageSquare, SplitSquareHorizontal, PanelLeftClose } from 'lucide-react';
import { parseCritique, CritiqueData } from '../utils/critiqueParser';
import { CritiqueStructuredDisplay } from './critique/CritiqueStructuredDisplay';
// import { ImprovementPreviewModal } from './ImprovementPreviewModal'; // Removed
import { locateIssues, IssueLocation } from '../services/aiFixService';
import { IssueNavigator } from './critique/IssueNavigator';

interface ChapterReviewModalProps {
  isOpen: boolean;
  title?: string;
  content: string;
  isLoading: boolean;
  onClose: () => void;
  onRegenerate: (force?: boolean) => void;
  displayMode?: 'plain' | 'structured';
  editableContent?: string;
  onContentChange?: (newContent: string) => void;
  chapterTitle?: string;
  settings?: {
    title: string;
    genre: string;
    style: string;
    tone: string;
    worldview?: string;
  };
}

export const ChapterReviewModal: React.FC<ChapterReviewModalProps> = ({
  isOpen,
  title = "章節智能簡報",
  content,
  isLoading,
  onClose,
  onRegenerate,
  displayMode = 'plain',
  editableContent = '',
  onContentChange,
  chapterTitle = '',
  settings
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'review' | 'split'>('review');
  const [localEditContent, setLocalEditContent] = useState(editableContent);
  const [parsedContent, setParsedContent] = useState<CritiqueData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Issue Locator State
  const [locatorState, setLocatorState] = useState<{
    isLoading: boolean;
    issues: IssueLocation[];
    showNavigator: boolean;
  }>({
    isLoading: false,
    issues: [],
    showNavigator: false
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse content when it changes
  useEffect(() => {
    if (content && displayMode === 'structured' && title.includes('點評')) {
      const parsed = parseCritique(content);
      setParsedContent(parsed);
    }
  }, [content, displayMode, title]);

  // Sync editable content
  useEffect(() => {
    setLocalEditContent(editableContent);
  }, [editableContent]);

  // Handle content change with debounced save
  useEffect(() => {
    if (viewMode === 'split' && localEditContent !== editableContent) {
      setIsSaving(true);
      const timer = setTimeout(() => {
        onContentChange?.(localEditContent);
        setIsSaving(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [localEditContent, viewMode, editableContent, onContentChange]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle "Locate Issue" click
  const handleLocateSuggestion = async (suggestion: string) => {
    if (!settings) return;

    // Switch to split view automatically
    if (viewMode !== 'split') setViewMode('split');

    setLocatorState(prev => ({ ...prev, isLoading: true, showNavigator: true, issues: [] }));

    try {
      const issues = await locateIssues({
        suggestion,
        chapterContent: localEditContent || editableContent,
        settings: {
          title: settings.title,
          genre: settings.genre
        }
      });
      setLocatorState(prev => ({ ...prev, isLoading: false, issues }));
    } catch (error) {
      console.error("Failed to locate issues:", error);
      alert("無法定位問題段落，請稍後再試。");
      setLocatorState(prev => ({ ...prev, isLoading: false, showNavigator: false }));
    }
  };

  // Navigate to specific issue in textarea
  const handleNavigateToIssue = (quote: string) => {
    if (!textareaRef.current || !localEditContent) return;

    const index = localEditContent.indexOf(quote);
    if (index !== -1) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(index, index + quote.length);

      // Calculate scroll position (approximate)
      const lineHeight = 24; // approx px
      const linesBefore = localEditContent.substring(0, index).split('\n').length;
      const scrollPos = (linesBefore - 2) * lineHeight; // Scroll a bit above

      textareaRef.current.scrollTop = scrollPos > 0 ? scrollPos : 0;
    } else {
      alert("無法在當前文本中找到該段落（可能已被修改）");
    }
  };

  const closeNavigator = () => {
    setLocatorState(prev => ({ ...prev, showNavigator: false }));
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className={`
        bg-white dark:bg-gray-800 rounded-2xl shadow-2xl 
        ${viewMode === 'split' ? 'w-full max-w-[95vw]' : 'w-full max-w-3xl'}
        flex flex-col max-h-[85vh] overflow-hidden border border-indigo-100 dark:border-indigo-900/50 ring-4 ring-indigo-500/10 dark:ring-indigo-500/20 transition-all duration-300
      `}>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-50/50 dark:bg-gray-800/80 transition-colors">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                {title.includes('點評') ? <MessageSquare size={20} className="text-indigo-600 dark:text-indigo-400" /> : <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />}
              </div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 font-serif">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Split view toggle */}
              {displayMode === 'structured' && title.includes('點評') && editableContent && (
                <button
                  onClick={() => setViewMode(viewMode === 'review' ? 'split' : 'review')}
                  className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
                >
                  {viewMode === 'review' ? (
                    <>
                      <SplitSquareHorizontal size={14} />
                      邊看邊改
                    </>
                  ) : (
                    <>
                      <PanelLeftClose size={14} />
                      僅查看點評
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === 'split' ? (
            // Split view
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Critique Content */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-6 bg-white dark:bg-gray-900 transition-colors">
                {isLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-sm font-medium animate-pulse text-indigo-400">AI 正在分析內容...</p>
                  </div>
                ) : displayMode === 'structured' && parsedContent ? (
                  <CritiqueStructuredDisplay
                    content={parsedContent}
                    onLocateSuggestion={handleLocateSuggestion}
                  />
                ) : (
                  <div className="prose prose-indigo dark:prose-invert max-w-none">
                    <div className="bg-slate-50 dark:bg-gray-800 p-8 rounded-xl border border-slate-100 dark:border-gray-700 text-slate-800 dark:text-gray-200 font-serif text-lg leading-loose shadow-sm">
                      {content.split('\n').map((paragraph, idx) => {
                        if (!paragraph.trim()) return <br key={idx} />;
                        return (
                          <p key={idx} className="mb-4 text-justify" style={{ textIndent: '2em' }}>
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Editor */}
              <div className="w-1/2 relative flex flex-col bg-gray-50 dark:bg-gray-900/50">
                {/* Issue Navigator Overlay */}
                {locatorState.showNavigator && (
                  <div className="absolute top-4 right-4 left-4 z-20">
                    <IssueNavigator
                      issues={locatorState.issues}
                      isLoading={locatorState.isLoading}
                      onNavigate={handleNavigateToIssue}
                      onClose={closeNavigator}
                    />
                  </div>
                )}

                <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">實時編輯</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">修改會自動同步</p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isSaving ? '💾 保存中...' : '✓ 已保存'}
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={localEditContent}
                  onChange={(e) => setLocalEditContent(e.target.value)}
                  className="flex-1 w-full p-6 bg-transparent resize-none focus:outline-none text-gray-700 dark:text-gray-200 font-sans text-sm leading-relaxed"
                  placeholder="章節內容..."
                />
              </div>
            </div>
          ) : (
            // Single column view
            <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-gray-900 transition-colors">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : displayMode === 'structured' && parsedContent ? (
                <CritiqueStructuredDisplay content={parsedContent} />
              ) : (
                <div className="prose prose-indigo dark:prose-invert max-w-none">
                  <div className="bg-slate-50 dark:bg-gray-800 p-8 rounded-xl border border-slate-100 dark:border-gray-700 text-slate-800 dark:text-gray-200 font-serif text-lg leading-loose shadow-sm">
                    {content.split('\n').map((paragraph, idx) => {
                      if (!paragraph.trim()) return <br key={idx} />;
                      return (
                        <p key={idx} className="mb-4 text-justify" style={{ textIndent: '2em' }}>
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-3 transition-colors">
            <button
              onClick={() => onRegenerate(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              重新生成
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "已複製" : "複製內容"}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 text-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
