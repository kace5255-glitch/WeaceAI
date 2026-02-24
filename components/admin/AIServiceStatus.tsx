import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Cpu, Shield, Clock } from 'lucide-react';
import { adminService, AIServiceInfo } from '../../services/adminService';

export const AIServiceStatus: React.FC = () => {
  const [services, setServices] = useState<AIServiceInfo[]>([]);
  const [rateLimit, setRateLimit] = useState<{ windowMs: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAIStatus();
      setServices(data.services);
      setRateLimit(data.rateLimit);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

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
        <button onClick={loadStatus} className="mt-3 px-4 py-1.5 text-xs bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors">重試</button>
      </div>
    );
  }

  const available = services.filter(s => s.available).length;
  const total = services.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI 服務狀態</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{available}/{total} 個服務可用</p>
        </div>
        <button onClick={loadStatus} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <RefreshCw size={14} /> 重新檢測
        </button>
      </div>

      {/* 服務卡片 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {services.map(service => (
          <div key={service.name} className={`rounded-2xl p-5 border transition-colors ${
            service.available
              ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-800/40'
              : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-800/40'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  service.available
                    ? 'bg-emerald-100 dark:bg-emerald-500/15'
                    : 'bg-red-100 dark:bg-red-500/15'
                }`}>
                  <Cpu size={20} className={service.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{service.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{service.key}</p>
                </div>
              </div>
              {service.available ? (
                <CheckCircle size={20} className="text-emerald-500" />
              ) : (
                <XCircle size={20} className="text-red-500" />
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              service.available
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              {service.available ? 'API Key 已配置' : 'API Key 未配置'}
            </span>
          </div>
        ))}
      </div>

      {/* 速率限制 */}
      {rateLimit && (
        <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/40">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-violet-500" /> 速率限制設定
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">時間窗口</span>
              </div>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{rateLimit.windowMs / 60000} 分鐘</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">最大請求數</span>
              </div>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{rateLimit.max} 次 / IP</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
