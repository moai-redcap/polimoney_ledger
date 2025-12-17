import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";

interface DashboardData {
  userName: string | null;
}

export const handler: Handlers<DashboardData> = {
  async GET(_req, ctx) {
    const user = ctx.state.user as { email?: string } | undefined;
    return ctx.render({
      userName: user?.email || null,
    });
  },
};

export default function DashboardPage({ data }: PageProps<DashboardData>) {
  return (
    <>
      <Head>
        <title>ダッシュボード - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/" title="ダッシュボード">
        <div class="grid gap-6">
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
}
