import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Copy, Check, Gem, LogOut, Settings, History } from 'lucide-react';
import { PointsHistoryModal } from './PointsHistoryModal';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
  userId: string;
  accessToken: string;
  onLogout: () => void;
  onOpenUserSettings: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  position?: 'below' | 'above';
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: 'text-red-400', bg: 'bg-red-500/20' },
  senior_tester: { label: '資深測試員', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  tester: { label: '測試員', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  user: { label: '免費用戶', color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({
  isOpen, onClose, userName, userEmail, userRole, userId, accessToken,
  onLogout, onOpenUserSettings, anchorRef, position = 'below',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [dailyPoints, setDailyPoints] = useState(0);
  const [taskPoints, setTaskPoints] = useState(0);
  const [permanentPoints, setPermanentPoints] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<React.CSSProperties>({});
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchProfile();
    updatePosition();
  }, [isOpen]);

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    if (position === 'above') {
      setCoords({ left: rect.left, bottom: window.innerHeight - rect.top + 8 });
    } else {
      setCoords({ right: window.innerWidth - rect.right, top: rect.bottom + 8 });
    }
  };

  // 點擊外部關閉
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.profile) {
        setDailyPoints(data.profile.daily_points || 0);
        setTaskPoints(data.profile.task_points || 0);
        setPermanentPoints(data.profile.permanent_points || 0);
        setInviteCode(data.profile.invite_code || '');
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleInfo = ROLE_LABELS[userRole] || ROLE_LABELS.user;

  if (!isOpen && !showHistory) return null;

  const totalPoints = dailyPoints + taskPoints + permanentPoints;

  const panel = isOpen ? ReactDOM.createPortal(
    <div ref={panelRef} style={{ position: 'fixed', ...coords }} className="w-72 bg-gray-900 rounded-xl shadow-2xl border border-gray-700/50 z-[9999] overflow-hidden">
      {/* 頭部 - 用戶資訊 */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{userName}</p>
            <p className="text-gray-400 text-xs truncate">{userEmail}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${roleInfo.bg} ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        </div>
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* 點數明細 */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Gem size={14} className="text-amber-400" />
            <span className="text-sm font-semibold text-gray-200">點數</span>
          </div>
          <span className="text-xl font-bold text-white">{totalPoints.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-gray-400">每日點數</p>
            <p className="text-sm font-bold text-blue-400">{dailyPoints.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600">每日刷新額度</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">任務點數</p>
            <p className="text-sm font-bold text-green-400">{taskPoints.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600">活動/任務獎勵</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">永久點數</p>
            <p className="text-sm font-bold text-purple-400">{permanentPoints.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600">充值永久資產</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* 邀請碼 */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">邀請碼</span>
          <div className="flex items-center gap-1.5">
            <code className="text-xs font-mono text-gray-300 bg-gray-800 px-2 py-0.5 rounded">{inviteCode || '---'}</code>
            <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-700 transition-colors">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-gray-500" />}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* 選單 */}
      <div className="py-1">
        <button
          onClick={() => setShowHistory(true)}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <History size={14} className="text-gray-500" />
          <span>點數記錄</span>
        </button>
        <button
          onClick={() => { onClose(); onOpenUserSettings(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <Settings size={14} className="text-gray-500" />
          <span>帳號設定</span>
        </button>
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={14} />
          <span>登出</span>
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {panel}
      <PointsHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        accessToken={accessToken}
      />
    </>
  );
};
