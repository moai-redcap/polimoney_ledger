/**
 * Zag.js ベースのアクセシブル Menu コンポーネント
 *
 * WAI-ARIA Menu パターンを自動適用：
 * - 矢印キーでのアイテムナビゲーション
 * - Enter/Space でのアイテム選択
 * - ESC キーでの閉じ動作
 * - aria-expanded, aria-haspopup 自動設定
 * - typeahead（文字入力でアイテム検索）
 */
import { useMachine, normalizeProps } from "@zag-js/preact";
import * as menu from "@zag-js/menu";
import { useId } from "preact/hooks";
import type { ComponentChildren, VNode } from "preact";

export interface ZagMenuItem {
  /** 一意の識別子 */
  value: string;
  /** 表示ラベル */
  label: string;
  /** 無効化 */
  disabled?: boolean;
  /** クリック時のコールバック */
  onSelect?: () => void;
}

export interface ZagMenuProps {
  /** メニューを開くトリガー要素 */
  trigger: VNode;
  /** メニューアイテム */
  items: ZagMenuItem[];
  /** アイテム選択時のコールバック */
  onSelect?: (value: string) => void;
  /** メニュー内のカスタムコンテンツ（items の代わりに使用） */
  children?: ComponentChildren;
}

export function ZagMenu({
  trigger,
  items,
  onSelect,
}: ZagMenuProps) {
  const id = useId();
  const service = useMachine(menu.machine, {
    id,
    onSelect(details) {
      const item = items.find((i) => i.value === details.value);
      if (item?.onSelect) item.onSelect();
      if (onSelect) onSelect(details.value);
    },
  });
  const api = menu.connect(service, normalizeProps);

  return (
    <>
      <span {...api.getTriggerProps()} data-component="menu-trigger">
        {trigger}
      </span>
      <div {...api.getPositionerProps()} data-component="menu-positioner">
        <ul {...api.getContentProps()} data-component="menu-content">
          {items.map((item) => (
            <li
              key={item.value}
              {...api.getItemProps({ value: item.value })}
              data-component="menu-item"
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default ZagMenu;
