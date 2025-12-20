import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

export const handler: Handlers = {
  async POST(req) {
    try {
      const { access_token, refresh_token } = await req.json();

      if (!access_token) {
        return new Response(
          JSON.stringify({ error: "access_token is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

      // トークンを使ってセッションを設定
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || "",
      });

      if (error) {
        console.error("Failed to set session:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!data.session) {
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // セッションCookieを設定
      const headers = new Headers({
        "Content-Type": "application/json",
      });

      // アクセストークンをCookieに設定
      headers.append(
        "Set-Cookie",
        `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
      );

      // リフレッシュトークンをCookieに設定
      if (data.session.refresh_token) {
        headers.append(
          "Set-Cookie",
          `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers }
      );
    } catch (error) {
      console.error("Auth callback error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
