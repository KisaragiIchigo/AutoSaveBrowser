import { useEffect, useRef } from 'react';
import { ShortcutAction } from '../types';

interface ShortcutHandlers {
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onFocusAddress?: () => void;
  onBookmark?: () => void;
  onSaveCurrent?: () => void;
  onToggleSaveMode?: () => void;
  onToggleSidebar?: () => void;
  onReload?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
}

/**
 * ショートカットの検知は Main プロセスが担当する。
 * Webview にフォーカスがある間は Renderer の keydown が発火しないため、
 * ここでは正規化済みアクションの購読とハンドラへの振り分けだけを行う。
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const unsubscribe = window.electronAPI.onShortcut((action: ShortcutAction) => {
      const current = handlersRef.current;

      switch (action) {
        case 'new-tab': current.onNewTab?.(); break;
        case 'close-tab': current.onCloseTab?.(); break;
        case 'focus-address': current.onFocusAddress?.(); break;
        case 'bookmark': current.onBookmark?.(); break;
        case 'save-current': current.onSaveCurrent?.(); break;
        case 'toggle-save-mode': current.onToggleSaveMode?.(); break;
        case 'toggle-sidebar': current.onToggleSidebar?.(); break;
        case 'reload': current.onReload?.(); break;
        case 'go-back': current.onGoBack?.(); break;
        case 'go-forward': current.onGoForward?.(); break;
        default: break;
      }
    });

    return unsubscribe;
  }, []);
}
