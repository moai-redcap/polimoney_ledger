import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import { define } from "../../../lib/define.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Election {
  id: string;
  election_name: string;
  election_date: string;
  politicians: {
    name: string;
  } | null;
}

interface Asset {
  id: string;
  journal_date: string | null;
  description: string;
  asset_type: string;
  amount: number;
  contact_name: string | null;
}

interface PageData {
  election: Election | null;
  assets: Asset[];
  error?: string;
}

// 資産種別の表示名
const ASSET_TYPE_LABELS: Record<string, string> = {
  land: "土地",
  building: "建物",
  vehicle: "車両・動産",
  securities: "有価証券",
  facility_rights: "施設利用権",
  deposit: "敷金・保証金",
};

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const req = ctx.req;
    const electionId = ctx.params.id;
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      const supabase = getSupabaseClient(userId);

      // 選挙情報を取得
      const { data: election, error: electionError } = await supabase
        .from("elections")
        .select("id, election_name, election_date, politicians(name)")
        .eq("id", electionId)
        .single();

      if (electionError || !election) {
        return page({
          election: null,
          assets: [],
          error: "選挙が見つかりません",
        });
      }

      // election_id から ledger を取得
      const { data: ledgerData } = await supabase
        .from("ledgers")
        .select("id")
        .eq("election_id", electionId)
        .limit(1)
        .single();

      // 資産取得の仕訳を取得
      const { data: journals, error: journalsError } = ledgerData
        ? await supabase
          .from("journals")
          .select(
            `
          id,
          journal_date,
          description,
          asset_type,
          status,
          contacts (
            name
          ),
          journal_entries (
            debit_amount
          )
        `,
          )
          .eq("ledger_id", ledgerData.id)
          .eq("is_asset_acquisition", true)
          .eq("status", "approved")
          .order("journal_date", { ascending: false })
        : { data: null, error: null };

      if (journalsError) {
        console.error("Failed to fetch assets:", journalsError);
      }

      // 資産データを整形
      const assets: Asset[] = (journals || []).map((j: any) => ({
        id: j.id,
        journal_date: j.journal_date,
        description: j.description,
        asset_type: j.asset_type,
        amount: j.journal_entries?.reduce(
          (sum: number, e: any) => sum + (e.debit_amount || 0),
          0,
        ) || 0,
        contact_name: j.contacts?.name || null,
      }));

      return page({
        election,
        assets,
      });
    } catch (error) {
      console.error("Error:", error);
      return page({
        election: null,
        assets: [],
        error: "エラーが発生しました",
      });
    }
  },
});

// 金額をフォーマット
function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

// 日付をフォーマット
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default define.page<typeof handler>(({ data }) => {
  const { election, assets, error } = data;

  if (error || !election) {
    return (
      <>
        <Head>
          <title>資産一覧が見つかりません - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/elections" title="資産一覧">
          <div class="alert alert-error">
            <span>{error || "選挙が見つかりません"}</span>
          </div>
          <div class="mt-4">
            <a href="/elections" class="btn btn-outline">
              ← 選挙一覧に戻る
            </a>
          </div>
        </Layout>
      </>
    );
  }

  const title = `${election.election_name}${
    election.politicians?.name ? ` (${election.politicians.name})` : ""
  }`;

  // 資産種別ごとに集計
  const assetSummary = assets.reduce((acc, asset) => {
    if (!acc[asset.asset_type]) {
      acc[asset.asset_type] = { count: 0, total: 0 };
    }
    acc[asset.asset_type].count += 1;
    acc[asset.asset_type].total += asset.amount;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const totalAmount = assets.reduce((sum, a) => sum + a.amount, 0);

  return (
    <>
      <Head>
        <title>{title} - 資産一覧 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/elections" title={`${title} の資産一覧`}>
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a href="/elections">選挙一覧</a>
            </li>
            <li>
              <a href={`/elections/${election.id}/ledger`}>
                {election.election_name}
              </a>
            </li>
            <li>資産一覧</li>
          </ul>
        </div>

        {/* タブナビゲーション */}
        <div role="tablist" class="tabs tabs-bordered mb-6">
          <a
            role="tab"
            href={`/elections/${election.id}/ledger`}
            class="tab hover:text-primary"
          >
            仕訳一覧
          </a>
          <a role="tab" class="tab tab-active">
            資産一覧
          </a>
          <a
            role="tab"
            href={`/elections/${election.id}/members`}
            class="tab hover:text-primary"
          >
            メンバー
          </a>
        </div>

        {/* 資産サマリーカード */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="stat bg-base-200 rounded-box">
            <div class="stat-title">資産総額</div>
            <div class="stat-value text-primary">
              ¥{formatAmount(totalAmount)}
            </div>
            <div class="stat-desc">{assets.length}件の資産</div>
          </div>

          {Object.entries(assetSummary).map(([type, { count, total }]) => (
            <div key={type} class="stat bg-base-200 rounded-box">
              <div class="stat-title">{ASSET_TYPE_LABELS[type] || type}</div>
              <div class="stat-value text-lg">¥{formatAmount(total)}</div>
              <div class="stat-desc">{count}件</div>
            </div>
          ))}
        </div>

        {/* 資産一覧テーブル */}
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title text-lg">
              資産等一覧
              <span class="badge badge-ghost">{assets.length}件</span>
            </h2>

            {assets.length === 0
              ? (
                <div class="text-center py-12">
                  <div class="text-6xl mb-4">🏛️</div>
                  <p class="text-base-content/70">資産の登録がありません</p>
                  <p class="text-sm text-base-content/50 mt-2">
                    仕訳登録時に「資産取得」にチェックを入れると、ここに表示されます
                  </p>
                </div>
              )
              : (
                <div class="overflow-x-auto">
                  <table class="table table-zebra">
                    <thead>
                      <tr>
                        <th>取得日</th>
                        <th>資産種別</th>
                        <th>摘要</th>
                        <th>取得先</th>
                        <th class="text-right">取得価額</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id}>
                          <td class="whitespace-nowrap">
                            {formatDate(asset.journal_date)}
                          </td>
                          <td>
                            <span class="badge badge-outline">
                              {ASSET_TYPE_LABELS[asset.asset_type] ||
                                asset.asset_type}
                            </span>
                          </td>
                          <td>
                            <div class="max-w-xs truncate">
                              {asset.description}
                            </div>
                          </td>
                          <td>
                            {asset.contact_name || (
                              <span class="text-base-content/50">-</span>
                            )}
                          </td>
                          <td class="text-right font-mono">
                            ¥{formatAmount(asset.amount)}
                          </td>
                          <td>
                            <a
                              href={`/journals/${asset.id}`}
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
          </div>
        </div>
      </Layout>
    </>
  );
});
