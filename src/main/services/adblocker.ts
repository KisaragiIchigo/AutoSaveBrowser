import fs from 'fs';
import path from 'path';
import fetch from 'cross-fetch';
import { session, Session, WebContents } from 'electron';
import { FiltersEngine, Request } from '@ghostery/adblocker';
import { StorageService } from './storage';
import { PortablePathManager } from './portablePaths';
import { FilterListDef } from '../../renderer/types';

export const SUPPORTED_FILTERS: FilterListDef[] = [
  {
    id: 'easylist',
    name: 'EasyList',
    category: 'ads',
    url: 'https://easylist.to/easylist/easylist.txt',
    filename: 'easylist.txt',
    enabled: true,
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    category: 'privacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    filename: 'easyprivacy.txt',
    enabled: true,
  },
  {
    id: 'adguard_japanese',
    name: 'AdGuard Japanese (日本語広告・迷惑枠)',
    category: 'japanese',
    url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_7_Japanese/filter.txt',
    filename: 'adguard_japanese.txt',
    enabled: true,
  },
  {
    id: 'ublock_filters',
    name: 'uBlock filters – Ads, trackers, and more',
    category: 'ads',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    filename: 'ublock_filters.txt',
    enabled: true,
  },
  {
    id: 'ublock_badware',
    name: 'uBlock filters – Badware risks',
    category: 'security',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
    filename: 'ublock_badware.txt',
    enabled: true,
  },
  {
    id: 'peter_lowe',
    name: 'Peter Lowe – Ads, trackers, and more',
    category: 'ads',
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=0&mimetype=plaintext',
    filename: 'peter_lowe.txt',
    enabled: true,
  },
  {
    id: 'malicious_url',
    name: 'Malicious URL Blocklist (悪質URL遮断)',
    category: 'security',
    url: 'https://raw.githubusercontent.com/curbengh/urlhaus-filter/master/urlhaus-filter-online.txt',
    filename: 'malicious_urls.txt',
    enabled: true,
  },
  {
    id: 'block_lan_intrusion',
    name: 'Block Outsider Intrusion into LAN (ローカル侵入防御)',
    category: 'security',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/lan-block.txt',
    filename: 'ublock_lan.txt',
    enabled: true,
  },
  {
    id: 'easylist_ai_widgets',
    name: 'EasyList – AI Widgets (AIウィジェット非表示)',
    category: 'annoyances',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/easylist_cookie/easylist_cookie_general_hide.txt',
    filename: 'easylist_ai_widgets.txt',
    enabled: true,
  },
];

export class AdBlockService {
  private static engine: FiltersEngine | null = null;
  private static isUpdating: boolean = false;
  private static isHooked: boolean = false;
  private static cachedListsPath: string = '';

  public static async initialize(): Promise<void> {
    this.cachedListsPath = path.join(PortablePathManager.getAdblockDir(), 'adblock-engine-cache.bin');

    try {
      // 1. キャッシュバイナリが存在すれば高速復元
      if (fs.existsSync(this.cachedListsPath)) {
        try {
          const buffer = fs.readFileSync(this.cachedListsPath);
          this.engine = FiltersEngine.deserialize(buffer);
        } catch {
          await this.rebuildBlockerFromSources();
        }
      } else {
        await this.rebuildBlockerFromSources();
      }

      // 2. ネットワークリクエストフックのセットアップ
      this.setupWebRequestHook();
    } catch (err) {
      console.error('Failed to initialize AdBlockService:', err);
    }
  }

  public static getFilterListDefs(): FilterListDef[] {
    const settings = StorageService.getSettings();
    const configs = settings.filterConfigs || {};
    return SUPPORTED_FILTERS.map((f) => ({
      ...f,
      enabled: configs[f.id] !== undefined ? configs[f.id] : f.enabled,
    }));
  }

  public static async setFilterEnabled(filterId: string, enabled: boolean): Promise<void> {
    const settings = StorageService.getSettings();
    const configs = { ...(settings.filterConfigs || {}), [filterId]: enabled };
    StorageService.saveSettings({ filterConfigs: configs });
    await this.rebuildBlockerFromSources();
  }

  public static async rebuildBlockerFromSources(): Promise<void> {
    const adblockDir = PortablePathManager.getAdblockDir();
    const filterDefs = this.getFilterListDefs();
    const activeFilters = filterDefs.filter((f) => f.enabled);

    const contents: string[] = [];

    // ローカルに保存されている有効フィルターファイルを読み込み
    for (const filter of activeFilters) {
      const filePath = path.join(adblockDir, filter.filename);
      if (fs.existsSync(filePath)) {
        try {
          const text = fs.readFileSync(filePath, 'utf-8');
          contents.push(text);
        } catch {}
      }
    }

    // 手動ブロックリストを追加
    const customContent = StorageService.getCustomBlocklist();
    if (customContent) {
      contents.push(customContent);
    }

    if (contents.length > 0) {
      this.engine = FiltersEngine.parse(contents.join('\n'));
    } else {
      // 初回起動時などでローカルファイルがない場合は EasyList/EasyPrivacy を取得
      await this.updateEasyLists();
      return;
    }

    // キャッシュ保存
    try {
      if (this.engine) {
        const buffer = this.engine.serialize();
        fs.writeFileSync(this.cachedListsPath, buffer);
      }
    } catch {}
  }

  public static reloadManualLists(): void {
    this.rebuildBlockerFromSources();
  }

  public static setupWebRequestHook(): void {
    if (this.isHooked) return;
    this.isHooked = true;

    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      const settings = StorageService.getSettings();
      if (!settings.adblockEnabled || !this.engine) {
        callback({ cancel: false });
        return;
      }

      try {
        const req = Request.fromRawDetails({
          url: details.url,
          type: details.resourceType as any,
          sourceUrl: (details as any).referrer || (details as any).initiator || '',
        });

        const { match } = this.engine.match(req);
        if (match) {
          callback({ cancel: true });
          return;
        }
      } catch {}

      callback({ cancel: false });
    });
  }

  /**
   * WebContents のページロード時にコスメティックフィルター（CSS要素非表示）を注入
   */
  public static injectCosmetics(contents: WebContents): void {
    const settings = StorageService.getSettings();
    if (!settings.adblockEnabled || !this.engine) return;

    try {
      const pageUrl = contents.getURL();
      if (!pageUrl || pageUrl.startsWith('about:') || pageUrl.startsWith('chrome:')) return;

      const hostname = new URL(pageUrl).hostname;
      const { styles } = this.engine.getCosmeticsFilters({
        url: pageUrl,
        hostname,
        domain: hostname,
      });

      if (styles && styles.trim()) {
        contents.insertCSS(styles).catch(() => {});
      }
    } catch {}
  }

  public static toggleBlocking(_enabled: boolean): void {
    // onBeforeRequest 内で settings.adblockEnabled を直接参照しているため、
    // ここでの明示的なセッション付け替えは不要
  }

  public static async updateEasyLists(): Promise<{ success: boolean; message: string }> {
    if (this.isUpdating) {
      return { success: false, message: '既に更新処理が実行中です。' };
    }

    this.isUpdating = true;
    const adblockDir = PortablePathManager.getAdblockDir();
    const filterDefs = this.getFilterListDefs();

    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      filterDefs.map(async (filter) => {
        const filePath = path.join(adblockDir, filter.filename);
        try {
          const res = await fetch(filter.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          fs.writeFileSync(filePath, text, 'utf-8');
          successCount++;
        } catch (e) {
          console.error(`Failed to download filter ${filter.name}:`, e);
          failCount++;
        }
      })
    );

    // 最新のフィルター群からブロッカーを再構築
    await this.rebuildBlockerFromSources();
    this.isUpdating = false;

    return {
      success: successCount > 0,
      message: `フィルター更新完了: ${successCount}件成功 / ${failCount}件失敗`,
    };
  }
}
