/**
 * オーナー譲渡申請の個別操作 API
 *
 * DELETE /api/ownership-transfers/:id - 申請をキャンセル（申請者のみ）
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const handler: Handlers = {
  // 申請をキャンセル（申請者のみ）
  async DELETE(req, ctx) {
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
        .select("id, from_user_id, status")
        .eq("id", transferId)
        .single();

      if (fetchError || !transfer) {
        return new Response(
          JSON.stringify({ error: "譲渡申請が見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 申請者のみキャンセル可能
      if (transfer.from_user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "申請者のみキャンセルできます" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // pending 状態のみキャンセル可能
      if (transfer.status !== "pending") {
        return new Response(
          JSON.stringify({ error: "保留中の申請のみキャンセルできます" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // ステータスを cancelled に更新
      const { error: updateError } = await supabase
        .from("ownership_transfers")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", transferId);

      if (updateError) {
        console.error("Failed to cancel transfer:", updateError);
        return new Response(
          JSON.stringify({ error: "キャンセルに失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "譲渡申請をキャンセルしました" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
