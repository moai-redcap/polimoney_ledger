/**
 * 仕訳 API
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const journalsRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

interface JournalEntry {
  account_code: string;
  sub_account_id?: string | null;
  debit_amount: number;
  credit_amount: number;
}

interface CreateJournalRequest {
  organization_id: string | null;
  election_id: string | null;
  journal_date: string | null;
  description: string;
  contact_id?: string | null;
  classification?: string | null;
  non_monetary_basis?: string | null;
  notes?: string | null;
  amount_political_grant?: number;
  amount_political_fund?: number;
  amount_public_subsidy?: number;
  is_receipt_hard_to_collect?: boolean;
  receipt_hard_to_collect_reason?: string | null;
  status?: "draft" | "approved";
  is_asset_acquisition?: boolean;
  asset_type?: string | null;
  entries: JournalEntry[];
}

// POST /journals - 仕訳作成
journalsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body: CreateJournalRequest = await c.req.json();

    // バリデーション（承認済みの場合のみ日付必須）
    const status = body.status || "approved";
    if (status === "approved" && !body.journal_date) {
      return c.json({ error: "発生日は必須です" }, 400);
    }

    if (!body.description) {
      return c.json({ error: "摘要は必須です" }, 400);
    }

    if (!body.entries || body.entries.length === 0) {
      return c.json({ error: "仕訳明細は必須です" }, 400);
    }

    // 借方・貸方の合計が一致するかチェック
    const totalDebit = body.entries.reduce(
      (sum, e) => sum + e.debit_amount,
      0
    );
    const totalCredit = body.entries.reduce(
      (sum, e) => sum + e.credit_amount,
      0
    );
    if (totalDebit !== totalCredit) {
      return c.json({ error: "借方と貸方の合計が一致しません" }, 400);
    }

    if (!body.organization_id && !body.election_id) {
      return c.json(
        { error: "政治団体または選挙を指定してください" },
        400
      );
    }

    // 領収証徴収困難の場合、理由が必須
    if (
      body.is_receipt_hard_to_collect &&
      !body.receipt_hard_to_collect_reason
    ) {
      return c.json(
        { error: "領収証を徴し難い理由を入力してください" },
        400
      );
    }

    // 資産取得フラグがある場合、資産種別が必須
    if (body.is_asset_acquisition && !body.asset_type) {
      return c.json({ error: "資産種別を選択してください" }, 400);
    }

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    // 仕訳を作成
    const { data: journal, error: journalError } = await supabase
      .from("journals")
      .insert({
        organization_id: body.organization_id,
        election_id: body.election_id,
        journal_date: body.journal_date || null,
        description: body.description,
        contact_id: body.contact_id || null,
        classification: body.classification || null,
        non_monetary_basis: body.non_monetary_basis || null,
        notes: body.notes || null,
        amount_political_grant: body.amount_political_grant || 0,
        amount_political_fund: body.amount_political_fund || 0,
        amount_public_subsidy: body.amount_public_subsidy || 0,
        is_receipt_hard_to_collect: body.is_receipt_hard_to_collect || false,
        receipt_hard_to_collect_reason:
          body.receipt_hard_to_collect_reason || null,
        status: status,
        is_asset_acquisition: body.is_asset_acquisition || false,
        asset_type: body.asset_type || null,
        submitted_by_user_id: userId,
      })
      .select()
      .single();

    if (journalError) {
      console.error("Failed to create journal:", journalError);
      return c.json({ error: "仕訳の作成に失敗しました" }, 500);
    }

    // 仕訳明細を作成
    const entriesWithJournalId = body.entries.map((entry) => ({
      journal_id: journal.id,
      account_code: entry.account_code,
      sub_account_id: entry.sub_account_id || null,
      debit_amount: entry.debit_amount,
      credit_amount: entry.credit_amount,
    }));

    const { error: entriesError } = await supabase
      .from("journal_entries")
      .insert(entriesWithJournalId);

    if (entriesError) {
      console.error("Failed to create journal entries:", entriesError);
      // 仕訳を削除（ロールバック）
      await supabase.from("journals").delete().eq("id", journal.id);
      return c.json({ error: "仕訳明細の作成に失敗しました" }, 500);
    }

    return c.json({ success: true, data: { id: journal.id } }, 201);
  } catch (error) {
    console.error("Error creating journal:", error);
    return c.json({ error: "仕訳の作成に失敗しました" }, 500);
  }
});

// GET /journals/:id - 仕訳詳細
journalsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("journals")
      .select(`
        *,
        journal_entries (*),
        contacts (*)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return c.json({ error: "仕訳が見つかりません" }, 404);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error fetching journal:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// PUT /journals/:id - 仕訳更新
journalsRouter.put("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const body = await c.req.json();

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("journals")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update journal:", error);
      return c.json({ error: "仕訳の更新に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error updating journal:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// DELETE /journals/:id - 仕訳削除
journalsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    // 仕訳明細を先に削除
    await supabase.from("journal_entries").delete().eq("journal_id", id);

    // 仕訳を削除
    const { error } = await supabase.from("journals").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete journal:", error);
      return c.json({ error: "仕訳の削除に失敗しました" }, 500);
    }

    return c.json({ message: "削除しました" });
  } catch (error) {
    console.error("Error deleting journal:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /journals/:id/approve - 仕訳承認
journalsRouter.post("/:id/approve", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("journals")
      .update({ status: "approved" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to approve journal:", error);
      return c.json({ error: "仕訳の承認に失敗しました" }, 500);
    }

    return c.json({ data });
  } catch (error) {
    console.error("Error approving journal:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /journals/:id/receipts - 領収書アップロード
journalsRouter.post("/:id/receipts", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  try {
    const body = await c.req.json();

    const supabase =
      userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

    const { data, error } = await supabase
      .from("receipts")
      .insert({
        journal_id: id,
        storage_path: body.storage_path,
        file_name: body.file_name,
        file_size: body.file_size,
        mime_type: body.mime_type,
        uploaded_by_user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create receipt:", error);
      return c.json({ error: "領収書の登録に失敗しました" }, 500);
    }

    return c.json({ data }, 201);
  } catch (error) {
    console.error("Error creating receipt:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});
