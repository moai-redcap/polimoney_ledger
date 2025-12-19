/**
 * プロフィール API
 *
 * GET /api/profile - プロフィール取得
 * PUT /api/profile - プロフィール更新（表示名）
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface UpdateProfileRequest {
  display_name: string;
}

export const handler: Handlers = {
  // プロフィール取得
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
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return new Response(
          JSON.stringify({ error: "ユーザー情報の取得に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Supabase Auth では display_name または full_name で保存される場合がある
      const displayName =
        user.user_metadata?.display_name || user.user_metadata?.full_name || "";

      return new Response(
        JSON.stringify({
          data: {
            id: user.id,
            email: user.email,
            display_name: displayName,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error fetching profile:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  // プロフィール更新
  async PUT(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body: UpdateProfileRequest = await req.json();

      if (!body.display_name?.trim()) {
        return new Response(JSON.stringify({ error: "表示名は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabase =
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      // Supabase Auth Dashboard で "Display name" として表示されるのは full_name
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: body.display_name.trim() },
      });

      if (error) {
        console.error("Failed to update profile:", error);
        return new Response(
          JSON.stringify({ error: "プロフィールの更新に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const updatedDisplayName =
        data.user.user_metadata?.display_name ||
        data.user.user_metadata?.full_name ||
        "";

      return new Response(
        JSON.stringify({
          data: {
            id: data.user.id,
            email: data.user.email,
            display_name: updatedDisplayName,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      return new Response(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
