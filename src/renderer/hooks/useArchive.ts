import { useState, useEffect, useCallback } from 'react';
import { ArchiveRecord, SaveFormat } from '../types';

export function useArchive(onToast?: (msg: string, isError?: boolean) => void) {
  const [history, setHistory] = useState<ArchiveRecord[]>([]);
  const [activeTasks, setActiveTasks] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const list = await window.electronAPI.getArchiveHistory();
      setHistory(list);
    } catch (e) {
      console.error('Failed to get archive history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await window.electronAPI.clearArchiveHistory();
      setHistory([]);
      if (onToast) onToast('保存履歴を消去しました');
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }, [onToast]);

  const savePage = useCallback(async (params: {
    tabId: string;
    url: string;
    title: string;
    format?: SaveFormat;
  }) => {
    try {
      if (onToast) onToast(`保存開始: ${params.title || params.url}`);
      const result = await window.electronAPI.startSavePage(params);
      return result;
    } catch (e: any) {
      console.error('Failed to start saving page:', e);
      if (onToast) onToast(`保存エラー: ${e.message || String(e)}`, true);
      return { success: false, recordId: '', error: String(e) };
    }
  }, [onToast]);

  const openInExplorer = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.openPathInExplorer(filePath);
    } catch (e) {
      console.error('Failed to open explorer:', e);
    }
  }, []);

  const openFile = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.openFile(filePath);
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }, []);

  // リアルタイムステータス変化購読
  useEffect(() => {
    fetchHistory();

    const unsubscribe = window.electronAPI.onArchiveStatusChanged((record) => {
      // 履歴一覧の更新
      setHistory((prev) => {
        const index = prev.findIndex((r) => r.id === record.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = record;
          return next;
        }
        return [record, ...prev];
      });

      // アクティブタスク一覧の管理
      if (record.status === 'queued' || record.status === 'saving') {
        setActiveTasks((prev) => {
          const index = prev.findIndex((r) => r.id === record.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = record;
            return next;
          }
          return [...prev, record];
        });
      } else {
        // completed または failed の場合はアクティブタスクから除去
        setActiveTasks((prev) => prev.filter((r) => r.id !== record.id));

        if (record.status === 'completed' && onToast) {
          onToast(`保存完了: ${record.title}`);
        } else if (record.status === 'failed' && onToast) {
          onToast(`保存失敗: ${record.title} (${record.errorMessage || 'エラー'})`, true);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchHistory, onToast]);

  return {
    history,
    activeTasks,
    loading,
    savePage,
    clearHistory,
    openInExplorer,
    openFile,
    reloadHistory: fetchHistory,
  };
}
