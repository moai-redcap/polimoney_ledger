/**
 * メンバー管理 API
 *
 * GET /api/members?organization_id=xxx または election_id=xxx - メンバー一覧取得
 * POST /api/members - メンバー招待
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";
import { AppRole } from "../../lib/permissions.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface InviteMemberRequest {
  email: string;
  role: AppRole;
  organization_id?: string;
  election_id?: string;
}

export const handler: Handlers = {
  // メンバー一覧取得
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organization_id");
    const electionId = url.searchParams.get("election_id");

    if (!organizationId && !electionId) {
      return new Response(
        JSON.stringify({
          error: "organization_id または election_id を指定してください",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const supabase = getSupabaseClient(userId);

      // まず台帳の所有者かどうかをチェック
      let isOwner = false;
      if (organizationId) {
        const { data: org } = await supabase
          .from("political_organizations")
          .select("owner_user_id")
          .eq("id", organizationId)
          .single();
        isOwner = org?.owner_user_id === userId;
      } else if (electionId) {
        const { data: election } = await supabase
          .from("elections")
          .select("owner_user_id")
          .eq("id", electionId)
          .single();
        isOwner = election?.owner_user_id === userId;
      }

      // メンバー一覧を取得
      let query = supabase.from("ledger_members").select(`
        id,
        user_id,
        role,
        created_at,
        invited_by_user_id
      `);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      } else if (electionId) {
        query = query.eq("election_id", electionId);
      }

      const { data: members, error } = await query.order("created_at");

      if (error) {
        console.error("Failed to fetch members:", error);
        return new Response(
          JSON.stringify({ error: "メンバーの取得に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // ユーザー情報を取得（display_name を含む）
      // 注: 本番環境では auth.users への直接アクセスは制限されるため、
      // profiles テーブルまたは別の方法で取得する必要がある
      const membersWithProfiles = members || [];

      return new Response(
        JSON.stringify({
          data: membersWithProfiles,
          isOwner,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error fetching members:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // メンバー招待
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body: InviteMemberRequest = await req.json();

      // バリデーション
      if (!body.email || !body.role) {
        return new Response(
          JSON.stringify({ error: "email と role は必須です" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!body.organization_id && !body.election_id) {
        return new Response(
          JSON.stringify({
            error: "organization_id または election_id を指定してください",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

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

      // 権限チェック: 台帳のオーナーかどうか
      let isOwner = false;
      if (body.organization_id) {
        const { data: org } = await supabase
          .from("political_organizations")
          .select("owner_user_id")
          .eq("id", body.organization_id)
          .single();
        isOwner = org?.owner_user_id === userId;
      } else if (body.election_id) {
        const { data: election } = await supabase
          .from("elections")
          .select("owner_user_id")
          .eq("id", body.election_id)
          .single();
        isOwner = election?.owner_user_id === userId;
      }

      // オーナーまたは manageMembers 権限を持つメンバーのみ招待可能
      if (!isOwner) {
        // メンバーとしての権限をチェック
        let memberQuery = supabase
          .from("ledger_members")
          .select("role")
          .eq("user_id", userId);

        if (body.organization_id) {
          memberQuery = memberQuery.eq("organization_id", body.organization_id);
        } else if (body.election_id) {
          memberQuery = memberQuery.eq("election_id", body.election_id);
        }

        const { data: member } = await memberQuery.single();
        const memberRole = member?.role as AppRole | undefined;

        // admin のみ manageMembers 権限を持つ
        if (memberRole !== "admin") {
          return new Response(
            JSON.stringify({ error: "メンバーを招待する権限がありません" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // メールアドレスからユーザーを検索
      // 注: Service Role Key が必要な場合があるため、開発中はテストユーザーで対応
      // 本番では Edge Function での実装を推奨

      // ユーザーが存在するか確認（簡易実装）
      // 実際の実装では、招待メール送信などの処理が必要
      const { data: existingMember } = await supabase
        .from("ledger_members")
        .select("id")
        .eq(
          body.organization_id ? "organization_id" : "election_id",
          body.organization_id || body.election_id
        )
        .limit(1);

      // 仮のユーザーIDを生成（実際の実装では招待されたユーザーのIDを使用）
      // この実装は開発用のプレースホルダーです
      const invitedUserId = crypto.randomUUID();

      const { data, error } = await supabase
        .from("ledger_members")
        .insert({
          user_id: invitedUserId,
          organization_id: body.organization_id || null,
          election_id: body.election_id || null,
          role: body.role,
          invited_by_user_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to invite member:", error);
        return new Response(
          JSON.stringify({ error: "メンバーの招待に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          data,
          message: `${body.email} にメンバー招待を送信しました（開発モード）`,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error inviting member:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
