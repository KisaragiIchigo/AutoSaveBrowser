import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class PortablePathManager {
  private static appRoot: string = '';
  private static portableDataDir: string = '';

  public static initialize(): void {
    // ポータブル実行ディレクトリの判定
    // electron-builder でのポータブル実行時は PORTABLE_EXECUTABLE_DIR が設定される
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      this.appRoot = process.env.PORTABLE_EXECUTABLE_DIR;
    } else if (app.isPackaged) {
      this.appRoot = path.dirname(app.getPath('exe'));
    } else {
      // 開発時はプロジェクトルート（dist-electron の1つ上）
      this.appRoot = path.resolve(__dirname, '../');
    }

    // 常にアプリと同じ階層の portable_data フォルダをデータルートとする
    this.portableDataDir = path.join(this.appRoot, 'portable_data');

    // ディレクトリが存在しない場合は自動作成
    if (!fs.existsSync(this.portableDataDir)) {
      fs.mkdirSync(this.portableDataDir, { recursive: true });
    }

    // Electron の userData, session データも portable_data 内に保持
    const profileDir = path.join(this.portableDataDir, 'profile');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    app.setPath('userData', profileDir);
  }

  public static getAppRoot(): string {
    return this.appRoot;
  }

  public static getPortableDataDir(): string {
    return this.portableDataDir;
  }

  public static getConfigDir(): string {
    const p = path.join(this.portableDataDir, 'config');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  }

  public static getAdblockDir(): string {
    const p = path.join(this.getConfigDir(), 'adblock');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  }

  public static getLogsDir(): string {
    const p = path.join(this.portableDataDir, 'logs');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  }

  public static getDefaultSaveDir(): string {
    // 既定の保存先は portable_data/saved_pages
    const p = path.join(this.portableDataDir, 'saved_pages');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  }

  /**
   * 相対パス（例: ./saved_pages や ./my_archive）を絶対パスに解決
   */
  public static resolvePath(rawPath: string): string {
    if (!rawPath) return this.getDefaultSaveDir();
    if (path.isAbsolute(rawPath)) {
      return path.normalize(rawPath);
    }
    return path.normalize(path.resolve(this.appRoot, rawPath));
  }

  /**
   * 絶対パスをアプリルートからの相対パスに変換可能なら変換
   */
  public static toRelativeIfInside(targetPath: string): string {
    const normalizedTarget = path.normalize(targetPath);
    const normalizedRoot = path.normalize(this.appRoot);
    if (normalizedTarget.startsWith(normalizedRoot)) {
      const rel = path.relative(normalizedRoot, normalizedTarget);
      return './' + rel.replace(/\\/g, '/');
    }
    return targetPath;
  }
}
