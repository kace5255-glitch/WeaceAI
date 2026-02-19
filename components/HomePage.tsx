import React, { useState, useEffect } from 'react';
import {
  BookOpen, PenTool, Sparkles, Clock, ChevronRight, Plus,
  FileText, Zap, Home, FolderOpen, Settings, LogOut, Moon, Sun,
  Bot, ListTree, MessageSquareText, Wand2, Globe, BookMarked,
  BarChart3, Flame, Star, ArrowRight, Trash2, Edit3, Check, X, MoreVertical,
  Search, Bell
} from 'lucide-react';
import { NovelSummary } from '../hooks/useNovelData';

interface HomePageProps {
  onCreateNovel: () => void;
  onOpenNovel: (novelId: string) => void;
  onDeleteNovel: (novelId: string) => void;
  onRenameNovel: (novelId: string, title: string) => void;
  novels: NovelSummary[];
  userName?: string;
  userRole?: string;
  userEmail?: string;
  stats?: {
    totalWords: number;
    totalChapters: number;
    writingStreak: number;
    achievements: number;
  };
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
  onLogout?: () => void;
  onOpenUserSettings?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onCreateNovel,
  onOpenNovel,
  onDeleteNovel,
  onRenameNovel,
  novels = [],
  userName = 'Writer',
  userRole = 'user',
  userEmail = '',
  stats = { totalWords: 0, totalChapters: 0, writingStreak: 0, achievements: 0 },
  theme = 'dark',
  toggleTheme,
  onLogout,
  onOpenUserSettings,
}) => {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNav, setActiveNav] = useState('home');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting('深夜好');
    else if (hour < 12) setGreeting('早安');
    else if (hour < 18) setGreeting('午安');
    else setGreeting('晚安');
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}萬`;
    return num.toLocaleString();
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '剛剛';
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    return new Date(timestamp).toLocaleDateString('zh-TW');
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return { label: 'Admin', color: 'bg-red-500/20 text-red-400' };
    if (role === 'pro') return { label: 'Pro', color: 'bg-violet-500/20 text-violet-400' };
    return { label: 'Free', color: 'bg-slate-500/20 text-slate-400' };
  };

  const badge = getRoleBadge(userRole);

  const navItems = [
    { id: 'home', icon: Home, label: '首頁' },
    { id: 'works', icon: FolderOpen, label: '我的小說' },
    { id: 'tools', icon: Wand2, label: 'AI 工具' },
    { id: 'stats', icon: BarChart3, label: '數據統計' },
  ];

  const gradientColors = [
    'from-violet-400 to-purple-600',
    'from-blue-400 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-pink-400 to-rose-600',
    'from-cyan-400 to-blue-600',
  ];

  const handleStartRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setMenuOpenId(null);
  };

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameNovel(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (id: string, title: string) => {
    setMenuOpenId(null);
    if (window.confirm(`確定要刪除「${title}」嗎？此操作無法復原。`)) {
      onDeleteNovel(id);
    }
  };

  // 小說卡片組件
  const NovelCard = ({ novel, index }: { novel: NovelSummary; index: number }) => {
    const gradient = gradientColors[index % gradientColors.length];
    const isRenaming = renamingId === novel.id;
    const isMenuOpen = menuOpenId === novel.id;

    return (
      <div className="group relative bg-white dark:bg-gray-800/60 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/40 hover:shadow-xl hover:border-violet-300 dark:hover:border-violet-500/30 hover:-translate-y-0.5 transition-all">
        {/* 封面區 */}
        <div className={`h-32 bg-gradient-to-br ${gradient} relative cursor-pointer`} onClick={() => !isRenaming && onOpenNovel(novel.id)}>
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={36} className="text-white/30" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 text-white/80 backdrop-blur-sm">
            {novel.genre}
          </span>
        </div>

        {/* 資訊區 */}
        <div className="p-4">
          {isRenaming ? (
            <div className="flex items-center gap-1.5 mb-2">
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                className="flex-1 text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-2 py-1 rounded-lg border border-violet-300 dark:border-violet-500 outline-none"
              />
              <button onClick={handleConfirmRename} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"><Check size={16} /></button>
              <button onClick={() => setRenamingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={16} /></button>
            </div>
          ) : (
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2 truncate cursor-pointer" onClick={() => onOpenNovel(novel.id)}>{novel.title}</h4>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><PenTool size={12} /> {formatNumber(novel.wordCount)} 字</span>
            <span className="flex items-center gap-1"><BookOpen size={12} /> {novel.chapterCount} 章</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(novel.updatedAt)}</span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : novel.id); }}
              className="p-1.5 rounded-lg bg-black/30 text-white/80 hover:bg-black/50 backdrop-blur-sm transition-all"
            >
              <MoreVertical size={14} />
            </button>
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
                <button onClick={() => handleStartRename(novel.id, novel.title)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Edit3 size={13} /> 重新命名
                </button>
                <button onClick={() => handleDelete(novel.id, novel.title)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 size={13} /> 刪除小說
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 首頁內容
  const renderHomeContent = () => (
    <>
      {/* Hero 歡迎區 — 漸層背景 */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 dark:from-violet-700 dark:via-purple-800 dark:to-indigo-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-violet-200 text-sm mb-1">{currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
              <h2 className="text-3xl font-bold text-white mb-2">{greeting}，{userName}</h2>
              <p className="text-violet-200/80 text-sm max-w-md">讓 AI 助手陪伴你的創作旅程，開啟今天的寫作靈感</p>
            </div>
            <div className="flex items-center gap-3">
              {novels.length > 0 && (
                <button onClick={() => onOpenNovel(novels[0].id)} className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-medium rounded-xl border border-white/20 transition-all active:scale-95">
                  <BookOpen size={16} /> 繼續寫作
                </button>
              )}
              <button onClick={onCreateNovel} className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-violet-700 text-sm font-bold rounded-xl shadow-lg shadow-black/10 transition-all active:scale-95">
                <Plus size={16} /> 新建小說
              </button>
            </div>
          </div>
          {/* 統計概覽 — 嵌入 Hero 底部 */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[
              { icon: PenTool, value: formatNumber(stats.totalWords), label: '總字數' },
              { icon: BookOpen, value: String(stats.totalChapters), label: '章節數' },
              { icon: FolderOpen, value: String(novels.length), label: '作品數' },
              { icon: Flame, value: `${stats.writingStreak} 天`, label: '連續創作' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon size={14} className="text-violet-200" />
                  <span className="text-xs text-violet-200/70">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近作品 */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">最近作品</h3>
          {novels.length > 0 && (
            <button onClick={() => setActiveNav('works')} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium flex items-center gap-1 transition-colors">
              查看全部 <ChevronRight size={14} />
            </button>
          )}
        </div>
        {novels.length === 0 ? (
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-12 border border-gray-200/80 dark:border-gray-700/40 border-dashed text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center"><BookMarked size={28} className="text-violet-600 dark:text-violet-400" /></div>
            <h4 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">開始你的創作之旅</h4>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">創建你的第一部小說，讓 AI 助手陪伴你的寫作旅程</p>
            <button onClick={onCreateNovel} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-95"><Plus size={16} /> 創建新小說</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {novels.slice(0, 6).map((novel, i) => <NovelCard key={novel.id} novel={novel} index={i} />)}
          </div>
        )}
      </div>
    </>
  );

  // 我的小說頁面
  const renderWorksContent = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">我的小說</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">共 {novels.length} 部作品 · {formatNumber(novels.reduce((s, n) => s + n.wordCount, 0))} 字</p>
        </div>
        <button onClick={onCreateNovel} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-95">
          <Plus size={18} /> 新建小說
        </button>
      </div>

      {novels.length === 0 ? (
        <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-16 border border-gray-200/80 dark:border-gray-700/40 border-dashed text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center"><BookMarked size={36} className="text-violet-600 dark:text-violet-400" /></div>
          <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">還沒有任何小說</h4>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-md mx-auto">點擊上方「新建小說」按鈕，開始你的第一部創作</p>
          <button onClick={onCreateNovel} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-95"><Plus size={16} /> 創建新小說</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {/* 新建小說卡片 */}
          <button onClick={onCreateNovel} className="flex flex-col items-center justify-center h-[220px] bg-white dark:bg-gray-800/60 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/15 flex items-center justify-center mb-3 transition-colors">
              <Plus size={24} className="text-gray-400 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" />
            </div>
            <span className="text-sm font-medium text-gray-400 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">新建小說</span>
          </button>

          {novels.map((novel, i) => <NovelCard key={novel.id} novel={novel} index={i} />)}
        </div>
      )}
    </>
  );

  // 統計頁面
  const renderStatsContent = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">數據統計</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">你的創作數據一覽</p>
      </div>

      {/* 主要統計卡片 */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { icon: PenTool, value: formatNumber(stats.totalWords), label: '總字數', sub: `約 ${Math.ceil(stats.totalWords / 500)} 頁`, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { icon: BookOpen, value: String(stats.totalChapters), label: '總章節數', sub: `${novels.length} 部小說`, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/30`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg mb-4`}><s.icon size={22} className="text-white" /></div>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">{s.value}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{s.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Flame, value: `${stats.writingStreak}`, label: '連續創作天數', color: 'text-amber-500' },
          { icon: FolderOpen, value: String(novels.length), label: '作品數量', color: 'text-emerald-500' },
          { icon: Star, value: String(novels.filter(n => n.wordCount > 0).length), label: '進行中', color: 'text-violet-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-700/40 text-center">
            <s.icon size={24} className={`${s.color} mx-auto mb-3`} />
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden" onClick={() => menuOpenId && setMenuOpenId(null)}>
      {/* 左側導航欄 */}
      <aside className="w-64 flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700/50 flex flex-col">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25"><Sparkles size={18} className="text-white" /></div>
            <div>
              <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">知靈AI</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">智能網文寫作助手</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === item.id
                  ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50">
            <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">設定</p>
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? '淺色模式' : '深色模式'}
            </button>
            <button onClick={onOpenUserSettings} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
              <Settings size={18} /> 帳號設定
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">{userName.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{userName}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                {userEmail && <p className="text-[11px] text-gray-400 truncate">{userEmail.split('@')[0]}</p>}
              </div>
            </div>
            <button onClick={onLogout} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="登出"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* 頂部工具列 */}
        <div className="flex-shrink-0 px-8 py-4 flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          {/* 搜尋欄 */}
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="搜尋小說、章節..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl border border-transparent focus:border-violet-300 dark:focus:border-violet-500/50 focus:bg-white dark:focus:bg-gray-750 outline-none transition-all"
            />
          </div>

          {/* 右側工具 */}
          <div className="flex items-center gap-2">
            <button className="relative p-2.5 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" title="通知">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full"></span>
            </button>
            <button onClick={toggleTheme} className="p-2.5 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" title={theme === 'dark' ? '淺色模式' : '深色模式'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <button onClick={onOpenUserSettings} className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{userName}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
          {activeNav === 'home' && renderHomeContent()}
          {activeNav === 'works' && renderWorksContent()}
          {activeNav === 'stats' && renderStatsContent()}
          </div>
        </div>
      </main>
    </div>
  );
};
