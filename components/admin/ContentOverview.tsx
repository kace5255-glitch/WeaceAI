import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, BookOpen, User, Clock } from 'lucide-react';
import { adminService, AdminNovel } from '../../services/adminService';

export const ContentOverview: React.FC = () => {
  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const limit = 15;

  const loadNovels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getNovels({ search: search || undefined, page, limit });
      setNovels(data.novels);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadNovels(); }, [loadNovels]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">內容管理</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">共 {total} 部小說</p>
      </div>

      {/* 搜尋 */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋小說標題..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">小說標題</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">類型</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">作者</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">章節數</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">建立日期</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">最後更新</th>
              </tr>
            </thead>
            <tbody>
              {novels.map(novel => (
                <tr key={novel.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-violet-500 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{novel.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">{novel.genre}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <User size={13} />
                      <span className="truncate max-w-[120px]">{novel.authorName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300">{novel.chapterCount}</td>
                  <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-400">{formatDate(novel.created_at)}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock size={12} />
                      <span>{formatDate(novel.updated_at)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {novels.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">無符合條件的小說</td></tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">第 {page} / {totalPages} 頁</span>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
