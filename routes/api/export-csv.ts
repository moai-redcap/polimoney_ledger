/**
 * CSV エクスポート API
 *
 * 収支報告書作成の補助データを CSV 形式で出力
 *
 * GET /api/export-csv?type=expense|revenue|summary|assets&organization_id=xxx|election_id=xxx
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceClient, getSupabaseClient } from "../../lib/supabase.ts";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// 勘定科目マスタ（ローカルキャッシュ）
interface AccountMaster {
  code: string;
  name: string;
  type: string;
  report_category: string;
}

// 仕訳データ型
interface JournalData {
  id: string;
  journal_date: string;
  description: string;
  notes: string | null;
  amount_political_grant: number | null;
  amount_political_fund: number | null;
  amount_public_subsidy: number | null;
  is_receipt_hard_to_collect: boolean | null;
  is_asset_acquisition: boolean | null;
  asset_type: string | null;
  contacts: {
    name: string;
    contact_type: string;
    address: string | null;
    occupation: string | null;
  } | null;
  journal_entries: {
    account_code: string;
    sub_account_id: string | null;
    debit_amount: number;
    credit_amount: number;
  }[];
}

// 資産種別の表示名
const ASSET_TYPE_LABELS: Record<string, string> = {
  land: "土地",
  building: "建物",
  vehicle: "車両・動産",
  securities: "有価証券",
  facility_rights: "施設利用権",
  deposit: "敷金・保証金",
};

// 補助科目データ型
interface SubAccountData {
  id: string;
  name: string;
  parent_account_code: string;
}

/**
 * CSV エスケープ処理
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 日付フォーマット（YYYY/MM/DD）
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * 支出一覧 CSV を生成
 */
function generateExpenseCSV(
  journals: JournalData[],
  accountMaster: Map<string, AccountMaster>,
  subAccounts: Map<string, SubAccountData>,
  ledgerType: "organization" | "election"
): string {
  const headers =
    ledgerType === "organization"
      ? [
          "年月日",
          "支出の目的",
          "金額",
          "支払先氏名",
          "支払先住所",
          "勘定科目",
          "補助科目",
          "政党交付金充当額",
          "証憑なし",
          "備考",
        ]
      : [
          "年月日",
          "支出の目的",
          "金額",
          "支払先氏名",
          "支払先住所",
          "勘定科目",
          "補助科目",
          "公費負担額",
          "証憑なし",
          "備考",
        ];

  const rows: string[][] = [];

  for (const journal of journals) {
    // 借方（支出科目）のエントリを取得
    const expenseEntry = journal.journal_entries.find((e) =>
      e.account_code.startsWith("EXP_")
    );
    if (!expenseEntry) continue;

    const account = accountMaster.get(expenseEntry.account_code);
    const subAccount = expenseEntry.sub_account_id
      ? subAccounts.get(expenseEntry.sub_account_id)
      : null;

    const row = [
      formatDate(journal.journal_date),
      journal.description,
      String(expenseEntry.debit_amount),
      journal.contacts?.name || "",
      journal.contacts?.address || "",
      account?.name || expenseEntry.account_code,
      subAccount?.name || "",
      ledgerType === "organization"
        ? String(journal.amount_political_grant || 0)
        : String(journal.amount_public_subsidy || 0),
      journal.is_receipt_hard_to_collect ? "○" : "",
      journal.notes || "",
    ];

    rows.push(row);
  }

  // CSV 文字列を生成
  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvLines.join("\n");
}

/**
 * 収入一覧 CSV を生成
 */
function generateRevenueCSV(
  journals: JournalData[],
  accountMaster: Map<string, AccountMaster>,
  subAccounts: Map<string, SubAccountData>
): string {
  const headers = [
    "年月日",
    "内容",
    "金額",
    "寄附者氏名",
    "寄附者種別",
    "寄附者住所",
    "寄附者職業",
    "勘定科目",
    "備考",
  ];

  const rows: string[][] = [];

  for (const journal of journals) {
    // 貸方（収入科目）のエントリを取得
    const revenueEntry = journal.journal_entries.find((e) =>
      e.account_code.startsWith("REV_")
    );
    if (!revenueEntry) continue;

    const account = accountMaster.get(revenueEntry.account_code);

    const row = [
      formatDate(journal.journal_date),
      journal.description,
      String(revenueEntry.credit_amount),
      journal.contacts?.name || "",
      journal.contacts?.contact_type === "corporation" ? "法人" : "個人",
      journal.contacts?.address || "",
      journal.contacts?.occupation || "",
      account?.name || revenueEntry.account_code,
      journal.notes || "",
    ];

    rows.push(row);
  }

  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvLines.join("\n");
}

/**
 * 科目別集計 CSV を生成
 */
function generateSummaryCSV(
  journals: JournalData[],
  accountMaster: Map<string, AccountMaster>
): string {
  const headers = ["分類", "科目名", "件数", "金額合計"];

  // 科目ごとに集計
  const summary = new Map<
    string,
    { category: string; name: string; count: number; total: number }
  >();

  for (const journal of journals) {
    for (const entry of journal.journal_entries) {
      const account = accountMaster.get(entry.account_code);
      if (!account) continue;

      // 支出または収入のみ集計
      if (
        !entry.account_code.startsWith("EXP_") &&
        !entry.account_code.startsWith("REV_")
      ) {
        continue;
      }

      const key = entry.account_code;
      const existing = summary.get(key);
      const amount =
        entry.debit_amount > 0 ? entry.debit_amount : entry.credit_amount;

      if (existing) {
        existing.count++;
        existing.total += amount;
      } else {
        summary.set(key, {
          category: account.report_category,
          name: account.name,
          count: 1,
          total: amount,
        });
      }
    }
  }

  // 配列に変換してソート
  const rows = Array.from(summary.values())
    .sort((a, b) => a.category.localeCompare(b.category))
    .map((s) => [s.category, s.name, String(s.count), String(s.total)]);

  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvLines.join("\n");
}

/**
 * 資産等一覧 CSV を生成
 */
function generateAssetsCSV(journals: JournalData[]): string {
  const headers = [
    "取得年月日",
    "資産種別",
    "摘要",
    "取得先氏名",
    "取得先住所",
    "取得価額",
  ];

  const rows: string[][] = [];

  // 資産取得の仕訳のみ抽出
  const assetJournals = journals.filter((j) => j.is_asset_acquisition === true);

  for (const journal of assetJournals) {
    // 借方（資産取得）のエントリを取得して金額を計算
    const amount = journal.journal_entries.reduce(
      (sum, e) => sum + e.debit_amount,
      0
    );

    const row = [
      formatDate(journal.journal_date),
      ASSET_TYPE_LABELS[journal.asset_type || ""] || journal.asset_type || "",
      journal.description,
      journal.contacts?.name || "",
      journal.contacts?.address || "",
      String(amount),
    ];

    rows.push(row);
  }

  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvLines.join("\n");
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "expense"; // expense, revenue, summary
    const organizationId = url.searchParams.get("organization_id");
    const electionId = url.searchParams.get("election_id");

    if (!organizationId && !electionId) {
      return new Response(
        JSON.stringify({
          error: "organization_id または election_id を指定してください",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ledgerType = electionId ? "election" : "organization";

    const supabase = getSupabaseClient(userId);

    try {
      // 勘定科目マスタを取得
      const { data: accountMasterData } = await supabase
        .from("account_master")
        .select("code, name, type, report_category");

      const accountMaster = new Map<string, AccountMaster>();
      for (const a of accountMasterData || []) {
        accountMaster.set(a.code, a);
      }

      // 補助科目を取得
      const { data: subAccountsData } = await supabase
        .from("sub_accounts")
        .select("id, name, parent_account_code")
        .eq("owner_user_id", userId);

      const subAccounts = new Map<string, SubAccountData>();
      for (const s of subAccountsData || []) {
        subAccounts.set(s.id, s);
      }

      // 仕訳データを取得
      let query = supabase.from("journals").select(`
          id,
          journal_date,
          description,
          notes,
          amount_political_grant,
          amount_political_fund,
          amount_public_subsidy,
          is_receipt_hard_to_collect,
          is_asset_acquisition,
          asset_type,
          status,
          contacts (
            name,
            contact_type,
            address,
            occupation
          ),
          journal_entries (
            account_code,
            sub_account_id,
            debit_amount,
            credit_amount
          )
        `);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      } else if (electionId) {
        query = query.eq("election_id", electionId);
      }

      // 日付順でソート
      query = query.order("journal_date", { ascending: true });

      const { data: journals, error } = await query;

      if (error) {
        console.error("Failed to fetch journals:", error);
        return new Response(
          JSON.stringify({ error: "仕訳データの取得に失敗しました" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // CSV を生成
      let csv: string;
      let filename: string;
      const date = new Date().toISOString().split("T")[0];

      switch (type) {
        case "revenue":
          csv = generateRevenueCSV(
            journals as JournalData[],
            accountMaster,
            subAccounts
          );
          filename = `収入一覧_${date}.csv`;
          break;
        case "summary":
          csv = generateSummaryCSV(journals as JournalData[], accountMaster);
          filename = `科目別集計_${date}.csv`;
          break;
        case "assets":
          csv = generateAssetsCSV(journals as JournalData[]);
          filename = `資産等一覧_${date}.csv`;
          break;
        case "expense":
        default:
          csv = generateExpenseCSV(
            journals as JournalData[],
            accountMaster,
            subAccounts,
            ledgerType
          );
          filename = `支出一覧_${date}.csv`;
          break;
      }

      // BOM 付き UTF-8 で返す（Excel 対応）
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const csvBytes = new TextEncoder().encode(csv);
      const blob = new Uint8Array(bom.length + csvBytes.length);
      blob.set(bom);
      blob.set(csvBytes, bom.length);

      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
            filename
          )}`,
        },
      });
    } catch (error) {
      console.error("CSV export error:", error);
      return new Response(
        JSON.stringify({ error: "CSV エクスポートに失敗しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
