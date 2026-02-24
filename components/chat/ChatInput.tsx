import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X, Square, FileText } from 'lucide-react';

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
  isImage: boolean;
}

interface Props {
  onSend: (content: string, imageUrls?: string[], files?: AttachedFile[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<Props> = ({ onSend, onStop, isStreaming, disabled }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageAttachments = attachments.filter(a => a.isImage);
  const fileAttachments = attachments.filter(a => !a.isImage);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    const imgUrls = imageAttachments.map(a => a.dataUrl);
    onSend(
      text.trim(),
      imgUrls.length > 0 ? imgUrls : undefined,
      fileAttachments.length > 0 ? fileAttachments : undefined
    );
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`檔案 ${file.name} 超過 10MB 限制`);
        continue;
      }
      const isImage = file.type.startsWith('image/');
      if (isImage && imageAttachments.length >= 4) {
        alert('最多上傳 4 張圖片');
        continue;
      }
      if (isImage && file.size > 4 * 1024 * 1024) {
        alert(`圖片 ${file.name} 超過 4MB 限制`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string,
          isImage
        }]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [imageAttachments.length]);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Ctrl+V 貼上圖片
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        if (imageAttachments.length >= 4) {
          alert('最多上傳 4 張圖片');
          return;
        }
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > 4 * 1024 * 1024) {
          alert('圖片超過 4MB 限制');
          continue;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => [...prev, {
            name: `paste-${Date.now()}.png`,
            type: file.type,
            dataUrl: reader.result as string,
            isImage: true
          }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [imageAttachments.length]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.isImage ? (
                <img src={att.dataUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-1 px-1">
                  <FileText size={16} className="text-violet-500" />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">{att.name.length > 8 ? att.name.slice(0, 6) + '...' : att.name}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.txt,.md,.json,.csv,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isStreaming}
          className="p-2 text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors disabled:opacity-40"
          title="上傳檔案或圖片"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="輸入訊息... (Enter 發送，Shift+Enter 換行)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
          style={{ maxHeight: '200px' }}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
            title="停止生成"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="發送"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export type { AttachedFile };
