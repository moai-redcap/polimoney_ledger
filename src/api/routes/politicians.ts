/**
 * 政治家 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import {
  createPoliticianVerification,
  sendPoliticianVerificationCode,
  verifyPoliticianEmail,
  verifyPoliticianDns,
  type CandidateRegistrationInfo,
  type PoliticalFundReportInfo,
} from "../../../lib/hub-client.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const politiciansRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /politicians/:id - 政治家詳細
politiciansRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("politicians")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return c.json({ error: "政治家が見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching politician:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /politicians/verify - 政治家認証開始
politiciansRouter.post("/verify", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // ユーザーのメールアドレスを取得
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email || "";

    const body = await c.req.json<{
      name: string;
      official_email: string;
      official_url?: string;
      party?: string;
      politician_id?: string;
      request_type?: "new" | "domain_change";
      previous_domain?: string;
      candidate_registration_info?: CandidateRegistrationInfo;
      political_fund_report_info?: PoliticalFundReportInfo;
    }>();

    const result = await createPoliticianVerification({
      ledger_user_id: userId,
      ledger_user_email: userEmail,
      name: body.name,
      official_email: body.official_email,
      official_url: body.official_url,
      party: body.party,
      politician_id: body.politician_id,
      request_type: body.request_type,
      previous_domain: body.previous_domain,
      candidate_registration_info: body.candidate_registration_info,
      political_fund_report_info: body.political_fund_report_info,
    });

    return c.json({ data: result }, 201);
  } catch (error) {
    console.error("Error creating politician verification:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "申請に失敗しました",
      },
      500
    );
  }
});

// POST /politicians/verify/:id/send-code - 認証コード送信
politiciansRouter.post("/verify/:id/send-code", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const verificationId = c.req.param("id");

  try {
    const result = await sendPoliticianVerificationCode(verificationId, {
      userId,
    });
    return c.json(result);
  } catch (error) {
    console.error("Error sending verification code:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "コード送信に失敗しました",
      },
      500
    );
  }
});

// POST /politicians/verify/:id/verify-code - 認証コード確認
politiciansRouter.post("/verify/:id/verify-code", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const verificationId = c.req.param("id");

  try {
    const body = await c.req.json<{ code: string }>();

    if (!body.code) {
      return c.json({ error: "認証コードは必須です" }, 400);
    }

    const result = await verifyPoliticianEmail(verificationId, body.code, {
      userId,
    });
    return c.json(result);
  } catch (error) {
    console.error("Error verifying code:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "認証に失敗しました",
      },
      500
    );
  }
});

// POST /politicians/verify/:id/verify-dns - DNS TXT認証確認
politiciansRouter.post("/verify/:id/verify-dns", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const verificationId = c.req.param("id");

  try {
    const result = await verifyPoliticianDns(verificationId, { userId });
    return c.json(result);
  } catch (error) {
    console.error("Error verifying DNS TXT:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "DNS TXT認証に失敗しました",
      },
      500
    );
  }
});
