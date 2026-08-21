import { useState, useCallback, useRef } from 'react';
import { TabData, ArchiveStatus } from '../types';

export function useTabs(initialUrls: string[] = ['https://www.google.com/']) {
  const [tabs, setTabs] = useState<TabData[]>(() => {
    const urls = initialUrls.length > 0 ? initialUrls : ['https://www.google.com/'];
    return urls.map((url, idx) => ({
      id: 'tab_' + Date.now() + '_' + idx,
      url,
      title: '新しいタブ',
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
    }));
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '');
  const tabCounter = useRef<number>(100);

  const addTab = useCallback((url: string = 'https://www.google.com/', activate: boolean = true, isAutoSave: boolean = false) => {
    tabCounter.current += 1;
    const newTabId = 'tab_' + Date.now() + '_' + tabCounter.current;
    const newTab: TabData = {
      id: newTabId,
      url,
      title: '読み込み中...',
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
      isAutoSaveTarget: isAutoSave,
      saveStatus: isAutoSave ? 'queued' : undefined,
    };

    setTabs((prev) => [...prev, newTab]);
    if (activate) {
      setActiveTabId(newTabId);
    }
    return newTabId;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) {
        // 最後の1つを閉じたら新しい空タブを生成
        const emptyTab: TabData = {
          id: 'tab_' + Date.now(),
          url: 'https://www.google.com/',
          title: '新しいタブ',
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
        };
        setActiveTabId(emptyTab.id);
        return [emptyTab];
      }

      const index = prev.findIndex((t) => t.id === id);
      const nextTabs = prev.filter((t) => t.id !== id);

      // アクティブタブを閉じる場合は前後のタブを選択
      if (id === activeTabId) {
        const nextActive = nextTabs[Math.max(0, index - 1)] || nextTabs[0];
        if (nextActive) {
          setActiveTabId(nextActive.id);
        }
      }

      return nextTabs;
    });
  }, [activeTabId]);

  const closeOtherTabs = useCallback((id: string) => {
    setTabs((prev) => prev.filter((t) => t.id === id));
    setActiveTabId(id);
  }, []);

  const closeRightTabs = useCallback((id: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      return prev.slice(0, index + 1);
    });
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<TabData>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const updateTabSaveStatus = useCallback((id: string, status: ArchiveStatus) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, saveStatus: status } : t)));
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    closeTab,
    closeOtherTabs,
    closeRightTabs,
    updateTab,
    updateTabSaveStatus,
  };
}
