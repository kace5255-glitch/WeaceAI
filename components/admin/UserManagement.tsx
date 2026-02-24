import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, AlertCircle, Eye, Trash2, UserX, UserCheck, Shield, Gem } from 'lucide-react';
import { adminService, AdminUser } from '../../services/adminService';
import { UserDetailPanel } from './UserDetailPanel';

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
  senior_tester: { label: 'Sr.Tester', color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  tester: { label: 'Tester', color: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' },
  user: { label: 'Free', color: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400' },
};

const FILTER_ROLES = [
  { value: 'all', label: '全部' },
  { value: 'admin', label: 'Admin' },
  { value: 'senior_tester', label: 'Sr.Tester' },
  { value: 'tester', label: 'Tester' },
  { value: 'user', label: 'Free' },
];

const BATCH_ACTIONS = [
  { value: '', label: '批量操作...' },
  { value: 'change_role:senior_tester', label: '設為 Sr.Tester' },
  { value: 'change_role:tester', label: '設為 Tester' },
  { value: 'change_role:user', label: '設為 Free' },
  { value: 'disable', label: '停用帳號' },
  { value: 'enable', label: '啟用帳號' },
  { value: 'delete', label: '刪除帳號' },
  { value: 'add_points', label: '批量加點' },
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchPoints, setBatchPoints] = useState('');
  const limit = 15;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getUsers({ search: search || undefined, role: roleFilter, page, limit });
      setUsers(data.users);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleUserUpdated = (userId: string, updates: Partial<{ role: string; is_active: boolean }>) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, ...updates } : u));
  };

  const handleUserDeleted = (userId: string) => {
    setUsers(prev => prev.filter(u => u.user_id !== userId));
    setTotal(prev => prev - 1);
    setSelectedUserId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const nonAdminIds = users.filter(u => u.role !== 'admin').map(u => u.user_id);
    if (nonAdminIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nonAdminIds));
    }
  };

  const handleBatchAction = async () => {
    if (!batchAction || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const [action, value] = batchAction.includes(':') ? batchAction.split(':') : [batchAction, undefined];

    if (action === 'delete') {
      if (!confirm(`確定要刪除 ${ids.length} 個帳號？此操作無法復原。`)) return;
    }
    if (action === 'add_points') {
      const pts = parseInt(batchPoints);
      if (!pts || pts <= 0) { alert('請輸入有效的點數數量'); return; }
    }

    setBatchLoading(true);
    try {
      await adminService.batchAction(ids, action, action === 'add_points' ? batchPoints : value);
      await loadUsers();
      setSelectedIds(new Set());
      setBatchAction('');
      setBatchPoints('');
    } catch (e: any) {
      alert(`批量操作失敗: ${e.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  const nonAdminIds = users.filter(u => u.role !== 'admin').map(u => u.user_id);
  const allSelected = nonAdminIds.length > 0 && nonAdminIds.every(id => selectedIds.has(id));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">用戶管理</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">共 {total} 位用戶</p>
      </div>

      {/* 搜尋與篩選 */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋 email、用戶名..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTER_ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => { setRoleFilter(r.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                roleFilter === r.value
                  ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'
                  : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 批量操作列 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-800/40">
          <span className="text-sm text-violet-700 dark:text-violet-300">已選 {selectedIds.size} 位用戶</span>
          <select
            value={batchAction}
            onChange={e => setBatchAction(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 outline-none"
          >
            {BATCH_ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          {batchAction === 'add_points' && (
            <input
              type="number"
              min="1"
              value={batchPoints}
              onChange={e => setBatchPoints(e.target.value)}
              placeholder="點數"
              className="w-24 text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 outline-none"
            />
          )}
          <button
            onClick={handleBatchAction}
            disabled={!batchAction || batchLoading}
            className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40"
          >
            {batchLoading ? '處理中...' : '執行'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-auto">取消選取</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
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
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">用戶</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">狀態</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">角色</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">小說</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">點數</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">最後登入</th>
                <th className="w-12 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const badge = ROLE_BADGES[user.role] || ROLE_BADGES.user;
                const isAdmin = user.role === 'admin';
                const isActive = user.is_active !== false;
                return (
                  <tr key={user.user_id} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-3">
                      {!isAdmin && (
                        <input type="checkbox" checked={selectedIds.has(user.user_id)} onChange={() => toggleSelect(user.user_id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isActive ? 'bg-gradient-to-br from-violet-400 to-purple-500' : 'bg-gray-400'}`}>
                          {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px]">{user.display_name || user.username || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {isActive ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{user.novelCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                        <Gem size={13} />
                        {user.spirit_stones || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">{formatDate(user.last_sign_in)}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => setSelectedUserId(user.user_id)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors" title="查看詳情">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">無符合條件的用戶</td></tr>
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

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={handleUserUpdated}
          onUserDeleted={handleUserDeleted}
        />
      )}
    </div>
  );
};
