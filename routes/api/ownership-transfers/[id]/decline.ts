/**
 * オーナー譲渡申請の拒否 API
 *
 * POST /api/ownership-transfers/:id/decline - 申請を拒否
 */

import { Handlers } from "$fresh/server.ts";
import {
  getServiceClient,
  getSupabaseClient,
} from "../../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const handler: Handlers = {
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const transferId = ctx.params.id;

    try {
      const supabase = getSupabaseClient(userId);

      // 譲渡申請を取得
      const { data: transfer, error: fetchError } = await supabase
        .from("ownership_transfers")
        .select("id, to_user_id, status")
        .eq("id", transferId)
        .single();

      if (fetchError || !transfer) {
        return new Response(
          JSON.stringify({ error: "譲渡申請が見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 譲渡先ユーザーのみ拒否可能
      if (transfer.to_user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "譲渡先のユーザーのみ拒否できます" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // pending 状態のみ拒否可能
      if (transfer.status !== "pending") {
        return new Response(
          JSON.stringify({ error: "保留中の申請のみ拒否できます" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // ステータスを declined に更新
      const { error: updateError } = await supabase
        .from("ownership_transfers")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", transferId);

      if (updateError) {
        console.error("Failed to decline transfer:", updateError);
        return new Response(JSON.stringify({ error: "拒否に失敗しました" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ message: "譲渡申請を拒否しました" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error declining transfer:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
