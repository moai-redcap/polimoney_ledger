import { Handlers } from "$fresh/server.ts";
import { getSupabaseClient, getServiceClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface JournalEntry {
  account_code: string;
  sub_account_id?: string;
  debit_amount: number;
  credit_amount: number;
}

interface CreateJournalRequest {
  organization_id: string | null;
  election_id: string | null;
  journal_date: string;
  description: string;
  contact_id?: string;
  classification?: string;
  notes?: string;
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

      // バリデーション
      if (!body.journal_date) {
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
        return new Response(
          JSON.stringify({ error: "仕訳明細は必須です" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
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

      const supabase =
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      // 仕訳を作成
      const { data: journal, error: journalError } = await supabase
        .from("journals")
        .insert({
          organization_id: body.organization_id,
          election_id: body.election_id,
          journal_date: body.journal_date,
          description: body.description,
          contact_id: body.contact_id || null,
          classification: body.classification || null,
          notes: body.notes || null,
          status: "draft",
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
        JSON.stringify({ success: true, journal_id: journal.id }),
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
