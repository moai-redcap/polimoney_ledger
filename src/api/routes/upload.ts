/**
 * アップロード API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const uploadRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// POST /upload - ファイルアップロード
uploadRouter.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "ファイルが必要です" }, 400);
    }

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_${file.name}`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (error) {
      console.error("Failed to upload file:", error);
      return c.json({ error: "ファイルのアップロードに失敗しました" }, 500);
    }

    const { data: publicUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    return c.json({
      data: {
        path: data.path,
        url: publicUrl.publicUrl,
      },
    }, 201);
  } catch (error) {
    console.error("Error uploading file:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /uploads/image - 画像アップロード
uploadRouter.post("/image", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "画像ファイルが必要です" }, 400);
    }

    // 画像ファイルのみ許可
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "画像ファイルのみアップロードできます" }, 400);
    }

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/images/${timestamp}.${ext}`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (error) {
      console.error("Failed to upload image:", error);
      return c.json({ error: "画像のアップロードに失敗しました" }, 500);
    }

    const { data: publicUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    return c.json({
      data: {
        path: data.path,
        url: publicUrl.publicUrl,
      },
    }, 201);
  } catch (error) {
    console.error("Error uploading image:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
