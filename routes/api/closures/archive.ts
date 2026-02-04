import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface ArchiveRequest {
  organizationId: string;
  year: number;
}

export const handler: Handlers = {
  async POST(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: ArchiveRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { organizationId, year } = body;

    if (!organizationId || !year) {
      return new Response(
        JSON.stringify({ error: "organizationId and year are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const supabase =
        userId === TEST_USER_ID
          ? getServiceClient()
          : getSupabaseClient(userId);

      // 組織の所有者確認
      const { data: org, error: orgError } = await supabase
        .from("political_organizations")
        .select("id, owner_user_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // 既存の締めステータスを確認
      const { data: existingClosure, error: closureError } = await supabase
        .from("ledger_year_closures")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("fiscal_year", year)
        .maybeSingle();

      if (closureError) {
        console.error("Failed to check existing closure:", closureError);
        return new Response(
          JSON.stringify({ error: "Failed to check existing closure" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // closed 状態でないとアーカイブできない
      if (!existingClosure || existingClosure.status !== "closed") {
        return new Response(
          JSON.stringify({
            error: `Year ${year} must be in 'closed' status to archive. Current status: ${existingClosure?.status || "not found"}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // locked ステータスに更新
      const { data: closure, error: updateError } = await supabase
        .from("ledger_year_closures")
        .update({
          status: "locked",
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingClosure.id)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to archive year:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to archive year" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // TODO: 画像を Hub Storage に移行する処理は Hub 連携完成後に実装

      return new Response(
        JSON.stringify({
          success: true,
          message: `${year}年度をアーカイブしました`,
          closure,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error executing archive:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
