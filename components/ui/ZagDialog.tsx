/**
 * Zag.js ベースのアクセシブル Dialog コンポーネント
 *
 * WAI-ARIA Dialog パターンを自動適用：
 * - フォーカストラップ（Tab/Shift+Tab）
 * - ESC キーでの閉じ動作
 * - 背景クリックでの閉じ動作
 * - aria-modal, aria-labelledby, aria-describedby 自動設定
 * - 開閉時のフォーカス復帰
 *
 * @example
 * ```tsx
 * import { ZagDialog } from "../components/ui/ZagDialog.tsx";
 *
 * function MyIsland() {
 *   return (
 *     <ZagDialog
 *       trigger={<button>開く</button>}
 *       title="確認"
 *       description="本当に削除しますか？"
 *     >
 *       <button onClick={onDelete}>削除する</button>
 *     </ZagDialog>
 *   );
 * }
 * ```
 */
import { useMachine, normalizeProps } from "@zag-js/preact";
import * as dialog from "@zag-js/dialog";
import { useId } from "preact/hooks";
import type { ComponentChildren, VNode } from "preact";

export interface ZagDialogProps {
  /** ダイアログを開くトリガー要素 */
  trigger: VNode;
  /** ダイアログのタイトル */
  title: string;
  /** ダイアログの説明（任意） */
  description?: string;
  /** ダイアログ内のコンテンツ */
  children: ComponentChildren;
  /** 閉じるボタンのラベル（デフォルト: "閉じる"） */
  closeLabel?: string;
  /** 閉じたときのコールバック */
  onClose?: () => void;
  /** モーダルかどうか（デフォルト: true） */
  modal?: boolean;
  /** 初期状態で開くかどうか */
  defaultOpen?: boolean;
  /** 外側をクリックで閉じるか（デフォルト: true） */
  closeOnInteractOutside?: boolean;
}

export function ZagDialog({
  trigger,
  title,
  description,
  children,
  closeLabel = "閉じる",
  onClose,
  modal = true,
  defaultOpen = false,
  closeOnInteractOutside = true,
}: ZagDialogProps) {
  const id = useId();
  const service = useMachine(dialog.machine, {
    id,
    modal,
    defaultOpen,
    closeOnInteractOutside,
    onOpenChange(details) {
      if (!details.open && onClose) {
        onClose();
      }
    },
  });
  const api = dialog.connect(service, normalizeProps);

  return (
    <>
      {/* トリガー */}
      <span {...api.getTriggerProps()}>
        {trigger}
      </span>

      {/* ダイアログ本体 */}
      {api.open && (
        <div {...api.getBackdropProps()} data-component="dialog-backdrop">
          <div {...api.getPositionerProps()} data-component="dialog-positioner">
            <div {...api.getContentProps()} data-component="dialog-content">
              {/* ヘッダー */}
              <div data-component="dialog-header">
                <h2 {...api.getTitleProps()}>{title}</h2>
                <button
                  {...api.getCloseTriggerProps()}
                  data-component="dialog-close"
                  aria-label={closeLabel}
                >
                  ✕
                </button>
              </div>

              {/* 説明文 */}
              {description && (
                <p {...api.getDescriptionProps()} data-component="dialog-description">
                  {description}
                </p>
              )}

              {/* コンテンツ */}
              <div data-component="dialog-body">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ZagDialog;
