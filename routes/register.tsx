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
    const role = form.get("role")?.toString() || "";
    const verificationDoc = form.get("verificationDoc") as File | null;

    // バリデーション
    if (!email || !password || !fullName || !role) {
      return ctx.render({ error: "すべての必須項目を入力してください" });
    }

    if (password !== confirmPassword) {
      return ctx.render({ error: "パスワードが一致しません" });
    }

    if (password.length < 8) {
      return ctx.render({ error: "パスワードは8文字以上で入力してください" });
    }

    if (!verificationDoc || verificationDoc.size === 0) {
      return ctx.render({ error: "本人確認書類を添付してください" });
    }

    // ファイルサイズチェック (5MB)
    if (verificationDoc.size > 5 * 1024 * 1024) {
      return ctx.render({ error: "ファイルサイズは5MB以下にしてください" });
    }

    // ファイル形式チェック
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(verificationDoc.type)) {
      return ctx.render({ error: "JPG, PNG, GIF, PDF形式のファイルを添付してください" });
    }

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return ctx.render({ error: "Supabase が設定されていません" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    // ユーザー作成（審査待ち状態）
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          registration_status: "pending_review", // 審査待ち
        },
      },
    });

    if (authError) {
      return ctx.render({ error: authError.message });
    }

    // TODO: 本人確認書類を Supabase Storage にアップロード
    // const userId = authData.user?.id;
    // if (userId) {
    //   const fileExt = verificationDoc.name.split('.').pop();
    //   const filePath = `verification/${userId}/${Date.now()}.${fileExt}`;
    //   await supabase.storage
    //     .from('documents')
    //     .upload(filePath, verificationDoc);
    // }

    return ctx.render({ success: true, email });
  },
};

export default function RegisterPage({ data }: PageProps<RegisterData>) {
  if (data?.success) {
    return (
      <>
        <Head>
          <title>申請完了 - Polimoney Ledger</title>
          <link href="/static/styles.css" rel="stylesheet" />
        </Head>
        <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
          <div class="card w-full max-w-md bg-base-100 shadow-xl">
            <div class="card-body text-center">
              <div class="text-5xl mb-4">📋</div>
              <h1 class="text-2xl font-bold">登録申請を受け付けました</h1>
              <div class="mt-4 space-y-3 text-left">
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
                  <div>
                    <p class="font-bold">審査について</p>
                    <p class="text-sm">
                      提出いただいた書類を確認後、メールにてご連絡いたします。
                      審査には数日かかる場合があります。
                    </p>
                  </div>
                </div>
                <p class="text-base-content/60 text-sm">
                  <strong>{data.email}</strong> 宛に確認メールを送信しました。
                  メール内のリンクをクリックして、メールアドレスの確認を完了してください。
                </p>
              </div>
              <div class="mt-6">
                <a href="/" class="btn btn-ghost">
                  トップページへ戻る
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
        <title>新規登録申請 - Polimoney Ledger</title>
        <link href="/static/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div class="card w-full max-w-lg bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="text-center mb-4">
              <span class="text-5xl">📒</span>
              <h1 class="text-2xl font-bold mt-2">Polimoney Ledger</h1>
              <p class="text-base-content/60 mt-1">新規登録申請</p>
            </div>

            {/* 審査についての説明 */}
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
              <div>
                <p class="font-bold text-sm">本サービスは政治家・会計責任者向けです</p>
                <p class="text-xs">
                  登録には本人確認書類の提出と審査が必要です。
                </p>
              </div>
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{data.error}</span>
              </div>
            )}

            <form method="POST" encType="multipart/form-data" class="space-y-4">
              {/* 基本情報 */}
              <div class="divider text-sm text-base-content/60">基本情報</div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    お名前 <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="山田 太郎"
                  class="input input-bordered w-full"
                  required
                />
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

              {/* 役割 */}
              <div class="divider text-sm text-base-content/60">役割</div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    あなたの役割 <span class="text-error">*</span>
                  </span>
                </label>
                <select name="role" class="select select-bordered w-full" required>
                  <option value="" disabled selected>
                    選択してください
                  </option>
                  <option value="politician">政治家本人</option>
                  <option value="accountant">会計責任者</option>
                  <option value="both">政治家本人 兼 会計責任者</option>
                </select>
              </div>

              {/* 本人確認書類 */}
              <div class="divider text-sm text-base-content/60">本人確認書類</div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    確認書類 <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="file"
                  name="verificationDoc"
                  accept=".jpg,.jpeg,.png,.gif,.pdf"
                  class="file-input file-input-bordered w-full"
                  required
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    以下のいずれかを添付してください：
                  </span>
                </label>
                <ul class="text-xs text-base-content/60 ml-4 list-disc space-y-1">
                  <li>議員証（政治家の場合）</li>
                  <li>政治団体設立届出書の控え</li>
                  <li>選任届出書の控え（会計責任者の場合）</li>
                </ul>
                <label class="label">
                  <span class="label-text-alt text-base-content/40">
                    JPG, PNG, GIF, PDF / 5MB以下
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
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                    />
                  </svg>
                  登録申請する
                </button>
              </div>

              <p class="text-xs text-center text-base-content/50 mt-2">
                申請後、審査を経てアカウントが有効化されます
              </p>
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
