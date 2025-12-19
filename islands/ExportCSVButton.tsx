import { useState } from "preact/hooks";

interface ExportCSVButtonProps {
  organizationId?: string | null;
  electionId?: string | null;
}

/**
 * CSV エクスポートボタン
 *
 * 支出一覧、収入一覧、科目別集計の CSV をダウンロード
 */
export default function ExportCSVButton({
  organizationId,
  electionId,
}: ExportCSVButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleExport = async (type: "expense" | "revenue" | "summary") => {
    setIsLoading(type);

    try {
      const params = new URLSearchParams({ type });
      if (organizationId) {
        params.set("organization_id", organizationId);
      } else if (electionId) {
        params.set("election_id", electionId);
      }

      const response = await fetch(`/api/export-csv?${params.toString()}`);

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "エクスポートに失敗しました");
      }

      // ダウンロード処理
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "export.csv";

      // filename*= 形式から取得
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      alert(
        error instanceof Error ? error.message : "エクスポートに失敗しました"
      );
    } finally {
      setIsLoading(null);
    }
  };

  const buttonLabel = isLoading ? "ダウンロード中..." : "CSV エクスポート";

  return (
    <div class="dropdown dropdown-end">
      <button
        type="button"
        class="btn btn-outline gap-2"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading !== null}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        {buttonLabel}
      </button>

      {isOpen && (
        <ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow mt-2">
          <li>
            <button
              onClick={() => handleExport("expense")}
              disabled={isLoading !== null}
              class="flex items-center gap-2"
            >
              {isLoading === "expense" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              支出一覧
            </button>
          </li>
          <li>
            <button
              onClick={() => handleExport("revenue")}
              disabled={isLoading !== null}
              class="flex items-center gap-2"
            >
              {isLoading === "revenue" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              収入一覧
            </button>
          </li>
          <li>
            <button
              onClick={() => handleExport("summary")}
              disabled={isLoading !== null}
              class="flex items-center gap-2"
            >
              {isLoading === "summary" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              科目別集計
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
