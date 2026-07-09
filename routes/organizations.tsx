import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import { define } from "../lib/define.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UserOrganization {
  id: string;
  name: string;
  created_at: string;
}

interface OrganizationsPageData {
  organizations: UserOrganization[];
  error?: string;
}

export const handler = define.handlers<OrganizationsPageData>({
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

      // ユーザーが作成した政治団体台帳を取得
      const { data: organizations, error } = await supabase
        .from("political_organizations")
        .select("id, name, created_at")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch organizations:", error);
        return page({
          organizations: [],
          error: "政治団体台帳の取得に失敗しました",
        });
      }

      return page({ organizations: organizations || [] });
    } catch (error) {
      console.error("Error:", error);
      return page({
        organizations: [],
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

export default define.page<typeof handler>(({
  data,
}) => {
  const { organizations, error } = data;

  return (
    <>
      <Head>
        <title>政治団体台帳一覧 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/organizations" title="政治団体台帳一覧">
        {error && (
          <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-6);">
            <div class="st-alert__icon">❌</div>
            <div class="st-alert__content">{error}</div>
          </div>
        )}

        {/* 新規作成ボタン */}
        <div style="margin-bottom: var(--st-sys-spacing-6);">
          <a href="/organizations/new" class="st-button st-button--filled">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              style="width: 1.25rem; height: 1.25rem;"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            新しい政治団体台帳を作成
          </a>
        </div>

        {/* 政治団体台帳一覧 */}
        {organizations.length === 0
          ? (
            <div class="st-card st-card--filled">
              <div class="st-card__content" style="text-align: center; padding: var(--st-sys-spacing-10);">
                <div style="font-size: 4rem; margin-bottom: var(--st-sys-spacing-4);">🏛️</div>
                <h2 class="st-card__title" style="justify-content: center;">政治団体台帳がありません</h2>
                <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                  「新しい政治団体台帳を作成」ボタンから、政治団体を登録して台帳を作成しましょう。
                </p>
              </div>
            </div>
          )
          : (
            <div class="st-stack st-stack--md">
              {organizations.map((org) => (
                <div key={org.id} class="st-card st-card--elevated">
                  <div class="st-card__content" style="padding: var(--st-sys-spacing-4) var(--st-sys-spacing-6);">
                    <div style="display: flex; flex-direction: column; gap: var(--st-sys-spacing-4);">
                      <div>
                        <h2 class="st-card__title">{org.name}</h2>
                        <div class="st-flex st-flex--wrap st-gap-2" style="margin-top: var(--st-sys-spacing-2);">
                          <span class="st-badge st-badge--outline">
                            作成日: {formatDate(org.created_at)}
                          </span>
                        </div>
                      </div>
                      <div class="st-flex st-gap-2">
                        <a
                          href={`/organizations/${org.id}/ledger`}
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
