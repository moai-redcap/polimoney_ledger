import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface ExportData {
  exported_at: string;
  version: string;
  user: {
    id: string;
    email: string | undefined;
    full_name: string | undefined;
  };
  political_organizations: unknown[];
  politicians: unknown[];
  elections: unknown[];
  contacts: unknown[];
  sub_accounts: unknown[];
  journals: unknown[];
  journal_entries: unknown[];
  media_assets: unknown[];
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // テストユーザーの場合は service role client を使用
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

    try {
      // ユーザー情報取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 各テーブルからデータを取得
      const [
        orgsResult,
        politiciansResult,
        electionsResult,
        contactsResult,
        subAccountsResult,
        journalsResult,
      ] = await Promise.all([
        supabase
          .from("political_organizations")
          .select("*")
          .eq("owner_user_id", userId),
        supabase.from("politicians").select("*").eq("owner_user_id", userId),
        supabase.from("elections").select("*").eq("owner_user_id", userId),
        supabase.from("contacts").select("*").eq("owner_user_id", userId),
        supabase.from("sub_accounts").select("*").eq("owner_user_id", userId),
        supabase
          .from("journals")
          .select("*")
          .eq("submitted_by_user_id", userId),
      ]);

      // 仕訳IDを収集
      const journalIds = (journalsResult.data || []).map(
        (j: { id: string }) => j.id
      );

      // 仕訳明細と添付ファイルを取得
      let journalEntries: unknown[] = [];
      let mediaAssets: unknown[] = [];

      if (journalIds.length > 0) {
        const [entriesResult, mediaResult] = await Promise.all([
          supabase
            .from("journal_entries")
            .select("*")
            .in("journal_id", journalIds),
          supabase
            .from("media_assets")
            .select("*")
            .in("journal_id", journalIds),
        ]);
        journalEntries = entriesResult.data || [];
        mediaAssets = mediaResult.data || [];
      }

      const exportData: ExportData = {
        exported_at: new Date().toISOString(),
        version: "1.0.0",
        user: {
          id: userId,
          email: user?.email,
          full_name: user?.user_metadata?.full_name,
        },
        political_organizations: orgsResult.data || [],
        politicians: politiciansResult.data || [],
        elections: electionsResult.data || [],
        contacts: contactsResult.data || [],
        sub_accounts: subAccountsResult.data || [],
        journals: journalsResult.data || [],
        journal_entries: journalEntries,
        media_assets: mediaAssets,
      };

      // ファイル名を生成
      const date = new Date().toISOString().split("T")[0];
      const filename = `polimoney-ledger-export-${date}.json`;

      return new Response(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      console.error("Export error:", error);
      return new Response(
        JSON.stringify({ error: "エクスポートに失敗しました" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
