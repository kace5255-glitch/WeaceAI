import React, { useState } from 'react';
import {
  LayoutDashboard, Users, BookOpen, Cpu, Sun, Moon, Shield, ArrowLeft
} from 'lucide-react';
import { DashboardOverview } from './admin/DashboardOverview';
import { UserManagement } from './admin/UserManagement';
import { ContentOverview } from './admin/ContentOverview';
import { AIServiceStatus } from './admin/AIServiceStatus';

interface AdminDashboardProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

type AdminTab = 'dashboard' | 'users' | 'content' | 'ai';

const navItems: { id: AdminTab; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: '平台總覽' },
  { id: 'users', icon: Users, label: '用戶管理' },
  { id: 'content', icon: BookOpen, label: '內容管理' },
  { id: 'ai', icon: Cpu, label: 'AI 服務' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, theme, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 側邊導航 */}
      <aside className="w-60 flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700/50 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">管理後台</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">知靈AI Admin</p>
            </div>
          </div>
        </div>

        {/* 導航選單 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}

          {/* 設定區塊 */}
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50">
            <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">設定</p>
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? '淺色模式' : '深色模式'}
            </button>
            <button onClick={onBack} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
              <ArrowLeft size={18} /> 返回主頁
            </button>
          </div>
        </nav>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'content' && <ContentOverview />}
          {activeTab === 'ai' && <AIServiceStatus />}
        </div>
      </main>
    </div>
  );
};
