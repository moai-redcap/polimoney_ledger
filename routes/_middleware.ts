/**
 * 認証ミドルウェア
 *
 * 保護されたルートへのアクセスを制御
 * - /login, /register は認証不要
 * - /api/* は API キーまたはセッション認証
 * - その他のルートはログイン必須
 */

import { FreshContext } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

// 認証不要なパス（完全一致）
const PUBLIC_PATHS_EXACT = ["/welcome", "/privacy"];

// 認証不要なパス（前方一致）
const PUBLIC_PATHS_PREFIX = ["/login", "/register", "/pending-review"];

function isPublicPath(pathname: string): boolean {
  // 完全一致チェック
  if (PUBLIC_PATHS_EXACT.includes(pathname)) {
    return true;
  }
  // 前方一致チェック
  return PUBLIC_PATHS_PREFIX.some((path) => pathname.startsWith(path));
}

export async function handler(req: Request, ctx: FreshContext) {
  const url = new URL(req.url);

  // 静的ファイルはスキップ
  // Fresh では static/ 内のファイルはルートから直接提供される（/styles.css など）
  const staticExtensions = [
    ".css",
    ".js",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
  ];
  const hasStaticExtension = staticExtensions.some((ext) =>
    url.pathname.endsWith(ext)
  );

  if (
    url.pathname.startsWith("/_fresh") ||
    url.pathname.startsWith("/static") ||
    hasStaticExtension
  ) {
    return ctx.next();
  }

  // 公開パスはスキップ
  if (isPublicPath(url.pathname)) {
    return ctx.next();
  }

  // Supabase が設定されていない場合はスキップ（開発用）
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.warn("[Auth] Supabase not configured, skipping auth check");
    return ctx.next();
  }

  // Cookie からアクセストークンを取得
  const cookies = getCookies(req.headers);
  const accessToken = cookies["sb-access-token"];
  const refreshToken = cookies["sb-refresh-token"];

  if (!accessToken) {
    // ログインページにリダイレクト
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?redirect=${encodeURIComponent(url.pathname)}`,
      },
    });
  }

  // トークンを検証
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    // リフレッシュトークンで再取得を試みる
    if (refreshToken) {
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (!refreshError && refreshData.session) {
        // 新しいトークンをセット
        const response = await ctx.next();
        const headers = new Headers(response.headers);

        headers.append(
          "Set-Cookie",
          `sb-access-token=${refreshData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
        );
        headers.append(
          "Set-Cookie",
          `sb-refresh-token=${refreshData.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
        );

        // ユーザー情報をコンテキストに追加
        ctx.state.user = refreshData.user;
        ctx.state.userId = refreshData.user?.id;

        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }
    }

    // 認証失敗、ログインページにリダイレクト
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?redirect=${encodeURIComponent(url.pathname)}`,
      },
    });
  }

  // 審査ステータスをチェック
  const registrationStatus = user.user_metadata?.registration_status;
  if (registrationStatus === "pending_review") {
    // 審査待ちユーザーは専用ページにリダイレクト
    if (!url.pathname.startsWith("/pending-review")) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/pending-review" },
      });
    }
  }

  // ユーザー情報をコンテキストに追加
  ctx.state.user = user;
  ctx.state.userId = user.id;

  return ctx.next();
}
