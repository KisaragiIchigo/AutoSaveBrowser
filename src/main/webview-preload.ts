import { ipcRenderer } from 'electron';

// Webview 内でのリンククリック・キーボード操作を監視
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e: MouseEvent) => {
    // Ctrl+クリック または Cmd+クリック
    if (e.ctrlKey || e.metaKey || e.button === 1) { // 1はマウス中クリック
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href && !target.href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        ipcRenderer.sendToHost('ctrl-click-link', {
          url: target.href,
          title: target.innerText || target.title || '',
        });
      }
    }
  }, true);

  // 中クリック (auxclick) の補足
  document.addEventListener('auxclick', (e: MouseEvent) => {
    if (e.button === 1) {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href && !target.href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        ipcRenderer.sendToHost('ctrl-click-link', {
          url: target.href,
          title: target.innerText || target.title || '',
        });
      }
    }
  }, true);
});
