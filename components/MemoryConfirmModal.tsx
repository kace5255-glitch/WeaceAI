import React, { useState } from 'react';
import { X, Brain, Trash2, MapPin, Zap, Heart, Swords, Package, ChevronDown, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { MemoryExtractionResult } from '../types';

interface MemoryConfirmModalProps {
    isOpen: boolean;
    extracted: MemoryExtractionResult;
    chapterIndex: number;
    onConfirm: (edited: MemoryExtractionResult) => void;
    onSkip: () => void;
    isSaving: boolean;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    plot: { label: '劇情', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    foreshadow: { label: '伏筆', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    character_change: { label: '角色變化', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    power_up: { label: '實力提升', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    relationship: { label: '關係', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
    worldbuilding: { label: '世界觀', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    conflict: { label: '衝突', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    resolution: { label: '解決', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
};

export const MemoryConfirmModal: React.FC<MemoryConfirmModalProps> = ({
    isOpen, extracted, chapterIndex, onConfirm, onSkip, isSaving
}) => {
    const [editedData, setEditedData] = useState<MemoryExtractionResult>(extracted);
    const [expandedSnapshots, setExpandedSnapshots] = useState<Set<number>>(new Set([0]));
    const [eventsExpanded, setEventsExpanded] = useState(true);
    const [snapshotsExpanded, setSnapshotsExpanded] = useState(true);

    // Sync when extracted changes
    React.useEffect(() => { setEditedData(extracted); }, [extracted]);

    if (!isOpen) return null;

    const removeEvent = (idx: number) => {
        setEditedData(prev => ({
            ...prev,
            events: prev.events.filter((_, i) => i !== idx)
        }));
    };

    const updateEventSummary = (idx: number, summary: string) => {
        setEditedData(prev => ({
            ...prev,
            events: prev.events.map((e, i) => i === idx ? { ...e, summary } : e)
        }));
    };
    const removeSnapshot = (idx: number) => {
        setEditedData(prev => ({
            ...prev,
            character_snapshots: prev.character_snapshots.filter((_, i) => i !== idx)
        }));
        setExpandedSnapshots(prev => { const n = new Set(prev); n.delete(idx); return n; });
    };

    const updateSnapshotField = (idx: number, field: string, value: any) => {
        setEditedData(prev => ({
            ...prev,
            character_snapshots: prev.character_snapshots.map((s, i) =>
                i === idx ? { ...s, [field]: value } : s
            )
        }));
    };

    const toggleSnapshot = (idx: number) => {
        setExpandedSnapshots(prev => {
            const n = new Set(prev);
            n.has(idx) ? n.delete(idx) : n.add(idx);
            return n;
        });
    };

    const eventCount = editedData.events?.length || 0;
    const snapCount = editedData.character_snapshots?.length || 0;
    const foreshadowCount = editedData.foreshadow_callbacks?.length || 0;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-violet-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-t-xl shrink-0">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Brain size={18} className="text-violet-500" />
                        第{chapterIndex}章 記憶提取確認
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {eventCount}事件 · {snapCount}角色 · {foreshadowCount}伏筆回收
                        </span>
                        <button onClick={onSkip} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>
                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                    {/* Events Section */}
                    {eventCount > 0 && (
                        <div>
                            <button onClick={() => setEventsExpanded(!eventsExpanded)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                                {eventsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                章節事件 ({eventCount})
                            </button>
                            {eventsExpanded && (
                                <div className="space-y-2">
                                    {editedData.events.map((evt, idx) => {
                                        const typeInfo = EVENT_TYPE_LABELS[evt.event_type] || { label: evt.event_type, color: 'bg-gray-100 text-gray-600' };
                                        return (
                                            <div key={idx} className="group flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                                                <div className="shrink-0 mt-0.5">
                                                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${typeInfo.color}`}>{typeInfo.label}</span>
                                                    <div className="text-[10px] text-gray-400 mt-1 text-center">重要度 {evt.importance}</div>
                                                </div>
                                                <textarea
                                                    value={evt.summary}
                                                    onChange={(e) => updateEventSummary(idx, e.target.value)}
                                                    rows={2}
                                                    className="flex-1 text-xs bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-700 dark:text-gray-300 leading-relaxed p-0"
                                                />
                                                <button onClick={() => removeEvent(idx)} className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Character Snapshots Section */}
                    {snapCount > 0 && (
                        <div>
                            <button onClick={() => setSnapshotsExpanded(!snapshotsExpanded)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                                {snapshotsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                角色狀態快照 ({snapCount})
                            </button>
                            {snapshotsExpanded && (
                                <div className="space-y-2">
                                    {editedData.character_snapshots.map((snap, idx) => (
                                        <div key={idx} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 overflow-hidden">
                                            <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => toggleSnapshot(idx)}>
                                                <div className="flex items-center gap-2">
                                                    {expandedSnapshots.has(idx) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{snap.name}</span>
                                                    {snap.key_action && <span className="text-[10px] text-gray-400 truncate max-w-[200px]">— {snap.key_action}</span>}
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); removeSnapshot(idx); }} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            {expandedSnapshots.has(idx) && (
                                                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                                                    <SnapshotField icon={<MapPin size={12} />} label="位置" value={snap.location || ''} onChange={(v) => updateSnapshotField(idx, 'location', v)} color="text-blue-500" />
                                                    <SnapshotField icon={<Zap size={12} />} label="實力" value={snap.power_level || ''} onChange={(v) => updateSnapshotField(idx, 'power_level', v)} color="text-amber-500" />
                                                    <SnapshotField icon={<Heart size={12} />} label="情緒" value={snap.emotional_state || ''} onChange={(v) => updateSnapshotField(idx, 'emotional_state', v)} color="text-pink-500" />
                                                    <SnapshotField icon={<Swords size={12} />} label="傷勢" value={snap.injuries || ''} onChange={(v) => updateSnapshotField(idx, 'injuries', v || null)} color="text-red-500" />
                                                    <SnapshotField icon={<Package size={12} />} label="物品" value={snap.possessions || ''} onChange={(v) => updateSnapshotField(idx, 'possessions', v || null)} color="text-green-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Foreshadow Callbacks */}
                    {foreshadowCount > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                <AlertCircle size={14} className="text-purple-500" />
                                伏筆回收 ({foreshadowCount})
                            </div>
                            <div className="space-y-1">
                                {editedData.foreshadow_callbacks.map((f, idx) => (
                                    <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                                        <span className="font-medium text-purple-700 dark:text-purple-300">{f.keyword}</span>：{f.description}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {eventCount === 0 && snapCount === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">本章未提取到記憶資料</div>
                    )}
                </div>
                {/* Footer */}
                <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 rounded-b-xl shrink-0">
                    <p className="text-[11px] text-gray-400">確認後將寫入記憶系統並更新角色卡動態狀態</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSkip}
                            disabled={isSaving}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            跳過
                        </button>
                        <button
                            onClick={() => onConfirm(editedData)}
                            disabled={isSaving}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 shadow-sm shadow-violet-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 儲存中...</>
                            ) : (
                                <><Check size={13} /> 確認儲存</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 角色快照欄位小組件
const SnapshotField: React.FC<{
    icon: React.ReactNode; label: string; value: string;
    onChange: (v: string) => void; color: string;
}> = ({ icon, label, value, onChange, color }) => (
    <div className="flex items-center gap-1.5">
        <span className={`shrink-0 ${color}`}>{icon}</span>
        <span className="text-[10px] text-gray-400 shrink-0 w-6">{label}</span>
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="—"
            className="flex-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors placeholder-gray-300 dark:placeholder-gray-500"
        />
    </div>
);
