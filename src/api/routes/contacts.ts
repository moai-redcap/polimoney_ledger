/**
 * 関係者 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const contactsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

interface CreateContactRequest {
  contact_type: "person" | "corporation";
  name: string;
  address?: string;
  occupation?: string;
  is_name_private?: boolean;
  is_address_private?: boolean;
  is_occupation_private?: boolean;
  privacy_reason_type?: "personal_info" | "other";
  privacy_reason_other?: string;
}

// GET /contacts - 関係者一覧
contactsRouter.get("/", async (c) => {
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
      .from("contacts")
      .select("id, name, contact_type, address, occupation")
      .eq("owner_user_id", userId)
      .order("name");

    if (error) {
      console.error("Failed to fetch contacts:", error);
      return c.json({ error: "関係者の取得に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /contacts - 関係者作成
contactsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body: CreateContactRequest = await c.req.json();

    // バリデーション
    if (!body.contact_type || !body.name) {
      return c.json({ error: "contact_type と name は必須です" }, 400);
    }

    const validTypes = ["person", "corporation"];
    if (!validTypes.includes(body.contact_type)) {
      return c.json(
        {
          error:
            "contact_type は 'person' または 'corporation' である必要があります",
        },
        400
      );
    }

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        owner_user_id: userId,
        contact_type: body.contact_type,
        name: body.name,
        address: body.address || null,
        occupation: body.occupation || null,
        is_name_private: body.is_name_private || false,
        is_address_private: body.is_address_private || false,
        is_occupation_private: body.is_occupation_private || false,
        privacy_reason_type: body.privacy_reason_type || null,
        privacy_reason_other: body.privacy_reason_other || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create contact:", error);
      return c.json({ error: "関係者の登録に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating contact:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// GET /contacts/:id - 関係者詳細
contactsRouter.get("/:id", async (c) => {
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
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("owner_user_id", userId)
      .single();

    if (error || !data) {
      return c.json({ error: "関係者が見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /contacts/:id - 関係者更新
contactsRouter.put("/:id", async (c) => {
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
      .from("contacts")
      .update({
        name: body.name,
        address: body.address || null,
        occupation: body.occupation || null,
        is_name_private: body.is_name_private || false,
        is_address_private: body.is_address_private || false,
        is_occupation_private: body.is_occupation_private || false,
        privacy_reason_type: body.privacy_reason_type || null,
        privacy_reason_other: body.privacy_reason_other || null,
      })
      .eq("id", id)
      .eq("owner_user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update contact:", error);
      return c.json({ error: "関係者の更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating contact:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// DELETE /contacts/:id - 関係者削除
contactsRouter.delete("/:id", async (c) => {
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
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", userId);

    if (error) {
      console.error("Failed to delete contact:", error);
      return c.json({ error: "関係者の削除に失敗しました" }, 500);
    }

    return c.json({ message: "削除しました" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
