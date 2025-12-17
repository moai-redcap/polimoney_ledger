import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { getSupabaseClient, getServiceClient } from "../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UserElection {
  id: string;
  election_name: string;
  election_date: string;
  created_at: string;
  politicians: {
    name: string;
  } | null;
}

interface ElectionsPageData {
  elections: UserElection[];
  error?: string;
}

export const handler: Handlers<ElectionsPageData> = {
  async GET(req, ctx) {
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

      // ユーザーが作成した選挙台帳を取得
      const { data: elections, error } = await supabase
        .from("elections")
        .select(
          `
          id,
          election_name,
          election_date,
          created_at,
          politicians (
            name
          )
        `
        )
        .eq("owner_user_id", userId)
        .order("election_date", { ascending: false });

      if (error) {
        console.error("Failed to fetch elections:", error);
        return ctx.render({
          elections: [],
          error: "選挙台帳の取得に失敗しました",
        });
      }

      return ctx.render({ elections: elections || [] });
    } catch (error) {
      console.error("Error:", error);
      return ctx.render({
        elections: [],
        error: "エラーが発生しました",
      });
    }
  },
};

// 日付をフォーマット
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ElectionsPage({ data }: PageProps<ElectionsPageData>) {
  const { elections, error } = data;

  return (
    <>
      <Head>
        <title>選挙台帳一覧 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/elections" title="選挙台帳一覧">
        {error && (
          <div role="alert" class="alert alert-error mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
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
          </div>
        )}

        {/* 新規作成ボタン */}
        <div class="mb-6">
          <a href="/elections/new" class="btn btn-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            新しい選挙台帳を作成
          </a>
        </div>

        {/* 選挙台帳一覧 */}
        {elections.length === 0 ? (
          <div class="card bg-base-100 shadow">
            <div class="card-body items-center text-center py-12">
              <div class="text-6xl mb-4">🗳️</div>
              <h2 class="card-title">選挙台帳がありません</h2>
              <p class="text-base-content/70 mb-4">
                「新しい選挙台帳を作成」ボタンから、選挙を登録して台帳を作成しましょう。
              </p>
            </div>
          </div>
        ) : (
          <div class="grid gap-4">
            {elections.map((election) => (
              <div key={election.id} class="card bg-base-100 shadow">
                <div class="card-body">
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 class="card-title">{election.election_name}</h2>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <span class="badge badge-outline">
                          {formatDate(election.election_date)}
                        </span>
                        {election.politicians?.name && (
                          <span class="badge badge-primary badge-outline">
                            {election.politicians.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <a
                        href={`/elections/${election.id}/ledger`}
                        class="btn btn-primary"
                      >
                        台帳を開く
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </>
  );
}
