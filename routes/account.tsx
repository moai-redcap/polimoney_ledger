import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../components/Layout.tsx";
import { getSupabaseClient } from "../lib/supabase.ts";
import ProfileEditor from "../islands/ProfileEditor.tsx";
import EmailChangeForm from "../islands/EmailChangeForm.tsx";
import { define } from "../lib/define.ts";

interface PageData {
  email: string;
  displayName: string;
  userId: string;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
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

    const displayName = user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name || "";

    return page({
      email: user?.email || "",
      displayName,
      userId,
    });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { email, displayName, userId } = data;

  return (
    <>
      <Head>
        <title>アカウント - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/account" title="アカウント">
        <div class="st-stack st-stack--lg" style="max-width: 42rem;">
          {/* プロフィール編集 */}
          <ProfileEditor initialDisplayName={displayName} />

          {/* メールアドレス変更 */}
          <EmailChangeForm currentEmail={email} />

          {/* パスワード変更（OAuth以外の場合） */}
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h2 class="st-card__title">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  style="width: 1.5rem; height: 1.5rem;"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
                セキュリティ
              </h2>
              <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                パスワードの変更やアカウントの削除ができます。
              </p>
              <div class="st-flex st-flex--wrap st-gap-2">
                <a href="/auth/reset-password" class="st-button st-button--outlined">
                  パスワードを変更
                </a>
              </div>
            </div>
          </div>

          {/* 危険な操作 */}
          <div class="st-card" style="background: color-mix(in srgb, var(--st-sys-color-error) 5%, var(--st-sys-color-surface)); border: 1px solid color-mix(in srgb, var(--st-sys-color-error) 20%, transparent);">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h2 class="st-card__title" style="color: var(--st-sys-color-error);">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  style="width: 1.5rem; height: 1.5rem;"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                危険な操作
              </h2>
              <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                アカウントを削除すると、すべてのデータが完全に削除されます。
                この操作は取り消せません。
              </p>
              <div class="st-card__actions">
                <button class="st-button st-button--outlined" style="color: var(--st-sys-color-error); border-color: var(--st-sys-color-error);" disabled>
                  アカウントを削除（準備中）
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
});
