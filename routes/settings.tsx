import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import ReSyncButton from "../islands/ReSyncButton.tsx";
import { define } from "../lib/define.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface PageData {
  userId: string;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/settings" },
      });
    }

    return page({ userId });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { userId } = data;

  return (
    <>
      <Head>
        <title>設定 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/settings" title="設定">
        <div class="st-stack st-stack--lg" style="max-width: 48rem;">
          {/* 同期ステータス */}
          <section class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h2 class="st-card__title">Hub 同期ステータス</h2>
              <div class="st-flex st-flex--items-center st-gap-2" style="margin-top: var(--st-sys-spacing-2);">
                <span class="st-badge st-badge--primary" style="background: var(--st-sys-color-tertiary); color: var(--st-sys-color-on-tertiary);">自動同期: 有効</span>
                <span style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
                  仕訳承認時に自動で Hub に同期されます
                </span>
              </div>
            </div>
          </section>

          {/* データエクスポート */}
          <section class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h2 class="st-card__title">📦 データポータビリティ</h2>
              <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                あなたのすべてのデータを JSON 形式でダウンロードできます。
                政治団体、選挙、仕訳、連絡先などが含まれます。
              </p>
              <div class="st-card__actions">
                <a
                  href="/api/export"
                  class="st-button st-button--outlined"
                  download
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style="height: 1.25rem; width: 1.25rem; margin-right: var(--st-sys-spacing-2);"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  データをエクスポート
                </a>
              </div>
            </div>
          </section>

          {/* スペーサー */}
          <div style="padding: var(--st-sys-spacing-8) 0;"></div>

          {/* Danger Zone */}
          <section>
            <ReSyncButton />
          </section>
        </div>
      </Layout>
    </>
  );
});
