import fs from 'fs';
import path from 'path';
import { webContents, WebContents } from 'electron';
import { PortablePathManager } from './portablePaths';
import { StorageService } from './storage';
import { sanitizeFilename, extractDomain, formatTimestamp, dedupeFilePath, getFileSizeSafe } from './utils';
import { SaveFormat, ArchiveRecord } from '../../renderer/types';

export class ArchiverService {
  /**
   * ターゲットとなる WebContents のページを指定フォーマットで保存する
   */
  public static async saveTargetWebContents(
    targetWebContents: WebContents,
    params: {
      url: string;
      title: string;
      format?: SaveFormat;
      customOutPath?: string;
    }
  ): Promise<{ success: boolean; filePath?: string; record: ArchiveRecord; error?: string }> {
    const settings = StorageService.getSettings();
    const format = params.format || settings.saveFormat || 'complete_html';
    const domain = extractDomain(params.url);

    // 保存先ディレクトリの決定（ポータブル相対パス解決）
    const baseSaveDir = PortablePathManager.resolvePath(settings.saveDir);
    let targetDir = baseSaveDir;

    if (settings.domainSubdirEnabled) {
      targetDir = path.join(baseSaveDir, sanitizeFilename(domain, 60));
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // ファイル名の決定
    const sanitizedTitle = sanitizeFilename(params.title || domain);
    const prefix = settings.useTimestampPrefix ? `${formatTimestamp()}_` : '';
    
    let ext = '.html';
    if (format === 'mhtml') ext = '.mhtml';
    else if (format === 'pdf') ext = '.pdf';

    const rawFilename = `${prefix}${sanitizedTitle}${ext}`;
    const initialOutPath = params.customOutPath || path.join(targetDir, rawFilename);

    // 重複回避
    const finalOutPath = dedupeFilePath(initialOutPath, format === 'complete_html');

    const recordId = 'arc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const record: ArchiveRecord = {
      id: recordId,
      url: params.url,
      title: params.title || domain,
      filePath: finalOutPath,
      format,
      status: 'saving',
      domain,
      timestamp: Date.now(),
    };

    // 保存実行
    try {
      if (format === 'pdf') {
        const pdfData = await targetWebContents.printToPDF({
          printBackground: true,
          preferCSSPageSize: true,
        });
        fs.writeFileSync(finalOutPath, pdfData);
      } else {
        const electronSaveType = format === 'mhtml' ? 'MHTML' : 'HTMLComplete';
        await targetWebContents.savePage(finalOutPath, electronSaveType);
      }

      // 保存完了後のサイズ取得
      const fileSize = getFileSizeSafe(finalOutPath);
      record.status = 'completed';
      record.fileSize = fileSize;

      StorageService.addOrUpdateArchiveRecord(record);
      return { success: true, filePath: finalOutPath, record };
    } catch (err: any) {
      console.error('Save page error:', err);
      record.status = 'failed';
      record.errorMessage = err.message || String(err);
      StorageService.addOrUpdateArchiveRecord(record);
      return { success: false, record, error: record.errorMessage };
    }
  }

  /**
   * 全 WebContents から該当する URL または ID の WebContents を検索
   */
  public static findWebContents(criteria: { webContentsId?: number; url?: string }): WebContents | null {
    const all = webContents.getAllWebContents();
    if (criteria.webContentsId) {
      const found = all.find((wc) => wc.id === criteria.webContentsId);
      if (found) return found;
    }
    if (criteria.url) {
      const found = all.find((wc) => wc.getURL() === criteria.url);
      if (found) return found;
    }
    return null;
  }
}
