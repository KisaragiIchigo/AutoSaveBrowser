import React from 'react';
import { Plus, Layers, ArrowRightToLine, XCircle } from 'lucide-react';
import { TabItem } from './TabItem';
import { TabData } from '../../types';

interface TabBarProps {
  tabs: TabData[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCloseOtherTabs: (id: string) => void;
  onCloseRightTabs: (id: string) => void;
  onAddTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseRightTabs,
  onAddTab,
}) => {
  return (
    <div className="h-9 bg-bg-app border-b border-border-subtle flex items-end px-2 select-none overflow-hidden space-x-1">
      {/* タブリスト */}
      <div className="flex-1 flex items-end space-x-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={onSelectTab}
            onClose={onCloseTab}
            onCloseOthers={onCloseOtherTabs}
            onCloseRight={onCloseRightTabs}
          />
        ))}

        {/* 新規タブ追加ボタン */}
        <button
          onClick={onAddTab}
          className="w-7 h-7 flex items-center justify-center rounded-t-md hover:bg-bg-elevated/70 text-text-muted hover:text-text-primary transition-colors mb-[1px]"
          title="新しいタブを追加 (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* タブ整理アクション */}
      <div className="flex items-center space-x-1 mb-1 pl-2 border-l border-border-subtle text-xs text-text-muted flex-shrink-0">
        <span className="font-mono text-[11px] px-1 text-text-muted">
          Tabs: {tabs.length}
        </span>
        <button
          onClick={() => onCloseOtherTabs(activeTabId)}
          className="px-1.5 py-0.5 rounded hover:bg-bg-elevated hover:text-text-primary transition-colors text-[11px] flex items-center space-x-1"
          title="選択中以外のタブをすべて閉じる"
        >
          <XCircle className="w-3 h-3 text-status-warning" />
          <span>×他</span>
        </button>
        <button
          onClick={() => onCloseRightTabs(activeTabId)}
          className="px-1.5 py-0.5 rounded hover:bg-bg-elevated hover:text-text-primary transition-colors text-[11px] flex items-center space-x-1"
          title="選択中の右側のタブをすべて閉じる"
        >
          <ArrowRightToLine className="w-3 h-3 text-status-warning" />
          <span>×→</span>
        </button>
      </div>
    </div>
  );
};
