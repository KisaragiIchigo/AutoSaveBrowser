import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from './hooks/useSettings';
import { useTabs } from './hooks/useTabs';
import { useArchive } from './hooks/useArchive';
import { useShortcuts } from './hooks/useShortcuts';
import { TitleBar } from './components/TitleBar/TitleBar';
import { TabBar } from './components/TabBar/TabBar';
import { AddressBar } from './components/AddressBar/AddressBar';
import { BrowserArea } from './components/BrowserArea/BrowserArea';
import { ArchiveSidebar } from './components/Sidebar/ArchiveSidebar';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { BookmarksModal } from './components/BookmarksModal/BookmarksModal';
import { ToastContainer, ToastItem } from './components/Toast/ToastContainer';
import { webviewRegistry } from './lib/webviewRegistry';

export const App: React.FC = () => {
  // トースト状態
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, isError: boolean = false) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 設定フック
  const { settings, updateSettings, selectDirectory } = useSettings();

  // SaveMode トグル状態
  const [isSaveMode, setIsSaveMode] = useState<boolean>(false);

  // サイドバー / モーダル開閉状態
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);

  // アドレス入力フォーカス用ref
  const addressInputRef = useRef<HTMLInputElement>(null);

  // アーカイブフック
  const {
    history,
    activeTasks,
    savePage,
    clearHistory,
    openInExplorer,
    openFile,
  } = useArchive(showToast);

  // タブ管理フック
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    closeTab,
    closeOtherTabs,
    closeRightTabs,
    updateTab,
  } = useTabs(settings?.startupUrls || ['https://www.google.com/']);

  // 新規ウィンドウ阻止時（setWindowOpenHandler）のIPCイベント購読
  useEffect(() => {
    const unsubscribe = window.electronAPI.onOpenNewTabRequested(({ url }) => {
      if (url && !url.startsWith('about:blank')) {
        if (isSaveMode) {
          addTab(url, false, true);
          showToast(`バックグラウンド自動保存キューに追加: ${url}`);
        } else {
          addTab(url, true, false);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isSaveMode, addTab, showToast]);

  // ナビゲーション（対象 Webview はタブIDで引く。src 属性は初期URLのまま固定されるため）
  const handleNavigate = useCallback((url: string) => {
    const webview = webviewRegistry.get(activeTabId);
    updateTab(activeTabId, { url, isLoading: true });
    webview?.loadURL(url).catch(() => {
      updateTab(activeTabId, { isLoading: false });
    });
  }, [activeTabId, updateTab]);

  const handleGoBack = useCallback(() => {
    const webview = webviewRegistry.get(activeTabId);
    if (webview?.canGoBack()) {
      webview.goBack();
    }
  }, [activeTabId]);

  const handleGoForward = useCallback(() => {
    const webview = webviewRegistry.get(activeTabId);
    if (webview?.canGoForward()) {
      webview.goForward();
    }
  }, [activeTabId]);

  const handleReload = useCallback(() => {
    webviewRegistry.get(activeTabId)?.reload();
  }, [activeTabId]);

  // SaveMode トグル
  const handleToggleSaveMode = () => {
    const next = !isSaveMode;
    setIsSaveMode(next);
    showToast(next ? 'SaveMode を有効にしました (Ctrl+クリックで自動保存)' : 'SaveMode を無効にしました');
  };

  // AdBlock トグル
  const handleToggleAdblock = async () => {
    if (!settings) return;
    const next = !settings.adblockEnabled;
    await updateSettings({ adblockEnabled: next });
    showToast(next ? '広告ブロックを有効にしました' : '広告ブロックを無効にしました');
  };

  // 現在タブの即時保存
  const handleSaveCurrentTab = async () => {
    if (!activeTab) return;
    await savePage({
      tabId: activeTab.id,
      url: activeTab.url,
      title: activeTab.title,
    });
  };

  // ブックマーク追加
  const handleBookmarkCurrent = async () => {
    if (!activeTab) return;
    try {
      await window.electronAPI.saveBookmark({
        title: activeTab.title || activeTab.url,
        url: activeTab.url,
        favicon: activeTab.favicon,
      });
      showToast(`ブックマークに追加: ${activeTab.title || activeTab.url}`);
    } catch {
      showToast('ブックマークの追加に失敗しました', true);
    }
  };

  // キーボードショートカット登録
  useShortcuts({
    onNewTab: () => addTab('https://www.google.com/', true, false),
    onCloseTab: () => closeTab(activeTabId),
    onFocusAddress: () => addressInputRef.current?.focus(),
    onBookmark: handleBookmarkCurrent,
    onSaveCurrent: handleSaveCurrentTab,
    onToggleSaveMode: handleToggleSaveMode,
    onToggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    onReload: handleReload,
    onGoBack: handleGoBack,
    onGoForward: handleGoForward,
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-app text-text-primary overflow-hidden select-none">
      {/* 1. タイトルバー */}
      <TitleBar activeTaskCount={activeTasks.length} isSaveMode={isSaveMode} />

      {/* 2. タブバー */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTab}
        onCloseOtherTabs={closeOtherTabs}
        onCloseRightTabs={closeRightTabs}
        onAddTab={() => addTab('https://www.google.com/', true, false)}
      />

      {/* 3. アドレス＆ツールバー */}
      <AddressBar
        activeTab={activeTab}
        settings={settings}
        isSaveMode={isSaveMode}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onToggleSaveMode={handleToggleSaveMode}
        onToggleAdblock={handleToggleAdblock}
        onBookmarkCurrent={handleBookmarkCurrent}
        onSaveCurrentTab={handleSaveCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        addressInputRef={addressInputRef}
      />

      {/* 4. メインブラウザ領域 & サイドバー */}
      <div className="flex-1 flex overflow-hidden relative">
        <BrowserArea
          tabs={tabs}
          activeTabId={activeTabId}
          settings={settings}
          isSaveMode={isSaveMode}
          onUpdateTab={updateTab}
          onAddTab={addTab}
          onCloseTab={closeTab}
          onSaveTab={(tabId, url, title) => savePage({ tabId, url, title })}
        />

        <ArchiveSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          history={history}
          activeTasks={activeTasks}
          onOpenInExplorer={openInExplorer}
          onOpenFile={openFile}
          onClearHistory={clearHistory}
        />
      </div>

      {/* 5. モーダルダイアログ */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={updateSettings}
        onSelectDirectory={selectDirectory}
        onToast={showToast}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        currentTab={activeTab}
        onOpenUrl={(url) => {
          addTab(url, true, false);
        }}
        onToast={showToast}
      />

      {/* 6. トースト通知 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
