/**
 * 選挙 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const electionsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// POST /elections - 選挙作成
electionsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();

    if (!body.election_name) {
      return c.json({ error: "選挙名は必須です" }, 400);
    }

    if (!body.election_date) {
      return c.json({ error: "選挙日は必須です" }, 400);
    }

    if (!body.hub_politician_id) {
      return c.json(
        { error: "政治家IDは必須です（認証済みの政治家IDが必要です）" },
        400
      );
    }

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

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
      return c.json({ error: "選挙台帳の作成に失敗しました" }, 500);
    }

    return c.json({ success: true, election_id: election.id }, 201);
  } catch (error) {
    console.error("Error creating election:", error);
    return c.json({ error: "選挙台帳の作成に失敗しました" }, 500);
  }
});
