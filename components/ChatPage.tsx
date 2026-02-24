import React, { useEffect, useState } from 'react';
import { ArrowLeft, Moon, Sun, Menu } from 'lucide-react';
import { ChatSidebar } from './chat/ChatSidebar';
import { ChatMessageArea } from './chat/ChatMessageArea';
import { useChatData } from '../hooks/useChatData';

interface Props {
  onBack: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ChatPage: React.FC<Props> = ({ onBack, theme, toggleTheme }) => {
  const {
    conversations, activeConvId, messages, isStreaming, isLoadingMessages,
    streamingContent, selectedModel, setSelectedModel, chatMode, setChatMode,
    loadConversations, selectConversation, createConversation,
    deleteConv, renameConv, togglePin, sendMessage, stopStreaming,
    regenerate, editAndResend
  } = useChatData();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // 選擇對話後自動收起側邊欄（行動裝置）
  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 relative">
      {/* 行動裝置遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左側對話列表 */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:w-auto md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          onSelect={handleSelectConversation}
          onCreate={createConversation}
          onDelete={deleteConv}
          onRename={renameConv}
          onTogglePin={togglePin}
        />
      </div>

      {/* 右側聊天區 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 導航欄 */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all md:hidden"
            title="對話列表"
          >
            <Menu size={18} />
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 transition-colors"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">返回首頁</span>
          </button>
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title={theme === 'dark' ? '淺色模式' : '深色模式'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* 訊息區域 */}
        <ChatMessageArea
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          chatMode={chatMode}
          onModeChange={setChatMode}
          onSend={sendMessage}
          onStop={stopStreaming}
          onRegenerate={regenerate}
          onEditResend={editAndResend}
          conversationTitle={activeConv?.title}
          isLoadingMessages={isLoadingMessages}
        />
      </div>
    </div>
  );
};
