import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Bookmark,
  Sparkles,
  Shield,
  ShieldAlert,
  Download,
  FolderDown,
  Settings,
  History,
  SlidersHorizontal,
} from 'lucide-react';
import { TabData, AppSettings } from '../../types';

interface AddressBarProps {
  activeTab?: TabData;
  settings: AppSettings | null;
  isSaveMode: boolean;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onToggleSaveMode: () => void;
  onToggleAdblock: () => void;
  onBookmarkCurrent: () => void;
  onSaveCurrentTab: () => void;
  onOpenSettings: () => void;
  onOpenBookmarks: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  addressInputRef: React.RefObject<HTMLInputElement>;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  activeTab,
  settings,
  isSaveMode,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onToggleSaveMode,
  onToggleAdblock,
  onBookmarkCurrent,
  onSaveCurrentTab,
  onOpenSettings,
  onOpenBookmarks,
  onToggleSidebar,
  isSidebarOpen,
  addressInputRef,
}) => {
  const [inputVal, setInputVal] = useState<string>('');

  useEffect(() => {
    if (activeTab?.url) {
      setInputVal(activeTab.url);
    }
  }, [activeTab?.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputVal.trim();
    if (!url) return;

    // URL形式かどうかの判定
    const isUrl = /^https?:\/\//i.test(url) || /^www\./i.test(url) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(url);

    if (isUrl) {
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
    } else {
      // 検索エンジンへのクエリ
      const engine = settings?.searchEngine || 'google';
      if (engine === 'duckduckgo') {
        url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
      } else if (engine === 'bing') {
        url = `https://www.bing.com/search?q=${encodeURIComponent(url)}`;
      } else if (engine === 'yahoo') {
        url = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(url)}`;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }

    onNavigate(url);
  };

  return (
    <div className="h-11 bg-bg-surface border-b border-border-base px-3 flex items-center space-x-2 text-xs select-none">
      {/* 戻る・進む・更新 */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onGoBack}
          disabled={!activeTab?.canGoBack}
          className="w-7 h-7 flex items-center justify-center rounded-btn hover:bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="前のページへ戻る"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onGoForward}
          disabled={!activeTab?.canGoForward}
          className="w-7 h-7 flex items-center justify-center rounded-btn hover:bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="次のページへ進む"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onReload}
          className="w-7 h-7 flex items-center justify-center rounded-btn hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          title="ページを再読み込み (Ctrl+R)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* アドレス / 検索バー */}
      <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
        <div className="absolute left-2.5 text-text-muted pointer-events-none">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          ref={addressInputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="URLを入力、またはキーワードで検索..."
          className="w-full h-8 pl-8 pr-8 bg-bg-app border border-border-subtle hover:border-border-base focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/40 rounded-btn text-xs text-text-primary placeholder:text-text-muted outline-none transition-all font-sans"
        />
        <button
          type="button"
          onClick={onBookmarkCurrent}
          className="absolute right-2 text-text-muted hover:text-accent-amber transition-colors"
          title="このページをブックマーク (Ctrl+D)"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* アクションボタン群 */}
      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {/* SaveMode トグル */}
        <button
          onClick={onToggleSaveMode}
          className={`h-8 px-2.5 flex items-center space-x-1.5 rounded-btn font-medium text-xs transition-all ${
            isSaveMode
              ? 'bg-accent-emerald text-white sage-glow hover:bg-accent-hover'
              : 'bg-bg-elevated hover:bg-bg-elevated/80 text-text-muted hover:text-text-secondary border border-border-subtle'
          }`}
          title="SaveMode: ONにするとCtrl+クリックの新規タブをバックグラウンドで自動保存＆自動クローズ (Ctrl+Shift+S)"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isSaveMode ? 'text-white' : 'text-accent-emerald'}`} />
          <span className="font-mono text-[11px]">{isSaveMode ? 'SaveMode: ON' : 'SaveMode: OFF'}</span>
        </button>

        {/* AdBlock トグル */}
        <button
          onClick={onToggleAdblock}
          className={`h-8 px-2 flex items-center space-x-1 rounded-btn text-xs border transition-colors ${
            settings?.adblockEnabled
              ? 'bg-bg-elevated text-accent-cyan border-accent-cyan/30 hover:bg-bg-elevated/80'
              : 'bg-bg-elevated text-text-muted border-border-subtle hover:text-text-secondary'
          }`}
          title="広告ブロックのON/OFF切り替え"
        >
          {settings?.adblockEnabled ? <Shield className="w-3.5 h-3.5 text-accent-cyan" /> : <ShieldAlert className="w-3.5 h-3.5 text-text-muted" />}
          <span className="font-mono text-[11px]">{settings?.adblockEnabled ? 'AdBlock' : 'NoBlock'}</span>
        </button>

        {/* 今すぐ保存ボタン */}
        <button
          onClick={onSaveCurrentTab}
          className="h-8 px-2.5 flex items-center space-x-1 rounded-btn bg-bg-elevated hover:bg-accent-primary hover:text-white text-text-secondary border border-border-subtle transition-colors"
          title="現在のアクティブタブを今すぐ保存 (Ctrl+S)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>保存</span>
        </button>

        {/* ブックマークダイアログ */}
        <button
          onClick={onOpenBookmarks}
          className="w-8 h-8 flex items-center justify-center rounded-btn hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          title="ブックマーク一覧"
        >
          <Bookmark className="w-4 h-4" />
        </button>

        {/* アーカイブ履歴 / キューサイドバー開閉 */}
        <button
          onClick={onToggleSidebar}
          className={`w-8 h-8 flex items-center justify-center rounded-btn transition-colors ${
            isSidebarOpen
              ? 'bg-accent-primary/20 text-accent-accent border border-accent-primary/40'
              : 'hover:bg-bg-elevated text-text-secondary hover:text-text-primary'
          }`}
          title="保存キュー & アーカイブ履歴パネル (Ctrl+H)"
        >
          <History className="w-4 h-4" />
        </button>

        {/* 設定モーダル */}
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 flex items-center justify-center rounded-btn hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          title="設定"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
