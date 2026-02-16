
import React, { useState } from 'react';
import { Volume } from '../types';
import { X, Download, FileText, CheckSquare, Square } from 'lucide-react';

interface ExportChapterModalProps {
    isOpen: boolean;
    onClose: () => void;
    volumes: Volume[];
    novelTitle: string;
}

export const ExportChapterModal: React.FC<ExportChapterModalProps> = ({
    isOpen,
    onClose,
    volumes,
    novelTitle
}) => {
    const [selectedVolumeIds, setSelectedVolumeIds] = useState<string[]>(volumes.map(v => v.id));

    if (!isOpen) return null;

    const handleToggleVolume = (id: string) => {
        setSelectedVolumeIds(prev =>
            prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
        );
    };

    const handleExport = () => {
        const selectedVolumes = volumes.filter(v => selectedVolumeIds.includes(v.id));
        let fullText = `# ${novelTitle}\n\n`;

        selectedVolumes.forEach(vol => {
            fullText += `## ${vol.title}\n\n`;
            vol.chapters.forEach(chap => {
                fullText += `### ${chap.title}\n\n`;
                fullText += `${chap.content}\n\n---\n\n`;
            });
        });

        const blob = new Blob([fullText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${novelTitle}_export.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Download size={20} />
                        <h2 className="font-bold">導出小說內容</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">選擇導出分卷</p>
                    <div className="space-y-2">
                        {volumes.map(vol => (
                            <div
                                key={vol.id}
                                onClick={() => handleToggleVolume(vol.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedVolumeIds.includes(vol.id)
                                    ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    <span className="font-medium text-sm">{vol.title}</span>
                                    <span className="text-[10px] opacity-60">({vol.chapters.length} 節)</span>
                                </div>
                                {selectedVolumeIds.includes(vol.id) ? (
                                    <CheckSquare size={18} />
                                ) : (
                                    <Square size={18} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selectedVolumeIds.length === 0}
                        className="flex-3 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-md shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        立即下載 (.md)
                    </button>
                </div>
            </div>
        </div>
    );
};
