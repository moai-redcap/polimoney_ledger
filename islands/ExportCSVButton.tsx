import { useState } from "preact/hooks";

interface ExportCSVButtonProps {
  ledgerId: string;
}

/**
 * CSV エクスポートボタン
 *
 * 支出一覧、収入一覧、科目別集計、資産等一覧の CSV をダウンロード
 * 一括ダウンロード（ZIP）にも対応
 */
export default function ExportCSVButton({
  ledgerId,
}: ExportCSVButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleExport = async (
    type: "expense" | "revenue" | "summary" | "assets" | "all",
    includeImages = false,
  ) => {
    setIsLoading(type + (includeImages ? "_with_images" : ""));

    try {
      const params = new URLSearchParams({ type });
      params.set("ledger_id", ledgerId);
      if (includeImages) {
        params.set("include_images", "true");
      }

      const response = await fetch(`/api/export-csv?${params.toString()}`);

      if (!response.ok) {
        // ZIP やCSVの場合、JSON パースがエラーになる可能性があるのでテキストで取得
        let errorMessage = "エクスポートに失敗しました";
        try {
          const json = await response.json();
          errorMessage = json.error || errorMessage;
        } catch {
          // JSONパースに失敗した場合はデフォルトメッセージ
        }
        throw new Error(errorMessage);
      }

      // ダウンロード処理
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = type === "all" ? "収支報告補助データ.zip" : "export.csv";

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
        error instanceof Error ? error.message : "エクスポートに失敗しました",
      );
    } finally {
      setIsLoading(null);
    }
  };

  const handleExportReport = async () => {
    setIsLoading("report");
    try {
      const params = new URLSearchParams();
      params.set("ledger_id", ledgerId);

      const response = await fetch(`/api/export-report?${params.toString()}`);

      if (!response.ok) {
        let errorMessage = "エクスポートに失敗しました";
        try {
          const json = await response.json();
          errorMessage = json.error || errorMessage;
        } catch { /* noop */ }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = organizationId
        ? "政治資金収支報告書_補助.zip"
        : "選挙運動費用収支報告書_補助.csv";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
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
      console.error("Export report error:", error);
      alert(
        error instanceof Error ? error.message : "エクスポートに失敗しました",
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
          style="width: 1.25rem; height: 1.25rem;"
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
        <ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-72 p-2 shadow mt-2">
          <li class="menu-title">
            <span>一括ダウンロード</span>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleExport("all")}
              disabled={isLoading !== null}
              class="flex items-center gap-2 font-bold"
            >
              {isLoading === "all" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              📦 CSV のみ（ZIP）
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleExport("all", true)}
              disabled={isLoading !== null}
              class="flex items-center gap-2 font-bold"
            >
              {isLoading === "all_with_images" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              🖼️ CSV + 領収書画像（ZIP）
            </button>
          </li>
          <li class="menu-title">
            <span>個別ダウンロード</span>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleExport("expense")}
              disabled={isLoading !== null}
              class="st-flex st-flex--items-center st-gap-2"
            >
              {isLoading === "expense" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              支出一覧
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleExport("revenue")}
              disabled={isLoading !== null}
              class="st-flex st-flex--items-center st-gap-2"
            >
              {isLoading === "revenue" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              収入一覧
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleExport("summary")}
              disabled={isLoading !== null}
              class="st-flex st-flex--items-center st-gap-2"
            >
              {isLoading === "summary" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              科目別集計
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => handleExport("assets")}
              disabled={isLoading !== null}
              class="st-flex st-flex--items-center st-gap-2"
            >
              {isLoading === "assets" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              資産等一覧
            </button>
          </li>
          <li class="menu-title">
            <span>収支報告書準拠（試験）</span>
          </li>
          <li>
            <button
              type="button"
              onClick={handleExportReport}
              disabled={isLoading !== null}
              class="flex items-center gap-2 font-bold text-secondary"
            >
              {isLoading === "report" && (
                <span class="loading loading-spinner loading-xs"></span>
              )}
              📊 収支報告書 CSV（一括 ZIP）
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
