import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { getSupabaseClient } from "../lib/supabase.ts";
import ProfileEditor from "../islands/ProfileEditor.tsx";
import EmailChangeForm from "../islands/EmailChangeForm.tsx";

interface PageData {
  email: string;
  displayName: string;
  userId: string;
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/account" },
      });
    }

    const supabase = getSupabaseClient(userId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const displayName =
      user?.user_metadata?.display_name || user?.user_metadata?.full_name || "";

    return ctx.render({
      email: user?.email || "",
      displayName,
      userId,
    });
  },
};

export default function AccountPage({ data }: PageProps<PageData>) {
  const { email, displayName, userId } = data;

  return (
    <>
      <Head>
        <title>アカウント - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/account" title="アカウント">
        <div class="max-w-2xl space-y-6">
          {/* プロフィール編集 */}
          <ProfileEditor initialDisplayName={displayName} />

          {/* メールアドレス変更 */}
          <EmailChangeForm currentEmail={email} />

          {/* パスワード変更（OAuth以外の場合） */}
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
                セキュリティ
              </h2>
              <p class="text-base-content/70 mb-4">
                パスワードの変更やアカウントの削除ができます。
              </p>
              <div class="flex flex-wrap gap-2">
                <a href="/auth/reset-password" class="btn btn-outline">
                  パスワードを変更
                </a>
              </div>
            </div>
          </div>

          {/* 危険な操作 */}
          <div class="card bg-error/5 border border-error/20">
            <div class="card-body">
              <h2 class="card-title text-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                危険な操作
              </h2>
              <p class="text-base-content/70 mb-4">
                アカウントを削除すると、すべてのデータが完全に削除されます。
                この操作は取り消せません。
              </p>
              <div class="card-actions">
                <button class="btn btn-error btn-outline" disabled>
                  アカウントを削除（準備中）
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
