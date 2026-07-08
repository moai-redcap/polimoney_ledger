import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import { Handlers } from "fresh/compat";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface ExecuteRequest {
  organizationId: string;
  year: number;
}

export const handler: Handlers = {
  async POST(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: ExecuteRequest;
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
      const supabase = userId === TEST_USER_ID
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

      if (existingClosure && existingClosure.status !== "open") {
        return new Response(
          JSON.stringify({
            error: `Year ${year} is already ${existingClosure.status}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // ledger_year_closures を upsert
      const closureData = {
        organization_id: organizationId,
        fiscal_year: year,
        status: "closed",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: closure, error: upsertError } = await supabase
        .from("ledger_year_closures")
        .upsert(closureData, {
          onConflict: "organization_id,fiscal_year",
        })
        .select()
        .single();

      if (upsertError) {
        console.error("Failed to close year:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to close year" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${year}年度を締めました`,
          closure,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error executing closure:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
