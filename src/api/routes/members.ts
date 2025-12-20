/**
 * メンバー API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const membersRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /members - メンバー一覧
membersRouter.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const organizationId = c.req.query("organization_id");
  const electionId = c.req.query("election_id");

  try {
    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    let query = supabase.from("members").select("*");

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    if (electionId) {
      query = query.eq("election_id", electionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch members:", error);
      return c.json({ error: "メンバーの取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching members:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /members - メンバー追加
membersRouter.post("/", async (c) => {
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
      .from("members")
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error("Failed to create member:", error);
      return c.json({ error: "メンバーの追加に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating member:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// DELETE /members/:id - メンバー削除
membersRouter.delete("/:id", async (c) => {
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

    const { error } = await supabase.from("members").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete member:", error);
      return c.json({ error: "メンバーの削除に失敗しました" }, 500);
    }

    return c.json({ message: "削除しました" });
  } catch (error) {
    console.error("Error deleting member:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
