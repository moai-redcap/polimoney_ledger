/**
 * 関係者 API - 個別操作
 *
 * PUT /api/contacts/:id - 関係者の更新
 * DELETE /api/contacts/:id - 関係者の削除
 * GET /api/contacts/:id - 関係者の詳細取得
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UpdateContactRequest {
  contact_type?: "person" | "corporation";
  name?: string;
  address?: string | null;
  occupation?: string | null;
  is_name_private?: boolean;
  is_address_private?: boolean;
  is_occupation_private?: boolean;
  privacy_reason_type?: "personal_info" | "other" | null;
  privacy_reason_other?: string | null;
}

export const handler: Handlers = {
  // 関係者の詳細取得
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contactId = ctx.params.id;

    try {
      const supabase = getSupabaseClient(userId);

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .eq("owner_user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(
            JSON.stringify({ error: "関係者が見つかりません" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        console.error("Failed to fetch contact:", error);
        return new Response(
          JSON.stringify({ error: "関係者の取得に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching contact:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // 関係者の更新
  async PUT(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contactId = ctx.params.id;

    try {
      const body: UpdateContactRequest = await req.json();

      // バリデーション
      if (body.contact_type) {
        const validTypes = ["person", "corporation"];
        if (!validTypes.includes(body.contact_type)) {
          return new Response(
            JSON.stringify({
              error:
                "contact_type は 'person' または 'corporation' である必要があります",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      const supabase = getSupabaseClient(userId);

      // 更新対象が自分の所有かチェック
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("id", contactId)
        .eq("owner_user_id", userId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "関係者が見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 更新データの構築
      const updateData: Record<string, unknown> = {};
      if (body.contact_type !== undefined)
        updateData.contact_type = body.contact_type;
      if (body.name !== undefined) updateData.name = body.name;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.occupation !== undefined)
        updateData.occupation = body.occupation;
      if (body.is_name_private !== undefined)
        updateData.is_name_private = body.is_name_private;
      if (body.is_address_private !== undefined)
        updateData.is_address_private = body.is_address_private;
      if (body.is_occupation_private !== undefined)
        updateData.is_occupation_private = body.is_occupation_private;
      if (body.privacy_reason_type !== undefined)
        updateData.privacy_reason_type = body.privacy_reason_type;
      if (body.privacy_reason_other !== undefined)
        updateData.privacy_reason_other = body.privacy_reason_other;

      const { data, error } = await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", contactId)
        .eq("owner_user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Failed to update contact:", error);
        return new Response(
          JSON.stringify({ error: "関係者の更新に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating contact:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // 関係者の削除
  async DELETE(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contactId = ctx.params.id;

    try {
      const supabase = getSupabaseClient(userId);

      // 削除前に仕訳での使用をチェック
      const { data: usedInJournals } = await supabase
        .from("journals")
        .select("id")
        .eq("contact_id", contactId)
        .limit(1);

      if (usedInJournals && usedInJournals.length > 0) {
        return new Response(
          JSON.stringify({
            error: "この関係者は仕訳で使用されているため削除できません",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("owner_user_id", userId);

      if (error) {
        console.error("Failed to delete contact:", error);
        return new Response(
          JSON.stringify({ error: "関係者の削除に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error deleting contact:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
