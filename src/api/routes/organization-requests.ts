/**
 * 政治団体リクエスト API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const organizationRequestsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /organization-requests - 政治団体リクエスト一覧
organizationRequestsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organization_requests")
      .select("*")
      .eq("requested_by_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch organization requests:", error);
      return c.json({ error: "政治団体リクエストの取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching organization requests:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /organization-requests - 政治団体リクエスト作成
organizationRequestsRouter.post("/", async (c) => {
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
      .from("organization_requests")
      .insert({
        requested_by_user_id: userId,
        ...body,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create organization request:", error);
      return c.json({ error: "政治団体リクエストの作成に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating organization request:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
