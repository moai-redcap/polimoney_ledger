/**
 * メールアドレス変更 API
 */

import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async PUT(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      const { email } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: "メールアドレスは必須です" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // メールアドレスの形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: "有効なメールアドレスを入力してください" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const supabase = getSupabaseClient(userId);

      // Supabase Auth のメールアドレス更新
      // 確認メールが自動送信される
      const { error } = await supabase.auth.updateUser({
        email: email,
      });

      if (error) {
        console.error("Failed to update email:", error);

        // よくあるエラーメッセージを日本語化
        if (error.message.includes("already registered")) {
          return new Response(
            JSON.stringify({
              error: "このメールアドレスは既に使用されています",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ error: "メールアドレスの変更に失敗しました" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "確認メールを送信しました",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error updating email:", error);
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
