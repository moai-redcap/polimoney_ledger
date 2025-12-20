/**
 * 政治団体 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const organizationsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /organizations/:id - 政治団体詳細
organizationsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return c.json({ error: "政治団体が見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /organizations/:id - 政治団体更新
organizationsRouter.put("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const body = await c.req.json();

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organizations")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update organization:", error);
      return c.json({ error: "政治団体の更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating organization:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /organizations - 政治団体作成
organizationsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        owner_user_id: userId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create organization:", error);
      return c.json({ error: "政治団体の作成に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating organization:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /organizations/manager-verify - 管理者認証開始
organizationsRouter.post("/manager-verify", async (c) => {
  // TODO: 実装
  return c.json({ error: "Not implemented" }, 501);
});

// POST /organizations/manager-verify/:id/send-code - 認証コード送信
organizationsRouter.post("/manager-verify/:id/send-code", async (c) => {
  // TODO: 実装
  return c.json({ error: "Not implemented" }, 501);
});

// POST /organizations/manager-verify/:id/verify-code - 認証コード確認
organizationsRouter.post("/manager-verify/:id/verify-code", async (c) => {
  // TODO: 実装
  return c.json({ error: "Not implemented" }, 501);
});
