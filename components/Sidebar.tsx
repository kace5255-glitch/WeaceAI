
import React, { useState } from 'react';
import { BookOpen, FileText, Plus, Settings, History, Download, LayoutTemplate, FolderPlus, ChevronRight, ChevronDown, Edit2, LogOut, User, Trash2, ArrowUpDown, Search, Moon, Sun } from 'lucide-react';
import { Volume } from '../types';

interface SidebarProps {
  volumes: Volume[];
  currentChapterId: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: (volumeId: string) => void;
  onAddVolume: () => void;
  onUpdateVolume: (id: string, title: string) => void;
  onDeleteVolume?: (id: string) => void;
  onDeleteChapter: (id: string) => void;
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  volumes,
  currentChapterId,
  onSelectChapter,
  onAddChapter,
  onAddVolume,
  onUpdateVolume,
  onDeleteVolume,
  onDeleteChapter,
  userEmail,
  userRole,
  onLogout,
  theme,
  toggleTheme
}) => {
  // Track expanded volumes. Default all expanded.
  const [expandedVolumes, setExpandedVolumes] = useState<Record<string, boolean>>(
    volumes.reduce((acc, vol) => ({ ...acc, [vol.id]: true }), {})
  );

  const toggleVolume = (id: string) => {
    setExpandedVolumes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);

  // Sort State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sort Logic
  const sortedVolumes = [...volumes].sort((a, b) => {
    // Assuming original validation preserves order, or use index if available.
    // Here we just reverse the array if desc, trusting input order is asc.
    return sortOrder === 'asc' ? 0 : -1;
  });
  // Actually, to properly reverse, we should use the index or just reverse the array if 'desc'. 
  // Since we don't have explicit index prop visible in Volume type here (it's in DB), 
  // Let's assume input 'volumes' is already sorted by index from parent.
  const baseVolumes = sortOrder === 'asc' ? volumes : [...volumes].reverse();

  // Search Logic
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVolumes = baseVolumes.map(vol => {
    // If volume title matches, keep all chapters (or maybe just show volume? Let's keep all for context)
    // Actually, usually search filters everything.
    // Rule:
    // 1. If Volume title matches, show Volume AND all its chapters (even if they don't match? No, usually filtering down is better, but seeing context is good. Let's filter chapters unless volume matches strictly? 
    // Let's go with: Show volume if (Vol Title Match OR Has Matching Chapters).
    // Show Chapter if (Vol Title Match OR Chapter Title Match).

    const volTitleMatch = vol.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchingChapters = vol.chapters.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || volTitleMatch
    );

    if (volTitleMatch || matchingChapters.length > 0) {
      return {
        ...vol,
        chapters: sortOrder === 'asc' ? matchingChapters : [...matchingChapters].reverse(),
        isMatch: true
      };
    }
    return null;
  }).filter(Boolean) as (Volume & { isMatch: boolean })[];

  // Auto-expand on search
  React.useEffect(() => {
    if (searchQuery) {
      const newExpanded: Record<string, boolean> = {};
      filteredVolumes.forEach(v => {
        newExpanded[v.id] = true;
      });
      setExpandedVolumes(prev => ({ ...prev, ...newExpanded }));
    }
  }, [searchQuery]);

  const displayVolumes = searchQuery ? filteredVolumes : baseVolumes.map(v => ({
    ...v,
    chapters: sortOrder === 'asc' ? v.chapters : [...v.chapters].reverse() // Apply sort to non-search view too
  }));


  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full flex-shrink-0 z-20 transition-colors duration-200">
      {/* Brand */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between text-purple-600 dark:text-purple-400">
        <div className="flex items-center gap-2">
          <BookOpen size={24} />
          <span className="font-bold text-lg text-gray-800 dark:text-gray-100">幻靈寫作AI</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-all"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            目錄
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="text-gray-400 hover:text-purple-600 transition-colors"
              title={sortOrder === 'asc' ? "切換為倒敘" : "切換為正序"}
            >
              <ArrowUpDown size={12} />
            </button>
          </div>
          <button
            onClick={onAddVolume}
            className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            title="新增分卷"
          >
            <FolderPlus size={16} />
          </button>
        </div>



        {/* Search Input */}
        <div className="px-2 mb-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋章節..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs bg-gray-50 border border-gray-100 rounded-md focus:outline-none focus:border-purple-300 transition-all text-gray-600 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="space-y-4">
          {displayVolumes.length === 0 && searchQuery && (
            <div className="text-center text-xs text-gray-400 py-4">無符合搜尋結果</div>
          )}
          {displayVolumes.map((vol) => {
            // Also sort chapters if needed? Usually "Reverse Order" implies reading newest first.
            const displayChapters = sortOrder === 'asc' ? vol.chapters : [...vol.chapters].reverse();

            return (
              <div key={vol.id} className="select-none">
                {/* Volume Header */}
                <div className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 mb-1">
                  <div className="flex items-center gap-1 flex-1 min-w-0" onClick={() => toggleVolume(vol.id)}>
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedVolumes[vol.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {editingVolumeId === vol.id ? (
                      <input
                        autoFocus
                        className="text-xs font-bold text-gray-700 bg-white border border-purple-300 rounded px-1 py-0.5 w-full focus:outline-none"
                        defaultValue={vol.title}
                        onBlur={(e) => {
                          onUpdateVolume(vol.id, e.target.value);
                          setEditingVolumeId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateVolume(vol.id, (e.target as HTMLInputElement).value);
                            setEditingVolumeId(null);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-gray-700 truncate cursor-pointer" onDoubleClick={() => setEditingVolumeId(vol.id)}>
                        {vol.title}
                      </span>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center">
                    <button
                      onClick={() => setEditingVolumeId(vol.id)}
                      className="p-1 text-gray-400 hover:text-purple-600"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddChapter(vol.id); }}
                      className="p-1 text-gray-400 hover:text-purple-600"
                      title="在本卷新增章節"
                    >
                      <Plus size={12} />
                    </button>
                    {onDeleteVolume && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteVolume(vol.id); }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="刪除分卷"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chapters */}
                {expandedVolumes[vol.id] && (
                  <div className="ml-2 pl-2 border-l border-gray-100 dark:border-gray-700 space-y-0.5">
                    {vol.chapters.length === 0 && (
                      <div className="text-[10px] text-gray-300 px-3 py-1 italic">
                        (無章節)
                      </div>
                    )}
                    {displayChapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        onClick={() => onSelectChapter(chapter.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 group cursor-pointer ${chapter.id === currentChapterId
                          ? 'bg-purple-50 text-purple-700 font-medium translate-x-1'
                          : 'text-gray-600 hover:bg-gray-50 hover:translate-x-1'
                          }`}
                      >
                        <FileText size={13} className={chapter.id === currentChapterId ? 'text-purple-500' : 'text-gray-300'} />
                        <span className="truncate text-xs">{chapter.title || '未命名章節'}</span>

                        <div
                          className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChapter(chapter.id);
                          }}
                          title="刪除章節"
                        >
                          <Trash2 size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Functional Tools */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          功能選項
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToolButton icon={<Download size={16} />} label="導出" />
          <ToolButton icon={<History size={16} />} label="歷史" />
          <ToolButton icon={<LayoutTemplate size={16} />} label="備註" />
          <ToolButton icon={<Settings size={16} />} label="設定" />
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold shrink-0">
            {userEmail ? userEmail.charAt(0).toUpperCase() : <User size={16} />}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate" title={userEmail}>
              {userEmail || 'Guest'}
            </span>
            <span className={`text-[10px] ${userRole === 'admin' ? 'text-purple-600 dark:text-purple-400 font-bold' : userRole === 'pro' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
              {userRole === 'admin' ? 'Admin' : userRole === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="登出"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div >
  );
};

const ToolButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 transition-colors shadow-sm">
    <div className="mb-1 text-gray-500 dark:text-gray-400">{icon}</div>
    <span className="text-[10px]">{label}</span>
  </button>
);
