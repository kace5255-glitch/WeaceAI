import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, Gem } from 'lucide-react';
import { adminService, AdminStats } from '../../services/adminService';

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={loadStats} className="mt-3 px-4 py-1.5 text-xs bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors">
          重試
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const mainCards = [
    { icon: Users, label: '註冊用戶', value: stats.users.total, today: stats.users.today, todayLabel: '今日新增', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { icon: BookOpen, label: '小說總數', value: stats.novels.total, today: stats.novels.today, todayLabel: '今日新增', gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { icon: Gem, label: '平台總點數', value: stats.points?.total || 0, today: 0, todayLabel: '', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  ];

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
    senior_tester: { label: 'Sr.Tester', color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
    tester: { label: 'Tester', color: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' },
    user: { label: 'Free', color: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400' },
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">平台總覽</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">知靈AI 平台即時數據</p>
      </div>

      {/* 主要統計卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {mainCards.map((card, i) => (
          <div key={i} className={`${card.bg} rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/30`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-3`}>
              <card.icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value.toLocaleString()}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{card.label}</p>
            {card.today > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={12} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">+{card.today} {card.todayLabel}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 角色分佈 */}
      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/40">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">用戶角色分佈</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(stats.users.roles).map(([role, count]) => {
            const info = roleLabels[role] || { label: role, color: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400' };
            const pct = stats.users.total > 0 ? ((count / stats.users.total) * 100).toFixed(1) : '0';
            return (
              <div key={role} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{count}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
