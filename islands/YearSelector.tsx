import { useState } from "preact/hooks";
import YearClosureDialog from "./YearClosureDialog.tsx";
import ArchiveDialog from "./ArchiveDialog.tsx";

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
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

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
    setShowArchiveDialog(false);
    // ページをリロードしてステータスを更新
    globalThis.location.reload();
  }

  // ステータスのラベルを取得
  function getStatusLabel(s: string) {
    switch (s) {
      case "closed":
        return " (締め済)";
      case "locked":
        return " (アーカイブ済)";
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
        return <span class="badge badge-neutral">アーカイブ済</span>;
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

      {/* アーカイブボタン（closed の時のみ） */}
      {status === "closed" && (
        <button
          type="button"
          class="btn btn-sm btn-outline btn-neutral"
          onClick={() => setShowArchiveDialog(true)}
        >
          アーカイブ
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

      {/* アーカイブダイアログ */}
      {showArchiveDialog && (
        <ArchiveDialog
          organizationId={organizationId}
          year={currentYear}
          onClose={() => setShowArchiveDialog(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
