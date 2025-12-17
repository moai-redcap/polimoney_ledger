import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

// Hub API 設定
const HUB_API_URL =
  Deno.env.get("HUB_API_URL_PROD") || Deno.env.get("HUB_API_URL_DEV") || "";
const HUB_API_KEY =
  Deno.env.get("HUB_API_KEY_PROD") || Deno.env.get("HUB_API_KEY_DEV") || "";

interface PendingReviewData {
  email?: string;
  fullName?: string;
  status?: string;
  rejectionReason?: string;
}

export const handler: Handlers<PendingReviewData> = {
  async GET(req, ctx) {
    const cookies = getCookies(req.headers);
    const accessToken = cookies["sb-access-token"];

    if (!accessToken || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      // 認証されていない場合はログインページへ
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // 審査ステータスが pending_review でない場合はダッシュボードへ
    const registrationStatus = user.user_metadata?.registration_status;
    if (registrationStatus !== "pending_review") {
      return new Response(null, {
        status: 302,
        headers: { Location: "/dashboard" },
      });
    }

    // Hub から申請状態を取得（オプション）
    let hubStatus = "";
    let rejectionReason = "";
    if (HUB_API_URL && HUB_API_KEY) {
      try {
        const response = await fetch(
          `${HUB_API_URL}/api/v1/registration-requests/check/${encodeURIComponent(
            user.email || ""
          )}`,
          {
            headers: { "X-API-Key": HUB_API_KEY },
          }
        );
        if (response.ok) {
          const data = await response.json();
          hubStatus = data.status;
          rejectionReason = data.rejection_reason;
        }
      } catch {
        // Hub への接続エラーは無視
      }
    }

    return ctx.render({
      email: user.email,
      fullName: user.user_metadata?.full_name,
      status: hubStatus,
      rejectionReason,
    });
  },
};

export default function PendingReviewPage({
  data,
}: PageProps<PendingReviewData>) {
  return (
    <>
      <Head>
        <title>審査中 - Polimoney Ledger</title>
        <link href="/static/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div class="card w-full max-w-lg bg-base-100 shadow-xl">
          <div class="card-body text-center">
            {data?.status === "rejected" ? (
              <>
                <div class="text-5xl mb-4">❌</div>
                <h1 class="text-2xl font-bold text-error">
                  登録申請が却下されました
                </h1>
                <div class="alert alert-error mt-4 text-left">
                  <div>
                    <p class="font-bold">却下理由</p>
                    <p class="text-sm">
                      {data.rejectionReason || "理由は記載されていません"}
                    </p>
                  </div>
                </div>
                <p class="text-base-content/60 mt-4">
                  再度申請される場合は、新しいアカウントで登録してください。
                </p>
                <div class="mt-6 space-x-2">
                  <a href="/logout" class="btn btn-ghost">
                    ログアウト
                  </a>
                  <a href="/" class="btn btn-primary">
                    トップページへ
                  </a>
                </div>
              </>
            ) : (
              <>
                <div class="text-5xl mb-4">⏳</div>
                <h1 class="text-2xl font-bold">審査中です</h1>
                <div class="mt-4 space-y-4">
                  <div class="alert alert-info text-left">
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
                      <p class="font-bold">現在、登録申請を審査しています</p>
                      <p class="text-sm">
                        提出いただいた本人確認書類を確認中です。
                        審査が完了次第、<strong>{data?.email}</strong>{" "}
                        宛にメールでお知らせします。
                      </p>
                    </div>
                  </div>

                  <div class="bg-base-200 rounded-lg p-4 text-left">
                    <p class="text-sm text-base-content/60">申請者情報</p>
                    <p class="font-bold">{data?.fullName}</p>
                    <p class="text-sm">{data?.email}</p>
                  </div>

                  <p class="text-sm text-base-content/60">
                    審査には通常 1〜3 営業日かかります。
                    しばらくお待ちください。
                  </p>
                </div>

                <div class="mt-6 space-x-2">
                  <a href="/logout" class="btn btn-ghost">
                    ログアウト
                  </a>
                  <button class="btn btn-outline" onClick="location.reload()">
                    更新
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
