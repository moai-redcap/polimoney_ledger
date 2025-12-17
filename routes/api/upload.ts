import { Handlers } from "$fresh/server.ts";

/**
 * 証明書類のアップロードAPI
 * Supabase Storage にファイルをアップロードし、公開URLを返す
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
// 新しいキー形式: sb_publishable_... または従来の anon key
const SUPABASE_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "";
const STORAGE_BUCKET = "evidence-files";

export const handler: Handlers = {
  async POST(req) {
    try {
      // FormData からファイルを取得
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "ファイルが選択されていません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // ファイルサイズ制限（10MB）
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return new Response(
          JSON.stringify({ error: "ファイルサイズは10MB以下にしてください" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 許可されるMIMEタイプ
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
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

      // ユニークなファイル名を生成
      const ext = file.name.split(".").pop() || "bin";
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const filePath = `requests/${uniqueName}`;

      // Supabase Storage にアップロード
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filePath}`;
      const arrayBuffer = await file.arrayBuffer();

      // 新しいキー形式(sb_publishable_...)は apikey ヘッダー、
      // JWT形式は Authorization: Bearer ヘッダーを使用
      const isNewKeyFormat = SUPABASE_KEY.startsWith("sb_");
      const headers: Record<string, string> = {
        "Content-Type": file.type,
        "x-upsert": "false",
      };
      if (isNewKeyFormat) {
        headers["apikey"] = SUPABASE_KEY;
      } else {
        headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
        headers["apikey"] = SUPABASE_KEY;
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: arrayBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Supabase upload error:", {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText,
          url: uploadUrl,
          hasKey: !!SUPABASE_KEY,
          keyPrefix: SUPABASE_KEY.substring(0, 15) + "...",
        });
        throw new Error(`ファイルのアップロードに失敗しました: ${uploadResponse.status}`);
      }

      // 公開URLを生成
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;

      return new Response(
        JSON.stringify({
          url: publicUrl,
          fileName: file.name,
          path: filePath,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Upload failed:", error);
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
};
