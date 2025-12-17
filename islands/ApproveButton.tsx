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
      <div class="flex items-center gap-2 text-success">
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
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span>承認しました</span>
      </div>
    );
  }

  return (
    <div class="flex flex-col items-end gap-2">
      <button
        class={`btn btn-primary ${isLoading ? "loading" : ""}`}
        onClick={handleApprove}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span class="loading loading-spinner loading-sm"></span>
            承認中...
          </>
        ) : (
          <>
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
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            承認する
          </>
        )}
      </button>

      {error && <div class="text-error text-sm">{error}</div>}
    </div>
  );
}
