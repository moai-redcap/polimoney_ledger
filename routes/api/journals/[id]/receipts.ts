/**
 * 仕訳に紐づく領収書一覧 API
 *
 * GET /api/journals/:id/receipts
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

interface MediaAssetWithUrl {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  created_at: string;
  url: string | null;
}

export const handler: Handlers = {
  /**
   * GET /api/journals/:id/receipts
   *
   * 仕訳に紐づく領収書一覧を取得（署名付きURL付き）
   */
  async GET(req, ctx) {
    const journalId = ctx.params.id;

    // ユーザー認証チェック
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!journalId) {
      return new Response(JSON.stringify({ error: "Journal ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const supabase = getSupabase();

      // 仕訳の存在確認とアクセス権チェック
      const { data: journal, error: journalError } = await supabase
        .from("journals")
        .select("id, submitted_by_user_id")
        .eq("id", journalId)
        .single();

      if (journalError || !journal) {
        return new Response(JSON.stringify({ error: "Journal not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 領収書一覧を取得
      const { data: mediaAssets, error: fetchError } = await supabase
        .from("media_assets")
        .select("*")
        .eq("journal_id", journalId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch receipts: ${fetchError.message}`);
      }

      // 署名付きURLを生成
      const assetsWithUrls: MediaAssetWithUrl[] = await Promise.all(
        (mediaAssets || []).map(async (asset) => {
          const { data: signedUrlData } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(asset.storage_path, 3600);

          return {
            id: asset.id,
            file_name: asset.file_name,
            mime_type: asset.mime_type,
            file_size: asset.file_size,
            created_at: asset.created_at,
            url: signedUrlData?.signedUrl || null,
          };
        })
      );

      return new Response(JSON.stringify({ data: assetsWithUrls }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Fetch receipts failed:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "領収書の取得に失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
