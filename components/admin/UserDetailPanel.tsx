import React, { useState, useEffect } from 'react';
import {
  X, BookOpen, Clock, Shield, UserX, UserCheck as UserCheckIcon,
  AlertTriangle, Mail, Calendar, Hash, Crown, Trash2, FileText, Gem
} from 'lucide-react';
import { adminService, AdminUserDetail, AuditLog } from '../../services/adminService';

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
  senior_tester: { label: 'Sr.Tester', color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  tester: { label: 'Tester', color: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' },
  user: { label: 'Free', color: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400' },
};

const UPGRADE_OPTIONS = [
  { value: 'senior_tester', label: 'Sr.Tester' },
  { value: 'tester', label: 'Tester' },
  { value: 'user', label: 'Free' },
];

interface UserDetailPanelProps {
  userId: string;
  onClose: () => void;
  onUserUpdated: (userId: string, updates: Partial<{ role: string; is_active: boolean }>) => void;
  onUserDeleted: (userId: string) => void;
}

export const UserDetailPanel: React.FC<UserDetailPanelProps> = ({ userId, onClose, onUserUpdated, onUserDeleted }) => {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [toggling, setToggling] = useState(false);
  // 等級變更
  const [upgradeRole, setUpgradeRole] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 點數調整
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsType, setPointsType] = useState('permanent');
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  const [pointsMsg, setPointsMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminService.getUserDetail(userId);
        setUser(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleUpgrade = async () => {
    if (!user || !upgradeRole || upgradeRole === user.role) return;
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      await adminService.upgradeMember(userId, upgradeRole);
      setUser(prev => prev ? { ...prev, role: upgradeRole } : prev);
      onUserUpdated(userId, { role: upgradeRole });
      const roleName = UPGRADE_OPTIONS.find(o => o.value === upgradeRole)?.label || upgradeRole;
      setUpgradeMsg(`已變更為 ${roleName}`);
      setUpgradeRole('');
    } catch (e: any) {
      setUpgradeMsg(`失敗: ${e.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setToggling(true);
    try {
      const newStatus = !(user.is_active !== false);
      await adminService.toggleUserStatus(userId, newStatus);
      setUser(prev => prev ? { ...prev, is_active: newStatus } : prev);
      onUserUpdated(userId, { is_active: newStatus });
      setStatusConfirm(false);
    } catch (e: any) {
      alert(`操作失敗: ${e.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await adminService.deleteUser(userId);
      onUserDeleted(userId);
    } catch (e: any) {
      alert(`刪除失敗: ${e.message}`);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!user) return;
    const amount = parseInt(pointsAmount);
    if (!amount || !pointsReason.trim()) {
      setPointsMsg('請填寫點數和原因');
      return;
    }
    setAdjustingPoints(true);
    setPointsMsg('');
    try {
      const res = await adminService.adjustPoints(userId, amount, pointsReason.trim(), pointsType);
      setUser(prev => {
        if (!prev) return prev;
        const field = pointsType + '_points' as keyof typeof prev;
        return {
          ...prev,
          [field]: res.newValue,
          spirit_stones: res.newBalance,
        };
      });
      setPointsMsg(`成功！餘額: ${res.newBalance}`);
      setPointsAmount('');
      setPointsReason('');
    } catch (e: any) {
      setPointsMsg(`失敗: ${e.message}`);
    } finally {
      setAdjustingPoints(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isActive = user ? user.is_active !== false : true;
  const isAdmin = user?.role === 'admin';
  const badge = user ? (ROLE_BADGES[user.role] || ROLE_BADGES.user) : ROLE_BADGES.user;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">用戶詳情</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : user ? (
            <>
              {/* 用戶頭像與基本資訊 */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${
                  isActive ? 'bg-gradient-to-br from-violet-400 to-purple-500' : 'bg-gray-400'
                }`}>
                  {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">
                      {user.display_name || user.username || '-'}
                    </h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    {!isActive && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">已停用</span>
                    )}
                  </div>
                  {user.username && user.display_name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">@{user.username}</p>
                  )}
                </div>
              </div>

              {/* 資訊欄位 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail size={13} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Email</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield size={13} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">User ID</span>
                  </div>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">{user.user_id}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar size={13} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">註冊時間</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatDate(user.created_at)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash size={13} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">創作統計</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.novelCount} 部小說 · {user.totalChapters} 章</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 col-span-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gem size={13} className="text-amber-500" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">點數餘額</span>
                    <span className="ml-auto text-sm font-bold text-amber-600 dark:text-amber-400">{user.spirit_stones || 0}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400">每日 <span className="font-semibold text-blue-500">{user.daily_points || 0}</span></span>
                    <span className="text-gray-500 dark:text-gray-400">任務 <span className="font-semibold text-green-500">{user.task_points || 0}</span></span>
                    <span className="text-gray-500 dark:text-gray-400">永久 <span className="font-semibold text-purple-500">{user.permanent_points || 0}</span></span>
                  </div>
                </div>
              </div>

              {/* 小說列表 */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <BookOpen size={15} className="text-violet-500" /> 小說列表
                </h4>
                {user.novels.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">尚無小說</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {user.novels.map(novel => (
                      <div key={novel.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{novel.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">{novel.genre}</span>
                            <span className="text-[11px] text-gray-400">{novel.chapterCount} 章</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 flex-shrink-0 ml-3">
                          <Clock size={11} />
                          <span>{formatDate(novel.updated_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 會員等級管理 */}
              {!isAdmin && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Crown size={15} className="text-amber-500" /> 等級管理
                  </h4>
                  {/* 等級變更 */}
                  <div className="flex items-center gap-2">
                    <select
                      value={upgradeRole}
                      onChange={e => setUpgradeRole(e.target.value)}
                      className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 outline-none hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                    >
                      <option value="">變更等級...</option>
                      {UPGRADE_OPTIONS.filter(o => o.value !== user.role).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleUpgrade}
                      disabled={!upgradeRole || upgrading}
                      className="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-40"
                    >
                      {upgrading ? '處理中...' : '確認'}
                    </button>
                  </div>
                  {upgradeMsg && (
                    <p className={`text-xs mt-2 ${upgradeMsg.startsWith('失敗') ? 'text-red-500' : 'text-emerald-500'}`}>{upgradeMsg}</p>
                  )}
                </div>
              )}

              {/* 點數調整 */}
              {!isAdmin && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Gem size={15} className="text-amber-500" /> 點數調整
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={pointsType}
                        onChange={e => setPointsType(e.target.value)}
                        className="w-20 text-sm px-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 outline-none"
                      >
                        <option value="permanent">永久</option>
                        <option value="daily">每日</option>
                        <option value="task">任務</option>
                      </select>
                      <input
                        type="number"
                        value={pointsAmount}
                        onChange={e => setPointsAmount(e.target.value)}
                        placeholder="數量（正數加，負數扣）"
                        className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 outline-none hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pointsReason}
                        onChange={e => setPointsReason(e.target.value)}
                        placeholder="原因（必填）"
                        className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 outline-none hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                      />
                      <button
                        onClick={handleAdjustPoints}
                        disabled={adjustingPoints || !pointsAmount || !pointsReason.trim()}
                        className="px-4 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-40"
                      >
                        {adjustingPoints ? '處理中...' : '調整'}
                      </button>
                    </div>
                    {pointsMsg && (
                      <p className={`text-xs ${pointsMsg.startsWith('失敗') ? 'text-red-500' : 'text-emerald-500'}`}>{pointsMsg}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 操作日誌 */}
              {user.auditLogs && user.auditLogs.length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <FileText size={15} className="text-gray-500" /> 操作日誌
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {user.auditLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                        <span className="text-gray-600 dark:text-gray-300">{log.action}{log.details?.role ? ` → ${log.details.role}` : ''}</span>
                        <span className="text-gray-400 flex-shrink-0 ml-2">{formatDate(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 帳號操作 */}
              {!isAdmin && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  {/* 停用/啟用 */}
                  {!statusConfirm ? (
                    <button
                      onClick={() => setStatusConfirm(true)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors ${
                        isActive
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                      }`}
                    >
                      {isActive ? <UserX size={16} /> : <UserCheckIcon size={16} />}
                      {isActive ? '停用帳號' : '啟用帳號'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/40">
                      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                      <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                        確定要{isActive ? '停用' : '啟用'}此帳號？
                      </p>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => setStatusConfirm(false)} className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                        <button onClick={handleToggleStatus} disabled={toggling} className={`px-3 py-1 text-xs text-white rounded-lg transition-colors disabled:opacity-50 ${
                          isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                        }`}>
                          {toggling ? '處理中...' : '確認'}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* 刪除帳號 */}
                  {!deleteConfirm ? (
                    <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                      <Trash2 size={16} /> 刪除帳號
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40">
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-300 flex-1">確定刪除？此操作無法復原。</p>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                        <button onClick={handleDelete} disabled={deleting} className="px-3 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
                          {deleting ? '刪除中...' : '確認刪除'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
