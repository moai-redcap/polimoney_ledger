/**
 * 政治団体 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import {
  createOrganizationManagerVerification,
  sendOrganizationManagerVerificationCode,
  verifyOrganizationManagerEmail,
  verifyOrganizationManagerDns,
  type PoliticalFundReportInfo,
} from "../../../lib/hub-client.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const organizationsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// GET /organizations/:id - 政治団体詳細
organizationsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return c.json({ error: "政治団体が見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /organizations/:id - 政治団体更新
organizationsRouter.put("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const body = await c.req.json();

    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organizations")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update organization:", error);
      return c.json({ error: "政治団体の更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating organization:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /organizations - 政治団体作成
organizationsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();

    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        owner_user_id: userId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create organization:", error);
      return c.json({ error: "政治団体の作成に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating organization:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /organizations/manager-verify - 管理者認証開始
organizationsRouter.post("/manager-verify", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // ユーザーのメールアドレスを取得
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email || "";

    const body = await c.req.json<{
      organization_id?: string;
      organization_name: string;
      organization_type?: string;
      official_email: string;
      role_in_organization?: string;
      request_type?: "new" | "domain_change";
      previous_domain?: string;
      political_fund_report_info: PoliticalFundReportInfo;
    }>();

    const result = await createOrganizationManagerVerification({
      ledger_user_id: userId,
      ledger_user_email: userEmail,
      organization_id: body.organization_id,
      organization_name: body.organization_name,
      organization_type: body.organization_type,
      official_email: body.official_email,
      role_in_organization: body.role_in_organization,
      request_type: body.request_type,
      previous_domain: body.previous_domain,
      political_fund_report_info: body.political_fund_report_info,
    });

    return c.json({ data: result }, 201);
  } catch (error) {
    console.error("Error creating organization manager verification:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "申請に失敗しました",
      },
      500
    );
  }
});

// POST /organizations/manager-verify/:id/send-code - 認証コード送信
organizationsRouter.post("/manager-verify/:id/send-code", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const verificationId = c.req.param("id");

  try {
    const result = await sendOrganizationManagerVerificationCode(
      verificationId,
      { userId }
    );
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

// POST /organizations/manager-verify/:id/verify-code - 認証コード確認
organizationsRouter.post("/manager-verify/:id/verify-code", async (c) => {
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

    const result = await verifyOrganizationManagerEmail(
      verificationId,
      body.code,
      { userId }
    );
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

// POST /organizations/manager-verify/:id/verify-dns - DNS TXT認証確認
organizationsRouter.post("/manager-verify/:id/verify-dns", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const verificationId = c.req.param("id");

  try {
    const result = await verifyOrganizationManagerDns(verificationId, {
      userId,
    });
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
