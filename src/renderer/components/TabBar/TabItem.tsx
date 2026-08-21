import React, { useState } from 'react';
import { X, Globe, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { TabData } from '../../types';

interface TabItemProps {
  tab: TabData;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseRight: (id: string) => void;
}

export const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseRight,
}) => {
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setShowContextMenu(null);

  return (
    <>
      <div
        onClick={() => onSelect(tab.id)}
        onContextMenu={handleContextMenu}
        className={`group relative flex items-center h-8 min-w-[120px] max-w-[220px] px-3 space-x-2 rounded-t-md text-xs cursor-pointer border-t border-x transition-all select-none ${
          isActive
            ? 'bg-bg-surface text-text-primary border-border-base border-b-transparent shadow-sm'
            : 'bg-bg-app text-text-muted hover:bg-bg-elevated/60 hover:text-text-secondary border-transparent'
        }`}
      >
        {/* ファビコン / ローディング / 保存ステータス */}
        <div className="flex-shrink-0 flex items-center justify-center w-4 h-4">
          {tab.saveStatus === 'saving' ? (
            <span title="保存処理中">
              <Loader2 className="w-3.5 h-3.5 text-accent-emerald animate-spin" />
            </span>
          ) : tab.saveStatus === 'completed' ? (
            <span title="保存完了">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
            </span>
          ) : tab.saveStatus === 'failed' ? (
            <span title="保存失敗">
              <AlertCircle className="w-3.5 h-3.5 text-status-error" />
            </span>
          ) : tab.isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin" />
          ) : tab.favicon ? (
            <img src={tab.favicon} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-text-muted" />
          )}
        </div>

        {/* タイトル */}
        <span className="flex-1 truncate font-medium text-[11px] leading-tight">
          {tab.title || '新しいタブ'}
        </span>

        {/* 自動保存対象バッジ */}
        {tab.isAutoSaveTarget && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald shadow-glow flex-shrink-0" title="自動保存対象" />
        )}

        {/* 閉じるボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(tab.id);
          }}
          className="w-4 h-4 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="タブを閉じる (Ctrl+W)"
        >
          <X className="w-3 h-3" />
        </button>

        {/* アクティブタブ下部のアクセントライン */}
        {isActive && (
          <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-accent-emerald rounded-full" />
        )}
      </div>

      {/* 右クリックコンテキストメニュー */}
      {showContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeMenu} />
          <div
            style={{ top: showContextMenu.y, left: showContextMenu.x }}
            className="fixed z-50 min-w-[160px] py-1 bg-bg-surface border border-border-base rounded-card shadow-glass text-xs text-text-secondary animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={() => {
                closeMenu();
                onClose(tab.id);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-bg-elevated hover:text-text-primary flex items-center justify-between"
            >
              <span>タブを閉じる</span>
              <span className="text-[10px] text-text-muted">Ctrl+W</span>
            </button>
            <button
              onClick={() => {
                closeMenu();
                onCloseOthers(tab.id);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-bg-elevated hover:text-text-primary"
            >
              他のタブを閉じる
            </button>
            <button
              onClick={() => {
                closeMenu();
                onCloseRight(tab.id);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-bg-elevated hover:text-text-primary"
            >
              右側のタブを閉じる
            </button>
          </div>
        </>
      )}
    </>
  );
};
