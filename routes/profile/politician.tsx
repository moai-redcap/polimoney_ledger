import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import PoliticianProfileForm from "../../islands/PoliticianProfileForm.tsx";
import {
  getVerifiedPoliticianByUserId,
  type Politician,
} from "../../lib/hub-client.ts";

interface PageData {
  userId: string;
  politician: Politician | null;
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/profile/politician" },
      });
    }

    // Hub から認証済み政治家情報を取得
    const politician = await getVerifiedPoliticianByUserId(userId);

    return ctx.render({
      userId,
      politician,
    });
  },
};

export default function PoliticianProfilePage({ data }: PageProps<PageData>) {
  const { politician } = data;

  return (
    <>
      <Head>
        <title>政治家情報編集 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/profile/politician" title="政治家情報編集">
        <div class="max-w-2xl">
          {politician ? (
            <PoliticianProfileForm politician={politician} />
          ) : (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="alert alert-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="stroke-current shrink-0 h-6 w-6"
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
                    <h3 class="font-bold">政治家として認証されていません</h3>
                    <p class="text-sm">
                      政治家情報を編集するには、まず政治家認証を完了してください。
                    </p>
                  </div>
                </div>
                <div class="card-actions mt-4">
                  <a href="/verify/politician" class="btn btn-primary">
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
}
