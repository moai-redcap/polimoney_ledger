/**
 * オーナーシップ移譲 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const ownershipTransfersRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /ownership-transfers - 移譲リクエスト一覧
ownershipTransfersRouter.get("/", async (c) => {
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
      .from("ownership_transfers")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch transfers:", error);
      return c.json({ error: "移譲リクエストの取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /ownership-transfers - 移譲リクエスト作成
ownershipTransfersRouter.post("/", async (c) => {
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
      .from("ownership_transfers")
      .insert({
        from_user_id: userId,
        to_email: body.to_email,
        resource_type: body.resource_type,
        resource_id: body.resource_id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create transfer:", error);
      return c.json({ error: "移譲リクエストの作成に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating transfer:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// GET /ownership-transfers/:id - 移譲リクエスト詳細
ownershipTransfersRouter.get("/:id", async (c) => {
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
      .from("ownership_transfers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return c.json({ error: "移譲リクエストが見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /ownership-transfers/:id/accept - 移譲を受け入れ
ownershipTransfersRouter.post("/:id/accept", async (c) => {
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
      .from("ownership_transfers")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("to_user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Failed to accept transfer:", error);
      return c.json({ error: "移譲の受け入れに失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error accepting transfer:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /ownership-transfers/:id/decline - 移譲を拒否
ownershipTransfersRouter.post("/:id/decline", async (c) => {
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
      .from("ownership_transfers")
      .update({ status: "declined", declined_at: new Date().toISOString() })
      .eq("id", id)
      .eq("to_user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Failed to decline transfer:", error);
      return c.json({ error: "移譲の拒否に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error declining transfer:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
