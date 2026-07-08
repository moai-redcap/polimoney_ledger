import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import PendingTransfers from "../islands/PendingTransfers.tsx";
import { define } from "../lib/define.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Transfer {
  id: string;
  from_user_id: string;
  organization_id: string | null;
  election_id: string | null;
  requested_at: string;
  political_organizations?: {
    id: string;
    name: string;
  } | null;
  elections?: {
    id: string;
    election_name: string;
  } | null;
}

interface DashboardData {
  userName: string | null;
  pendingTransfers: Transfer[];
}

export const handler = define.handlers<DashboardData>({
  async GET(ctx) {
    const req = ctx.req;
    const user = ctx.state.user as { email?: string } | undefined;
    const userId = ctx.state.userId as string;

    let pendingTransfers: Transfer[] = [];

    if (userId) {
      try {
        const supabase = userId === TEST_USER_ID
          ? getServiceClient()
          : getSupabaseClient(req);

        const { data: transfers } = await supabase
          .from("ownership_transfers")
          .select(
            `
            id,
            from_user_id,
            organization_id,
            election_id,
            requested_at,
            political_organizations (
              id,
              name
            ),
            elections (
              id,
              election_name
            )
          `,
          )
          .eq("to_user_id", userId)
          .eq("status", "pending")
          .order("requested_at", { ascending: false });

        pendingTransfers = (transfers || []) as Transfer[];
      } catch (error) {
        console.error("Failed to fetch pending transfers:", error);
      }
    }

    return page({
      userName: user?.email || null,
      pendingTransfers,
    });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { pendingTransfers } = data;

  return (
    <>
      <Head>
        <title>ダッシュボード - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/" title="ダッシュボード">
        <div class="grid gap-6">
          {/* 承認待ちの譲渡申請 */}
          <PendingTransfers initialTransfers={pendingTransfers} />

          {/* ウェルカムカード */}
          <div class="card bg-primary text-primary-content">
            <div class="card-body">
              <h2 class="card-title">ようこそ、Polimoney Ledger へ！</h2>
              <p>
                政治資金の収支管理を始めましょう。
                まずは政治団体または選挙を登録してください。
              </p>
            </div>
          </div>

          {/* クイックアクション */}
          <div class="grid md:grid-cols-2 gap-4">
            <a
              href="/organizations"
              class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
            >
              <div class="card-body">
                <div class="flex items-center gap-4">
                  <div class="text-4xl">🏛️</div>
                  <div>
                    <h3 class="card-title">政治団体</h3>
                    <p class="text-base-content/70">政治団体の台帳を管理</p>
                  </div>
                </div>
              </div>
            </a>

            <a
              href="/elections"
              class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
            >
              <div class="card-body">
                <div class="flex items-center gap-4">
                  <div class="text-4xl">🗳️</div>
                  <div>
                    <h3 class="card-title">選挙</h3>
                    <p class="text-base-content/70">選挙の台帳を管理</p>
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* ヘルプ */}
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h2 class="card-title">使い方</h2>
              <ol class="list-decimal list-inside space-y-2 text-base-content/70">
                <li>「政治団体」または「選挙」を選択</li>
                <li>対象の団体・選挙を選んで「台帳を開く」をクリック</li>
                <li>仕訳を登録して収支を管理</li>
                <li>仕訳を承認すると公開データとして同期されます</li>
              </ol>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
});
