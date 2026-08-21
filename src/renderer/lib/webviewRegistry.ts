/**
 * タブIDと Webview 要素の対応表。
 * Webview の src 属性は初期URLのまま固定されるため、DOM セレクタでは遷移後の要素を特定できない。
 * ナビゲーション操作（戻る/進む/再読込/URL遷移）は必ずこのレジストリ経由で対象を取得する。
 */
export interface WebviewHandle {
  goBack(): void;
  goForward(): void;
  reload(): void;
  loadURL(url: string): Promise<void>;
  canGoBack(): boolean;
  canGoForward(): boolean;
  getURL(): string;
  getTitle(): string;
}

const elements = new Map<string, WebviewHandle>();

export const webviewRegistry = {
  register(tabId: string, element: WebviewHandle): void {
    elements.set(tabId, element);
  },

  unregister(tabId: string): void {
    elements.delete(tabId);
  },

  get(tabId: string): WebviewHandle | null {
    return elements.get(tabId) ?? null;
  },
};
