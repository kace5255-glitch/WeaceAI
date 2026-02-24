import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Gem, RefreshCw } from 'lucide-react';

interface PointsTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  source: string;
  description: string;
  created_at: string;
}

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
}

type FilterTab = 'all' | 'earn' | 'spend';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'earn', label: '獲得' },
  { value: 'spend', label: '消耗' },
];

export const PointsHistoryModal: React.FC<PointsHistoryModalProps> = ({
  isOpen, onClose, accessToken,
}) => {
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [balance, setBalance] = useState({ daily: 0, task: 0, permanent: 0 });
  const limit = 20;

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    fetchHistory(1);
    fetchBalance();
  }, [isOpen, filter]);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance({
          daily: data.daily_points || 0,
          task: data.task_points || 0,
          permanent: data.permanent_points || 0,
        });
      }
    } catch {}
  };

  const handleRefresh = () => {
    fetchHistory(page);
    fetchBalance();
  };

  const fetchHistory = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const offset = (p - 1) * limit;
      const filterParam = filter !== 'all' ? `&type=${filter}` : '';
      const url = `/api/user/points-history?limit=${limit}&offset=${offset}${filterParam}`;
      console.log('[PointsHistory] fetching:', url);
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log('[PointsHistory] status:', res.status);
      const data = await res.json();
      console.log('[PointsHistory] data:', data);
      if (!res.ok) throw new Error(data.error || '載入失敗');
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      console.error('[PointsHistory] error:', e);
      setError(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchHistory(p);
  };

  const totalPages = Math.ceil(total / limit);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-TW', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <Gem size={18} className="text-amber-400" />
            <h2 className="text-base font-bold text-white">點數記錄</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleRefresh} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="刷新">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 餘額 */}
        <div className="mx-5 mb-3 p-3 rounded-xl bg-gray-800/60 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-white">{balance.daily + balance.task + balance.permanent}</p>
            <p className="text-[10px] text-gray-500">總餘額</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-blue-400">{balance.daily}</p>
            <p className="text-[10px] text-gray-500">每日</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-green-400">{balance.task}</p>
            <p className="text-[10px] text-gray-500">任務</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-purple-400">{balance.permanent}</p>
            <p className="text-[10px] text-gray-500">永久</p>
          </div>
        </div>

        {/* 篩選 tabs */}
        <div className="flex gap-1.5 px-5 pb-3">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === tab.value
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 記錄列表 */}
        <div className="px-5 pb-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 text-center py-12">{error}</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-12">暫無記錄</p>
          ) : (
            <div className="space-y-1">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{tx.description}</p>
                    <p className="text-[11px] text-gray-600">{formatTime(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ml-3 flex-shrink-0 ${tx.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">共 {total} 筆</span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                上一頁
              </button>
              <span className="px-2 py-1 text-xs text-gray-500">{page}/{totalPages}</span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};