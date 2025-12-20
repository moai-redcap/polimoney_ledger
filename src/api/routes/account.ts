/**
 * アカウント API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const accountRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// PUT /account/email - メールアドレス変更
accountRouter.put("/email", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();

    if (!body.email) {
      return c.json({ error: "メールアドレスは必須です" }, 400);
    }

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    // Supabase Auth のメール変更
    const { error } = await supabase.auth.updateUser({
      email: body.email,
    });

    if (error) {
      console.error("Failed to update email:", error);
      return c.json({ error: "メールアドレスの変更に失敗しました" }, 500);
    }

    return c.json({ message: "確認メールを送信しました" });
  } catch (error) {
    console.error("Error updating email:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
