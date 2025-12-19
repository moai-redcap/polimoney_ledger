import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

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
      const body: CreateJournalRequest = await req.json();

      // バリデーション（承認済みの場合のみ日付必須）
      const status = body.status || "approved";
      if (status === "approved" && !body.journal_date) {
        return new Response(JSON.stringify({ error: "発生日は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.description) {
        return new Response(JSON.stringify({ error: "摘要は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.entries || body.entries.length === 0) {
        return new Response(JSON.stringify({ error: "仕訳明細は必須です" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
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
        return new Response(
          JSON.stringify({ error: "借方と貸方の合計が一致しません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!body.organization_id && !body.election_id) {
        return new Response(
          JSON.stringify({ error: "政治団体または選挙を指定してください" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 領収証徴収困難の場合、理由が必須
      if (
        body.is_receipt_hard_to_collect &&
        !body.receipt_hard_to_collect_reason
      ) {
        return new Response(
          JSON.stringify({ error: "領収証を徴し難い理由を入力してください" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 資産取得フラグがある場合、資産種別が必須
      if (body.is_asset_acquisition && !body.asset_type) {
        return new Response(
          JSON.stringify({ error: "資産種別を選択してください" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({ error: "仕訳の作成に失敗しました" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
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
        return new Response(
          JSON.stringify({ error: "仕訳明細の作成に失敗しました" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: { id: journal.id } }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating journal:", error);
      return new Response(
        JSON.stringify({ error: "仕訳の作成に失敗しました" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
