export type SaveFormat = 'complete_html' | 'mhtml' | 'single_html' | 'pdf';

export interface FilterListDef {
  id: string;
  name: string;
  category: 'ads' | 'privacy' | 'security' | 'japanese' | 'annoyances';
  url: string;
  filename: string;
  enabled: boolean;
}

export interface AppSettings {
  saveDir: string;               // 相対パス（./portable_data/saved_pages）または絶対パス
  saveFormat: SaveFormat;
  historyLimit: number;
  startupUrls: string[];
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'yahoo';
  adblockEnabled: boolean;
  adblockLists: string[];
  filterConfigs: Record<string, boolean>; // filterId -> enabled
  useTimestampPrefix: boolean;
  autosaveStartDelayMs: number;
  domainSubdirEnabled: boolean;
  saveSlotsMax: number;
  toastEnabled: boolean;
  toastDurationMs: number;
  autoCloseAfterSave: boolean;
  isPortable: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
}

export type ArchiveStatus = 'queued' | 'saving' | 'completed' | 'failed';

export interface ArchiveRecord {
  id: string;
  url: string;
  title: string;
  filePath: string;
  fileSize?: number;
  format: SaveFormat;
  status: ArchiveStatus;
  domain: string;
  timestamp: number;
  errorMessage?: string;
}

export interface TabData {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isAutoSaveTarget?: boolean;
  saveStatus?: ArchiveStatus;
}

export interface IElectronAPI {
  // ウィンドウ操作
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // 設定関連
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  selectDirectory: () => Promise<string | null>;
  getAppPathInfo: () => Promise<{ appRoot: string; portableDataDir: string; isPortable: boolean }>;

  // ブックマーク関連
  getBookmarks: () => Promise<BookmarkItem[]>;
  saveBookmark: (bm: Omit<BookmarkItem, 'id' | 'createdAt'>) => Promise<BookmarkItem[]>;
  deleteBookmark: (id: string) => Promise<BookmarkItem[]>;

  // 手動ブロックリスト
  getBlocklist: () => Promise<string>;
  saveBlocklist: (content: string) => Promise<boolean>;

  // 広告ブロック
  getFilterListDefs: () => Promise<FilterListDef[]>;
  toggleFilterList: (filterId: string, enabled: boolean) => Promise<{ success: boolean }>;
  updateEasyLists: () => Promise<{ success: boolean; message: string }>;

  // 保存・アーカイブ
  startSavePage: (params: {
    tabId: string;
    url: string;
    title: string;
    format?: SaveFormat;
    customOutPath?: string;
  }) => Promise<{ success: boolean; filePath?: string; recordId: string; error?: string }>;
  
  getArchiveHistory: () => Promise<ArchiveRecord[]>;
  clearArchiveHistory: () => Promise<void>;
  openPathInExplorer: (filePath: string) => Promise<void>;
  openFile: (filePath: string) => Promise<void>;

  // イベント購読
  onArchiveStatusChanged: (callback: (record: ArchiveRecord) => void) => () => void;
  onAdblockStatusChanged: (callback: (status: { updating: boolean; message?: string }) => void) => () => void;
  onOpenNewTabRequested: (callback: (data: { url: string; disposition?: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
