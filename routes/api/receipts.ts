/**
 * 領収書アップロード API
 *
 * POST: 領収書を Supabase Storage にアップロードし、media_assets に記録
 * DELETE: 領収書を削除
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const STORAGE_BUCKET = "receipts";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * リクエストの Cookie からユーザー ID を取得
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const cookies = req.headers.get("Cookie") || "";
  const accessTokenMatch = cookies.match(/sb-access-token=([^;]+)/);

  if (!accessTokenMatch) {
    return null;
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessTokenMatch[1]);

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch {
    return null;
  }
}

export const handler: Handlers = {
  /**
   * POST /api/receipts
   *
   * FormData:
   * - file: File (必須)
   * - journal_id: string (必須)
   */
  async POST(req) {
    // ユーザー認証チェック
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const journalId = formData.get("journal_id") as string | null;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "ファイルが選択されていません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!journalId) {
        return new Response(
          JSON.stringify({ error: "仕訳IDが指定されていません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // ファイルサイズ制限（5MB）
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return new Response(
          JSON.stringify({ error: "ファイルサイズは5MB以下にしてください" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 許可されるMIMEタイプ
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({
            error:
              "許可されていないファイル形式です。画像またはPDFをアップロードしてください",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabase();

      // 仕訳の存在確認
      const { data: journal, error: journalError } = await supabase
        .from("journals")
        .select("id, submitted_by_user_id")
        .eq("id", journalId)
        .single();

      if (journalError || !journal) {
        return new Response(JSON.stringify({ error: "仕訳が見つかりません" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // ユニークなファイル名を生成
      // パス: {user_id}/{journal_id}/{timestamp}-{uuid}.{ext}
      const ext = file.name.split(".").pop() || "bin";
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const storagePath = `${userId}/${journalId}/${uniqueName}`;

      // Supabase Storage にアップロード
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(
          `ファイルのアップロードに失敗しました: ${uploadError.message}`
        );
      }

      // media_assets にレコードを追加
      const { data: mediaAsset, error: insertError } = await supabase
        .from("media_assets")
        .insert({
          journal_id: journalId,
          uploaded_by_user_id: userId,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) {
        // アップロードしたファイルを削除
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw new Error(`レコードの作成に失敗しました: ${insertError.message}`);
      }

      // 署名付きURLを生成（1時間有効）
      const { data: signedUrlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600);

      return new Response(
        JSON.stringify({
          id: mediaAsset.id,
          file_name: mediaAsset.file_name,
          mime_type: mediaAsset.mime_type,
          file_size: mediaAsset.file_size,
          url: signedUrlData?.signedUrl || null,
          created_at: mediaAsset.created_at,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Receipt upload failed:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "アップロードに失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  /**
   * DELETE /api/receipts?id={media_asset_id}
   */
  async DELETE(req) {
    // ユーザー認証チェック
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(req.url);
      const mediaAssetId = url.searchParams.get("id");

      if (!mediaAssetId) {
        return new Response(
          JSON.stringify({ error: "IDが指定されていません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabase();

      // media_asset を取得
      const { data: mediaAsset, error: fetchError } = await supabase
        .from("media_assets")
        .select("*")
        .eq("id", mediaAssetId)
        .single();

      if (fetchError || !mediaAsset) {
        return new Response(
          JSON.stringify({ error: "ファイルが見つかりません" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 自分がアップロードしたファイルのみ削除可能
      if (mediaAsset.uploaded_by_user_id !== userId) {
        return new Response(JSON.stringify({ error: "削除権限がありません" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Storage からファイルを削除
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([mediaAsset.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Storage の削除に失敗しても、DB のレコードは削除する
      }

      // media_assets からレコードを削除
      const { error: deleteError } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", mediaAssetId);

      if (deleteError) {
        throw new Error(`レコードの削除に失敗しました: ${deleteError.message}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Receipt delete failed:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "削除に失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
