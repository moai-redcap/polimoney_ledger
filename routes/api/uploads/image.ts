/**
 * 画像アップロード API (Hub へのプロキシ)
 */

import { Handlers } from "$fresh/server.ts";

// Hub API 設定
const IS_PRODUCTION = Deno.env.get("APP_ENV") === "production";
const HUB_API_URL = IS_PRODUCTION
  ? Deno.env.get("HUB_API_URL_PROD") || "https://api.polimoney.dd2030.org"
  : Deno.env.get("HUB_API_URL_DEV") || "http://localhost:3722";
const HUB_API_KEY = IS_PRODUCTION
  ? Deno.env.get("HUB_API_KEY_PROD") || ""
  : Deno.env.get("HUB_API_KEY_DEV") || "";

export const handler: Handlers = {
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // FormData をそのまま Hub に転送
      const formData = await req.formData();

      // Hub に転送
      const response = await fetch(`${HUB_API_URL}/api/v1/uploads/image`, {
        method: "POST",
        headers: {
          "X-API-Key": HUB_API_KEY,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Upload proxy error:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
