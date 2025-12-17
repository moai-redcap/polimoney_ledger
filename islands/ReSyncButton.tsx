import { useState } from "preact/hooks";

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface ReSyncButtonProps {
  /** 台帳タイプ: "election" | "organization" */
  ledgerType?: "election" | "organization";
  /** 台帳 ID（指定時はその台帳のみ同期） */
  ledgerId?: string;
}

/**
 * 再同期ボタン（Danger Zone 用）
 *
 * 通常は承認時に自動同期されるため、このボタンは
 * Hub との同期にズレが生じた場合の緊急用です。
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
    <div class="border-2 border-error rounded-lg p-6 bg-error/5">
      {/* ヘッダー */}
      <div class="flex items-center gap-2 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-6 h-6 text-error"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <h3 class="text-lg font-bold text-error">Danger Zone</h3>
      </div>

      {/* 説明 */}
      <div class="mb-4">
        <h4 class="font-semibold mb-1">Hub との強制再同期</h4>
        <p class="text-sm text-base-content/70">
          通常、仕訳は承認時に自動で Hub に同期されます。
          このボタンは Hub とのデータにズレが生じた場合にのみ使用してください。
          承認済みの全仕訳が Hub に再送信されます。
        </p>
      </div>

      {/* ボタン or 確認ダイアログ */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
          class="btn btn-outline btn-error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          強制再同期を実行
        </button>
      ) : (
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-error">
            本当に再同期を実行しますか？
          </p>
          <div class="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isLoading}
              class={`btn btn-error ${isLoading ? "loading" : ""}`}
            >
              {isLoading ? (
                <>
                  <span class="loading loading-spinner loading-sm"></span>
                  再同期中...
                </>
              ) : (
                "はい、再同期します"
              )}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              class="btn btn-ghost"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div class="alert alert-error mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 成功表示 */}
      {result && (
        <div class="alert alert-success mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p class="font-bold">再同期完了!</p>
            <p class="text-sm">
              作成: {result.created} 件 / 更新: {result.updated} 件 / スキップ:{" "}
              {result.skipped} 件
              {result.errors > 0 && (
                <span class="text-error"> / エラー: {result.errors} 件</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

