import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import PoliticianVerificationForm from "../../islands/PoliticianVerificationForm.tsx";
import {
  getVerifiedPoliticianByUserId,
  getPoliticianVerificationsByUser,
  type Politician,
  type PoliticianVerification,
} from "../../lib/hub-client.ts";

interface PageData {
  userId: string;
  verifiedPolitician: Politician | null;
  politicianVerifications: PoliticianVerification[];
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/verify/politician" },
      });
    }

    // Hub から認証情報を取得
    const [verifiedPolitician, politicianVerifications] = await Promise.all([
      getVerifiedPoliticianByUserId(userId).catch(() => null),
      getPoliticianVerificationsByUser(userId).catch(() => []),
    ]);

    return ctx.render({
      userId,
      verifiedPolitician,
      politicianVerifications,
    });
  },
};

export default function PoliticianVerificationPage({
  data,
}: PageProps<PageData>) {
  const { userId, verifiedPolitician, politicianVerifications } = data;

  return (
    <>
      <Head>
        <title>政治家認証 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/verify/politician" title="政治家認証">
        <div class="max-w-2xl">
          {/* 説明 */}
          <div class="alert alert-info mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 class="font-bold">政治家認証とは</h3>
              <p class="text-sm">
                政治家として本人確認を行うことで、選挙台帳を作成・管理できるようになります。
                認証には公式ドメインのメールアドレスが必要です。
              </p>
            </div>
          </div>

          <PoliticianVerificationForm
            userId={userId}
            verifiedPolitician={verifiedPolitician}
            politicianVerifications={politicianVerifications}
          />
        </div>
      </Layout>
    </>
  );
}
