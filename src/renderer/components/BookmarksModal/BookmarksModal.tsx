import React, { useState, useEffect } from 'react';
import { X, Bookmark, Plus, Trash2, Globe, ExternalLink, BookmarkPlus } from 'lucide-react';
import { BookmarkItem, TabData } from '../../types';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab?: TabData;
  onOpenUrl: (url: string) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  onOpenUrl,
  onToast,
}) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const fetchBookmarks = async () => {
    try {
      const list = await window.electronAPI.getBookmarks();
      setBookmarks(list);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookmarks();
      setIsAdding(false);
      if (currentTab) {
        setNewTitle(currentTab.title || '');
        setNewUrl(currentTab.url || '');
      }
    }
  }, [isOpen, currentTab]);

  if (!isOpen) return null;

  // 現在のページをワンクリック追加
  const handleQuickAddCurrent = async () => {
    if (!currentTab || !currentTab.url || currentTab.url.startsWith('about:blank')) {
      onToast('有効なページが開かれていません', true);
      return;
    }

    try {
      const updated = await window.electronAPI.saveBookmark({
        title: currentTab.title || currentTab.url,
        url: currentTab.url,
        favicon: currentTab.favicon,
      });
      setBookmarks(updated);
      onToast(`ブックマークに追加しました: ${currentTab.title || currentTab.url}`);
    } catch {
      onToast('ブックマークの追加に失敗しました', true);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      const updated = await window.electronAPI.saveBookmark({
        title: newTitle.trim() || newUrl.trim(),
        url: newUrl.trim().startsWith('http') ? newUrl.trim() : 'https://' + newUrl.trim(),
      });
      setBookmarks(updated);
      setNewTitle('');
      setNewUrl('');
      setIsAdding(false);
      onToast('ブックマークを追加しました');
    } catch (e) {
      onToast('ブックマークの追加に失敗しました', true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await window.electronAPI.deleteBookmark(id);
      setBookmarks(updated);
      onToast('ブックマークを削除しました');
    } catch {
      onToast('削除に失敗しました', true);
    }
  };

  const handleOpenItem = (url: string) => {
    onOpenUrl(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[580px] max-h-[82vh] bg-bg-surface border border-border-base rounded-card shadow-glass flex flex-col overflow-hidden text-xs text-text-secondary">
        {/* ヘッダー */}
        <div className="h-12 px-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium text-sm text-text-primary">
            <Bookmark className="w-4 h-4 text-accent-amber" />
            <span>ブックマーク管理</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-elevated text-text-muted font-mono">
              {bookmarks.length}件
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* クイック現在タブ追加バー */}
        {currentTab && currentTab.url && !currentTab.url.startsWith('about:blank') && (
          <div className="p-3 bg-bg-app border-b border-border-subtle flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-6 h-6 rounded bg-bg-surface border border-border-subtle flex items-center justify-center flex-shrink-0">
                {currentTab.favicon ? (
                  <img src={currentTab.favicon} alt="" className="w-3.5 h-3.5 object-contain" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-accent-cyan" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-text-primary truncate text-[11px]">
                  {currentTab.title || '現在のページ'}
                </div>
                <div className="text-[10px] text-text-muted truncate font-mono">
                  {currentTab.url}
                </div>
              </div>
            </div>

            <button
              onClick={handleQuickAddCurrent}
              className="px-3 py-1.5 rounded-btn bg-accent-emerald hover:bg-accent-hover text-white font-medium shadow-glow flex items-center space-x-1.5 transition-colors flex-shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>このページを追加</span>
            </button>
          </div>
        )}

        {/* 手動追加フォーム */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="p-3 bg-bg-app border-b border-border-subtle space-y-2">
            <div>
              <label className="block text-text-muted text-[10px] mb-1">タイトル</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="タイトル"
                className="w-full h-8 px-3 bg-bg-surface border border-border-subtle focus:border-accent-emerald rounded-btn text-xs text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-text-muted text-[10px] mb-1">URL</label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/"
                className="w-full h-8 px-3 bg-bg-surface border border-border-subtle focus:border-accent-emerald rounded-btn text-xs text-text-primary outline-none font-mono"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-accent-emerald hover:bg-accent-hover text-white font-medium shadow-glow"
              >
                保存
              </button>
            </div>
          </form>
        ) : (
          <div className="px-3 py-2 border-b border-border-subtle flex justify-end">
            <button
              onClick={() => {
                if (currentTab) {
                  setNewTitle(currentTab.title || '');
                  setNewUrl(currentTab.url || '');
                }
                setIsAdding(true);
              }}
              className="px-2.5 py-1 rounded-btn bg-bg-elevated hover:bg-accent-primary hover:text-white text-text-primary flex items-center space-x-1.5 transition-colors text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>URLを手動入力して追加</span>
            </button>
          </div>
        )}

        {/* 一覧 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {bookmarks.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-text-muted space-y-1">
              <Bookmark className="w-6 h-6 opacity-30" />
              <span>登録されたブックマークはありません</span>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                onDoubleClick={() => handleOpenItem(bm.url)}
                className="flex items-center justify-between p-2.5 rounded-card bg-bg-app hover:bg-bg-elevated border border-border-subtle hover:border-border-base transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                  <Globe className="w-4 h-4 text-accent-cyan flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary truncate">{bm.title}</div>
                    <div className="text-[10px] text-text-muted truncate font-mono">{bm.url}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleOpenItem(bm.url)}
                    className="p-1.5 rounded hover:bg-bg-surface text-text-muted hover:text-text-primary transition-colors"
                    title="このタブで開く"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(bm.id)}
                    className="p-1.5 rounded hover:bg-status-error/20 text-text-muted hover:text-status-error transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
