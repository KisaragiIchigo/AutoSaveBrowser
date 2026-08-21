import fs from 'fs';
import path from 'path';
import { PortablePathManager } from './portablePaths';
import { AppSettings, BookmarkItem, ArchiveRecord } from '../../renderer/types';

export class StorageService {
  private static settingsFile: string;
  private static bookmarksFile: string;
  private static historyFile: string;
  private static customBlockFile: string;

  private static settingsCache: AppSettings | null = null;
  private static bookmarksCache: BookmarkItem[] | null = null;
  private static historyCache: ArchiveRecord[] | null = null;

  public static initialize(): void {
    const configDir = PortablePathManager.getConfigDir();
    const adblockDir = PortablePathManager.getAdblockDir();

    this.settingsFile = path.join(configDir, 'settings.json');
    this.bookmarksFile = path.join(configDir, 'bookmarks.json');
    this.historyFile = path.join(configDir, 'archive_history.json');
    this.customBlockFile = path.join(adblockDir, 'custom_blocklist.txt');

    // 手動ブロックリストの初期化
    if (!fs.existsSync(this.customBlockFile)) {
      const template = [
        '# 手動ブロックドメイン（1行に1ドメイン記述）',
        '# 例: ads.example.com',
        '# 例: analytics.tracker.org',
        '',
      ].join('\n');
      fs.writeFileSync(this.customBlockFile, template, 'utf-8');
    }
  }

  public static getDefaultSettings(): AppSettings {
    return {
      saveDir: './portable_data/saved_pages',
      saveFormat: 'complete_html',
      historyLimit: 5000,
      startupUrls: ['https://www.google.com/'],
      searchEngine: 'google',
      adblockEnabled: true,
      adblockLists: [
        path.join(PortablePathManager.getAdblockDir(), 'easylist.txt'),
        path.join(PortablePathManager.getAdblockDir(), 'easyprivacy.txt'),
      ],
      filterConfigs: {},
      useTimestampPrefix: false,
      autosaveStartDelayMs: 400,
      domainSubdirEnabled: true,
      saveSlotsMax: 2,
      toastEnabled: true,
      toastDurationMs: 2800,
      autoCloseAfterSave: true,
      isPortable: true,
    };
  }

  // ===== 設定 (Settings) =====
  public static getSettings(): AppSettings {
    if (this.settingsCache) return this.settingsCache;

    const defaults = this.getDefaultSettings();
    if (!fs.existsSync(this.settingsFile)) {
      this.settingsCache = defaults;
      this.saveSettings(defaults);
      return defaults;
    }

    try {
      const raw = fs.readFileSync(this.settingsFile, 'utf-8');
      const parsed = JSON.parse(raw);
      this.settingsCache = { ...defaults, ...parsed };
    } catch {
      this.settingsCache = defaults;
    }

    return this.settingsCache || defaults;
  }

  public static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.settingsCache = updated;

    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save settings.json:', e);
    }

    return updated;
  }

  // ===== ブックマーク (Bookmarks) =====
  public static getBookmarks(): BookmarkItem[] {
    if (this.bookmarksCache) return this.bookmarksCache;

    if (!fs.existsSync(this.bookmarksFile)) {
      this.bookmarksCache = [];
      return [];
    }

    try {
      const raw = fs.readFileSync(this.bookmarksFile, 'utf-8');
      this.bookmarksCache = JSON.parse(raw) || [];
    } catch {
      this.bookmarksCache = [];
    }

    return this.bookmarksCache || [];
  }

  public static saveBookmark(bm: Omit<BookmarkItem, 'id' | 'createdAt'>): BookmarkItem[] {
    const list = this.getBookmarks();
    const newItem: BookmarkItem = {
      ...bm,
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
    };
    list.unshift(newItem);
    this.bookmarksCache = list;

    try {
      fs.writeFileSync(this.bookmarksFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save bookmarks.json:', e);
    }

    return list;
  }

  public static deleteBookmark(id: string): BookmarkItem[] {
    let list = this.getBookmarks();
    list = list.filter((item) => item.id !== id);
    this.bookmarksCache = list;

    try {
      fs.writeFileSync(this.bookmarksFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to update bookmarks.json:', e);
    }

    return list;
  }

  // ===== アーカイブ履歴 (Archive History) =====
  public static getArchiveHistory(): ArchiveRecord[] {
    if (this.historyCache) return this.historyCache;

    if (!fs.existsSync(this.historyFile)) {
      this.historyCache = [];
      return [];
    }

    try {
      const raw = fs.readFileSync(this.historyFile, 'utf-8');
      this.historyCache = JSON.parse(raw) || [];
    } catch {
      this.historyCache = [];
    }

    return this.historyCache || [];
  }

  public static addOrUpdateArchiveRecord(record: ArchiveRecord): void {
    const list = this.getArchiveHistory();
    const index = list.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.unshift(record);
    }

    const limit = this.getSettings().historyLimit || 5000;
    if (list.length > limit) {
      list.length = limit;
    }

    this.historyCache = list;
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save archive_history.json:', e);
    }
  }

  public static clearArchiveHistory(): void {
    this.historyCache = [];
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to clear archive_history.json:', e);
    }
  }

  // ===== 手動ブロックリスト (Custom Blocklist) =====
  public static getCustomBlocklist(): string {
    try {
      if (fs.existsSync(this.customBlockFile)) {
        return fs.readFileSync(this.customBlockFile, 'utf-8');
      }
    } catch {}
    return '';
  }

  public static saveCustomBlocklist(content: string): boolean {
    try {
      fs.writeFileSync(this.customBlockFile, content, 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to save custom_blocklist.txt:', e);
      return false;
    }
  }

  public static getCustomBlockFilePath(): string {
    return this.customBlockFile;
  }
}
