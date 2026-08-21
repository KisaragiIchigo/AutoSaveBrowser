import { BrowserWindow, WebContents } from 'electron';
import { ArchiverService } from './archiver';
import { StorageService } from './storage';
import { SaveFormat, ArchiveRecord } from '../../renderer/types';

interface QueueItem {
  id: string;
  tabId: string;
  url: string;
  title: string;
  format?: SaveFormat;
  customOutPath?: string;
  targetWebContents: WebContents;
  resolve: (res: { success: boolean; filePath?: string; recordId: string; error?: string }) => void;
}

export class SaveQueueManager {
  private static queue: QueueItem[] = [];
  private static activeCount: number = 0;
  private static mainWindow: BrowserWindow | null = null;

  public static setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  public static enqueue(params: {
    tabId: string;
    url: string;
    title: string;
    format?: SaveFormat;
    customOutPath?: string;
    targetWebContents: WebContents;
  }): Promise<{ success: boolean; filePath?: string; recordId: string; error?: string }> {
    return new Promise((resolve) => {
      const id = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const item: QueueItem = {
        id,
        tabId: params.tabId,
        url: params.url,
        title: params.title,
        format: params.format,
        customOutPath: params.customOutPath,
        targetWebContents: params.targetWebContents,
        resolve,
      };

      this.queue.push(item);

      // キュー投入ステータスをレンダラーに通知（待機中）
      this.notifyStatus({
        id,
        url: params.url,
        title: params.title,
        filePath: '',
        format: params.format || StorageService.getSettings().saveFormat,
        status: 'queued',
        domain: '',
        timestamp: Date.now(),
      });

      this.processNext();
    });
  }

  private static async processNext(): Promise<void> {
    const maxSlots = StorageService.getSettings().saveSlotsMax || 2;
    if (this.activeCount >= maxSlots || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;

    // 実行中ステータス通知
    this.notifyStatus({
      id: item.id,
      url: item.url,
      title: item.title,
      filePath: '',
      format: item.format || StorageService.getSettings().saveFormat,
      status: 'saving',
      domain: '',
      timestamp: Date.now(),
    });

    // 実行中タイムアウト（90秒に拡大。待機キューはタイムアウトしない）
    const timeoutPromise = new Promise<{ success: boolean; error: string }>((_, reject) => {
      setTimeout(() => reject(new Error('ページ保存がタイムアウトしました (90秒)')), 90000);
    });

    try {
      if (item.targetWebContents.isDestroyed()) {
        throw new Error('タブが既に閉じられています');
      }

      // 1回目の実行
      const executeSave = () =>
        ArchiverService.saveTargetWebContents(item.targetWebContents, {
          url: item.url,
          title: item.title,
          format: item.format,
          customOutPath: item.customOutPath,
        });

      let result: any;
      try {
        result = await Promise.race([executeSave(), timeoutPromise]);
      } catch (firstErr) {
        // 1回目の失敗時：WebContentsがまだ生きていれば800ms待って1回だけリトライ
        if (!item.targetWebContents.isDestroyed()) {
          await new Promise((r) => setTimeout(r, 800));
          result = await Promise.race([executeSave(), timeoutPromise]);
        } else {
          throw firstErr;
        }
      }

      this.notifyStatus(result.record);

      item.resolve({
        success: result.success,
        filePath: result.filePath,
        recordId: result.record.id,
        error: result.error,
      });
    } catch (err: any) {
      console.error('Queue execution error for:', item.url, err);
      const errorRecord: ArchiveRecord = {
        id: item.id,
        url: item.url,
        title: item.title,
        filePath: '',
        format: item.format || 'complete_html',
        status: 'failed',
        domain: '',
        timestamp: Date.now(),
        errorMessage: err.message || String(err),
      };
      this.notifyStatus(errorRecord);

      item.resolve({
        success: false,
        recordId: item.id,
        error: errorRecord.errorMessage,
      });
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      // 次のキューを消化
      setTimeout(() => {
        this.processNext();
      }, 50);
    }
  }

  private static notifyStatus(record: ArchiveRecord): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('archive:status-changed', record);
    }
  }
}
