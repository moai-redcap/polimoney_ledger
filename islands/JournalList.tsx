import { useState } from "preact/hooks";

interface JournalEntry {
  id: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
}

interface Journal {
  id: string;
  journal_date: string;
  description: string;
  status: "draft" | "approved";
  contact_id: string | null;
  created_at: string;
  journal_entries: JournalEntry[];
  contacts: {
    name: string;
  } | null;
}

interface JournalListProps {
  journals: Journal[];
  basePath: string;
}

// 勘定科目コードから名前を取得
const ACCOUNT_NAMES: Record<string, string> = {
  // 収入
  REV_INDIVIDUAL: "個人からの寄附",
  REV_CORPORATE: "法人からの寄附",
  REV_POLITICAL_PARTY: "政党からの寄附",
  REV_OTHER_ORG: "その他団体からの寄附",
  REV_DUES: "党費・会費",
  REV_DONATION_IN_KIND: "寄附（金銭以外）",
  REV_OTHER: "その他の収入",
  // 支出
  EXP_PERSONNEL: "人件費",
  EXP_OFFICE: "事務所費",
  EXP_UTILITIES: "光熱水費",
  EXP_COMMUNICATION: "通信費",
  EXP_TRAVEL: "交通費",
  EXP_PRINTING: "印刷費",
  EXP_ADVERTISING: "広告宣伝費",
  EXP_MEETING: "会議費",
  EXP_SUPPLIES: "備品・消耗品費",
  EXP_RESEARCH: "調査研究費",
  EXP_OTHER: "その他の支出",
};

function getAccountName(code: string): string {
  return ACCOUNT_NAMES[code] || code;
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
  return entries.reduce((sum, entry) => sum + entry.debit_amount + entry.credit_amount, 0);
}

// 収支区分を判定
function getIncomeExpenseType(entries: JournalEntry[]): "income" | "expense" {
  const totalDebit = entries.reduce((sum, e) => sum + e.debit_amount, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit_amount, 0);
  return totalCredit > totalDebit ? "income" : "expense";
}

export default function JournalList({ journals, basePath }: JournalListProps) {
  const [filter, setFilter] = useState<"all" | "draft" | "approved">("all");

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
    { income: 0, expense: 0 }
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
      {filteredJournals.length === 0 ? (
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <p class="text-base-content/70">仕訳がありません</p>
        </div>
      ) : (
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>収支</th>
                <th>日付</th>
                <th>勘定科目</th>
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
                const accountCode = journal.journal_entries[0]?.account_code;

                return (
                  <tr key={journal.id}>
                    <td>
                      {type === "income" ? (
                        <span class="badge badge-primary badge-sm">収入</span>
                      ) : (
                        <span class="badge badge-error badge-sm">支出</span>
                      )}
                    </td>
                    <td class="whitespace-nowrap">
                      {formatDate(journal.journal_date)}
                    </td>
                    <td>{getAccountName(accountCode)}</td>
                    <td>
                      <div class="max-w-xs truncate">{journal.description}</div>
                    </td>
                    <td>
                      {journal.contacts?.name || (
                        <span class="text-base-content/50">-</span>
                      )}
                    </td>
                    <td class="text-right font-mono">
                      ¥{formatAmount(amount)}
                    </td>
                    <td>
                      {journal.status === "draft" ? (
                        <span class="badge badge-warning badge-sm">下書き</span>
                      ) : (
                        <span class="badge badge-success badge-sm">承認済</span>
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
