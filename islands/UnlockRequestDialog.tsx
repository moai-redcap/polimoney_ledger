import { useState } from "preact/hooks";

interface UnlockRequestDialogProps {
  organizationId: string;
  year: number;
  hasPendingRequest: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnlockRequestDialog({
  organizationId,
  year,
  hasPendingRequest,
  onClose,
  onSuccess,
}: UnlockRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (reason.trim().length < 10) {
      setError("理由は10文字以上で入力してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/closures/unlock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, year, reason: reason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "リクエスト送信に失敗しました");
      }

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  // 既に申請中の場合
  if (hasPendingRequest) {
    return (
      <dialog id="unlock_request_dialog" class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">{year}年度のロック解除申請</h3>

          <div class="st-alert st-alert--info" style="margin-bottom: var(--st-sys-spacing-4);">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p style="font-weight: 700;">申請中です</p>
              <p style="font-size: var(--st-sys-typescale-body-small-size);">
                この年度のロック解除リクエストは既に申請されています。
                Hub管理者の審査をお待ちください。
              </p>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="st-button" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" onClick={onClose}>
            close
          </button>
        </form>
      </dialog>
    );
  }

  return (
    <dialog id="unlock_request_dialog" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{year}年度のロック解除申請</h3>

        <div class="alert alert-warning mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p style="font-weight: 700;">ご注意</p>
            <ul class="text-sm mt-1 list-disc list-inside">
              <li>申請は1件のみ有効です</li>
              <li>Hub管理者による審査に時間がかかる場合があります</li>
              <li>承認後、一定期間のみ編集可能になります</li>
            </ul>
          </div>
        </div>

        <div class="form-control mb-4">
          <label class="st-field__label-wrapper">
            <span class="st-field__label" style="font-weight: 500;">解除理由</span>
            <span class="label-text-alt text-error">必須（10文字以上）</span>
          </label>
          <textarea
            class="textarea textarea-bordered h-24"
            placeholder="例: 記載漏れがあったため、領収証を追加登録する必要があります"
            value={reason}
            onInput={(e) => setReason((e.target as HTMLTextAreaElement).value)}
          />
          <label class="st-field__label-wrapper">
            <span class="st-field__helper">
              {reason.length}文字
              {reason.length < 10 && reason.length > 0 && (
                <span class="text-error ml-2">
                  あと{10 - reason.length}文字
                </span>
              )}
            </span>
          </label>
        </div>

        {error && (
          <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
            <span>{error}</span>
          </div>
        )}

        <div class="modal-action">
          <button type="button" class="st-button" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            class="st-button st-button--filled"
            disabled={submitting || reason.trim().length < 10}
            onClick={handleSubmit}
          >
            {submitting
              ? <span class="st-spinner st-spinner--sm" />
              : (
                "申請を送信"
              )}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
