import { useCallback, useEffect, useState } from "preact/hooks";

interface Receipt {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  url: string | null;
  created_at: string;
}

interface ReceiptUploaderProps {
  journalId: string;
  /** 読み取り専用モード（承認済み仕訳など） */
  readOnly?: boolean;
}

export default function ReceiptUploader({
  journalId,
  readOnly = false,
}: ReceiptUploaderProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // 証憑一覧を取得
  const fetchReceipts = useCallback(async () => {
    try {
      const response = await fetch(`/api/journals/${journalId}/receipts`);
      if (!response.ok) {
        throw new Error("証憑の取得に失敗しました");
      }
      const json = await response.json();
      setReceipts(json.data || []);
    } catch (err) {
      console.error("Fetch receipts error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [journalId]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // ファイルアップロード
  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("journal_id", journalId);

      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "アップロードに失敗しました");
      }

      const newReceipt = await response.json();
      setReceipts((prev) => [newReceipt, ...prev]);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "アップロードに失敗しました",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // ファイル削除
  const deleteReceipt = async (id: string) => {
    if (!confirm("この証憑を削除しますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/receipts?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "削除に失敗しました");
      }

      setReceipts((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // ファイル選択ハンドラ
  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // リセット
    target.value = "";
  };

  // ドラッグ＆ドロップハンドラ
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // MIME タイプに応じたアイコン
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📄";
    return "📎";
  };

  if (isLoading) {
    return (
      <div class="flex items-center justify-center p-4">
        <span class="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div class="st-stack st-stack--md">
      {/* エラー表示 */}
      {error && (
        <div class="st-alert st-alert--error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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
          <button class="st-button st-button--text st-button--sm" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* アップロードエリア */}
      {!readOnly && (
        <div
          class={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-base-300 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading
            ? (
              <div class="flex flex-col items-center gap-2">
                <span class="loading loading-spinner loading-lg"></span>
                <span style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
                  アップロード中...
                </span>
              </div>
            )
            : (
              <>
                <div class="text-4xl mb-2">📎</div>
                <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-2);">
                  ファイルをドラッグ＆ドロップ
                </p>
                <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">または</p>
                <label class="st-button st-button--outlined">
                  <input
                    type="file"
                    style="display: none;"
                    accept="image/jpeg,image/png,image/gif,application/pdf"
                    onChange={handleFileSelect}
                  />
                  ファイルを選択
                </label>
                <p class="text-xs text-base-content/50 mt-3">
                  JPEG, PNG, GIF, PDF（最大5MB）
                </p>
              </>
            )}
        </div>
      )}

      {/* 証憑一覧 */}
      {receipts.length > 0
        ? (
          <div class="space-y-2">
            <h4 style="font-weight: 500; font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
              添付ファイル ({receipts.length})
            </h4>
            <ul style="border-top: 1px solid var(--st-sys-color-outline-variant);">
              {receipts.map((receipt) => (
                <li key={receipt.id} class="py-2 flex items-center gap-3">
                  {/* サムネイル or アイコン */}
                  <div style="flex-shrink: 0; width: 3rem; height: 3rem; background: var(--st-sys-color-surface-variant); border-radius: var(--st-sys-shape-corner-medium); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    {receipt.mime_type.startsWith("image/") && receipt.url
                      ? (
                        <img
                          src={receipt.url}
                          alt={receipt.file_name}
                          class="w-full h-full object-cover"
                        />
                      )
                      : (
                        <span class="text-2xl">
                          {getFileIcon(receipt.mime_type)}
                        </span>
                      )}
                  </div>

                  {/* ファイル情報 */}
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">
                      {receipt.file_name}
                    </p>
                    <p style="font-size: var(--st-sys-typescale-label-small-size); color: var(--st-sys-color-on-surface-variant);">
                      {formatFileSize(receipt.file_size)}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div class="flex-shrink-0 flex gap-1">
                    {receipt.url && (
                      <a
                        href={receipt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-ghost btn-sm btn-square"
                        title="開く"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-4 h-4"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                          />
                        </svg>
                      </a>
                    )}
                    {!readOnly && (
                      <button
                        class="btn btn-ghost btn-sm btn-square text-error"
                        onClick={() => deleteReceipt(receipt.id)}
                        title="削除"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-4 h-4"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
        : (
          !readOnly && (
            <p style="text-align: center; font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); padding: var(--st-sys-spacing-4) 0;">
              証憑がまだ添付されていません
            </p>
          )
        )}
    </div>
  );
}
