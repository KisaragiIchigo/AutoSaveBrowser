import React, { useState } from 'react';
import {
  FolderOpen,
  ExternalLink,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileCode,
  HardDrive,
  X,
  Filter,
} from 'lucide-react';
import { ArchiveRecord } from '../../types';

interface ArchiveSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: ArchiveRecord[];
  activeTasks: ArchiveRecord[];
  onOpenInExplorer: (filePath: string) => void;
  onOpenFile: (filePath: string) => void;
  onClearHistory: () => void;
}

export const ArchiveSidebar: React.FC<ArchiveSidebarProps> = ({
  isOpen,
  onClose,
  history,
  activeTasks,
  onOpenInExplorer,
  onOpenFile,
  onClearHistory,
}) => {
  const [filterQuery, setFilterQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.domain.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <aside className="w-80 h-full bg-bg-surface border-l border-border-base flex flex-col z-30 shadow-glass text-xs select-none">
      {/* ヘッダー */}
      <div className="h-10 px-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center space-x-2 font-medium text-text-primary">
          <HardDrive className="w-4 h-4 text-accent-emerald" />
          <span>保存キュー＆履歴</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-elevated text-text-muted font-mono">
            {history.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          title="パネルを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 検索バー */}
      <div className="p-2 border-b border-border-subtle">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-text-muted" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="タイトル・ドメインで検索..."
            className="w-full h-7 pl-7 pr-2 bg-bg-app border border-border-subtle focus:border-accent-emerald rounded text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
      </div>

      {/* 進行中タスク（キュー） */}
      {activeTasks.length > 0 && (
        <div className="p-2 border-b border-border-subtle bg-bg-elevated/40">
          <div className="text-[11px] font-medium text-accent-emerald mb-1.5 flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>処理中のタスク ({activeTasks.length}件)</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="p-2 rounded bg-bg-surface border border-accent-emerald/30 text-[11px] space-y-1"
              >
                <div className="font-medium text-text-primary truncate">{task.title || '保存準備中...'}</div>
                <div className="text-text-muted text-[10px] truncate">{task.url}</div>
                <div className="flex items-center justify-between text-[10px] text-accent-accent">
                  <span>{task.status === 'saving' ? '書き込み中...' : '待機中...'}</span>
                  <span className="font-mono">{formatTime(task.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 履歴一覧 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredHistory.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-text-muted text-[11px] space-y-1">
            <Clock className="w-6 h-6 opacity-30" />
            <span>保存履歴はありません</span>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-card bg-bg-app border border-border-subtle hover:border-border-base transition-all group"
            >
              <div className="flex items-start justify-between space-x-2 mb-1">
                <div className="font-medium text-text-primary text-[11px] leading-snug line-clamp-2">
                  {item.title || item.domain}
                </div>
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-status-error flex-shrink-0 mt-0.5" />
                )}
              </div>

              <div className="text-[10px] text-text-muted truncate mb-1.5 font-mono">
                {item.domain}
              </div>

              <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border-subtle/50">
                <span className="font-mono">{formatBytes(item.fileSize)}</span>
                <span className="font-mono">{formatTime(item.timestamp)}</span>
              </div>

              {/* アクションボタン */}
              <div className="mt-2 pt-1.5 border-t border-border-subtle flex items-center justify-end space-x-1.5">
                <button
                  onClick={() => onOpenInExplorer(item.filePath)}
                  className="px-2 py-1 rounded bg-bg-elevated hover:bg-accent-emerald/20 hover:text-accent-emerald text-text-secondary transition-colors text-[10px] flex items-center space-x-1"
                  title="保存先フォルダをエクスプローラーで開く"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>フォルダ</span>
                </button>
                <button
                  onClick={() => onOpenFile(item.filePath)}
                  className="px-2 py-1 rounded bg-bg-elevated hover:bg-accent-primary/20 hover:text-accent-accent text-text-secondary transition-colors text-[10px] flex items-center space-x-1"
                  title="保存されたファイルをブラウザ等で開く"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>開く</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* フッター */}
      {history.length > 0 && (
        <div className="p-2 border-t border-border-subtle flex justify-end">
          <button
            onClick={onClearHistory}
            className="px-2.5 py-1 rounded hover:bg-status-error/20 text-text-muted hover:text-status-error transition-colors text-[11px] flex items-center space-x-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>履歴を消去</span>
          </button>
        </div>
      )}
    </aside>
  );
};
