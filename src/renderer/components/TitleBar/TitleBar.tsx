import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, HardDrive, ShieldCheck, Sparkles } from 'lucide-react';

interface TitleBarProps {
  activeTaskCount: number;
  isSaveMode: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ activeTaskCount, isSaveMode }) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const checkMaximized = async () => {
    try {
      const max = await window.electronAPI.isMaximized();
      setIsMaximized(max);
    } catch {}
  };

  useEffect(() => {
    checkMaximized();
  }, []);

  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = async () => {
    await window.electronAPI.maximize();
    checkMaximized();
  };
  const handleClose = () => window.electronAPI.close();

  return (
    <header className="h-8 bg-bg-app border-b border-border-subtle flex items-center justify-between px-3 select-none app-drag-region text-xs text-text-secondary z-50">
      {/* 左側：ロゴ & ポータブルバッジ */}
      <div className="flex items-center space-x-2.5 app-no-drag">
        <div className="flex items-center space-x-1.5 font-semibold text-text-primary tracking-wide">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-emerald shadow-glow" />
          <span className="font-mono text-sm tracking-tight text-text-primary">AutoSaver</span>
          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-accent font-medium border border-accent-primary/30">
            Next
          </span>
        </div>

        {/* USBポータブルバッジ */}
        <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-[11px] text-text-muted">
          <HardDrive className="w-3 h-3 text-accent-emerald" />
          <span className="font-mono">PORTABLE</span>
        </div>

        {/* SaveMode ステータスインジケータ */}
        {isSaveMode && (
          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-accent-emerald/15 border border-accent-emerald/30 text-[11px] text-accent-accent animate-pulse">
            <Sparkles className="w-3 h-3 text-accent-emerald" />
            <span className="font-medium">SaveMode ACTIVE</span>
          </div>
        )}

        {/* 保存中タスクバッジ */}
        {activeTaskCount > 0 && (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-status-info/20 text-status-info text-[11px] font-mono border border-status-info/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-status-info" />
            <span>保存処理中: {activeTaskCount}件</span>
          </div>
        )}
      </div>

      {/* 中央：ダブルクリックで最大化 */}
      <div
        className="flex-1 h-full cursor-default"
        onDoubleClick={handleMaximize}
      />

      {/* 右側：ウィンドウコントロールボタン */}
      <div className="flex items-center space-x-1 app-no-drag">
        <button
          onClick={handleMinimize}
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          title="最小化"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          title={isMaximized ? '元に戻す' : '最大化'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-status-error/80 text-text-muted hover:text-white transition-colors"
          title="閉じる"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
