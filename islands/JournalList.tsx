import { useState } from "preact/hooks";
import { type Journal, type JournalEntry } from "../lib/types.ts";

interface AccountCode {
  code: string;
  name: string;
  type: string;
}

interface JournalListProps {
  journals: Journal[];
  basePath: string;
  accountCodes?: AccountCode[];
}

// 勘定科目コードから名前を取得するヘルパー関数を作成
function createAccountNameGetter(
  accountCodes?: AccountCode[],
): (code: string) => string {
  const accountMap = new Map<string, string>();
  if (accountCodes) {
    for (const ac of accountCodes) {
      accountMap.set(ac.code, ac.name);
    }
  }
  return (code: string) => accountMap.get(code) || code;
}

// 金額をフォーマット
function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

// 日付をフォーマット
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 仕訳の合計金額を計算
function calculateTotal(entries: JournalEntry[]): number {
  return entries.reduce(
    (sum, entry) => sum + entry.debit_amount + entry.credit_amount,
    0,
  );
}

// 収支区分を判定
function getIncomeExpenseType(entries: JournalEntry[]): "income" | "expense" {
  const totalDebit = entries.reduce((sum, e) => sum + e.debit_amount, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit_amount, 0);
  return totalCredit > totalDebit ? "income" : "expense";
}

export default function JournalList({
  journals,
  basePath,
  accountCodes,
}: JournalListProps) {
  const [filter, setFilter] = useState<"all" | "draft" | "approved">("all");

  // 勘定科目コード→名前の変換関数
  const getAccountName = createAccountNameGetter(accountCodes);

  const filteredJournals = journals.filter((j) => {
    if (filter === "all") return true;
    return j.status === filter;
  });

  const draftCount = journals.filter((j) => j.status === "draft").length;
  const approvedCount = journals.filter((j) => j.status === "approved").length;

  // 収入・支出の合計
  const totals = filteredJournals.reduce(
    (acc, j) => {
      const type = getIncomeExpenseType(j.journal_entries);
      const amount = calculateTotal(j.journal_entries);
      if (type === "income") {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return (
    <div>
      {/* フィルタータブ */}
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div class="tabs tabs-boxed">
          <button
            class={`tab ${filter === "all" ? "tab-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            すべて ({journals.length})
          </button>
          <button
            class={`tab ${filter === "draft" ? "tab-active" : ""}`}
            onClick={() => setFilter("draft")}
          >
            <span class="badge badge-warning badge-sm mr-1">下書き</span>
            {draftCount}
          </button>
          <button
            class={`tab ${filter === "approved" ? "tab-active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <span class="badge badge-success badge-sm mr-1">承認済</span>
            {approvedCount}
          </button>
        </div>

        {/* 収支サマリー */}
        <div class="text-sm">
          <span class="text-primary font-medium">
            収入: ¥{formatAmount(totals.income)}
          </span>
          <span class="mx-2">|</span>
          <span class="text-error font-medium">
            支出: ¥{formatAmount(totals.expense)}
          </span>
        </div>
      </div>

      {/* 仕訳一覧 */}
      {filteredJournals.length === 0
        ? (
          <div class="text-center py-12">
            <div class="text-6xl mb-4">📋</div>
            <p class="text-base-content/70">仕訳がありません</p>
          </div>
        )
        : (
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>収支</th>
                  <th>日付</th>
                  <th>借方</th>
                  <th>貸方</th>
                  <th>摘要</th>
                  <th>取引先</th>
                  <th class="text-right">金額</th>
                  <th>ステータス</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredJournals.map((journal) => {
                  const type = getIncomeExpenseType(journal.journal_entries);
                  const amount = calculateTotal(journal.journal_entries);

                  // 借方・貸方のエントリを分離
                  const debitEntries = journal.journal_entries.filter(
                    (e) => e.debit_amount > 0,
                  );
                  const creditEntries = journal.journal_entries.filter(
                    (e) => e.credit_amount > 0,
                  );

                  return (
                    <tr key={journal.id}>
                      <td>
                        {type === "income"
                          ? (
                            <span class="badge badge-primary badge-sm">
                              収入
                            </span>
                          )
                          : (
                            <span class="badge badge-error badge-sm">支出</span>
                          )}
                      </td>
                      <td class="whitespace-nowrap">
                        {journal.journal_date
                          ? (
                            formatDate(journal.journal_date)
                          )
                          : <span class="text-base-content/50">-</span>}
                      </td>
                      <td>
                        <div class="text-sm">
                          {debitEntries.map((e, i) => (
                            <div key={i} class="text-primary">
                              {getAccountName(e.account_code)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm">
                          {creditEntries.map((e, i) => (
                            <div key={i} class="text-secondary">
                              {getAccountName(e.account_code)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div class="max-w-xs truncate">
                          {journal.description}
                        </div>
                      </td>
                      <td>
                        {journal.contacts?.[0]?.name || (
                          <span class="text-base-content/50">-</span>
                        )}
                      </td>
                      <td class="text-right font-mono">
                        ¥{formatAmount(amount)}
                      </td>
                      <td>
                        {journal.status === "draft"
                          ? (
                            <span class="badge badge-warning badge-sm">
                              下書き
                            </span>
                          )
                          : (
                            <span class="badge badge-success badge-sm">
                              承認済
                            </span>
                          )}
                      </td>
                      <td>
                        <a
                          href={`/journals/${journal.id}`}
                          class="btn btn-ghost btn-sm"
                        >
                          詳細
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
