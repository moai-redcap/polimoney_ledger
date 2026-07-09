import { Head } from "fresh/runtime";
import { page } from "fresh";
import { createClient } from "@supabase/supabase-js";
import { define } from "../lib/define.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

interface RegisterData {
  error?: string;
  success?: boolean;
  email?: string;
}

export const handler = define.handlers<RegisterData>({
  GET(ctx) {
    return page({});
  },

  async POST(ctx) {
    const req = ctx.req;
    const form = await req.formData();
    const email = form.get("email")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const confirmPassword = form.get("confirmPassword")?.toString() || "";
    const fullName = form.get("fullName")?.toString() || "";
    const tosAccepted = form.get("tosAccepted") === "on";
    const privacyPolicyAccepted = form.get("privacyPolicyAccepted") === "on";

    // バリデーション
    if (!email || !password || !fullName) {
      return page({ error: "すべての必須項目を入力してください" });
    }

    if (!tosAccepted) {
      return page({ error: "利用規約への同意が必要です" });
    }

    if (!privacyPolicyAccepted) {
      return page({ error: "プライバシーポリシーへの同意が必要です" });
    }

    if (password !== confirmPassword) {
      return page({ error: "パスワードが一致しません" });
    }

    if (password.length < 8) {
      return page({ error: "パスワードは8文字以上で入力してください" });
    }

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return page({ error: "Supabase が設定されていません" });
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
      return page({ error: authError.message });
    }

    if (!authData.user?.id) {
      return page({ error: "ユーザー作成に失敗しました" });
    }

    return page({ success: true, email });
  },
});

export default define.page<typeof handler>(({ data }) => {
  if (data?.success) {
    return (
      <>
        <Head>
          <title>登録完了 - Polimoney Ledger</title>
          <link href="/styles.css" rel="stylesheet" />
        </Head>
        <div style="min-height: 100vh; background: var(--st-sys-color-surface); display: flex; align-items: center; justify-content: center; padding: var(--st-sys-spacing-4);">
          <div class="st-card st-card--elevated" style="width: 100%; max-width: 28rem;">
            <div class="card-body text-center">
              <div class="text-5xl mb-4">✉️</div>
              <h1 style="font-size: var(--st-sys-typescale-headline-small-size); font-weight: 700;">確認メールを送信しました</h1>
              <div class="mt-4 space-y-3 text-left">
                <p class="text-base-content/80">
                  <strong>{data.email}</strong> 宛に確認メールを送信しました。
                </p>
                <p class="text-base-content/60 text-sm">
                  メール内の「メールアドレスを確認する」ボタンをクリックして、確認を完了してください。
                  確認が完了すると、ログインできるようになります。
                </p>
                <div class="st-alert st-alert--warning" style="margin-top: var(--st-sys-spacing-4);">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div style="font-size: var(--st-sys-typescale-label-small-size);">
                    <p style="font-weight: 700;">送信元について</p>
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
                <div class="st-alert st-alert--info" style="margin-top: var(--st-sys-spacing-4);">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div style="font-size: var(--st-sys-typescale-label-small-size);">
                    <p style="font-weight: 700;">政治家認証について</p>
                    <p>
                      政治家本人として選挙台帳を作成するには、ログイン後に政治家認証を申請してください。
                    </p>
                  </div>
                </div>
              </div>
              <div style="margin-top: var(--st-sys-spacing-6);">
                <a href="/login" class="st-button st-button--filled">
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
      <div style="min-height: 100vh; background: var(--st-sys-color-surface); display: flex; align-items: center; justify-content: center; padding: var(--st-sys-spacing-4);">
        <div class="st-card st-card--elevated" style="width: 100%; max-width: 28rem;">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <div style="text-align: center; margin-bottom: var(--st-sys-spacing-4);">
              <span style="font-size: 3rem;">📒</span>
              <h1 class="text-2xl font-bold mt-2">Polimoney Ledger</h1>
              <p class="text-base-content/60 mt-1">新規登録</p>
            </div>

            {data?.error && (
              <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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

            <form method="POST" class="st-stack st-stack--md">
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">
                    姓名（本名） <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="山田 太郎"
                  class="st-input" style="width: 100%;"
                  required
                />
                <label class="st-field__label-wrapper">
                  <span class="st-field__helper">
                    政治家認証などに使用されます。本名を入力してください。
                  </span>
                </label>
              </div>

              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">
                    メールアドレス <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  class="st-input" style="width: 100%;"
                  required
                />
              </div>

              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">
                    パスワード（8文字以上） <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="パスワード"
                  class="st-input" style="width: 100%;"
                  minLength={8}
                  required
                />
              </div>

              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">
                    パスワード（確認） <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="パスワード（確認）"
                  class="st-input" style="width: 100%;"
                  minLength={8}
                  required
                />
              </div>

              {/* 利用規約・プライバシーポリシー同意 */}
              <div style="display: flex; align-items: center; gap: var(--st-sys-spacing-4); color: var(--st-sys-color-on-surface-variant); font-size: var(--st-sys-typescale-body-small-size);">同意事項</div>

              {/* フィッシング注意 */}
              <div class="st-alert st-alert--info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div style="font-size: var(--st-sys-typescale-label-small-size);">
                  <p style="font-weight: 700;">フィッシングサイトにご注意ください</p>
                  <p>
                    Polimoney Ledger
                    はオープンソースソフトウェアです。偽サイトに個人情報を入力しないよう、URLをご確認ください。
                  </p>
                </div>
              </div>

              <div class="st-field">
                <label style="display: flex; align-items: center; cursor: pointer; gap: var(--st-sys-spacing-3);">
                  <input
                    type="checkbox"
                    name="tosAccepted"
                    style="accent-color: var(--st-sys-color-primary);"
                    required
                  />
                  <span class="st-field__label">
                    <a href="/terms" target="_blank" style="color: var(--st-sys-color-primary); text-decoration: underline;">
                      利用規約
                    </a>
                    に同意する <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
              </div>

              <div class="st-field">
                <label style="display: flex; align-items: center; cursor: pointer; gap: var(--st-sys-spacing-3);">
                  <input
                    type="checkbox"
                    name="privacyPolicyAccepted"
                    style="accent-color: var(--st-sys-color-primary);"
                    required
                  />
                  <span class="st-field__label">
                    <a
                      href="/privacy"
                      target="_blank"
                      style="color: var(--st-sys-color-primary); text-decoration: underline;"
                    >
                      プライバシーポリシー
                    </a>
                    に同意する <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
              </div>

              <div style="margin-top: var(--st-sys-spacing-6);">
                <button type="submit" class="st-button st-button--filled" style="width: 100%;">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    style="width: 1.25rem; height: 1.25rem;"
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

            <div style="border-top: 1px solid var(--st-sys-color-outline-variant); margin: var(--st-sys-spacing-4) 0;">または</div>

            <div style="text-align: center;">
              <p class="text-sm text-base-content/60">
                すでにアカウントをお持ちの場合は
              </p>
              <a href="/login" style="color: var(--st-sys-color-primary); text-decoration: underline;">
                ログイン
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
