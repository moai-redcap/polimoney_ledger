/**
 * 補助科目 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const subAccountsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /sub-accounts - 補助科目一覧
subAccountsRouter.get("/", async (c) => {
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
      .from("sub_accounts")
      .select("*")
      .eq("owner_user_id", userId)
      .order("name");

    if (error) {
      console.error("Failed to fetch sub-accounts:", error);
      return c.json({ error: "補助科目の取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching sub-accounts:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /sub-accounts - 補助科目作成
subAccountsRouter.post("/", async (c) => {
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
      .from("sub_accounts")
      .insert({
        owner_user_id: userId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create sub-account:", error);
      return c.json({ error: "補助科目の作成に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating sub-account:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /sub-accounts/:id - 補助科目更新
subAccountsRouter.put("/:id", async (c) => {
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
      .from("sub_accounts")
      .update(body)
      .eq("id", id)
      .eq("owner_user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update sub-account:", error);
      return c.json({ error: "補助科目の更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating sub-account:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// DELETE /sub-accounts/:id - 補助科目削除
subAccountsRouter.delete("/:id", async (c) => {
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

    const { error } = await supabase
      .from("sub_accounts")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", userId);

    if (error) {
      console.error("Failed to delete sub-account:", error);
      return c.json({ error: "補助科目の削除に失敗しました" }, 500);
    }

    return c.json({ message: "削除しました" });
  } catch (error) {
    console.error("Error deleting sub-account:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
