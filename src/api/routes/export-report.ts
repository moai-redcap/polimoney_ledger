/**
 * 収支報告書 CSV エクスポート API
 *
 * 政治資金収支報告書・選挙運動費用収支報告書に準拠したフォーマットで
 * 科目別集計データを CSV で出力する。
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import {
  ACCOUNT_CODES,
  getAccountName,
  getAccountType,
} from "../../constants/account-codes.ts";
import { zipSync } from "fflate";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const exportReportRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// ============================================
// 型定義
// ============================================

interface JournalEntry {
  account_code: string;
  debit_amount: number;
  credit_amount: number;
}

interface JournalRow {
  id: string;
  journal_date: string;
  description: string;
  contacts: {
    name: string;
    address: string | null;
    occupation: string | null;
  } | null;
  journal_entries: JournalEntry[];
}

// ============================================
// CSV ヘルパー
// ============================================

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const BOM = "\uFEFF";
  const headerLine = headers.map(csvEscape).join(",");
  const dataLines = rows.map((row) => row.map(csvEscape).join(","));
  return BOM + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================
// データ取得
// ============================================

async function fetchJournals(
  userId: string,
  ledgerId: string,
  year: string | null,
): Promise<JournalRow[]> {
  const supabase =
    userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

  let query = supabase
    .from("journals")
    .select(
      `
      id,
      journal_date,
      description,
      contacts ( name, address, occupation ),
      journal_entries ( account_code, debit_amount, credit_amount )
    `,
    )
    .eq("status", "approved")
    .eq("ledger_id", ledgerId)
    .order("journal_date", { ascending: true });

  if (year) {
    query = query
      .gte("journal_date", `${year}-01-01`)
      .lte("journal_date", `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`仕訳データの取得に失敗しました: ${error.message}`);
  return (data ?? []) as unknown as JournalRow[];
}

// ============================================
// 政治団体用: 収入の部 CSV
// ============================================

function generateOrgRevenueCsv(journals: JournalRow[]): string {
  const headers = [
    "収入区分",
    "科目コード",
    "科目名",
    "金額",
    "件数",
    "摘要（代表例）",
  ];

  // reportCategory ごとに集計
  const categoryMap = new Map<
    string,
    Map<string, { name: string; total: number; count: number; desc: string }>
  >();

  // 収入区分の表示順
  const INCOME_CATEGORIES = [
    "党費・会費",
    "寄附",
    "事業収入",
    "交付金",
    "その他の収入",
  ];

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctInfo = ACCOUNT_CODES[e.account_code];
      if (!acctInfo || acctInfo.type !== "revenue") continue;
      if (e.credit_amount <= 0) continue;

      const cat = acctInfo.reportCategory;
      if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());

      const codeMap = categoryMap.get(cat)!;
      const existing = codeMap.get(e.account_code);
      if (existing) {
        existing.total += e.credit_amount;
        existing.count += 1;
      } else {
        codeMap.set(e.account_code, {
          name: acctInfo.name,
          total: e.credit_amount,
          count: 1,
          desc: j.description,
        });
      }
    }
  }

  const rows: (string | number | null)[][] = [];

  for (const cat of INCOME_CATEGORIES) {
    const codeMap = categoryMap.get(cat);
    if (!codeMap) continue;

    let catTotal = 0;
    for (const [code, info] of codeMap) {
      rows.push([cat, code, info.name, info.total, info.count, info.desc]);
      catTotal += info.total;
    }
    rows.push([`【${cat} 小計】`, "", "", catTotal, "", ""]);
  }

  const grandTotal = [...categoryMap.values()].flatMap((m) =>
    [...m.values()].map((v) => v.total)
  ).reduce((a, b) => a + b, 0);
  rows.push(["【収入 合計】", "", "", grandTotal, "", ""]);

  return toCsv(headers, rows);
}

// ============================================
// 政治団体用: 支出の部 CSV
// ============================================

function generateOrgExpenseCsv(journals: JournalRow[]): string {
  const headers = [
    "支出区分",
    "科目コード",
    "科目名",
    "金額",
    "件数",
    "摘要（代表例）",
  ];

  const EXPENSE_CATEGORIES = ["経常経費", "政治活動費"];

  const categoryMap = new Map<
    string,
    Map<string, { name: string; total: number; count: number; desc: string }>
  >();

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctInfo = ACCOUNT_CODES[e.account_code];
      if (!acctInfo || acctInfo.type !== "expense") continue;
      if (e.debit_amount <= 0) continue;

      const cat = acctInfo.reportCategory;
      if (!EXPENSE_CATEGORIES.includes(cat)) continue;
      if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());

      const codeMap = categoryMap.get(cat)!;
      const existing = codeMap.get(e.account_code);
      if (existing) {
        existing.total += e.debit_amount;
        existing.count += 1;
      } else {
        codeMap.set(e.account_code, {
          name: acctInfo.name,
          total: e.debit_amount,
          count: 1,
          desc: j.description,
        });
      }
    }
  }

  const rows: (string | number | null)[][] = [];

  for (const cat of EXPENSE_CATEGORIES) {
    const codeMap = categoryMap.get(cat);
    if (!codeMap) continue;

    let catTotal = 0;
    for (const [code, info] of codeMap) {
      rows.push([cat, code, info.name, info.total, info.count, info.desc]);
      catTotal += info.total;
    }
    rows.push([`【${cat} 小計】`, "", "", catTotal, "", ""]);
  }

  const grandTotal = [...categoryMap.values()].flatMap((m) =>
    [...m.values()].map((v) => v.total)
  ).reduce((a, b) => a + b, 0);
  rows.push(["【支出 合計】", "", "", grandTotal, "", ""]);

  return toCsv(headers, rows);
}

// ============================================
// 選挙用: 選挙運動費用収支報告書 CSV
// ============================================

function generateElectionReportCsv(journals: JournalRow[]): string {
  const headers = [
    "区分",
    "科目コード",
    "科目名",
    "日付",
    "摘要",
    "関係者名",
    "金額",
    "公費負担額",
    "証憑難",
  ];

  const rows: (string | number | null)[][] = [];

  // 収入
  rows.push(["【収入の部】", "", "", "", "", "", "", "", ""]);
  let totalIncome = 0;

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctType = getAccountType(e.account_code);
      if (acctType !== "revenue" || e.credit_amount <= 0) continue;

      rows.push([
        "収入",
        e.account_code,
        getAccountName(e.account_code),
        j.journal_date,
        j.description,
        j.contacts?.name ?? "",
        e.credit_amount,
        "",
        "",
      ]);
      totalIncome += e.credit_amount;
    }
  }
  rows.push(["収入合計", "", "", "", "", "", totalIncome, "", ""]);

  // 支出（選挙運動費用）
  rows.push(["", "", "", "", "", "", "", "", ""]);
  rows.push(["【支出の部】", "", "", "", "", "", "", "", ""]);
  let totalExpense = 0;
  let totalSubsidy = 0;

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctType = getAccountType(e.account_code);
      if (acctType !== "expense" || e.debit_amount <= 0) continue;

      rows.push([
        "支出",
        e.account_code,
        getAccountName(e.account_code),
        j.journal_date,
        j.description,
        j.contacts?.name ?? "",
        e.debit_amount,
        "",
        "",
      ]);
      totalExpense += e.debit_amount;
    }

    // 公費負担（SUBSIDY_PUBLIC）
    for (const e of j.journal_entries) {
      if (e.account_code === "SUBSIDY_PUBLIC" && e.credit_amount > 0) {
        totalSubsidy += e.credit_amount;
      }
    }
  }
  rows.push(["支出合計", "", "", "", "", "", totalExpense, totalSubsidy, ""]);

  return toCsv(headers, rows);
}

// ============================================
// API エンドポイント
// ============================================

exportReportRouter.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const ledgerType = c.req.query("ledger_type") as
    | "organization"
    | "election"
    | null;
  const ledgerId = c.req.query("ledger_id") ?? null;
  const year = c.req.query("year") ?? null;

  if (!ledgerId) {
    return c.json(
      { error: "ledger_id を指定してください" },
      400,
    );
  }

  try {
    const journals = await fetchJournals(
      userId,
      ledgerId,
      year,
    );

    const dateStr = todayStr();
    const yearSuffix = year ? `_${year}年度` : "";

    if (ledgerType === "election" || electionId) {
      // 選挙用: 選挙運動費用収支報告書
      const csv = generateElectionReportCsv(journals);
      const filename = `選挙運動費用収支報告書_補助${yearSuffix}_${dateStr}.csv`;

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    } else {
      // 政治団体用: 収入の部 + 支出の部をZIPで
      const encoder = new TextEncoder();
      const zipData: Record<string, Uint8Array> = {
        [`収入の部${yearSuffix}.csv`]: encoder.encode(
          generateOrgRevenueCsv(journals),
        ),
        [`支出の部${yearSuffix}.csv`]: encoder.encode(
          generateOrgExpenseCsv(journals),
        ),
      };
      const zipped = zipSync(zipData);
      const zipFilename = `政治資金収支報告書_補助${yearSuffix}_${dateStr}.zip`;

      const zipBuffer = zipped.slice().buffer as ArrayBuffer;
      return new Response(zipBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`,
        },
      });
    }
  } catch (error) {
    console.error("Export report error:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "エクスポートに失敗しました",
      },
      500,
    );
  }
});
