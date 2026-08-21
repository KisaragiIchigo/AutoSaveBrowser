import { app, BrowserWindow, ipcMain, dialog, shell, webContents } from 'electron';
import path from 'path';
import fs from 'fs';
import { PortablePathManager } from './services/portablePaths';
import { StorageService } from './services/storage';
import { AdBlockService } from './services/adblocker';
import { SaveQueueManager } from './services/queue';
import { ArchiverService } from './services/archiver';
import { AppSettings, BookmarkItem, SaveFormat } from '../renderer/types';

// ポータブル初期化（実行ディレクトリ直下に portable_data を設定）
PortablePathManager.initialize();
StorageService.initialize();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    backgroundColor: '#12161f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  SaveQueueManager.setMainWindow(mainWindow);
  AdBlockService.initialize();

  // 全 WebContents の生成をフック
  app.on('web-contents-created', (_event, contents) => {
    // ページロード完了時にコスメティックフィルター（CSS要素非表示）を注入
    contents.on('dom-ready', () => {
      AdBlockService.injectCosmetics(contents);
    });
    contents.on('did-finish-load', () => {
      AdBlockService.injectCosmetics(contents);
    });

    // 新規ウィンドウのポップアップを阻止し、アプリ内のタブとして開く
    contents.setWindowOpenHandler((details) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview:open-new-tab', {
          url: details.url,
          disposition: details.disposition,
        });
      }
      return { action: 'deny' };
    });

    // リンククリックでのナビゲーション制限（外部プロトコル等）
    contents.on('will-navigate', (e, navigationUrl) => {
      if (navigationUrl.startsWith('mailto:') || navigationUrl.startsWith('tel:')) {
        e.preventDefault();
        shell.openExternal(navigationUrl);
      }
    });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ===== IPC ハンドラー =====

// ウィンドウ操作
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// 設定関連
ipcMain.handle('settings:get', () => {
  return StorageService.getSettings();
});

ipcMain.handle('settings:save', (_event, newSettings: Partial<AppSettings>) => {
  const updated = StorageService.saveSettings(newSettings);
  if (newSettings.adblockEnabled !== undefined) {
    AdBlockService.toggleBlocking(newSettings.adblockEnabled);
  }
  return updated;
});

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const currentSettings = StorageService.getSettings();
  const currentPath = PortablePathManager.resolvePath(currentSettings.saveDir);

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: currentPath,
    title: '保存先フォルダを選択',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  return PortablePathManager.toRelativeIfInside(selectedPath);
});

ipcMain.handle('app:getPathInfo', () => {
  return {
    appRoot: PortablePathManager.getAppRoot(),
    portableDataDir: PortablePathManager.getPortableDataDir(),
    isPortable: true,
  };
});

// ブックマーク
ipcMain.handle('bookmarks:get', () => {
  return StorageService.getBookmarks();
});

ipcMain.handle('bookmarks:save', (_event, bm: Omit<BookmarkItem, 'id' | 'createdAt'>) => {
  return StorageService.saveBookmark(bm);
});

ipcMain.handle('bookmarks:delete', (_event, id: string) => {
  return StorageService.deleteBookmark(id);
});

// 手動ブロックリスト
ipcMain.handle('adblock:getBlocklist', () => {
  return StorageService.getCustomBlocklist();
});

ipcMain.handle('adblock:saveBlocklist', (_event, content: string) => {
  const ok = StorageService.saveCustomBlocklist(content);
  if (ok) {
    AdBlockService.reloadManualLists();
  }
  return ok;
});

ipcMain.handle('adblock:getFilterListDefs', () => {
  return AdBlockService.getFilterListDefs();
});

ipcMain.handle('adblock:toggleFilterList', async (_event, filterId: string, enabled: boolean) => {
  await AdBlockService.setFilterEnabled(filterId, enabled);
  return { success: true };
});

ipcMain.handle('adblock:updateEasyLists', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('adblock:status-changed', { updating: true, message: '広告ブロックフィルター一括更新中...' });
  }
  const res = await AdBlockService.updateEasyLists();
  if (mainWindow) {
    mainWindow.webContents.send('adblock:status-changed', { updating: false, message: res.message });
  }
  return res;
});

// 保存・アーカイブ
ipcMain.handle('archive:savePage', async (_event, params: {
  tabId: string;
  url: string;
  title: string;
  format?: SaveFormat;
  customOutPath?: string;
}) => {
  const allContents = webContents.getAllWebContents();
  let targetWc = allContents.find((wc) => wc.getURL() === params.url);
  if (!targetWc) {
    targetWc = allContents.find((wc) => wc.id !== mainWindow?.webContents.id);
  }

  if (!targetWc) {
    return { success: false, recordId: '', error: '対象のページ内容が見つかりません。' };
  }

  return SaveQueueManager.enqueue({
    tabId: params.tabId,
    url: params.url,
    title: params.title,
    format: params.format,
    customOutPath: params.customOutPath,
    targetWebContents: targetWc,
  });
});

ipcMain.handle('archive:getHistory', () => {
  return StorageService.getArchiveHistory();
});

ipcMain.handle('archive:clearHistory', () => {
  StorageService.clearArchiveHistory();
});

// ファイル操作
ipcMain.handle('fs:openInExplorer', (_event, rawFilePath: string) => {
  const resolved = PortablePathManager.resolvePath(rawFilePath);
  if (fs.existsSync(resolved)) {
    shell.showItemInFolder(resolved);
  } else {
    const dir = path.dirname(resolved);
    if (fs.existsSync(dir)) {
      shell.openPath(dir);
    }
  }
});

ipcMain.handle('fs:openFile', (_event, rawFilePath: string) => {
  const resolved = PortablePathManager.resolvePath(rawFilePath);
  if (fs.existsSync(resolved)) {
    shell.openPath(resolved);
  }
});
