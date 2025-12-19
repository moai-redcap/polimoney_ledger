/**
 * 補助科目 API
 *
 * GET /api/sub-accounts - 補助科目一覧取得
 * POST /api/sub-accounts - 補助科目作成
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface CreateSubAccountRequest {
  ledger_type: "political_organization" | "election";
  parent_account_code: string;
  name: string;
}

export const handler: Handlers = {
  // 補助科目一覧取得
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const ledgerType = url.searchParams.get("ledger_type");

    try {
      const supabase =
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      let query = supabase
        .from("sub_accounts")
        .select("*")
        .eq("owner_user_id", userId)
        .order("parent_account_code")
        .order("name");

      if (ledgerType) {
        query = query.eq("ledger_type", ledgerType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch sub_accounts:", error);
        return new Response(
          JSON.stringify({ error: "補助科目の取得に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching sub_accounts:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // 補助科目作成
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body: CreateSubAccountRequest = await req.json();

      // バリデーション
      if (!body.ledger_type || !body.parent_account_code || !body.name) {
        return new Response(
          JSON.stringify({
            error: "ledger_type, parent_account_code, name は必須です",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const validTypes = ["political_organization", "election"];
      if (!validTypes.includes(body.ledger_type)) {
        return new Response(
          JSON.stringify({
            error:
              "ledger_type は 'political_organization' または 'election' である必要があります",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase =
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      const { data, error } = await supabase
        .from("sub_accounts")
        .insert({
          owner_user_id: userId,
          ledger_type: body.ledger_type,
          parent_account_code: body.parent_account_code,
          name: body.name.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create sub_account:", error);
        return new Response(
          JSON.stringify({ error: "補助科目の登録に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating sub_account:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
