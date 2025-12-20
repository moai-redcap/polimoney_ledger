/**
 * プロフィール API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const profileRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /profile - プロフィール取得
profileRouter.get("/", async (c) => {
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
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error);
      return c.json({ error: "プロフィールの取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /profile - プロフィール更新
profileRouter.put("/", async (c) => {
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
      .from("profiles")
      .upsert({
        user_id: userId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to update profile:", error);
      return c.json({ error: "プロフィールの更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating profile:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// GET /profile/politician - 政治家プロフィール取得
profileRouter.get("/politician", async (c) => {
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
      .from("politician_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch politician profile:", error);
      return c.json({ error: "政治家プロフィールの取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching politician profile:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /profile/politician - 政治家プロフィール更新
profileRouter.put("/politician", async (c) => {
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
      .from("politician_profiles")
      .upsert({
        user_id: userId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to update politician profile:", error);
      return c.json({ error: "政治家プロフィールの更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating politician profile:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
