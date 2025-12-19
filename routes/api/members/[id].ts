/**
 * メンバー管理 API - 個別操作
 *
 * PUT /api/members/:id - ロール変更
 * DELETE /api/members/:id - メンバー削除
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import { AppRole } from "../../../lib/permissions.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UpdateMemberRequest {
  role: AppRole;
}

export const handler: Handlers = {
  // ロール変更
  async PUT(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const memberId = ctx.params.id;

    try {
      const body: UpdateMemberRequest = await req.json();

      const validRoles: AppRole[] = [
        "admin",
        "accountant",
        "approver",
        "submitter",
        "viewer",
      ];
      if (!validRoles.includes(body.role)) {
        return new Response(JSON.stringify({ error: "無効な role です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabase = getSupabaseClient(userId);

      // メンバー情報を取得
      const { data: member, error: fetchError } = await supabase
        .from("ledger_members")
        .select(
          "*, political_organizations(owner_user_id), elections(owner_user_id)"
        )
        .eq("id", memberId)
        .single();

      if (fetchError || !member) {
        return new Response(
          JSON.stringify({ error: "メンバーが見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 権限チェック: オーナーまたは admin のみ変更可能
      const ownerUserId =
        member.political_organizations?.owner_user_id ||
        member.elections?.owner_user_id;
      const isOwner = ownerUserId === userId;

      if (!isOwner) {
        // メンバーとしての権限をチェック
        const { data: currentMember } = await supabase
          .from("ledger_members")
          .select("role")
          .eq("user_id", userId)
          .eq(
            member.organization_id ? "organization_id" : "election_id",
            member.organization_id || member.election_id
          )
          .single();

        if (currentMember?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: "権限を変更する権限がありません" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      const { data, error } = await supabase
        .from("ledger_members")
        .update({ role: body.role })
        .eq("id", memberId)
        .select()
        .single();

      if (error) {
        console.error("Failed to update member:", error);
        return new Response(
          JSON.stringify({ error: "メンバーの更新に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating member:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // メンバー削除
  async DELETE(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const memberId = ctx.params.id;

    try {
      const supabase = getSupabaseClient(userId);

      // メンバー情報を取得
      const { data: member, error: fetchError } = await supabase
        .from("ledger_members")
        .select(
          "*, political_organizations(owner_user_id), elections(owner_user_id)"
        )
        .eq("id", memberId)
        .single();

      if (fetchError || !member) {
        return new Response(
          JSON.stringify({ error: "メンバーが見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 権限チェック
      const ownerUserId =
        member.political_organizations?.owner_user_id ||
        member.elections?.owner_user_id;
      const isOwner = ownerUserId === userId;

      if (!isOwner) {
        const { data: currentMember } = await supabase
          .from("ledger_members")
          .select("role")
          .eq("user_id", userId)
          .eq(
            member.organization_id ? "organization_id" : "election_id",
            member.organization_id || member.election_id
          )
          .single();

        if (currentMember?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: "メンバーを削除する権限がありません" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // オーナー自身は削除不可
      if (member.user_id === ownerUserId) {
        return new Response(
          JSON.stringify({ error: "オーナーは削除できません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("ledger_members")
        .delete()
        .eq("id", memberId);

      if (error) {
        console.error("Failed to delete member:", error);
        return new Response(
          JSON.stringify({ error: "メンバーの削除に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error deleting member:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
