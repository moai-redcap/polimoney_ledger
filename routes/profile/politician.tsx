import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import PoliticianProfileForm from "../../islands/PoliticianProfileForm.tsx";
import {
import { define } from "../../lib/define.ts";
  getVerifiedPoliticianByUserId,
  type Politician,
} from "../../lib/hub-client.ts";

interface PageData {
  userId: string;
  politician: Politician | null;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/profile/politician" },
      });
    }

    // Hub から認証済み政治家情報を取得
    const politician = await getVerifiedPoliticianByUserId(userId);

    return page({
      userId,
      politician,
    });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { politician } = data;

  return (
    <>
      <Head>
        <title>政治家情報編集 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/profile/politician" title="政治家情報編集">
        <div style="max-width: 42rem;">
          {politician
            ? <PoliticianProfileForm politician={politician} />
            : (
              <div class="st-card st-card--elevated">
                <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
                  <div class="st-alert st-alert--warning">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <h3 style="font-weight: 700;">政治家として認証されていません</h3>
                      <p style="font-size: var(--st-sys-typescale-body-small-size);">
                        政治家情報を編集するには、まず政治家認証を完了してください。
                      </p>
                    </div>
                  </div>
                  <div class="card-actions mt-4">
                    <a href="/verify/politician" class="st-button st-button--filled">
                      政治家認証を申請
                    </a>
                  </div>
                </div>
              </div>
            )}
        </div>
      </Layout>
    </>
  );
});
