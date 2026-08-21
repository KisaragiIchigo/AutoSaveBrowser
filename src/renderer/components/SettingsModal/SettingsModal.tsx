import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Shield,
  RotateCw,
  Sliders,
  Check,
  ListFilter,
} from 'lucide-react';
import { AppSettings, SaveFormat, FilterListDef } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<any>;
  onSelectDirectory: () => Promise<string | null>;
  onToast: (msg: string, isError?: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onSelectDirectory,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'save' | 'adblock' | 'startup'>('save');

  // ローカルステート
  const [saveDir, setSaveDir] = useState<string>('');
  const [saveFormat, setSaveFormat] = useState<SaveFormat>('complete_html');
  const [domainSubdirEnabled, setDomainSubdirEnabled] = useState<boolean>(true);
  const [useTimestampPrefix, setUseTimestampPrefix] = useState<boolean>(false);
  const [autosaveStartDelayMs, setAutosaveStartDelayMs] = useState<number>(400);
  const [saveSlotsMax, setSaveSlotsMax] = useState<number>(2);
  const [autoCloseAfterSave, setAutoCloseAfterSave] = useState<boolean>(true);
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo' | 'bing' | 'yahoo'>('google');
  const [adblockEnabled, setAdblockEnabled] = useState<boolean>(true);
  const [startupUrlsText, setStartupUrlsText] = useState<string>('');
  const [blocklistText, setBlocklistText] = useState<string>('');
  const [filterLists, setFilterLists] = useState<FilterListDef[]>([]);
  const [isUpdatingAdblock, setIsUpdatingAdblock] = useState<boolean>(false);

  // モーダルが開かれた瞬間だけ、現在の設定からローカルステートを同期（作業中に上書きされないようにする）
  useEffect(() => {
    if (isOpen && settings) {
      setSaveDir(settings.saveDir);
      setSaveFormat(settings.saveFormat);
      setDomainSubdirEnabled(settings.domainSubdirEnabled);
      setUseTimestampPrefix(settings.useTimestampPrefix);
      setAutosaveStartDelayMs(settings.autosaveStartDelayMs);
      setSaveSlotsMax(settings.saveSlotsMax);
      setAutoCloseAfterSave(settings.autoCloseAfterSave ?? true);
      setSearchEngine(settings.searchEngine);
      setAdblockEnabled(settings.adblockEnabled);
      setStartupUrlsText((settings.startupUrls || []).join('\n'));

      window.electronAPI.getBlocklist().then(setBlocklistText);
      loadFilterLists();
    }
  }, [isOpen]);

  const loadFilterLists = async () => {
    try {
      const list = await window.electronAPI.getFilterListDefs();
      setFilterLists(list);
    } catch {}
  };

  if (!isOpen) return null;

  const handleChooseDir = async () => {
    const selected = await onSelectDirectory();
    if (selected) {
      setSaveDir(selected);
      onToast(`保存先フォルダを選択しました: ${selected}`);
    }
  };

  const handleToggleFilterItem = async (filterId: string, currentEnabled: boolean) => {
    const next = !currentEnabled;
    try {
      await window.electronAPI.toggleFilterList(filterId, next);
      setFilterLists((prev) =>
        prev.map((f) => (f.id === filterId ? { ...f, enabled: next } : f))
      );
      onToast(`フィルター設定を更新しました: ${next ? '有効' : '無効'}`);
    } catch {
      onToast('フィルター設定の更新に失敗しました', true);
    }
  };

  const handleSaveAll = async () => {
    const startupUrls = startupUrlsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await onSaveSettings({
      saveDir,
      saveFormat,
      domainSubdirEnabled,
      useTimestampPrefix,
      autosaveStartDelayMs,
      saveSlotsMax,
      autoCloseAfterSave,
      searchEngine,
      adblockEnabled,
      startupUrls,
    });

    await window.electronAPI.saveBlocklist(blocklistText);
    onToast('設定を保存して適用しました');
    onClose();
  };

  const handleUpdateEasyList = async () => {
    setIsUpdatingAdblock(true);
    onToast('全フィルターリストを一括更新中...');
    try {
      const res = await window.electronAPI.updateEasyLists();
      if (res.success) {
        onToast(res.message || 'フィルターの更新が完了しました');
        loadFilterLists();
      } else {
        onToast(`更新失敗: ${res.message}`, true);
      }
    } catch (e: any) {
      onToast(`更新エラー: ${e.message || String(e)}`, true);
    } finally {
      setIsUpdatingAdblock(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'japanese':
        return <span className="px-1.5 py-0.5 rounded bg-accent-rose/20 text-accent-rose font-medium text-[10px]">日本語専用</span>;
      case 'ads':
        return <span className="px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-accent font-medium text-[10px]">広告ブロック</span>;
      case 'privacy':
        return <span className="px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan font-medium text-[10px]">プライバシー</span>;
      case 'security':
        return <span className="px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber font-medium text-[10px]">セキュリティ</span>;
      case 'annoyances':
        return <span className="px-1.5 py-0.5 rounded bg-status-info/20 text-status-info font-medium text-[10px]">迷惑要素/AI</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[680px] max-h-[88vh] bg-bg-surface border border-border-base rounded-card shadow-glass flex flex-col overflow-hidden text-xs text-text-secondary">
        {/* モーダルヘッダー */}
        <div className="h-12 px-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium text-sm text-text-primary">
            <Sliders className="w-4 h-4 text-accent-emerald" />
            <span>アプリケーション設定</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="h-10 px-4 border-b border-border-subtle bg-bg-app flex items-center space-x-2 select-none">
          <button
            onClick={() => setActiveTab('save')}
            className={`px-3 py-1.5 rounded-btn font-medium transition-colors ${
              activeTab === 'save'
                ? 'bg-bg-surface text-accent-accent border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            保存・アーカイブ設定
          </button>
          <button
            onClick={() => setActiveTab('adblock')}
            className={`px-3 py-1.5 rounded-btn font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'adblock'
                ? 'bg-bg-surface text-accent-accent border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>広告＆プライバシーブロック ({filterLists.filter((f) => f.enabled).length}有効)</span>
          </button>
          <button
            onClick={() => setActiveTab('startup')}
            className={`px-3 py-1.5 rounded-btn font-medium transition-colors ${
              activeTab === 'startup'
                ? 'bg-bg-surface text-accent-accent border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            起動・ブラウザ設定
          </button>
        </div>

        {/* モーダルコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'save' && (
            <div className="space-y-4">
              {/* 保存先ディレクトリ */}
              <div>
                <label className="block text-text-primary font-medium mb-1.5">
                  保存先フォルダ（ポータブル相対パス対応）
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={saveDir}
                    onChange={(e) => setSaveDir(e.target.value)}
                    className="flex-1 h-8 px-3 bg-bg-app border border-border-subtle focus:border-accent-emerald rounded-btn font-mono text-xs text-text-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleChooseDir}
                    className="h-8 px-3 flex items-center space-x-1.5 rounded-btn bg-bg-elevated hover:bg-accent-emerald hover:text-white text-text-primary border border-border-subtle transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>参照...</span>
                  </button>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  ※ `./portable_data/saved_pages` など相対パスで指定するとUSBを持ち運んでも安心です。
                </p>
              </div>

              {/* 保存形式 */}
              <div>
                <label className="block text-text-primary font-medium mb-1.5">保存フォーマット</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'complete_html', label: '完全HTML (推奨)', desc: 'HTML本体 + アセットフォルダ' },
                    { id: 'mhtml', label: '単一ファイル (MHTML)', desc: '1つのMHTMLファイルに統合' },
                    { id: 'pdf', label: 'PDF文書', desc: 'ページをPDFとして保存' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSaveFormat(fmt.id as SaveFormat)}
                      className={`p-2.5 rounded-card border text-left transition-all ${
                        saveFormat === fmt.id
                          ? 'bg-accent-primary/10 border-accent-emerald text-text-primary'
                          : 'bg-bg-app border-border-subtle hover:border-border-base text-text-muted'
                      }`}
                    >
                      <div className="font-medium text-xs text-text-primary mb-0.5">{fmt.label}</div>
                      <div className="text-[10px] text-text-muted">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ドメイン別自動振り分け & 日時プレフィックス */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={domainSubdirEnabled}
                    onChange={(e) => setDomainSubdirEnabled(e.target.checked)}
                    className="w-4 h-4 rounded bg-bg-app border-border-base text-accent-emerald focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-text-primary font-medium">ドメイン別サブフォルダへ自動仕分け</span>
                    <p className="text-[10px] text-text-muted">`保存先/example.com/ページ名.html` のように整理します</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTimestampPrefix}
                    onChange={(e) => setUseTimestampPrefix(e.target.checked)}
                    className="w-4 h-4 rounded bg-bg-app border-border-base text-accent-emerald focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-text-primary font-medium">ファイル名先頭にタイムスタンプを付与</span>
                    <p className="text-[10px] text-text-muted">`20260821_120000_ページ名.html` のように保存します</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCloseAfterSave}
                    onChange={(e) => setAutoCloseAfterSave(e.target.checked)}
                    className="w-4 h-4 rounded bg-bg-app border-border-base text-accent-emerald focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-text-primary font-medium">保存完了後にバックグラウンドタブを自動で閉じる</span>
                    <p className="text-[10px] text-text-muted">Ctrl+クリックで開いたタブが保存完了次第クローズされます</p>
                  </div>
                </label>
              </div>

              {/* 遅延＆スロット */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                <div>
                  <label className="block text-text-primary font-medium mb-1">
                    自動保存開始遅延: <span className="font-mono text-accent-accent">{autosaveStartDelayMs} ms</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="3000"
                    step="100"
                    value={autosaveStartDelayMs}
                    onChange={(e) => setAutosaveStartDelayMs(Number(e.target.value))}
                    className="w-full accent-accent-emerald cursor-pointer"
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">ページ読み込み完了から保存開始までの待機時間</p>
                </div>

                <div>
                  <label className="block text-text-primary font-medium mb-1">
                    同時保存スロット数: <span className="font-mono text-accent-accent">{saveSlotsMax} 本</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={saveSlotsMax}
                    onChange={(e) => setSaveSlotsMax(Number(e.target.value))}
                    className="w-full accent-accent-emerald cursor-pointer"
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">同時にバックグラウンド保存を実行する最大数</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'adblock' && (
            <div className="space-y-4">
              {/* マスターAdBlockトグル */}
              <div className="flex items-center justify-between p-3 rounded-card bg-bg-app border border-border-subtle">
                <div className="flex items-center space-x-2.5">
                  <Shield className="w-5 h-5 text-accent-emerald" />
                  <div>
                    <div className="font-medium text-text-primary">総合広告ブロック機能</div>
                    <div className="text-[10px] text-text-muted">全ネットワーク遮断＆コスメティック（要素非表示）フィルター</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdblockEnabled(!adblockEnabled)}
                  className={`px-3 py-1 rounded-btn font-mono text-xs transition-colors ${
                    adblockEnabled
                      ? 'bg-accent-emerald text-white shadow-glow'
                      : 'bg-bg-elevated text-text-muted border border-border-subtle'
                  }`}
                >
                  {adblockEnabled ? '有効 (ON)' : '無効 (OFF)'}
                </button>
              </div>

              {/* フィルター一括更新ヘッダー */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1.5 text-text-primary font-medium">
                  <ListFilter className="w-4 h-4 text-accent-accent" />
                  <span>導入済みフィルターリスト一覧 (9種類)</span>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingAdblock}
                  onClick={handleUpdateEasyList}
                  className="px-3 py-1.5 rounded-btn bg-bg-elevated hover:bg-accent-emerald/20 hover:text-accent-emerald text-text-secondary border border-border-subtle transition-colors flex items-center space-x-1.5 disabled:opacity-50 text-[11px]"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isUpdatingAdblock ? 'animate-spin' : ''}`} />
                  <span>全フィルターを最新に更新</span>
                </button>
              </div>

              {/* 9つのフィルター一覧カード */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filterLists.map((filter) => (
                  <div
                    key={filter.id}
                    className={`flex items-center justify-between p-2.5 rounded-card border transition-all ${
                      filter.enabled
                        ? 'bg-bg-app border-border-base'
                        : 'bg-bg-app/40 border-border-subtle/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={filter.enabled}
                        onChange={() => handleToggleFilterItem(filter.id, filter.enabled)}
                        className="w-4 h-4 rounded bg-bg-surface border-border-base text-accent-emerald focus:ring-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-text-primary truncate text-[11px]">
                            {filter.name}
                          </span>
                          {getCategoryBadge(filter.category)}
                        </div>
                        <div className="text-[10px] text-text-muted truncate font-mono mt-0.5">
                          {filter.url}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFilterItem(filter.id, filter.enabled)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] transition-colors ${
                        filter.enabled
                          ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                          : 'bg-bg-elevated text-text-muted border border-border-subtle'
                      }`}
                    >
                      {filter.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>

              {/* 手動ブロックリスト */}
              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-text-primary font-medium mb-1">
                  手動ブロック＆ホワイトリスト（1行1ルール、ホワイトリストは `@@ドメイン`）
                </label>
                <textarea
                  rows={4}
                  value={blocklistText}
                  onChange={(e) => setBlocklistText(e.target.value)}
                  placeholder="例:&#10;||ads.example.com^&#10;tracking.analyzer.org&#10;@@||allowed-site.com^"
                  className="w-full p-2.5 bg-bg-app border border-border-subtle focus:border-accent-emerald rounded-card font-mono text-xs text-text-primary outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'startup' && (
            <div className="space-y-4">
              {/* 検索エンジン */}
              <div>
                <label className="block text-text-primary font-medium mb-1.5">デフォルト検索エンジン</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'google', label: 'Google' },
                    { id: 'duckduckgo', label: 'DuckDuckGo' },
                    { id: 'bing', label: 'Bing' },
                    { id: 'yahoo', label: 'Yahoo! JAPAN' },
                  ].map((engine) => (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => setSearchEngine(engine.id as any)}
                      className={`py-2 px-3 rounded-card border text-center font-medium transition-all ${
                        searchEngine === engine.id
                          ? 'bg-accent-primary/20 border-accent-emerald text-accent-accent'
                          : 'bg-bg-app border-border-subtle text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {engine.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 起動URL */}
              <div>
                <label className="block text-text-primary font-medium mb-1">
                  起動時に自動で開くURL（1行1URL）
                </label>
                <textarea
                  rows={5}
                  value={startupUrlsText}
                  onChange={(e) => setStartupUrlsText(e.target.value)}
                  placeholder="https://www.google.com/&#10;https://news.ycombinator.com/"
                  className="w-full p-2.5 bg-bg-app border border-border-subtle focus:border-accent-emerald rounded-card font-mono text-xs text-text-primary outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="h-12 px-4 border-t border-border-subtle bg-bg-app flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-btn hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-1.5 rounded-btn bg-accent-emerald hover:bg-accent-hover text-white font-medium shadow-glow transition-all flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存して適用</span>
          </button>
        </div>
      </div>
    </div>
  );
};
