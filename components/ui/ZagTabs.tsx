/**
 * Zag.js ベースのアクセシブル Tabs コンポーネント
 *
 * WAI-ARIA Tabs パターンを自動適用：
 * - 矢印キーでのタブ切替
 * - aria-selected, aria-controls 自動設定
 * - タブパネルとタブの関連付け
 */
import { useMachine, normalizeProps } from "@zag-js/preact";
import * as tabs from "@zag-js/tabs";
import { useId } from "preact/hooks";
import type { ComponentChildren } from "preact";

export interface ZagTabItem {
  /** 一意の識別子 */
  value: string;
  /** タブのラベル */
  label: string;
  /** タブパネルのコンテンツ */
  content: ComponentChildren;
  /** 無効化 */
  disabled?: boolean;
}

export interface ZagTabsProps {
  /** タブアイテム */
  items: ZagTabItem[];
  /** デフォルトで選択されるタブ */
  defaultValue?: string;
  /** タブ変更時のコールバック */
  onValueChange?: (value: string) => void;
}

export function ZagTabs({
  items,
  defaultValue,
  onValueChange,
}: ZagTabsProps) {
  const id = useId();
  const service = useMachine(tabs.machine, {
    id,
    defaultValue: defaultValue ?? items[0]?.value,
    onValueChange(details) {
      if (onValueChange) onValueChange(details.value);
    },
  });
  const api = tabs.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} data-component="tabs">
      {/* タブリスト */}
      <div {...api.getListProps()} data-component="tabs-list">
        {items.map((item) => (
          <button
            key={item.value}
            {...api.getTriggerProps({ value: item.value })}
            data-component="tabs-trigger"
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* タブパネル */}
      {items.map((item) => (
        <div
          key={item.value}
          {...api.getContentProps({ value: item.value })}
          data-component="tabs-content"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

export default ZagTabs;
