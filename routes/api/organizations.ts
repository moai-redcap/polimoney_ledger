import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface CreateOrganizationRequest {
  name: string;
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
      const body: CreateOrganizationRequest = await req.json();

      // バリデーション
      if (!body.name) {
        return new Response(JSON.stringify({ error: "政治団体名は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabase =
        userId === TEST_USER_ID
          ? getServiceClient()
          : getSupabaseClient(userId);

      // 政治団体を作成
      const { data: organization, error: orgError } = await supabase
        .from("political_organizations")
        .insert({
          owner_user_id: userId,
          name: body.name,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Failed to create organization:", orgError);
        return new Response(
          JSON.stringify({ error: "政治団体の作成に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          organization_id: organization.id,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating organization:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
