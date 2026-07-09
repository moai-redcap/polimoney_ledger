import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import PoliticianVerificationForm from "../../islands/PoliticianVerificationForm.tsx";
import {
  getPoliticianVerificationsByUser,
  getVerifiedPoliticianByUserId,
  type Politician,
  type PoliticianVerification,
} from "../../lib/hub-client.ts";
import { define } from "../../lib/define.ts";

interface PageData {
  userId: string;
  verifiedPolitician: Politician | null;
  politicianVerifications: PoliticianVerification[];
  changeDomain: boolean;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/verify/politician" },
      });
    }

    // URL パラメータを取得
    const url = new URL(req.url);
    const changeDomain = url.searchParams.get("change_domain") === "true";

    // Hub から認証情報を取得
    const [verifiedPolitician, politicianVerifications] = await Promise.all([
      getVerifiedPoliticianByUserId(userId).catch(() => null),
      getPoliticianVerificationsByUser(userId).catch(() => []),
    ]);

    return page({
      userId,
      verifiedPolitician,
      politicianVerifications,
      changeDomain,
    });
  },
});

export default define.page<typeof handler>(({
  data,
}) => {
  const { userId, verifiedPolitician, politicianVerifications, changeDomain } =
    data;

  return (
    <>
      <Head>
        <title>政治家認証 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/verify/politician" title="政治家認証">
        <div style="max-width: 42rem;">
          {/* 説明 */}
          <div class="st-alert st-alert--info" style="margin-bottom: var(--st-sys-spacing-6);">
            <div class="st-alert__icon">ℹ️</div>
            <div class="st-alert__content">
              <h3 style="font-weight: 700;">政治家認証とは</h3>
              <p style="font-size: var(--st-sys-typescale-body-small-size);">
                政治家として本人確認を行うことで、選挙台帳を作成・管理できるようになります。
                認証には公式ドメインのメールアドレスが必要です。
              </p>
            </div>
          </div>

          <PoliticianVerificationForm
            userId={userId}
            verifiedPolitician={verifiedPolitician}
            politicianVerifications={politicianVerifications}
            changeDomain={changeDomain}
          />
        </div>
      </Layout>
    </>
  );
});
