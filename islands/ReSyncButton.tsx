import { useState } from "preact/hooks";

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface ReSyncButtonProps {
  /** 台帳タイプ "election" | "organization" */
  ledgerType?: "election" | "organization";
  /** 台帳 ID（指定時はその台帳のみ同期） */
  ledgerId?: string;
}

/**
 * 再同期ボタン（Danger Zone 用）
 *
 * 通常は承認時に自動同期されるため、このボタンは
 * Hub とのデータにズレが生じた場合の緊急用です。
 */
export default function ReSyncButton({
  ledgerType,
  ledgerId,
}: ReSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowConfirm(false);

    try {
      const params = new URLSearchParams();
      if (ledgerType) params.set("type", ledgerType);
      if (ledgerId) params.set("ledger_id", ledgerId);
      params.set("force", "true"); // 強制再同期フラグ

      const response = await fetch(`/api/sync?${params.toString()}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "同期に失敗しました");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style="border: 2px solid var(--st-sys-color-error); border-radius: var(--st-sys-shape-corner-large); padding: var(--st-sys-spacing-6); background: color-mix(in srgb, var(--st-sys-color-error) 5%, var(--st-sys-color-surface));">
      {/* ヘッダー */}
      <div class="st-flex st-flex--items-center st-gap-2" style="margin-bottom: var(--st-sys-spacing-4);">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          style="width: 1.5rem; height: 1.5rem; color: var(--st-sys-color-error);"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <h3 style="font-size: var(--st-sys-typescale-title-medium-size); font-weight: 700; color: var(--st-sys-color-error);">Danger Zone</h3>
      </div>

      {/* 説明 */}
      <div style="margin-bottom: var(--st-sys-spacing-4);">
        <h4 style="font-weight: 600; margin-bottom: var(--st-sys-spacing-1);">Hub との強制再同期</h4>
        <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
          通常、仕訳は承認時に自動で Hub に同期されます。このボタンは Hub
          とのデータにズレが生じた場合にのみ使用してください。
          承認済みの全仕訳が Hub に再送信されます。
        </p>
      </div>

      {/* ボタン or 確認ダイアログ */}
      {!showConfirm
        ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
            class="st-button st-button--outlined"
            style="color: var(--st-sys-color-error); border-color: var(--st-sys-color-error);"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              style="width: 1.25rem; height: 1.25rem;"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            強制再同期を実行
          </button>
        )
        : (
          <div class="st-stack st-stack--sm">
            <p style="font-size: var(--st-sys-typescale-body-small-size); font-weight: 600; color: var(--st-sys-color-error);">
              本当に再同期を実行しますか？
            </p>
            <div class="st-flex st-gap-2">
              <button
                onClick={handleSync}
                disabled={isLoading}
                class="st-button st-button--filled"
                style="background: var(--st-sys-color-error); color: var(--st-sys-color-on-error);"
              >
                {isLoading ? "再同期中..." : "はい、再同期します"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                class="st-button st-button--text"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

      {/* エラー表示 */}
      {error && (
        <div class="st-alert st-alert--error" style="margin-top: var(--st-sys-spacing-4);">
          <div class="st-alert__icon">❌</div>
          <div class="st-alert__content">{error}</div>
        </div>
      )}

      {/* 成功表示 */}
      {result && (
        <div class="st-alert st-alert--success" style="margin-top: var(--st-sys-spacing-4);">
          <div class="st-alert__icon">✅</div>
          <div class="st-alert__content">
            <p style="font-weight: 700;">再同期完了</p>
            <p style="font-size: var(--st-sys-typescale-body-small-size);">
              作成: {result.created} 件 / 更新: {result.updated} 件 / スキップ:{" "}
              {result.skipped} 件
              {result.errors > 0 && (
                <span style="color: var(--st-sys-color-error);"> / エラー: {result.errors} 件</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
