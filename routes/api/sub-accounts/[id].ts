/**
 * 補助科目 API - 個別操作
 *
 * PUT /api/sub-accounts/:id - 補助科目の更新
 * DELETE /api/sub-accounts/:id - 補助科目の削除
 * GET /api/sub-accounts/:id - 補助科目の詳細取得
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UpdateSubAccountRequest {
  name?: string;
}

export const handler: Handlers = {
  // 補助科目の詳細取得
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subAccountId = ctx.params.id;

    try {
      const supabase = getSupabaseClient(userId);

      const { data, error } = await supabase
        .from("sub_accounts")
        .select("*")
        .eq("id", subAccountId)
        .eq("owner_user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(
            JSON.stringify({ error: "補助科目が見つかりません" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        console.error("Failed to fetch sub_account:", error);
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
      console.error("Error fetching sub_account:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // 補助科目の更新
  async PUT(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subAccountId = ctx.params.id;

    try {
      const body: UpdateSubAccountRequest = await req.json();

      // バリデーション
      if (!body.name?.trim()) {
        return new Response(JSON.stringify({ error: "name は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabase = getSupabaseClient(userId);

      // 更新対象が自分の所有かチェック
      const { data: existing } = await supabase
        .from("sub_accounts")
        .select("id")
        .eq("id", subAccountId)
        .eq("owner_user_id", userId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "補助科目が見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("sub_accounts")
        .update({ name: body.name.trim() })
        .eq("id", subAccountId)
        .eq("owner_user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Failed to update sub_account:", error);
        return new Response(
          JSON.stringify({ error: "補助科目の更新に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating sub_account:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // 補助科目の削除
  async DELETE(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subAccountId = ctx.params.id;

    try {
      const supabase = getSupabaseClient(userId);

      // 削除前に仕訳明細での使用をチェック
      const { data: usedInEntries } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("sub_account_id", subAccountId)
        .limit(1);

      if (usedInEntries && usedInEntries.length > 0) {
        return new Response(
          JSON.stringify({
            error: "この補助科目は仕訳で使用されているため削除できません",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("sub_accounts")
        .delete()
        .eq("id", subAccountId)
        .eq("owner_user_id", userId);

      if (error) {
        console.error("Failed to delete sub_account:", error);
        return new Response(
          JSON.stringify({ error: "補助科目の削除に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error deleting sub_account:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
