import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { getSupabaseClient, getServiceClient } from "../../lib/supabase.ts";
import ApproveButton from "../../islands/ApproveButton.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface JournalEntry {
  id: string;
  account_code: string;
  sub_account_id: string | null;
  debit_amount: number;
  credit_amount: number;
}

interface Journal {
  id: string;
  journal_date: string;
  description: string;
  status: "draft" | "approved";
  organization_id: string | null;
  election_id: string | null;
  contact_id: string | null;
  classification: string | null;
  non_monetary_basis: string | null;
  notes: string | null;
  amount_public_subsidy: number | null;
  is_receipt_hard_to_collect: boolean;
  receipt_hard_to_collect_reason: string | null;
  created_at: string;
  approved_at: string | null;
  journal_entries: JournalEntry[];
  contacts: {
    name: string;
    contact_type: string;
    address: string | null;
  } | null;
  political_organizations: {
    name: string;
  } | null;
  elections: {
    election_name: string;
  } | null;
}

interface PageData {
  journal: Journal | null;
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const journalId = ctx.params.id;
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      const supabase =
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      const { data: journal, error } = await supabase
        .from("journals")
        .select(
          `
          id,
          journal_date,
          description,
          status,
          organization_id,
          election_id,
          contact_id,
          classification,
          non_monetary_basis,
          notes,
          amount_public_subsidy,
          is_receipt_hard_to_collect,
          receipt_hard_to_collect_reason,
          created_at,
          approved_at,
          journal_entries (
            id,
            account_code,
            sub_account_id,
            debit_amount,
            credit_amount
          ),
          contacts (
            name,
            contact_type,
            address
          ),
          political_organizations (
            name
          ),
          elections (
            election_name
          )
        `
        )
        .eq("id", journalId)
        .single();

      if (error || !journal) {
        return ctx.render({
          journal: null,
          error: "仕訳が見つかりません",
        });
      }

      return ctx.render({ journal });
    } catch (error) {
      console.error("Error:", error);
      return ctx.render({
        journal: null,
        error: "エラーが発生しました",
      });
    }
  },
};

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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JournalDetailPage({ data }: PageProps<PageData>) {
  const { journal, error } = data;

  if (error || !journal) {
    return (
      <>
        <Head>
          <title>仕訳が見つかりません - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/journals" title="仕訳詳細">
          <div class="alert alert-error">
            <span>{error || "仕訳が見つかりません"}</span>
          </div>
          <div class="mt-4">
            <a href="/journals" class="btn btn-outline">
              ← 仕訳一覧に戻る
            </a>
          </div>
        </Layout>
      </>
    );
  }

  // 借方・貸方の合計
  const totalDebit = journal.journal_entries.reduce(
    (sum, e) => sum + e.debit_amount,
    0
  );
  const totalCredit = journal.journal_entries.reduce(
    (sum, e) => sum + e.credit_amount,
    0
  );

  return (
    <>
      <Head>
        <title>仕訳詳細 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/journals" title="仕訳詳細">
        {/* ヘッダー */}
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <a href="/journals" class="btn btn-ghost btn-sm">
              ← 戻る
            </a>
            <h2 class="text-xl font-bold">
              {formatDate(journal.journal_date)}
            </h2>
            {journal.status === "draft" ? (
              <span class="badge badge-warning">下書き</span>
            ) : (
              <span class="badge badge-success">承認済</span>
            )}
          </div>

          {/* 承認ボタン */}
          {journal.status === "draft" && (
            <ApproveButton journalId={journal.id} />
          )}
        </div>

        {/* 基本情報 */}
        <div class="card bg-base-100 shadow mb-6">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">基本情報</h3>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt class="text-sm text-base-content/60">摘要</dt>
                <dd class="font-medium">{journal.description}</dd>
              </div>

              {journal.contacts && (
                <div>
                  <dt class="text-sm text-base-content/60">関係者</dt>
                  <dd class="font-medium">
                    {journal.contacts.name}
                    <span class="text-sm text-base-content/60 ml-2">
                      (
                      {journal.contacts.contact_type === "person"
                        ? "個人"
                        : "法人"}
                      )
                    </span>
                  </dd>
                </div>
              )}

              {journal.political_organizations && (
                <div>
                  <dt class="text-sm text-base-content/60">政治団体</dt>
                  <dd class="font-medium">
                    {journal.political_organizations.name}
                  </dd>
                </div>
              )}

              {journal.elections && (
                <div>
                  <dt class="text-sm text-base-content/60">選挙</dt>
                  <dd class="font-medium">{journal.elections.election_name}</dd>
                </div>
              )}

              {journal.classification && (
                <div>
                  <dt class="text-sm text-base-content/60">活動区分</dt>
                  <dd class="font-medium">
                    {journal.classification === "campaign"
                      ? "選挙運動期間中"
                      : "選挙運動期間外"}
                  </dd>
                </div>
              )}

              {journal.notes && (
                <div class="md:col-span-2">
                  <dt class="text-sm text-base-content/60">備考</dt>
                  <dd class="font-medium">{journal.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* 仕訳明細 */}
        <div class="card bg-base-100 shadow mb-6">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">仕訳明細</h3>
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>勘定科目</th>
                    <th class="text-right">借方</th>
                    <th class="text-right">貸方</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.journal_entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{getAccountName(entry.account_code)}</td>
                      <td class="text-right font-mono">
                        {entry.debit_amount > 0
                          ? `¥${formatAmount(entry.debit_amount)}`
                          : ""}
                      </td>
                      <td class="text-right font-mono">
                        {entry.credit_amount > 0
                          ? `¥${formatAmount(entry.credit_amount)}`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr class="font-bold">
                    <td>合計</td>
                    <td class="text-right font-mono">
                      ¥{formatAmount(totalDebit)}
                    </td>
                    <td class="text-right font-mono">
                      ¥{formatAmount(totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* 追加情報 */}
        {(journal.amount_public_subsidy ||
          journal.is_receipt_hard_to_collect ||
          journal.non_monetary_basis) && (
          <div class="card bg-base-100 shadow mb-6">
            <div class="card-body">
              <h3 class="card-title text-lg mb-4">追加情報</h3>
              <dl class="space-y-3">
                {journal.amount_public_subsidy !== null &&
                  journal.amount_public_subsidy > 0 && (
                    <div>
                      <dt class="text-sm text-base-content/60">公費負担額</dt>
                      <dd class="font-medium font-mono">
                        ¥{formatAmount(journal.amount_public_subsidy)}
                      </dd>
                    </div>
                  )}

                {journal.is_receipt_hard_to_collect && (
                  <div>
                    <dt class="text-sm text-base-content/60">領収書徴収困難</dt>
                    <dd class="font-medium">
                      {journal.receipt_hard_to_collect_reason || "理由未記載"}
                    </dd>
                  </div>
                )}

                {journal.non_monetary_basis && (
                  <div>
                    <dt class="text-sm text-base-content/60">
                      金銭以外の寄附の見積根拠
                    </dt>
                    <dd class="font-medium">{journal.non_monetary_basis}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* メタ情報 */}
        <div class="text-sm text-base-content/60">
          <p>作成日時: {formatDateTime(journal.created_at)}</p>
          {journal.approved_at && (
            <p>承認日時: {formatDateTime(journal.approved_at)}</p>
          )}
        </div>
      </Layout>
    </>
  );
}
