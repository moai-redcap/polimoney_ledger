import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import ElectionRequestForm from "../../islands/ElectionRequestForm.tsx";
import { createClient } from "@supabase/supabase-js";

interface ElectionRequestPageData {
  userEmail?: string;
}

export const handler: Handlers<ElectionRequestPageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // ユーザーのメールアドレスを取得
    let userEmail: string | undefined;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      userEmail = profile?.email;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }

    return ctx.render({ userEmail });
  },
};

export default function ElectionRequestPage({
  data,
}: PageProps<ElectionRequestPageData>) {
  const { userEmail } = data;

  return (
    <>
      <Head>
        <title>選挙登録のリクエスト - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/elections" title="選挙登録のリクエスト">
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-6">
          <ul>
            <li>
              <a href="/elections">選挙台帳一覧</a>
            </li>
            <li>
              <a href="/elections/new">新規作成</a>
            </li>
            <li>登録リクエスト</li>
          </ul>
        </div>

        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div class="alert alert-warning mb-4">
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
              <span>
                登録されている選挙の一覧に該当する選挙がない場合、こちらから登録をリクエストできます。
              </span>
            </div>

            <p class="text-base-content/70 mb-4">
              選挙の情報を入力してください。運営が確認後、承認されると選挙が利用可能になります。
            </p>

            <ElectionRequestForm userEmail={userEmail} />
          </div>
        </div>
      </Layout>
    </>
  );
}
