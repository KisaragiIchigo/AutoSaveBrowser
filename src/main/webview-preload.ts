import { ipcRenderer } from 'electron';

// マウスのサイドボタン（戻る/進む）はページ側へ配送されるため、
// ゲストで捕捉して Main プロセスへ通知する。
// app-command が発火しない環境での取りこぼし対策であり、
// 重複は Main 側の ShortcutService が弾く。
const NAVIGATION_BUTTONS: Record<number, 'go-back' | 'go-forward'> = {
  3: 'go-back',
  4: 'go-forward',
};

const handleNavigationButton = (e: MouseEvent) => {
  const action = NAVIGATION_BUTTONS[e.button];
  if (!action) return;

  e.preventDefault();
  e.stopPropagation();
  ipcRenderer.send('guest:nav-command', action);
};

window.addEventListener('mouseup', handleNavigationButton, true);
window.addEventListener('auxclick', handleNavigationButton, true);
