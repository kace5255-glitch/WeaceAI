import React, { useState, useMemo } from 'react';
import { Plus, Search, Pin, PinOff, Trash2, Edit3, Check, X, MessageSquare } from 'lucide-react';
import { ChatConversation } from '../../types';

interface Props {
  conversations: ChatConversation[];
  activeConvId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
}

export const ChatSidebar: React.FC<Props> = ({
  conversations, activeConvId, onSelect, onCreate, onDelete, onRename, onTogglePin
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  // 按日期分組
  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const pinned = filtered.filter(c => c.pinned);
    const unpinned = filtered.filter(c => !c.pinned);

    const todayItems = unpinned.filter(c => new Date(c.updated_at).getTime() >= today);
    const yesterdayItems = unpinned.filter(c => {
      const t = new Date(c.updated_at).getTime();
      return t >= yesterday && t < today;
    });
    const olderItems = unpinned.filter(c => new Date(c.updated_at).getTime() < yesterday);

    return { pinned, todayItems, yesterdayItems, olderItems };
  }, [filtered]);

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  };
  const confirmEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const ConvItem = ({ conv }: { conv: ChatConversation }) => {
    const isActive = conv.id === activeConvId;
    const isEditing = editingId === conv.id;

    return (
      <div
        onClick={() => !isEditing && onSelect(conv.id)}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
          isActive
            ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}
      >
        <MessageSquare size={16} className="shrink-0" />
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmEdit()}
              className="flex-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
            <button onClick={(e) => { e.stopPropagation(); confirmEdit(); }} className="text-green-500"><Check size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-gray-400"><X size={14} /></button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm truncate">{conv.title}</span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); onTogglePin(conv.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title={conv.pinned ? '取消釘選' : '釘選'}>
                {conv.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); startEdit(conv.id, conv.title); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="重命名">
                <Edit3 size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('確定刪除此對話？')) onDelete(conv.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 rounded" title="刪除">
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
  );

  return (
    <div className="w-[280px] h-full flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      {/* 頂部 */}
      <div className="p-3 space-y-2">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> 新對話
        </button>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋對話..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* 對話列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {grouped.pinned.length > 0 && (
          <>
            <SectionLabel label="釘選" />
            {grouped.pinned.map(c => <ConvItem key={c.id} conv={c} />)}
          </>
        )}
        {grouped.todayItems.length > 0 && (
          <>
            <SectionLabel label="今天" />
            {grouped.todayItems.map(c => <ConvItem key={c.id} conv={c} />)}
          </>
        )}
        {grouped.yesterdayItems.length > 0 && (
          <>
            <SectionLabel label="昨天" />
            {grouped.yesterdayItems.map(c => <ConvItem key={c.id} conv={c} />)}
          </>
        )}
        {grouped.olderItems.length > 0 && (
          <>
            <SectionLabel label="更早" />
            {grouped.olderItems.map(c => <ConvItem key={c.id} conv={c} />)}
          </>
        )}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
            {search ? '找不到對話' : '尚無對話'}
          </div>
        )}
      </div>
    </div>
  );
};
