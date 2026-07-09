import { useState } from "preact/hooks";

interface Issue {
  type: "error" | "warning";
  category: "draft" | "receipt" | "imbalance";
  message: string;
  journalId?: string;
  journalDate?: string;
  description?: string;
}

interface CheckResult {
  canClose: boolean;
  issues: Issue[];
  summary: {
    totalJournals: number;
    draftCount: number;
    missingReceiptCount: number;
    imbalanceCount: number;
  };
}

interface YearClosureDialogProps {
  organizationId: string;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function YearClosureDialog({
  organizationId,
  year,
  onClose,
  onSuccess,
}: YearClosureDialogProps) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  // 初回チェック実行
  useState(() => {
    checkClosure();
  });

  async function checkClosure() {
    setChecking(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/closures/check?org_id=${organizationId}&year=${year}`,
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "チェックに失敗しました");
      }
      const data: CheckResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setChecking(false);
    }
  }

  async function executeClosure() {
    setClosing(true);
    setError(null);

    try {
      const res = await fetch("/api/closures/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, year }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "締め処理に失敗しました");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setClosing(false);
    }
  }

  function copyIssues() {
    if (!result) return;

    const text = result.issues
      .map((issue) => {
        const type = issue.type === "error" ? "【必須】" : "【注意】";
        const date = issue.journalDate ? `(${issue.journalDate})` : "";
        return `${type} ${issue.message} ${date}`;
      })
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      alert("不備リストをコピーしました");
    });
  }

  const errorCount = result?.issues.filter((i) => i.type === "error").length ||
    0;
  const warningCount =
    result?.issues.filter((i) => i.type === "warning").length || 0;

  return (
    <dialog id="year_closure_dialog" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">{year}年度の締め処理</h3>

        {checking && (
          <div class="flex items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
            <span class="ml-2">チェック中...</span>
          </div>
        )}

        {error && (
          <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
            <span>{error}</span>
          </div>
        )}

        {result && !checking && (
          <>
            {/* サマリー */}
            <div class="stats shadow mb-4 w-full">
              <div class="stat">
                <div class="stat-title">仕訳数</div>
                <div class="stat-value text-lg">
                  {result.summary.totalJournals}
                </div>
              </div>
              <div class="stat">
                <div class="stat-title">エラー</div>
                <div class="stat-value text-lg text-error">{errorCount}</div>
              </div>
              <div class="stat">
                <div class="stat-title">警告</div>
                <div class="stat-value text-lg text-warning">
                  {warningCount}
                </div>
              </div>
            </div>

            {/* 締め可能 */}
            {result.canClose && result.issues.length === 0 && (
              <div class="st-alert st-alert--success" style="margin-bottom: var(--st-sys-spacing-4);">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  すべてのチェックが完了しました。年度締めを実行できます。
                </span>
              </div>
            )}

            {/* 警告のみで締め可能 */}
            {result.canClose && warningCount > 0 && (
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
                <span>警告がありますが、年度締めを実行できます。</span>
              </div>
            )}

            {/* 締め不可 */}
            {!result.canClose && (
              <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
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
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>エラーを解消してから締め処理を行ってください。</span>
              </div>
            )}

            {/* 不備リスト */}
            {result.issues.length > 0 && (
              <div style="margin-bottom: var(--st-sys-spacing-4);">
                <div class="flex items-center justify-between mb-2">
                  <h4 style="font-weight: 700;">不備リスト</h4>
                  <button
                    type="button"
                    class="st-button st-button--outlined st-button--sm"
                    onClick={copyIssues}
                  >
                    📋 コピー
                  </button>
                </div>
                <div class="max-h-64 overflow-y-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>種別</th>
                        <th>内容</th>
                        <th>日付</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.issues.map((issue, i) => (
                        <tr key={i}>
                          <td>
                            {issue.type === "error"
                              ? (
                                <span class="st-badge st-badge--sm" style="background: var(--st-sys-color-error); color: var(--st-sys-color-on-error);">
                                  必須
                                </span>
                              )
                              : (
                                <span class="st-badge st-badge--sm" style="background: var(--st-sys-color-tertiary); color: var(--st-sys-color-on-tertiary);">
                                  注意
                                </span>
                              )}
                          </td>
                          <td class="max-w-sm truncate">{issue.message}</td>
                          <td class="whitespace-nowrap">
                            {issue.journalDate || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* アクション */}
        <div class="modal-action">
          <button type="button" class="st-button" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            class="st-button st-button--filled"
            disabled={!result?.canClose || closing}
            onClick={executeClosure}
          >
            {closing
              ? <span class="st-spinner st-spinner--sm"></span>
              : (
                "年度締めを実行"
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
