import { useState } from "preact/hooks";

interface Transfer {
  id: string;
  from_user_id: string;
  organization_id: string | null;
  election_id: string | null;
  requested_at: string;
  political_organizations?: {
    id: string;
    name: string;
  } | null;
  elections?: {
    id: string;
    election_name: string;
  } | null;
}

interface PendingTransfersProps {
  initialTransfers: Transfer[];
}

export default function PendingTransfers({
  initialTransfers,
}: PendingTransfersProps) {
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (transfers.length === 0) {
    return null;
  }

  const handleAccept = async (transfer: Transfer) => {
    if (
      !confirm(
        `「${
          transfer.political_organizations?.name ||
          transfer.elections?.election_name ||
          "この台帳"
        }」のオーナー譲渡を承認しますか？`,
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ownership-transfers/${transfer.id}/accept`,
        { method: "POST" },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "承認に失敗しました");
      }

      setTransfers(transfers.filter((t) => t.id !== transfer.id));
      setSuccess("オーナー譲渡を承認しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (transfer: Transfer) => {
    if (!confirm("この譲渡申請を拒否しますか？")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ownership-transfers/${transfer.id}/decline`,
        { method: "POST" },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "拒否に失敗しました");
      }

      setTransfers(transfers.filter((t) => t.id !== transfer.id));
      setSuccess("譲渡申請を拒否しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="card bg-warning/10 border border-warning shadow mb-6">
      <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
        <h2 class="card-title text-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style="width: 1.5rem; height: 1.5rem;"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          承認待ちのオーナー譲渡申請
        </h2>

        {error && (
          <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
            <span>{error}</span>
            <button class="st-button st-button--text st-button--sm" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

        {success && (
          <div class="st-alert st-alert--success" style="margin-bottom: var(--st-sys-spacing-4);">
            <span>{success}</span>
            <button
              class="st-button st-button--text st-button--sm"
              onClick={() => setSuccess(null)}
            >
              ✕
            </button>
          </div>
        )}

        <div class="space-y-3">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              class="flex items-center justify-between p-4 bg-base-100 rounded-lg"
            >
              <div>
                <p style="font-weight: 500;">
                  {transfer.political_organizations?.name ||
                    transfer.elections?.election_name ||
                    "不明な台帳"}
                </p>
                <p class="text-sm text-base-content/60">
                  {new Date(transfer.requested_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  に申請
                </p>
              </div>
              <div class="st-flex st-gap-2">
                <button
                  class="st-button st-button--text st-button--sm"
                  onClick={() => handleDecline(transfer)}
                  disabled={isLoading}
                >
                  拒否
                </button>
                <button
                  class="st-button st-button--filled st-button--sm"
                  onClick={() => handleAccept(transfer)}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <span class="st-spinner st-spinner--sm" />
                  )}
                  承認
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
