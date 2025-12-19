import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface CreateContactRequest {
  contact_type: "person" | "corporation";
  name: string;
  address?: string;
  occupation?: string;
  is_name_private?: boolean;
  is_address_private?: boolean;
  is_occupation_private?: boolean;
  privacy_reason_type?: "personal_info" | "other";
  privacy_reason_other?: string;
}

export const handler: Handlers = {
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body: CreateContactRequest = await req.json();

      // バリデーション
      if (!body.contact_type || !body.name) {
        return new Response(
          JSON.stringify({ error: "contact_type と name は必須です" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

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

      const supabase =
        userId === TEST_USER_ID
          ? getServiceClient()
          : getSupabaseClient(userId);

      const { data, error } = await supabase
        .from("contacts")
        .insert({
          owner_user_id: userId,
          contact_type: body.contact_type,
          name: body.name,
          address: body.address || null,
          occupation: body.occupation || null,
          is_name_private: body.is_name_private || false,
          is_address_private: body.is_address_private || false,
          is_occupation_private: body.is_occupation_private || false,
          privacy_reason_type: body.privacy_reason_type || null,
          privacy_reason_other: body.privacy_reason_other || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create contact:", error);
        return new Response(
          JSON.stringify({ error: "関係者の登録に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating contact:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const supabase =
        userId === TEST_USER_ID
          ? getServiceClient()
          : getSupabaseClient(userId);

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, contact_type, address, occupation")
        .eq("owner_user_id", userId)
        .order("name");

      if (error) {
        console.error("Failed to fetch contacts:", error);
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
      console.error("Error fetching contacts:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
