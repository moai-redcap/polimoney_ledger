/**
 * 政治家 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const politiciansRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /politicians/:id - 政治家詳細
politiciansRouter.get("/:id", async (c) => {
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
      .from("politicians")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return c.json({ error: "政治家が見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching politician:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /politicians/verify - 政治家認証開始
politiciansRouter.post("/verify", async (c) => {
  // TODO: 実装
  return c.json({ error: "Not implemented" }, 501);
});

// POST /politicians/verify/:id/send-code - 認証コード送信
politiciansRouter.post("/verify/:id/send-code", async (c) => {
  // TODO: 実装
  return c.json({ error: "Not implemented" }, 501);
});

// POST /politicians/verify/:id/verify-code - 認証コード確認
politiciansRouter.post("/verify/:id/verify-code", async (c) => {
  // TODO: 実装
  return c.json({ error: "Not implemented" }, 501);
});
