import { Head } from "fresh/runtime";
import { page } from "fresh";
import { setCookie } from "$std/http/cookie.ts";
import { createClient } from "@supabase/supabase-js";
import { define } from "../lib/define.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

interface LoginData {
  error?: string;
  redirect?: string;
}

export const handler = define.handlers<LoginData>({
  GET(ctx) {
    const req = ctx.req;
    const url = new URL(req.url);
    const redirect = url.searchParams.get("redirect") || "/dashboard";
    return page({ redirect });
  },

  async POST(ctx) {
    const req = ctx.req;
    const form = await req.formData();
    const email = form.get("email")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const redirect = form.get("redirect")?.toString() || "/";

    if (!email || !password) {
      return page({
        error: "メールアドレスとパスワードを入力してください",
        redirect,
      });
    }

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return page({ error: "Supabase が設定されていません", redirect });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return page({ error: error.message, redirect });
    }

    if (!data.session) {
      return page({ error: "ログインに失敗しました", redirect });
    }

    // Cookie にトークンをセット
    const headers = new Headers();
    headers.set("Location", redirect);

    setCookie(headers, {
      name: "sb-access-token",
      value: data.session.access_token,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 3600, // 1時間
    });

    setCookie(headers, {
      name: "sb-refresh-token",
      value: data.session.refresh_token,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 604800, // 7日
    });

    return new Response(null, { status: 302, headers });
  },
});

export default define.page<typeof handler>(({ data }) => {
  return (
    <>
      <Head>
        <title>ログイン - Polimoney Ledger</title>
      </Head>
      <div style="min-height: 100vh; background: var(--st-sys-color-surface); display: flex; align-items: center; justify-content: center; padding: var(--st-sys-spacing-4);">
        <div class="st-card st-card--elevated" style="width: 100%; max-width: 28rem;">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-8);">
            <div style="text-align: center; margin-bottom: var(--st-sys-spacing-6);">
              <div class="st-flex st-flex--center st-gap-3">
                <img
                  src="/logo-ledger.svg"
                  alt="Polimoney Ledger"
                  style="width: 3rem; height: 3rem;"
                />
                <div style="text-align: left;">
                  <h1 style="font-size: var(--st-sys-typescale-headline-small-size); font-weight: 700; color: var(--st-sys-color-primary);">Polimoney</h1>
                  <p style="font-size: var(--st-sys-typescale-body-small-size); font-weight: 500; color: var(--st-sys-color-tertiary); margin-top: -0.25rem;">
                    Ledger
                  </p>
                </div>
              </div>
              <p style="color: var(--st-sys-color-on-surface-variant); margin-top: var(--st-sys-spacing-4);">ログインしてください</p>
            </div>

            {data?.error && (
              <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
                <div class="st-alert__icon">❌</div>
                <div class="st-alert__content">{data.error}</div>
              </div>
            )}

            <form method="POST" class="st-stack st-stack--md">
              <input
                type="hidden"
                name="redirect"
                value={data?.redirect || "/dashboard"}
              />

              <div class="st-field">
                <label class="st-field__label">メールアドレス</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  class="st-input"
                  required
                />
              </div>

              <div class="st-field">
                <label class="st-field__label">パスワード</label>
                <input
                  type="password"
                  name="password"
                  placeholder="パスワード"
                  class="st-input"
                  required
                />
              </div>

              <button type="submit" class="st-button st-button--filled" style="width: 100%;">
                ログイン
              </button>
            </form>

            <div style="display: flex; align-items: center; gap: var(--st-sys-spacing-3); margin: var(--st-sys-spacing-4) 0;">
              <hr style="flex: 1; border: none; border-top: 1px solid var(--st-sys-color-outline-variant);" />
              <span style="color: var(--st-sys-color-on-surface-variant); font-size: var(--st-sys-typescale-body-small-size);">または</span>
              <hr style="flex: 1; border: none; border-top: 1px solid var(--st-sys-color-outline-variant);" />
            </div>

            <div style="text-align: center;">
              <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
                アカウントをお持ちでない場合は
              </p>
              <a href="/register" style="color: var(--st-sys-color-primary); font-weight: 500;">
                新規登録
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
