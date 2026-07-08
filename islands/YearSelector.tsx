import { useState } from "preact/hooks";
import YearClosureDialog from "./YearClosureDialog.tsx";
import UnlockRequestDialog from "./UnlockRequestDialog.tsx";

interface YearClosureStatus {
  fiscal_year: number;
  status: "open" | "closed" | "locked" | "temporary_unlock";
  closed_at?: string;
}

interface YearSelectorProps {
  organizationId: string;
  currentYear: number;
  years: number[];
  closureStatuses: YearClosureStatus[];
}

export default function YearSelector({
  organizationId,
  currentYear,
  years,
  closureStatuses,
}: YearSelectorProps) {
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [reopening, setReopening] = useState(false);

  const currentStatus = closureStatuses.find(
    (s) => s.fiscal_year === currentYear,
  );
  const status = currentStatus?.status || "open";

  function handleYearChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const year = parseInt(target.value, 10);
    // URL クエリパラメータで年度を指定して遷移
    const url = new URL(globalThis.location.href);
    url.searchParams.set("year", year.toString());
    globalThis.location.href = url.href;
  }

  function handleSuccess() {
    setShowClosureDialog(false);
    setShowUnlockDialog(false);
    // ページをリロードしてステータスを更新
    globalThis.location.reload();
  }

  async function handleReopen() {
    if (
      !confirm(
        `${currentYear}年度の締めを解除しますか？\n編集可能な状態に戻ります。`,
      )
    ) {
      return;
    }

    setReopening(true);
    try {
      const res = await fetch("/api/closures/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, year: currentYear }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "締め解除に失敗しました");
      }

      globalThis.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setReopening(false);
    }
  }

  // ステータスのラベルを取得
  function getStatusLabel(s: string) {
    switch (s) {
      case "closed":
        return " (締め済)";
      case "locked":
        return " (ロック中)";
      case "temporary_unlock":
        return " (一時解除中)";
      default:
        return "";
    }
  }

  // ステータスバッジを返す
  function getStatusBadge() {
    switch (status) {
      case "closed":
        return <span class="badge badge-info">締め済み</span>;
      case "locked":
        return <span class="badge badge-neutral">ロック中</span>;
      case "temporary_unlock":
        return <span class="badge badge-warning">一時解除中</span>;
      default:
        return <span class="badge badge-success">編集可能</span>;
    }
  }

  return (
    <div class="flex items-center gap-4 mb-4">
      {/* 年度選択 */}
      <div class="flex items-center gap-2">
        <label class="font-medium">年度:</label>
        <select
          class="select select-bordered select-sm"
          value={currentYear}
          onChange={handleYearChange}
        >
          {years.map((year) => {
            const yearStatus = closureStatuses.find(
              (s) => s.fiscal_year === year,
            );
            const label = getStatusLabel(yearStatus?.status || "open");
            return (
              <option key={year} value={year}>
                {year}年度{label}
              </option>
            );
          })}
        </select>
      </div>

      {/* 締めステータス表示 */}
      {getStatusBadge()}

      {/* 年度締めボタン（open の時のみ） */}
      {status === "open" && (
        <button
          type="button"
          class="btn btn-sm btn-outline btn-warning"
          onClick={() => setShowClosureDialog(true)}
        >
          年度締め
        </button>
      )}

      {/* 締め解除ボタン（closed の時のみ） */}
      {status === "closed" && (
        <button
          type="button"
          class="btn btn-sm btn-outline btn-info"
          disabled={reopening}
          onClick={handleReopen}
        >
          {reopening ? <span class="loading loading-spinner loading-sm" /> : (
            "締め解除"
          )}
        </button>
      )}

      {/* ロック解除申請ボタン（locked の時のみ） */}
      {status === "locked" && (
        <button
          type="button"
          class="btn btn-sm btn-outline"
          onClick={() => setShowUnlockDialog(true)}
        >
          ロック解除申請
        </button>
      )}

      {/* 年度締めダイアログ */}
      {showClosureDialog && (
        <YearClosureDialog
          organizationId={organizationId}
          year={currentYear}
          onClose={() => setShowClosureDialog(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* ロック解除申請ダイアログ */}
      {showUnlockDialog && (
        <UnlockRequestDialog
          organizationId={organizationId}
          year={currentYear}
          hasPendingRequest={false}
          onClose={() => setShowUnlockDialog(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
