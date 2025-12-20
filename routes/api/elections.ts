import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface CreateElectionRequest {
  hub_election_id: string;
  election_name: string;
  election_date: string;
  hub_politician_id: string;
  politician_name: string;
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

    try {
      const body: CreateElectionRequest = await req.json();

      // バリデーション
      if (!body.election_name) {
        return new Response(JSON.stringify({ error: "選挙名は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.election_date) {
        return new Response(JSON.stringify({ error: "選挙日は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.hub_politician_id) {
        return new Response(
          JSON.stringify({
            error: "政治家IDは必須です（認証済みの政治家IDが必要です）",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const supabase =
        userId === TEST_USER_ID
          ? getServiceClient()
          : getSupabaseClient(userId);

      // 選挙台帳を作成（hub_politician_id と hub_election_id を保存）
      const { data: election, error: electionError } = await supabase
        .from("elections")
        .insert({
          owner_user_id: userId,
          hub_politician_id: body.hub_politician_id,
          hub_election_id: body.hub_election_id || null,
          election_name: body.election_name,
          election_date: body.election_date,
        })
        .select()
        .single();

      if (electionError) {
        console.error("Failed to create election:", electionError);
        return new Response(
          JSON.stringify({ error: "選挙台帳の作成に失敗しました" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          election_id: election.id,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating election:", error);
      return new Response(
        JSON.stringify({ error: "選挙台帳の作成に失敗しました" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
