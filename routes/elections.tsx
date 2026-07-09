import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import { define } from "../lib/define.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UserElection {
  id: string;
  election_name: string;
  election_date: string;
  created_at: string;
  hub_politician_id: string | null;
}

interface ElectionsPageData {
  elections: UserElection[];
  error?: string;
}

export const handler = define.handlers<ElectionsPageData>({
  async GET(ctx) {
    const req = ctx.req;
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

      // ユーザーが作成した選挙台帳を取得
      const { data: elections, error } = await supabase
        .from("elections")
        .select(
          `
          id,
          election_name,
          election_date,
          created_at,
          hub_politician_id
        `,
        )
        .eq("owner_user_id", userId)
        .order("election_date", { ascending: false });

      if (error) {
        console.error("Failed to fetch elections:", error);
        return page({
          elections: [],
          error: "選挙台帳の取得に失敗しました",
        });
      }

      return page({ elections: elections || [] });
    } catch (error) {
      console.error("Error:", error);
      return page({
        elections: [],
        error: "エラーが発生しました",
      });
    }
  },
});

// 日付をフォーマット
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default define.page<typeof handler>(({ data }) => {
  const { elections, error } = data;

  return (
    <>
      <Head>
        <title>選挙台帳一覧 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/elections" title="選挙台帳一覧">
        {error && (
          <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-6);">
            <div class="st-alert__icon">❌</div>
            <div class="st-alert__content">{error}</div>
          </div>
        )}

        {/* 新規作成ボタン */}
        <div style="margin-bottom: var(--st-sys-spacing-6);">
          <a href="/elections/new" class="st-button st-button--filled">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              style="width: 1.25rem; height: 1.25rem;"
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
        {elections.length === 0
          ? (
            <div class="st-card st-card--filled">
              <div class="st-card__content" style="text-align: center; padding: var(--st-sys-spacing-10);">
                <div style="font-size: 4rem; margin-bottom: var(--st-sys-spacing-4);">🗳️</div>
                <h2 class="st-card__title" style="justify-content: center;">選挙台帳がありません</h2>
                <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                  「新しい選挙台帳を作成」ボタンから、選挙を登録して台帳を作成しましょう。
                </p>
              </div>
            </div>
          )
          : (
            <div class="st-stack st-stack--md">
              {elections.map((election) => (
                <div key={election.id} class="st-card st-card--elevated">
                  <div class="st-card__content" style="padding: var(--st-sys-spacing-4) var(--st-sys-spacing-6);">
                    <div style="display: flex; flex-direction: column; gap: var(--st-sys-spacing-4);">
                      <div>
                        <h2 class="st-card__title">{election.election_name}</h2>
                        <div class="st-flex st-flex--wrap st-gap-2" style="margin-top: var(--st-sys-spacing-2);">
                          <span class="st-badge st-badge--outline">
                            {formatDate(election.election_date)}
                          </span>
                        </div>
                      </div>
                      <div class="st-flex st-gap-2">
                        <a
                          href={`/elections/${election.id}/ledger`}
                          class="st-button st-button--filled"
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
});
