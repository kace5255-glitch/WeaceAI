import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, AlertCircle, Crown, ArrowUpDown,
  TrendingUp, Users, Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { adminService, MemberInfo, MemberStats, ExpiryCheckResult } from '../../services/adminService';

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
  senior_tester: { label: 'Sr.Tester', color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  tester: { label: 'Tester', color: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' },
  vip: { label: 'VIP', color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' },
  pro: { label: 'Pro', color: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400' },
  user: { label: 'Free', color: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400' },
};

const FILTER_ROLES = [
  { value: 'all', label: '全部' },
  { value: 'vip', label: 'VIP' },
  { value: 'pro', label: 'Pro' },
  { value: 'senior_tester', label: 'Sr.Tester' },
  { value: 'tester', label: 'Tester' },
  { value: 'user', label: 'Free' },
];

const UPGRADE_OPTIONS = [
  { value: 'vip', label: 'VIP' },
  { value: 'pro', label: 'Pro' },
  { value: 'senior_tester', label: 'Sr.Tester' },
  { value: 'tester', label: 'Tester' },
  { value: 'user', label: 'Free' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
  { value: 180, label: '180 天' },
  { value: 365, label: '365 天' },
];

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // 升級 modal
  const [upgradeModal, setUpgradeModal] = useState<{
    userId: string; userName: string; currentRole: string;
  } | null>(null);
  const [upgradeRole, setUpgradeRole] = useState('pro');
  const [upgradeDays, setUpgradeDays] = useState(30);
  const [upgrading, setUpgrading] = useState(false);

  // 到期檢查
  const [expiryResult, setExpiryResult] = useState<ExpiryCheckResult | null>(null);
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  const limit = 15;

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getMembers({
        search: search || undefined, role: roleFilter, sort_by: sortBy, sort_order: sortOrder, page, limit,
      });
      setMembers(data.members);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, sortBy, sortOrder, page]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminService.getMemberStats();
      setStats(data);
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleUpgrade = async () => {
    if (!upgradeModal) return;
    setUpgrading(true);
    try {
      const days = ['pro', 'vip'].includes(upgradeRole) ? upgradeDays : undefined;
      await adminService.upgradeMember(upgradeModal.userId, upgradeRole, days);
      setUpgradeModal(null);
      loadMembers();
      loadStats();
    } catch (e: any) {
      alert(`操作失敗: ${e.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  const handleCheckExpiry = async () => {
    setCheckingExpiry(true);
    try {
      const result = await adminService.checkExpiry();
      setExpiryResult(result);
      if (result.downgraded > 0) {
        loadMembers();
        loadStats();
      }
    } catch (e: any) {
      alert(`檢查失敗: ${e.message}`);
    } finally {
      setCheckingExpiry(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getExpiryStatus = (member: MemberInfo) => {
    if (!['pro', 'vip'].includes(member.role) || !member.subscription_end) return null;
    const end = new Date(member.subscription_end);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    if (daysLeft < 0) return { label: '已過期', color: 'text-red-500', days: daysLeft };
    if (daysLeft <= 7) return { label: `${daysLeft} 天後到期`, color: 'text-amber-500', days: daysLeft };
    return { label: `剩餘 ${daysLeft} 天`, color: 'text-emerald-500', days: daysLeft };
  };

  const totalPages = Math.ceil(total / limit);
  const SortIcon = ({ field }: { field: string }) => (
    <span className="inline-flex ml-1 opacity-50">
      {sortBy === field ? (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} />}
    </span>
  );

  return (
    <div>
      {/* 統計卡片 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">會員管理</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理會員等級與訂閱狀態</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStats(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <TrendingUp size={14} /> {showStats ? '隱藏統計' : '顯示統計'}
          </button>
          <button onClick={handleCheckExpiry} disabled={checkingExpiry} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={checkingExpiry ? 'animate-spin' : ''} /> 到期檢查
          </button>
        </div>
      </div>

      {/* 到期檢查結果 */}
      {expiryResult && (
        <div className={`mb-4 p-4 rounded-xl border ${expiryResult.downgraded > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800/40' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/40'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={expiryResult.downgraded > 0 ? 'text-amber-500' : 'text-emerald-500'} />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                檢查完成：{expiryResult.checked} 位到期會員，{expiryResult.downgraded} 位已降級
              </span>
            </div>
            <button onClick={() => setExpiryResult(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">關閉</button>
          </div>
          {expiryResult.details.length > 0 && (
            <div className="mt-2 space-y-1">
              {expiryResult.details.map(d => (
                <p key={d.user_id} className="text-xs text-gray-600 dark:text-gray-400">
                  {d.name}：{d.previous_role.toUpperCase()} → Free（到期：{formatDate(d.expired_at)}）
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 統計卡片 */}
      {showStats && stats && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/40">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-gray-400" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">總用戶</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/40">
            <div className="flex items-center gap-2 mb-1">
              <Crown size={14} className="text-amber-500" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">付費會員</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{stats.paidCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/40">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-violet-500" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">轉換率</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{stats.conversionRate}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/40">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-emerald-500" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">有效訂閱</span>
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{stats.activeSubscriptions}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/40">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">即將到期</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.expiringSoon}</p>
            <p className="text-[10px] text-gray-400">7 天內</p>
          </div>
        </div>
      )}
      {showStats && statsLoading && (
        <div className="flex items-center justify-center h-24 mb-5">
          <div className="w-6 h-6 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

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

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* 會員表格 */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">用戶</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">等級</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('subscription_end')}>
                  到期日 <SortIcon field="subscription_end" />
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">狀態</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  註冊日期 <SortIcon field="created_at" />
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.user;
                const expiry = getExpiryStatus(member);
                const isAdmin = member.role === 'admin';
                return (
                  <tr key={member.user_id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(member.display_name || member.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[160px]">{member.display_name || member.username || '-'}</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="px-5 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                      {['pro', 'vip'].includes(member.role) ? formatDate(member.subscription_end) : '-'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {expiry ? (
                        <span className={`text-xs font-medium ${expiry.color}`}>{expiry.label}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-400">{formatDate(member.created_at)}</td>
                    <td className="px-5 py-3 text-center">
                      {isAdmin ? (
                        <span className="text-xs text-gray-400">-</span>
                      ) : (
                        <button
                          onClick={() => {
                            setUpgradeRole(member.role === 'user' ? 'pro' : member.role);
                            setUpgradeDays(30);
                            setUpgradeModal({ userId: member.user_id, userName: member.display_name || member.username || member.email, currentRole: member.role });
                          }}
                          className="text-xs px-3 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors font-medium"
                        >
                          變更等級
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">無符合條件的會員</td></tr>
              )}
            </tbody>
          </table>

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">第 {page} / {totalPages} 頁，共 {total} 位</span>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 升級/降級對話框 */}
      {upgradeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                <Crown size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">變更會員等級</h3>
                <p className="text-xs text-gray-400">{upgradeModal.userName}</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">目標等級</label>
                <select
                  value={upgradeRole}
                  onChange={e => setUpgradeRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
                >
                  {UPGRADE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}{opt.value === upgradeModal.currentRole ? '（目前）' : ''}</option>
                  ))}
                </select>
              </div>

              {['pro', 'vip'].includes(upgradeRole) && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">訂閱時長</label>
                  <select
                    value={upgradeDays}
                    onChange={e => setUpgradeDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
                  >
                    {DURATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">若目前訂閱尚未到期，將從到期日延長</p>
                </div>
              )}

              {!['pro', 'vip'].includes(upgradeRole) && upgradeModal.currentRole !== upgradeRole && ['pro', 'vip'].includes(upgradeModal.currentRole) && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/40">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">降級將清除訂閱期間，用戶將立即失去付費功能</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setUpgradeModal(null)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
              <button
                onClick={handleUpgrade}
                disabled={upgrading || upgradeRole === upgradeModal.currentRole}
                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {upgrading ? '處理中...' : '確認變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
