import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { getElections, type Election } from "../../lib/hub-client.ts";
import NewElectionForm from "../../islands/NewElectionForm.tsx";

interface NewElectionPageData {
  hubElections: Election[];
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
      // Hub から選挙一覧を取得
      const hubElections = await getElections();
      return ctx.render({ hubElections });
    } catch (error) {
      console.error("Failed to fetch elections from Hub:", error);
      return ctx.render({
        hubElections: [],
        error:
          error instanceof Error
            ? error.message
            : "選挙一覧の取得に失敗しました",
      });
    }
  },
};

export default function NewElectionPage({ data }: PageProps<NewElectionPageData>) {
  const { hubElections, error } = data;

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

        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <p class="text-base-content/70 mb-4">
              登録されている選挙から選択するか、該当する選挙がない場合は新規登録をリクエストしてください。
            </p>
            <NewElectionForm hubElections={hubElections} />
          </div>
        </div>
      </Layout>
    </>
  );
}
