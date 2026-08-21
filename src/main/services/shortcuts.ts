import { BrowserWindow, WebContents } from 'electron';
import { ShortcutAction } from '../../renderer/types';

// マウスサイドボタンは app-command とゲスト側 DOM の2経路から届くため、
// 短時間の重複を弾いて二重ナビゲーションを防ぐ
const NAV_DEDUP_MS = 250;

const NAVIGATION_ACTIONS: ReadonlySet<ShortcutAction> = new Set<ShortcutAction>(['go-back', 'go-forward']);

/**
 * キーボードショートカットとマウスサイドボタンを一元的に受け取り、
 * 正規化したアクションとして Renderer へ配送する。
 * Webview にフォーカスがある間は Renderer 側の keydown が発火しないため、
 * 検知は必ず Main プロセス側で行う。
 */
export class ShortcutService {
  private static mainWindow: BrowserWindow | null = null;
  private static lastNavigationAt: Partial<Record<ShortcutAction, number>> = {};

  public static setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  /** ウィンドウ単位のマウスサイドボタン（Windows の WM_APPCOMMAND）を購読する */
  public static registerWindowCommands(win: BrowserWindow): void {
    win.on('app-command', (_event, command) => {
      if (command === 'browser-backward') {
        this.dispatch('go-back');
      } else if (command === 'browser-forward') {
        this.dispatch('go-forward');
      }
    });
  }

  /** ホスト・ゲストを問わず WebContents のキー入力を横取りする */
  public static attachToWebContents(contents: WebContents): void {
    contents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      const action = resolveAction(input);
      if (!action) return;

      event.preventDefault();
      this.dispatch(action);
    });
  }

  /** ゲストページの DOM から届いたナビゲーション要求（サイドボタンの取りこぼし対策） */
  public static dispatchNavigation(action: 'go-back' | 'go-forward'): void {
    this.dispatch(action);
  }

  private static dispatch(action: ShortcutAction): void {
    if (NAVIGATION_ACTIONS.has(action)) {
      const now = Date.now();
      const last = this.lastNavigationAt[action] ?? 0;
      if (now - last < NAV_DEDUP_MS) return;
      this.lastNavigationAt[action] = now;
    }

    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    if (action === 'toggle-devtools') {
      this.mainWindow.webContents.toggleDevTools();
      return;
    }

    this.mainWindow.webContents.send('app:shortcut', action);
  }
}

function resolveAction(input: Electron.Input): ShortcutAction | null {
  const key = input.key.toLowerCase();
  const ctrl = input.control || input.meta;

  // Alt + 左右矢印: 戻る / 進む
  if (input.alt && !ctrl) {
    if (key === 'arrowleft') return 'go-back';
    if (key === 'arrowright') return 'go-forward';
    return null;
  }

  if (!ctrl) {
    if (key === 'f5') return 'reload';
    if (key === 'f12') return 'toggle-devtools';
    return null;
  }

  if (input.shift) {
    if (key === 's') return 'toggle-save-mode';
    if (key === 'i') return 'toggle-devtools';
    return null;
  }

  switch (key) {
    case 't': return 'new-tab';
    case 'w': return 'close-tab';
    case 'l': return 'focus-address';
    case 'd': return 'bookmark';
    case 's': return 'save-current';
    case 'h': return 'toggle-sidebar';
    case 'r': return 'reload';
    default: return null;
  }
}
