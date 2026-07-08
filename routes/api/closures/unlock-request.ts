import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import {
  checkUnlockStatus,
  createUnlockRequest,
} from "../../../lib/hub-client.ts";
import { Handlers } from "fresh/compat";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UnlockRequestBody {
  organizationId: string;
  year: number;
  reason: string;
}

export const handler: Handlers = {
  /**
   * POST - ロック解除リクエストを作成
   */
  async POST(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: UnlockRequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { organizationId, year, reason } = body;

    if (!organizationId || !year) {
      return new Response(
        JSON.stringify({ error: "organizationId and year are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!reason || reason.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "理由は10文字以上で入力してください" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const supabase = userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

      // 組織の所有者確認
      const { data: org, error: orgError } = await supabase
        .from("political_organizations")
        .select("id, owner_user_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // ユーザーのメールアドレスを取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      const userEmail = profile?.email || "unknown@example.com";

      // Hub API にリクエスト送信
      const unlockRequest = await createUnlockRequest(
        {
          ledger_id: organizationId,
          ledger_type: "organization",
          fiscal_year: year,
          requested_by_user_id: userId,
          requested_by_email: userEmail,
          reason: reason.trim(),
        },
        { userId },
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "ロック解除リクエストを送信しました",
          request: unlockRequest,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error creating unlock request:", error);

      // Hub からのエラーをそのまま返す
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";

      // 既存リクエストエラーの場合
      if (errorMessage.includes("pending unlock request already exists")) {
        return new Response(
          JSON.stringify({ error: "既にロック解除リクエストが申請中です" }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  /**
   * GET - ロック解除状態を確認
   */
  async GET(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const organizationId = url.searchParams.get("org_id");

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "org_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const result = await checkUnlockStatus(organizationId, { userId });
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error checking unlock status:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
