import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { type Election, getElections, getPolitician } from "../../lib/hub-client.ts";
import { getSupabaseClient } from "../../lib/supabase.ts";
import NewElectionForm from "../../islands/NewElectionForm.tsx";

interface VerifiedPolitician {
  id: string;
  name: string;
  name_kana: string | null;
  party: string | null;
}

interface NewElectionPageData {
  hubElections: Election[];
  verifiedPolitician: VerifiedPolitician | null;
  canCreateElection: boolean;
  error?: string;
}

export const handler: Handlers<NewElectionPageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      // ユーザーのprofileを取得してhub_politician_idを確認
      const supabase = getSupabaseClient(userId);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("hub_politician_id")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Failed to fetch profile:", profileError);
      }

      let verifiedPolitician: VerifiedPolitician | null = null;
      const canCreateElection = !!profile?.hub_politician_id;

      // hub_politician_idがある場合は政治家情報を取得
      if (profile?.hub_politician_id) {
        try {
          const politicianData = await getPolitician(profile.hub_politician_id);
          verifiedPolitician = {
            id: politicianData.id,
            name: politicianData.name,
            name_kana: politicianData.name_kana || null,
            party: politicianData.party || null,
          };
        } catch (err) {
          console.error("Failed to fetch politician from Hub:", err);
        }
      }

      // Hub から選挙一覧を取得
      const hubElections = await getElections();
      return ctx.render({ hubElections, verifiedPolitician, canCreateElection });
    } catch (error) {
      console.error("Failed to fetch elections from Hub:", error);
      return ctx.render({
        hubElections: [],
        verifiedPolitician: null,
        canCreateElection: false,
        error: error instanceof Error
          ? error.message
          : "選挙一覧の取得に失敗しました",
      });
    }
  },
};

export default function NewElectionPage({
  data,
}: PageProps<NewElectionPageData>) {
  const { hubElections, verifiedPolitician, canCreateElection, error } = data;

  return (
    <>
      <Head>
        <title>新しい選挙台帳を作成 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/elections" title="新しい選挙台帳を作成">
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-6">
          <ul>
            <li>
              <a href="/elections">選挙台帳一覧</a>
            </li>
            <li>新規作成</li>
          </ul>
        </div>

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

        {!canCreateElection ? (
          // 政治家として認証されていない場合
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="alert alert-warning">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 class="font-bold">選挙台帳を作成できません</h3>
                  <p class="text-sm mt-1">
                    選挙台帳を作成するには、政治家として認証されている必要があります。
                  </p>
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <h3 class="font-bold text-lg">選挙台帳を作成するには</h3>
                <ol class="list-decimal list-inside space-y-2 text-base-content/70">
                  <li>
                    <strong>政治家として認証申請</strong>する（公式ドメインのメール認証が必要）
                  </li>
                  <li>
                    Hub管理者による<strong>承認</strong>を受ける
                  </li>
                  <li>
                    承認後、このページから選挙台帳を作成できるようになります
                  </li>
                </ol>

                <div class="alert alert-info mt-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    class="stroke-current shrink-0 w-6 h-6"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    認証済み政治家から招待されたメンバーも、権限に応じて台帳を操作できます。
                  </span>
                </div>
              </div>

              <div class="card-actions justify-end mt-6">
                <a href="/settings" class="btn btn-primary">
                  政治家認証を申請する
                </a>
                <a href="/elections" class="btn btn-ghost">
                  戻る
                </a>
              </div>
            </div>
          </div>
        ) : (
          // 政治家として認証されている場合
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              {/* 認証済み政治家情報 */}
              {verifiedPolitician && (
                <div class="alert alert-success mb-4">
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p class="font-bold">認証済み: {verifiedPolitician.name}</p>
                    {verifiedPolitician.party && (
                      <p class="text-sm">{verifiedPolitician.party}</p>
                    )}
                  </div>
                </div>
              )}

              <p class="text-base-content/70 mb-4">
                登録されている選挙から選択するか、該当する選挙がない場合は新規登録をリクエストしてください。
              </p>
              <NewElectionForm
                hubElections={hubElections}
                verifiedPolitician={verifiedPolitician}
              />
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}
