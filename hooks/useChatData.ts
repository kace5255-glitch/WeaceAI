import { useState, useCallback, useRef } from 'react';
import { ChatConversation, ChatMessage, ChatMode } from '../types';
import * as chatApi from '../services/chatService';

export function useChatData() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('Google Flash');
  const [chatMode, setChatMode] = useState<ChatMode>('auto');
  const abortRef = useRef<AbortController | null>(null);

  // 載入對話列表
  const loadConversations = useCallback(async () => {
    try {
      const list = await chatApi.getConversations();
      setConversations(list);
    } catch (e) {
      console.error('載入對話列表失敗:', e);
    }
  }, []);

  // 選擇對話 → 載入訊息
  const selectConversation = useCallback(async (id: string) => {
    setActiveConvId(id);
    setMessages([]);
    setIsLoadingMessages(true);
    try {
      const msgs = await chatApi.getMessages(id);
      setMessages(msgs);
      const conv = conversations.find(c => c.id === id);
      if (conv) setSelectedModel(conv.model);
    } catch (e) {
      console.error('載入訊息失敗:', e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversations]);

  // 新建對話
  const createConversation = useCallback(async () => {
    try {
      const conv = await chatApi.createConversation(undefined, selectedModel);
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      return conv.id;
    } catch (e) {
      console.error('建立對話失敗:', e);
      return null;
    }
  }, [selectedModel]);
  // 刪除對話
  const deleteConv = useCallback(async (id: string) => {
    try {
      await chatApi.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error('刪除對話失敗:', e);
    }
  }, [activeConvId]);

  // 重命名對話
  const renameConv = useCallback(async (id: string, title: string) => {
    try {
      await chatApi.updateConversation(id, { title });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    } catch (e) {
      console.error('重命名失敗:', e);
    }
  }, []);

  // 釘選/取消釘選
  const togglePin = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    const pinned = !conv.pinned;
    try {
      await chatApi.updateConversation(id, { pinned });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned } : c));
    } catch (e) {
      console.error('釘選失敗:', e);
    }
  }, [conversations]);

  // 發送訊息（串流）
  const sendMessage = useCallback(async (content: string, imageUrls?: string[], files?: { name: string; type: string; dataUrl: string; isImage: boolean }[]) => {
    // 將檔案內容附加到訊息中
    let finalContent = content;
    if (files && files.length > 0) {
      for (const file of files) {
        // 解碼 base64 文字檔案內容
        try {
          const base64 = file.dataUrl.split(',')[1];
          const decoded = atob(base64);
          finalContent += `\n\n📎 檔案：${file.name}\n\`\`\`\n${decoded.slice(0, 10000)}\n\`\`\``;
        } catch {
          finalContent += `\n\n📎 檔案：${file.name}（無法解析內容）`;
        }
      }
    }

    if (!finalContent.trim() && (!imageUrls || imageUrls.length === 0)) return;

    let convId = activeConvId;
    // 如果沒有活躍對話，先建立一個
    if (!convId) {
      const newConv = await chatApi.createConversation(undefined, selectedModel);
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      convId = newConv.id;
    }

    // 樂觀添加用戶訊息（顯示用，含檔案名稱提示）
    let displayContent = content;
    if (files && files.length > 0) {
      const fileNames = files.map(f => `📎 ${f.name}`).join('\n');
      displayContent = content ? `${content}\n${fileNames}` : fileNames;
    }
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content: displayContent,
      image_urls: imageUrls || [],
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    const controller = new AbortController();
    abortRef.current = controller;

    let fullContent = '';
    try {
      await chatApi.streamChat(
        { conversationId: convId, message: finalContent, imageUrls, model: selectedModel, mode: chatMode },
        (token) => {
          fullContent += token;
          setStreamingContent(fullContent);
        },
        (messageId) => {
          // 串流完成 → 加入正式 assistant 訊息
          const assistantMsg: ChatMessage = {
            id: messageId || `done-${Date.now()}`,
            conversation_id: convId!,
            role: 'assistant',
            content: fullContent,
            image_urls: [],
            model: selectedModel,
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, assistantMsg]);
          setStreamingContent('');
          setIsStreaming(false);
          // 更新對話列表的 updated_at
          setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
          ));
        },
        (error) => {
          console.error('串流錯誤:', error);
          // 顯示錯誤訊息氣泡
          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            conversation_id: convId!,
            role: 'assistant',
            content: `⚠️ ${error || '生成失敗，請重試'}`,
            image_urls: [],
            model: selectedModel,
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, errorMsg]);
          setStreamingContent('');
          setIsStreaming(false);
        },
        controller.signal,
        (title) => {
          // 自動標題更新
          setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, title } : c
          ));
        }
      );
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('發送失敗:', e);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          conversation_id: convId!,
          role: 'assistant',
          content: `⚠️ 連線失敗：${e.message || '請檢查網路連線後重試'}`,
          image_urls: [],
          model: selectedModel,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [activeConvId, selectedModel, chatMode]);

  // 停止生成
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    if (streamingContent) {
      const partialMsg: ChatMessage = {
        id: `partial-${Date.now()}`,
        conversation_id: activeConvId || '',
        role: 'assistant',
        content: streamingContent,
        image_urls: [],
        model: selectedModel,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, partialMsg]);
      setStreamingContent('');
    }
  }, [activeConvId, selectedModel, streamingContent]);

  // 重新生成 AI 回覆
  const regenerate = useCallback(async (assistantMsgId: string) => {
    if (isStreaming || !activeConvId) return;

    // 找到該 AI 訊息的索引，取前一條用戶訊息
    const idx = messages.findIndex(m => m.id === assistantMsgId);
    if (idx < 0) return;

    // 往前找最近的用戶訊息
    let userMsg: ChatMessage | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { userMsg = messages[i]; break; }
    }
    if (!userMsg) return;

    // 刪除該 AI 訊息（後端）
    try {
      if (!assistantMsgId.startsWith('temp-') && !assistantMsgId.startsWith('done-') && !assistantMsgId.startsWith('partial-')) {
        await chatApi.deleteMessage(assistantMsgId);
      }
    } catch (e) {
      console.error('刪除訊息失敗:', e);
    }

    // 從前端移除該 AI 訊息
    setMessages(prev => prev.filter(m => m.id !== assistantMsgId));

    // 重新串流（skipSaveUser，因為用戶訊息已存在）
    setIsStreaming(true);
    setStreamingContent('');
    const controller = new AbortController();
    abortRef.current = controller;

    let fullContent = '';
    try {
      await chatApi.streamChat(
        { conversationId: activeConvId, message: userMsg.content, imageUrls: userMsg.image_urls, model: selectedModel, skipSaveUser: true, mode: chatMode },
        (token) => { fullContent += token; setStreamingContent(fullContent); },
        (messageId) => {
          const newMsg: ChatMessage = {
            id: messageId || `done-${Date.now()}`,
            conversation_id: activeConvId,
            role: 'assistant',
            content: fullContent,
            image_urls: [],
            model: selectedModel,
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, newMsg]);
          setStreamingContent('');
          setIsStreaming(false);
        },
        (error) => { console.error('重新生成錯誤:', error); setStreamingContent(''); setIsStreaming(false); },
        controller.signal
      );
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('重新生成失敗:', e);
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [activeConvId, selectedModel, messages, isStreaming]);

  // 編輯並重新發送用戶訊息
  const editAndResend = useCallback(async (userMsgId: string, newContent: string) => {
    if (isStreaming || !activeConvId) return;

    const idx = messages.findIndex(m => m.id === userMsgId);
    if (idx < 0) return;

    // 刪除該訊息之後的所有訊息（後端）
    try {
      if (!userMsgId.startsWith('temp-')) {
        await chatApi.deleteMessagesAfter(userMsgId);
        // 也刪除該用戶訊息本身
        await chatApi.deleteMessage(userMsgId);
      }
    } catch (e) {
      console.error('刪除訊息失敗:', e);
    }

    // 前端截斷到該訊息之前
    setMessages(prev => prev.slice(0, idx));

    // 重新發送（會自動儲存新的用戶訊息）
    await sendMessage(newContent);
  }, [activeConvId, selectedModel, messages, isStreaming, sendMessage]);

  return {
    conversations, activeConvId, messages, isLoading, isLoadingMessages, isStreaming,
    streamingContent, selectedModel, setSelectedModel, chatMode, setChatMode,
    loadConversations, selectConversation, createConversation,
    deleteConv, renameConv, togglePin, sendMessage, stopStreaming,
    regenerate, editAndResend
  };
}
