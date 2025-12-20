/**
 * 政治家プロフィール更新 API
 */

import { Handlers } from "$fresh/server.ts";
import {
  getVerifiedPoliticianByUserId,
  updatePolitician,
  type UpdatePoliticianInput,
} from "../../../lib/hub-client.ts";

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
      // 認証済み政治家を取得
      const politician = await getVerifiedPoliticianByUserId(userId);

      if (!politician) {
        return new Response(
          JSON.stringify({ error: "認証済みの政治家が見つかりません" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const body: UpdatePoliticianInput = await req.json();

      // バリデーション
      if (!body.name?.trim()) {
        return new Response(JSON.stringify({ error: "氏名は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Hub の政治家情報を更新
      const updated = await updatePolitician(politician.id, body, { userId });

      return new Response(JSON.stringify({ success: true, data: updated }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating politician profile:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "更新に失敗しました",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
