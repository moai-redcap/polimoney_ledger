import { useState } from "preact/hooks";

interface ApproveButtonProps {
  journalId: string;
}

export default function ApproveButton({ journalId }: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (
      !confirm("この仕訳を承認しますか？\n承認すると Hub に自動同期されます。")
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/journals/${journalId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "承認に失敗しました");
      }

      const result = await response.json();
      setIsApproved(true);

      // 成功メッセージを表示後、ページをリロード
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Approve error:", err);
      setError(err instanceof Error ? err.message : "承認に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (isApproved) {
    return (
      <div class="st-flex st-flex--items-center st-gap-2" style="color: var(--st-sys-color-tertiary);">
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
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span>承認しました</span>
      </div>
    );
  }

  return (
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: var(--st-sys-spacing-2);">
      <button
        class="st-button st-button--filled"
        onClick={handleApprove}
        disabled={isLoading}
      >
        {isLoading
          ? "承認中..."
          : (
            <>
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
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              承認する
            </>
          )}
      </button>

      {error && <div style="color: var(--st-sys-color-error); font-size: var(--st-sys-typescale-body-small-size);">{error}</div>}
    </div>
  );
}
