import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings, BookmarkItem, ArchiveRecord, SaveFormat } from '../renderer/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // ウィンドウ操作
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // 設定関連
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getAppPathInfo: () => ipcRenderer.invoke('app:getPathInfo'),

  // ブックマーク関連
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  saveBookmark: (bm: Omit<BookmarkItem, 'id' | 'createdAt'>) => ipcRenderer.invoke('bookmarks:save', bm),
  deleteBookmark: (id: string) => ipcRenderer.invoke('bookmarks:delete', id),

  // 手動ブロックリスト
  getBlocklist: () => ipcRenderer.invoke('adblock:getBlocklist'),
  saveBlocklist: (content: string) => ipcRenderer.invoke('adblock:saveBlocklist', content),

  // 広告ブロック
  getFilterListDefs: () => ipcRenderer.invoke('adblock:getFilterListDefs'),
  toggleFilterList: (filterId: string, enabled: boolean) => ipcRenderer.invoke('adblock:toggleFilterList', filterId, enabled),
  updateEasyLists: () => ipcRenderer.invoke('adblock:updateEasyLists'),

  // 保存・アーカイブ
  startSavePage: (params: {
    tabId: string;
    url: string;
    title: string;
    format?: SaveFormat;
    customOutPath?: string;
  }) => ipcRenderer.invoke('archive:savePage', params),

  getArchiveHistory: () => ipcRenderer.invoke('archive:getHistory'),
  clearArchiveHistory: () => ipcRenderer.invoke('archive:clearHistory'),
  openPathInExplorer: (filePath: string) => ipcRenderer.invoke('fs:openInExplorer', filePath),
  openFile: (filePath: string) => ipcRenderer.invoke('fs:openFile', filePath),

  // イベント購読
  onArchiveStatusChanged: (callback: (record: ArchiveRecord) => void) => {
    const subscription = (_event: any, record: ArchiveRecord) => callback(record);
    ipcRenderer.on('archive:status-changed', subscription);
    return () => ipcRenderer.removeListener('archive:status-changed', subscription);
  },

  onAdblockStatusChanged: (callback: (status: { updating: boolean; message?: string }) => void) => {
    const subscription = (_event: any, status: { updating: boolean; message?: string }) => callback(status);
    ipcRenderer.on('adblock:status-changed', subscription);
    return () => ipcRenderer.removeListener('adblock:status-changed', subscription);
  },

  onOpenNewTabRequested: (callback: (data: { url: string; disposition?: string }) => void) => {
    const subscription = (_event: any, data: { url: string; disposition?: string }) => callback(data);
    ipcRenderer.on('webview:open-new-tab', subscription);
    return () => ipcRenderer.removeListener('webview:open-new-tab', subscription);
  },
});
