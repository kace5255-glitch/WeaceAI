import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, ChevronDown } from 'lucide-react';
import { ChatMessage as ChatMessageType, ChatMode } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput, AttachedFile } from './ChatInput';

const MODELS = [
  'Google Flash',
  'Google Pro',
  'DeepSeek R1',
  'DeepSeek V3.2',
  'Claude Sonnet',
  'Claude Opus',
  'Qwen3-Max',
  'Qwen3-Plus',
];

const MODES: { value: ChatMode; label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'expert', label: '專業諮詢' },
  { value: 'developer', label: '編程技術' },
  { value: 'staff', label: '文件處理' },
  { value: 'peer', label: '閒聊' },
];

interface Props {
  messages: ChatMessageType[];
  streamingContent: string;
  isStreaming: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSend: (content: string, imageUrls?: string[], files?: AttachedFile[]) => void;
  onStop: () => void;
  onRegenerate?: (messageId: string) => void;
  onEditResend?: (messageId: string, newContent: string) => void;
  conversationTitle?: string;
  isLoadingMessages?: boolean;
}

export const ChatMessageArea: React.FC<Props> = ({
  messages, streamingContent, isStreaming, selectedModel,
  onModelChange, chatMode, onModeChange, onSend, onStop, onRegenerate, onEditResend, conversationTitle, isLoadingMessages
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isNearBottomRef = useRef(true);

  // 監聽捲動位置
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottomRef.current = distanceFromBottom < 200;
    setShowScrollBtn(distanceFromBottom > 200);
  }, []);

  // 自動滾動：只在用戶已在底部時才自動捲動
  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 頂部欄 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
          {conversationTitle || '新對話'}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">模式：</span>
          <select
            value={chatMode}
            onChange={e => onModeChange(e.target.value as ChatMode)}
            className="text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span className="text-xs text-gray-400">模型：</span>
          <select
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            className="text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* 訊息列表 */}
      <div className="relative flex-1">
        <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto bg-gray-50/50 dark:bg-gray-950/50">
        {isLoadingMessages ? (
          <div className="py-4 space-y-4 px-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />}
                <div className={`rounded-2xl px-4 py-3 space-y-2 ${i % 2 === 0 ? 'bg-violet-200 dark:bg-violet-900/30 w-[45%]' : 'bg-gray-200 dark:bg-gray-700 w-[60%]'}`}>
                  <div className="h-3 rounded bg-gray-300 dark:bg-gray-600 w-full" />
                  <div className="h-3 rounded bg-gray-300 dark:bg-gray-600 w-3/4" />
                  {i % 2 !== 0 && <div className="h-3 rounded bg-gray-300 dark:bg-gray-600 w-1/2" />}
                </div>
                {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />}
              </div>
            ))}
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
              <Bot size={32} className="text-violet-500" />
            </div>
            <p className="text-sm font-medium">開始一段新對話</p>
            <p className="text-xs">選擇模型，輸入訊息即可開始</p>
          </div>
        ) : (
          <div className="py-4">
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRegenerate={!isStreaming ? onRegenerate : undefined}
                onEditResend={!isStreaming ? onEditResend : undefined}
              />
            ))}
            {/* 串流中的訊息 */}
            {isStreaming && streamingContent && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  conversation_id: '',
                  role: 'assistant',
                  content: streamingContent,
                  image_urls: [],
                  model: selectedModel,
                  created_at: new Date().toISOString()
                }}
                isStreaming
              />
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  AI
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* 捲動到最新按鈕 */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <ChevronDown size={14} />
            最新訊息
          </button>
        )}
      </div>

      {/* 輸入欄 */}
      <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
    </div>
  );
};
