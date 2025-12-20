import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

interface RegisterData {
  error?: string;
  success?: boolean;
  email?: string;
}

export const handler: Handlers<RegisterData> = {
  GET(_req, ctx) {
    return ctx.render({});
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const email = form.get("email")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const confirmPassword = form.get("confirmPassword")?.toString() || "";
    const fullName = form.get("fullName")?.toString() || "";
    const tosAccepted = form.get("tosAccepted") === "on";
    const privacyPolicyAccepted = form.get("privacyPolicyAccepted") === "on";

    // バリデーション
    if (!email || !password || !fullName) {
      return ctx.render({ error: "すべての必須項目を入力してください" });
    }

    if (!tosAccepted) {
      return ctx.render({ error: "利用規約への同意が必要です" });
    }

    if (!privacyPolicyAccepted) {
      return ctx.render({ error: "プライバシーポリシーへの同意が必要です" });
    }

    if (password !== confirmPassword) {
      return ctx.render({ error: "パスワードが一致しません" });
    }

    if (password.length < 8) {
      return ctx.render({ error: "パスワードは8文字以上で入力してください" });
    }

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return ctx.render({ error: "Supabase が設定されていません" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    // ユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      return ctx.render({ error: authError.message });
    }

    if (!authData.user?.id) {
      return ctx.render({ error: "ユーザー作成に失敗しました" });
    }

    return ctx.render({ success: true, email });
  },
};

export default function RegisterPage({ data }: PageProps<RegisterData>) {
  if (data?.success) {
    return (
      <>
        <Head>
          <title>登録完了 - Polimoney Ledger</title>
          <link href="/styles.css" rel="stylesheet" />
        </Head>
        <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
          <div class="card w-full max-w-md bg-base-100 shadow-xl">
            <div class="card-body text-center">
              <div class="text-5xl mb-4">✉️</div>
              <h1 class="text-2xl font-bold">確認メールを送信しました</h1>
              <div class="mt-4 space-y-3 text-left">
                <p class="text-base-content/80">
                  <strong>{data.email}</strong> 宛に確認メールを送信しました。
                </p>
                <p class="text-base-content/60 text-sm">
                  メール内の「メールアドレスを確認する」ボタンをクリックして、確認を完了してください。
                  確認が完了すると、ログインできるようになります。
                </p>
                <div class="alert alert-warning mt-4">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div class="text-xs">
                    <p class="font-bold">送信元について</p>
                    <p>
                      メールは{" "}
                      <code class="bg-warning-content/20 px-1 rounded">
                        noreply@mail.app.supabase.io
                      </code>{" "}
                      から届きます。
                      届かない場合は迷惑メールフォルダをご確認ください。
                    </p>
                  </div>
                </div>
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
                  <div class="text-xs">
                    <p class="font-bold">政治家認証について</p>
                    <p>
                      政治家本人として選挙台帳を作成するには、ログイン後に政治家認証を申請してください。
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-6">
                <a href="/login" class="btn btn-primary">
                  ログインページへ
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>新規登録 - Polimoney Ledger</title>
        <link href="/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div class="card w-full max-w-md bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="text-center mb-4">
              <span class="text-5xl">📒</span>
              <h1 class="text-2xl font-bold mt-2">Polimoney Ledger</h1>
              <p class="text-base-content/60 mt-1">新規登録</p>
            </div>

            {data?.error && (
              <div class="alert alert-error mb-4">
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
                <span>{data.error}</span>
              </div>
            )}

            <form method="POST" class="space-y-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    姓名（本名） <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="山田 太郎"
                  class="input input-bordered w-full"
                  required
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    政治家認証などに使用されます。本名を入力してください。
                  </span>
                </label>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    メールアドレス <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  class="input input-bordered w-full"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    パスワード（8文字以上） <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="パスワード"
                  class="input input-bordered w-full"
                  minLength={8}
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    パスワード（確認） <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="パスワード（確認）"
                  class="input input-bordered w-full"
                  minLength={8}
                  required
                />
              </div>

              {/* 利用規約・プライバシーポリシー同意 */}
              <div class="divider text-sm text-base-content/60">同意事項</div>

              {/* フィッシング注意 */}
              <div class="alert alert-info">
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
                <div class="text-xs">
                  <p class="font-bold">フィッシングサイトにご注意ください</p>
                  <p>
                    Polimoney Ledger
                    はオープンソースソフトウェアです。偽サイトに個人情報を入力しないよう、URLをご確認ください。
                  </p>
                </div>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    name="tosAccepted"
                    class="checkbox checkbox-primary"
                    required
                  />
                  <span class="label-text">
                    <a href="/terms" target="_blank" class="link link-primary">
                      利用規約
                    </a>
                    に同意する <span class="text-error">*</span>
                  </span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    name="privacyPolicyAccepted"
                    class="checkbox checkbox-primary"
                    required
                  />
                  <span class="label-text">
                    <a
                      href="/privacy"
                      target="_blank"
                      class="link link-primary"
                    >
                      プライバシーポリシー
                    </a>
                    に同意する <span class="text-error">*</span>
                  </span>
                </label>
              </div>

              <div class="mt-6">
                <button type="submit" class="btn btn-primary w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                  登録する
                </button>
              </div>
            </form>

            <div class="divider">または</div>

            <div class="text-center">
              <p class="text-sm text-base-content/60">
                すでにアカウントをお持ちの場合は
              </p>
              <a href="/login" class="link link-primary">
                ログイン
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
