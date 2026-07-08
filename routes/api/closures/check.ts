import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface CheckResult {
  canClose: boolean;
  issues: Issue[];
  summary: {
    totalJournals: number;
    draftCount: number;
    missingReceiptCount: number;
    imbalanceCount: number;
  };
}

interface Issue {
  type: "error" | "warning";
  category: "draft" | "receipt" | "imbalance";
  message: string;
  journalId?: string;
  journalDate?: string;
  description?: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const organizationId = url.searchParams.get("org_id");
    const yearParam = url.searchParams.get("year");

    if (!organizationId || !yearParam) {
      return new Response(
        JSON.stringify({ error: "org_id and year are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year)) {
      return new Response(JSON.stringify({ error: "Invalid year" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const supabase = userId === TEST_USER_ID
        ? getServiceClient()
        : getSupabaseClient(userId);

      // 指定年度の仕訳を取得
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: journals, error: journalsError } = await supabase
        .from("journals")
        .select(
          `
          id,
          journal_date,
          description,
          status,
          journal_entries (
            id,
            debit_amount,
            credit_amount
          ),
          media_assets (
            id
          )
        `,
        )
        .eq("organization_id", organizationId)
        .gte("journal_date", startDate)
        .lte("journal_date", endDate);

      if (journalsError) {
        console.error("Failed to fetch journals:", journalsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch journals" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      const issues: Issue[] = [];
      let draftCount = 0;
      let missingReceiptCount = 0;
      let imbalanceCount = 0;

      for (const journal of journals || []) {
        // 1. 未承認仕訳チェック
        if (journal.status === "draft") {
          draftCount++;
          issues.push({
            type: "error",
            category: "draft",
            message: `未承認の仕訳があります: ${journal.description}`,
            journalId: journal.id,
            journalDate: journal.journal_date,
            description: journal.description,
          });
        }

        // 2. 領収証未添付チェック
        const hasReceipt = journal.media_assets &&
          journal.media_assets.length > 0;
        if (!hasReceipt) {
          missingReceiptCount++;
          issues.push({
            type: "warning",
            category: "receipt",
            message: `領収証が未添付です: ${journal.description}`,
            journalId: journal.id,
            journalDate: journal.journal_date,
            description: journal.description,
          });
        }

        // 3. 借方・貸方の不一致チェック
        const entries = journal.journal_entries || [];
        const totalDebit = entries.reduce(
          (sum: number, e: { debit_amount: number }) =>
            sum + (e.debit_amount || 0),
          0,
        );
        const totalCredit = entries.reduce(
          (sum: number, e: { credit_amount: number }) =>
            sum + (e.credit_amount || 0),
          0,
        );

        if (totalDebit !== totalCredit) {
          imbalanceCount++;
          issues.push({
            type: "error",
            category: "imbalance",
            message:
              `借方・貸方が不一致です: ${journal.description} (借方: ${totalDebit}, 貸方: ${totalCredit})`,
            journalId: journal.id,
            journalDate: journal.journal_date,
            description: journal.description,
          });
        }
      }

      // 必須エラーがなければ締め可能
      const hasErrors = issues.some((issue) => issue.type === "error");

      const result: CheckResult = {
        canClose: !hasErrors,
        issues,
        summary: {
          totalJournals: journals?.length || 0,
          draftCount,
          missingReceiptCount,
          imbalanceCount,
        },
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error checking closures:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
