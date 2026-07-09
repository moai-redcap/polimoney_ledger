import { useState } from "preact/hooks";

interface ArchiveDialogProps {
  organizationId: string;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ArchiveDialog({
  organizationId,
  year,
  onClose,
  onSuccess,
}: ArchiveDialogProps) {
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function executeArchive() {
    setArchiving(true);
    setError(null);

    try {
      const res = await fetch("/api/closures/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, year }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "アーカイブに失敗しました");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <dialog id="archive_dialog" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{year}年度のアーカイブ</h3>

        <div class="st-alert st-alert--warning" style="margin-bottom: var(--st-sys-spacing-4);">
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
            <p style="font-weight: 700;">アーカイブすると：</p>
            <ul class="text-sm mt-1 list-disc list-inside">
              <li>このデータは完全にロックされます</li>
              <li>編集にはHub管理者への解除申請が必要です</li>
            </ul>
          </div>
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
            class="st-button st-button--filled" style="background: var(--st-sys-color-tertiary); color: var(--st-sys-color-on-tertiary);"
            disabled={archiving}
            onClick={executeArchive}
          >
            {archiving
              ? <span class="st-spinner st-spinner--sm"></span>
              : (
                "アーカイブを実行"
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
