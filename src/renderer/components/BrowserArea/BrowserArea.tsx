import React, { useEffect, useRef } from 'react';
import { TabData, AppSettings } from '../../types';

interface BrowserAreaProps {
  tabs: TabData[];
  activeTabId: string;
  settings: AppSettings | null;
  isSaveMode: boolean;
  onUpdateTab: (id: string, updates: Partial<TabData>) => void;
  onAddTab: (url: string, activate: boolean, isAutoSave: boolean) => string;
  onCloseTab: (id: string) => void;
  onSaveTab: (tabId: string, url: string, title: string) => Promise<{ success: boolean; error?: string }>;
}

export const BrowserArea: React.FC<BrowserAreaProps> = ({
  tabs,
  activeTabId,
  settings,
  isSaveMode,
  onUpdateTab,
  onAddTab,
  onCloseTab,
  onSaveTab,
}) => {
  const webviewRefs = useRef<Record<string, any>>({});
  const autoSaveTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const enqueuedTabIds = useRef<Set<string>>(new Set());

  // 各タブのWebviewイベントリスナー設定
  useEffect(() => {
    tabs.forEach((tab) => {
      const webview = webviewRefs.current[tab.id];
      if (!webview || (webview as any)._hasBoundEvents) return;
      (webview as any)._hasBoundEvents = true;

      const handleDidStartLoading = () => {
        onUpdateTab(tab.id, { isLoading: true });
      };

      const handleDidStopLoading = () => {
        const canGoBack = webview.canGoBack?.() ?? false;
        const canGoForward = webview.canGoForward?.() ?? false;
        const currentUrl = webview.getURL?.() || tab.url;
        const currentTitle = webview.getTitle?.() || tab.title;

        onUpdateTab(tab.id, {
          isLoading: false,
          canGoBack,
          canGoForward,
          url: currentUrl,
          title: currentTitle,
        });

        // SaveMode 対象タブの場合の自動保存ディレイ＆キュー投入（1回だけ確実に投入）
        if (tab.isAutoSaveTarget && !enqueuedTabIds.current.has(tab.id)) {
          if (autoSaveTimers.current[tab.id]) {
            clearTimeout(autoSaveTimers.current[tab.id]);
          }

          const delay = Math.max(50, settings?.autosaveStartDelayMs ?? 400);
          autoSaveTimers.current[tab.id] = setTimeout(async () => {
            if (enqueuedTabIds.current.has(tab.id)) return;
            enqueuedTabIds.current.add(tab.id);

            const saveUrl = webview.getURL?.() || tab.url;
            const saveTitle = webview.getTitle?.() || tab.title;

            onUpdateTab(tab.id, { saveStatus: 'saving' });
            
            // キューマネージャー経由で保存実行（スロット管理・リトライ完備）
            const result = await onSaveTab(tab.id, saveUrl, saveTitle);

            if (result.success) {
              onUpdateTab(tab.id, { saveStatus: 'completed' });
              if (settings?.autoCloseAfterSave ?? true) {
                setTimeout(() => {
                  onCloseTab(tab.id);
                  enqueuedTabIds.current.delete(tab.id);
                }, 500);
              }
            } else {
              onUpdateTab(tab.id, { saveStatus: 'failed' });
            }
          }, delay);
        }
      };

      const handlePageTitleUpdated = (e: any) => {
        onUpdateTab(tab.id, { title: e.title });
      };

      const handlePageFaviconUpdated = (e: any) => {
        if (e.favicons && e.favicons.length > 0) {
          onUpdateTab(tab.id, { favicon: e.favicons[0] });
        }
      };

      const handleDidNavigate = (e: any) => {
        onUpdateTab(tab.id, { url: e.url });
      };

      const handleDidNavigateInPage = (e: any) => {
        if (e.isMainFrame) {
          onUpdateTab(tab.id, { url: e.url });
        }
      };

      // 新規ウィンドウ / Ctrl+クリック等のリンククリックをインターセプト
      const handleNewWindow = (e: any) => {
        e.preventDefault();
        const targetUrl = e.url;
        if (!targetUrl || targetUrl.startsWith('about:blank')) return;

        if (isSaveMode) {
          onAddTab(targetUrl, false, true);
        } else {
          onAddTab(targetUrl, true, false);
        }
      };

      // Webview内preloadからのCtrl+クリックメッセージ受信
      const handleIpcMessage = (e: any) => {
        if (e.channel === 'ctrl-click-link' && e.args && e.args[0]) {
          const { url } = e.args[0];
          if (url && !url.startsWith('about:blank')) {
            if (isSaveMode) {
              onAddTab(url, false, true);
            } else {
              onAddTab(url, true, false);
            }
          }
        }
      };

      webview.addEventListener('did-start-loading', handleDidStartLoading);
      webview.addEventListener('did-stop-loading', handleDidStopLoading);
      webview.addEventListener('page-title-updated', handlePageTitleUpdated);
      webview.addEventListener('page-favicon-updated', handlePageFaviconUpdated);
      webview.addEventListener('did-navigate', handleDidNavigate);
      webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
      webview.addEventListener('new-window', handleNewWindow);
      webview.addEventListener('ipc-message', handleIpcMessage);
    });
  }, [tabs, isSaveMode, settings, onUpdateTab, onAddTab, onCloseTab, onSaveTab]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <main className="flex-1 relative bg-bg-app overflow-hidden">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`absolute inset-0 w-full h-full ${
              isActive ? 'visible z-10' : 'invisible pointer-events-none -z-10'
            }`}
          >
            {/* @ts-ignore */}
            <webview
              ref={(el: any) => {
                if (el) webviewRefs.current[tab.id] = el;
                else delete webviewRefs.current[tab.id];
              }}
              src={tab.url}
              className="w-full h-full border-none bg-white"
              {...({ allowpopups: 'true' } as any)}
              webpreferences="contextIsolation=yes, allowRunningInsecureContent=no"
            />
          </div>
        );
      })}
    </main>
  );
};
