import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";
import { define } from "../../lib/define.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Journal {
  id: string;
  journal_date: string;
  description: string;
  status: "draft" | "approved";
  ledger_id: string | null;
  contact_id: string | null;
  created_at: string;
  journal_entries: {
    id: string;
    account_code: string;
    debit_amount: number;
    credit_amount: number;
  }[];
  contacts: {
    name: string;
  } | null;
}

interface PageData {
  journals: Journal[];
  filter: "all" | "draft" | "approved";
  error?: string;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const req = ctx.req;
    const url = new URL(req.url);
    const filter = (url.searchParams.get("filter") as PageData["filter"]) ||
      "all";

    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      const supabase = userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

      let query = supabase
        .from("journals")
        .select(
          `
          id,
          journal_date,
          description,
          status,
          ledger_id,
          contact_id,
          created_at,
          journal_entries (
            id,
            account_code,
            debit_amount,
            credit_amount
          ),
          contacts (
            name
          )
        `,
        )
        .eq("submitted_by_user_id", userId)
        .order("journal_date", { ascending: false });

      if (filter === "draft") {
        query = query.eq("status", "draft");
      } else if (filter === "approved") {
        query = query.eq("status", "approved");
      }

      const { data: journals, error } = await query;

      if (error) {
        console.error("Failed to fetch journals:", error);
        return page({
          journals: [],
          filter,
          error: "仕訳の取得に失敗しました",
        });
      }

      return page({
        journals: journals || [],
        filter,
      });
    } catch (error) {
      console.error("Error:", error);
      return page({
        journals: [],
        filter,
        error: "エラーが発生しました",
      });
    }
  },
});

// 金額をフォーマッチEfunction formatAmount(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

// 日付をフォーマッチEfunction formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 仕訳の合計��額を計箁Efunction calculateTotal(entries: Journal["journal_entries"]): number {
  return entries.reduce((sum, entry) => sum + entry.debit_amount, 0);
}

export default define.page<typeof handler>(({ data }) => {
  const { journals, filter, error } = data;

  const draftCount = journals.filter((j) => j.status === "draft").length;
  const approvedCount = journals.filter((j) => j.status === "approved").length;

  return (
    <>
      <Head>
        <title>仕訳一覧 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/journals" title="仕訳一覧">
        {/* フィルタータチE*/}
        <div class="tabs tabs-boxed mb-6">
          <a
            href="/journals"
            class={`tab ${filter === "all" ? "tab-active" : ""}`}
          >
            すべて ({journals.length})
          </a>
          <a
            href="/journals?filter=draft"
            class={`tab ${filter === "draft" ? "tab-active" : ""}`}
          >
            <span class="badge badge-warning badge-sm mr-1">下書ぁE/span>
            {draftCount}
          </a>
          <a
            href="/journals?filter=approved"
            class={`tab ${filter === "approved" ? "tab-active" : ""}`}
          >
            <span class="badge badge-success badge-sm mr-1">承認渁E/span>
            {approvedCount}
          </a>
        </div>

        {/* エラー表示 */}
        {error && (
          <div class="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* 仕訳一覧 */}
        {journals.length === 0
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
                    <th>日仁E/th>
                    <th>摘要E/th>
                    <th>関係老E/th>
                    <th class="text-right">金顁E/th>
                    <th>スチE�Eタス</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((journal) => (
                    <tr key={journal.id}>
                      <td class="whitespace-nowrap">
                        {formatDate(journal.journal_date)}
                      </td>
                      <td>
                        <div class="max-w-xs truncate">
                          {journal.description}
                        </div>
                      </td>
                      <td>
                        {journal.contacts?.name || (
                          <span class="text-base-content/50">-</span>
                        )}
                      </td>
                      <td class="text-right font-mono">
                        ¥{formatAmount(calculateTotal(journal.journal_entries))}
                      </td>
                      <td>
                        {journal.status === "draft"
                          ? (
                            <span class="badge badge-warning badge-sm">
                              下書ぁE                            </span>
                          )
                          : (
                            <span class="badge badge-success badge-sm">
                              承認渁E                            </span>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Layout>
    </>
  );
});
