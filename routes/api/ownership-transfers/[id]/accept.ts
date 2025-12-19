/**
 * オーナー譲渡申請の承認 API
 *
 * POST /api/ownership-transfers/:id/accept - 申請を承認
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
        .select(
          "id, from_user_id, to_user_id, organization_id, election_id, status"
        )
        .eq("id", transferId)
        .single();

      if (fetchError || !transfer) {
        return new Response(
          JSON.stringify({ error: "譲渡申請が見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 譲渡先ユーザーのみ承認可能
      if (transfer.to_user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "譲渡先のユーザーのみ承認できます" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // pending 状態のみ承認可能
      if (transfer.status !== "pending") {
        return new Response(
          JSON.stringify({ error: "保留中の申請のみ承認できます" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // トランザクション的に処理（オーナー変更 + ステータス更新）
      // 1. オーナーを変更
      if (transfer.organization_id) {
        const { error: orgError } = await supabase
          .from("political_organizations")
          .update({ owner_user_id: userId })
          .eq("id", transfer.organization_id);

        if (orgError) {
          console.error("Failed to update organization owner:", orgError);
          return new Response(
            JSON.stringify({ error: "オーナー変更に失敗しました" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      if (transfer.election_id) {
        const { error: elecError } = await supabase
          .from("elections")
          .update({ owner_user_id: userId })
          .eq("id", transfer.election_id);

        if (elecError) {
          console.error("Failed to update election owner:", elecError);
          return new Response(
            JSON.stringify({ error: "オーナー変更に失敗しました" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // 2. 譲渡申請のステータスを completed に更新
      const { error: updateError } = await supabase
        .from("ownership_transfers")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", transferId);

      if (updateError) {
        console.error("Failed to update transfer status:", updateError);
        return new Response(
          JSON.stringify({ error: "ステータス更新に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. 旧オーナーを admin としてメンバーに追加（オプション）
      const memberData = {
        user_id: transfer.from_user_id,
        role: "admin",
        invited_by_user_id: userId,
        organization_id: transfer.organization_id || null,
        election_id: transfer.election_id || null,
      };

      // 既にメンバーでない場合のみ追加
      const { data: existingMember } = await supabase
        .from("ledger_members")
        .select("id")
        .eq("user_id", transfer.from_user_id)
        .eq(
          transfer.organization_id ? "organization_id" : "election_id",
          transfer.organization_id || transfer.election_id
        )
        .single();

      if (!existingMember) {
        await supabase.from("ledger_members").insert(memberData);
      }

      return new Response(
        JSON.stringify({
          message: "オーナー譲渡が完了しました",
          data: { new_owner_id: userId },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error accepting transfer:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
