import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, RefreshCw, Pencil, X, Send } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../types';

// 程式碼區塊元件（含語法高亮 + 複製按鈕）

// 相對時間格式化
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) {
    const today = new Date(); today.setHours(0,0,0,0);
    if (date >= today) return `今天 ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    return `昨天 ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  }
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0,0,0,0);
  if (date >= yesterday) return `昨天 ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  return `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
}

// 程式碼區塊元件
const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(children);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };
  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-gray-800 text-gray-400 text-xs px-4 py-1.5 rounded-t-lg">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {codeCopied ? <><Check size={12} /> 已複製</> : <><Copy size={12} /> 複製</>}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, fontSize: '0.85rem' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditResend?: (messageId: string, newContent: string) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, isStreaming, onRegenerate, onEditResend }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setEditText(message.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const submitEdit = () => {
    if (editText.trim() && onEditResend) {
      onEditResend(message.id, editText.trim());
      setIsEditing(false);
      setEditText('');
    }
  };

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
          AI
        </div>
      )}

      <div className={`max-w-[75%] ${isEditing ? 'w-full max-w-[75%]' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
        }`}>
          {/* 圖片預覽 */}
          {isUser && message.image_urls && message.image_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.image_urls.map((url, i) => (
                <img key={i} src={url} alt="" className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
              ))}
            </div>
          )}

          {isUser ? (
            isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full bg-violet-700 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/50 placeholder-violet-300"
                  rows={Math.min(editText.split('\n').length + 1, 8)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-violet-700 hover:bg-violet-800 text-white/70 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                  <button onClick={submitEdit} disabled={!editText.trim()} className="p-1.5 rounded-lg bg-white text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )
          ) : (
            <div className="text-sm max-w-none [&_code]:text-violet-600 [&_code]:dark:text-violet-400 [&_code]:bg-gray-200 [&_code]:dark:bg-gray-700 [&_code]:px-1 [&_code]:rounded">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeStr = String(children).replace(/\n$/, '');
                    if (match) {
                      return <CodeBlock language={match[1]}>{codeStr}</CodeBlock>;
                    }
                    return <code className={className} {...props}>{children}</code>;
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border-collapse text-sm">{children}</table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead className="bg-gray-200 dark:bg-gray-700">{children}</thead>;
                  },
                  th({ children }) {
                    return <th className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-200">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-gray-700 dark:text-gray-300">{children}</td>;
                  },
                  tr({ children }) {
                    return <tr className="even:bg-gray-50 dark:even:bg-gray-800/50">{children}</tr>;
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-bold mt-3 mb-1.5 text-gray-800 dark:text-gray-100">{children}</h3>;
                  },
                  hr() {
                    return <hr className="my-3 border-gray-200 dark:border-gray-700" />;
                  },
                  strong({ children }) {
                    return <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>;
                  },
                  blockquote({ children }) {
                    return <blockquote className="border-l-3 border-violet-400 pl-3 my-2 text-gray-600 dark:text-gray-400 italic">{children}</blockquote>;
                  },
                  a({ href, children }) {
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline hover:text-violet-800 dark:hover:text-violet-300">{children}</a>;
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>

        {/* 操作按鈕列 */}
        <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {/* 時間戳 */}
          {message.created_at && !message.id.startsWith('streaming') && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
              {formatRelativeTime(message.created_at)}
            </span>
          )}
          {/* AI 訊息：複製 + 重新生成 */}
          {!isUser && !isStreaming && message.content && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? '已複製' : '複製'}
              </button>
              {onRegenerate && (
                <button onClick={() => onRegenerate(message.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <RefreshCw size={12} />
                  重新生成
                </button>
              )}
            </>
          )}
          {/* 用戶訊息：編輯 */}
          {isUser && !isStreaming && !isEditing && onEditResend && (
            <button onClick={startEdit} className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-500 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Pencil size={12} />
              編輯
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
          你
        </div>
      )}
    </div>
  );
};
