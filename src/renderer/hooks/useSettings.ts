import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pathInfo, setPathInfo] = useState<{ appRoot: string; portableDataDir: string; isPortable: boolean } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getSettings();
      setSettings(data);
      const info = await window.electronAPI.getAppPathInfo();
      setPathInfo(info);
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = await window.electronAPI.saveSettings(newSettings);
      setSettings(updated);
      return updated;
    } catch (e) {
      console.error('Failed to update settings:', e);
      return null;
    }
  }, []);

  const selectDirectory = useCallback(async () => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      return selected;
    } catch (e) {
      console.error('Failed to select directory:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    pathInfo,
    updateSettings,
    selectDirectory,
    reloadSettings: fetchSettings,
  };
}
