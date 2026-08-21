import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onFocusAddress?: () => void;
  onBookmark?: () => void;
  onSaveCurrent?: () => void;
  onToggleSaveMode?: () => void;
  onToggleSidebar?: () => void;
  onReload?: () => void;
}

export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl または Command キーとの組み合わせ
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // Ctrl+Shift+S: SaveMode トグル
        if (e.shiftKey && key === 's') {
          e.preventDefault();
          handlers.onToggleSaveMode?.();
          return;
        }

        switch (key) {
          case 't': // 新規タブ
            e.preventDefault();
            handlers.onNewTab?.();
            break;
          case 'w': // タブを閉じる
            e.preventDefault();
            handlers.onCloseTab?.();
            break;
          case 'l': // アドレスバーフォーカス
            e.preventDefault();
            handlers.onFocusAddress?.();
            break;
          case 'd': // ブックマーク
            e.preventDefault();
            handlers.onBookmark?.();
            break;
          case 's': // 今すぐ保存
            e.preventDefault();
            handlers.onSaveCurrent?.();
            break;
          case 'h': // サイドバー開閉
            e.preventDefault();
            handlers.onToggleSidebar?.();
            break;
          case 'r': // 更新
            e.preventDefault();
            handlers.onReload?.();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
