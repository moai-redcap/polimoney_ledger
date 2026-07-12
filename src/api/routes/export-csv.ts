/**
 * CSV エクスポート API
 *
 * 収支報告書作成補助データを CSV で出力する。
 * type=all の場合は 4 種 CSV を ZIP にまとめて返却。
 */

import { Hono } from "hono";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import {
  getAccountName,
  getAccountType,
  getReportCategory,
} from "../../constants/account-codes.ts";
import { zipSync } from "fflate";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const exportCsvRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// ============================================
// 型定義
// ============================================

interface JournalRow {
  id: string;
  journal_date: string;
  description: string;
  notes: string | null;
  contacts: {
    name: string;
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

interface SubAccount {
  id: string;
  name: string;
}

interface ReceiptRow {
  id: string;
  journal_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
}

// ============================================
// CSV ヘルパー
// ============================================

/** CSV のセルをエスケープ */
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** 行配列を BOM付き UTF-8 CSV 文字列に変換 */
function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const BOM = "\uFEFF";
  const headerLine = headers.map(csvEscape).join(",");
  const dataLines = rows.map((row) => row.map(csvEscape).join(","));
  return BOM + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

/** 今日の日付を YYYYMMDD 形式で取得 */
function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

// ============================================
// データ取得
// ============================================

async function fetchJournals(
  userId: string,
  ledgerId: string,
  year: string | null,
) {
  const supabase =
    userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

  let query = supabase
    .from("journals")
    .select(
      `
      id,
      journal_date,
      description,
      notes,
      contacts ( name, address, occupation ),
      journal_entries ( account_code, sub_account_id, debit_amount, credit_amount )
    `,
    )
    .eq("status", "approved")
    .eq("ledger_id", ledgerId)
    .order("journal_date", { ascending: true });

  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("journal_date", startDate).lte("journal_date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch journals for export:", error);
    throw new Error("仕訳データの取得に失敗しました");
  }

  return (data ?? []) as unknown as JournalRow[];
}

async function fetchSubAccounts(userId: string): Promise<Map<string, string>> {
  const supabase =
    userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

  const { data } = await supabase.from("sub_accounts").select("id, name");

  const map = new Map<string, string>();
  if (data) {
    for (const sa of data as SubAccount[]) {
      map.set(sa.id, sa.name);
    }
  }
  return map;
}

/**
 * 仕訳一覧に対応する領収書一覧を取得
 */
async function fetchReceiptsForJournals(
  userId: string,
  journalIds: string[],
): Promise<ReceiptRow[]> {
  if (journalIds.length === 0) return [];

  const supabase =
    userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

  const { data, error } = await supabase
    .from("receipts")
    .select("id, journal_id, storage_path, file_name, mime_type")
    .in("journal_id", journalIds);

  if (error) {
    console.error("Failed to fetch receipts:", error);
    return [];
  }
  return (data ?? []) as ReceiptRow[];
}

/**
 * Supabase Storage から署名付き URL でファイルバイナリを取得
 */
async function fetchReceiptBinary(
  userId: string,
  storagePath: string,
): Promise<Uint8Array | null> {
  try {
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(userId);

    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(storagePath, 60);

    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL:", error);
      return null;
    }

    const response = await fetch(data.signedUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.error("Failed to fetch receipt binary:", err);
    return null;
  }
}

// ============================================
// CSV 生成関数
// ============================================

function generateExpenseCsv(
  journals: JournalRow[],
  subAccountMap: Map<string, string>,
): string {
  const headers = [
    "日付",
    "科目コード",
    "科目名",
    "補助科目名",
    "摘要",
    "金額",
    "関係者名",
    "関係者住所",
    "関係者職業",
    "備考",
  ];

  const rows: (string | number | null)[][] = [];

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctType = getAccountType(e.account_code);
      // 支出 = expense 科目で借方に金額がある
      if (acctType === "expense" && e.debit_amount > 0) {
        rows.push([
          j.journal_date,
          e.account_code,
          getAccountName(e.account_code),
          e.sub_account_id ? (subAccountMap.get(e.sub_account_id) ?? "") : "",
          j.description,
          e.debit_amount,
          j.contacts?.name ?? "",
          j.contacts?.address ?? "",
          j.contacts?.occupation ?? "",
          j.notes ?? "",
        ]);
      }
    }
  }

  return toCsv(headers, rows);
}

function generateRevenueCsv(
  journals: JournalRow[],
  subAccountMap: Map<string, string>,
): string {
  const headers = [
    "日付",
    "科目コード",
    "科目名",
    "補助科目名",
    "摘要",
    "金額",
    "関係者名",
    "関係者住所",
    "関係者職業",
    "備考",
  ];

  const rows: (string | number | null)[][] = [];

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctType = getAccountType(e.account_code);
      // 収入 = revenue/subsidy 科目で貸方に金額がある
      if (
        (acctType === "revenue" || acctType === "subsidy") &&
        e.credit_amount > 0
      ) {
        rows.push([
          j.journal_date,
          e.account_code,
          getAccountName(e.account_code),
          e.sub_account_id ? (subAccountMap.get(e.sub_account_id) ?? "") : "",
          j.description,
          e.credit_amount,
          j.contacts?.name ?? "",
          j.contacts?.address ?? "",
          j.contacts?.occupation ?? "",
          j.notes ?? "",
        ]);
      }
    }
  }

  return toCsv(headers, rows);
}

function generateSummaryCsv(journals: JournalRow[]): string {
  const headers = ["報告書分類", "科目コード", "科目名", "合計金額", "件数"];

  // 科目別に集計
  const summaryMap = new Map<
    string,
    { reportCategory: string; name: string; total: number; count: number }
  >();

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctType = getAccountType(e.account_code);
      const amount =
        acctType === "expense" || acctType === "asset"
          ? e.debit_amount
          : e.credit_amount;

      if (amount > 0) {
        const existing = summaryMap.get(e.account_code);
        if (existing) {
          existing.total += amount;
          existing.count += 1;
        } else {
          summaryMap.set(e.account_code, {
            reportCategory: getReportCategory(e.account_code),
            name: getAccountName(e.account_code),
            total: amount,
            count: 1,
          });
        }
      }
    }
  }

  // reportCategory でソートして行を生成
  const entries = [...summaryMap.entries()].sort((a, b) => {
    const catCompare = a[1].reportCategory.localeCompare(
      b[1].reportCategory,
      "ja",
    );
    if (catCompare !== 0) return catCompare;
    return a[0].localeCompare(b[0]);
  });

  const rows: (string | number | null)[][] = entries.map(([code, info]) => [
    info.reportCategory,
    code,
    info.name,
    info.total,
    info.count,
  ]);

  return toCsv(headers, rows);
}

function generateAssetsCsv(journals: JournalRow[]): string {
  const headers = ["科目コード", "科目名", "借方合計", "貸方合計", "残高"];

  // 資産・負債・純資産の科目のみ集計
  const balanceMap = new Map<
    string,
    { name: string; totalDebit: number; totalCredit: number }
  >();

  for (const j of journals) {
    for (const e of j.journal_entries) {
      const acctType = getAccountType(e.account_code);
      if (
        acctType === "asset" ||
        acctType === "liability" ||
        acctType === "equity"
      ) {
        const existing = balanceMap.get(e.account_code);
        if (existing) {
          existing.totalDebit += e.debit_amount;
          existing.totalCredit += e.credit_amount;
        } else {
          balanceMap.set(e.account_code, {
            name: getAccountName(e.account_code),
            totalDebit: e.debit_amount,
            totalCredit: e.credit_amount,
          });
        }
      }
    }
  }

  const rows: (string | number | null)[][] = [...balanceMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, info]) => {
      const acctType = getAccountType(code);
      // 資産は借方残、負債・純資産は貸方残
      const balance =
        acctType === "asset"
          ? info.totalDebit - info.totalCredit
          : info.totalCredit - info.totalDebit;
      return [code, info.name, info.totalDebit, info.totalCredit, balance];
    });

  return toCsv(headers, rows);
}

// ============================================
// API エンドポイント
// ============================================

exportCsvRouter.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const type = c.req.query("type");
  const ledgerId = c.req.query("ledger_id") ?? null;
  const year = c.req.query("year") ?? null;
  const includeImages = c.req.query("include_images") === "true";

  // バリデーション
  const validTypes = ["expense", "revenue", "summary", "assets", "all"];
  if (!type || !validTypes.includes(type)) {
    return c.json(
      {
        error:
          "type は 'expense', 'revenue', 'summary', 'assets', 'all' のいずれかを指定してください",
      },
      400,
    );
  }

  if (!ledgerId) {
    return c.json(
      { error: "ledger_id を指定してください" },
      400,
    );
  }

  try {
    // データ取得
    const [journals, subAccountMap] = await Promise.all([
      fetchJournals(userId, ledgerId, year),
      fetchSubAccounts(userId),
    ]);

    const dateStr = todayStr();
    const yearSuffix = year ? `_${year}年度` : "";

    if (type === "all") {
      // 4種 CSV を生成して ZIP にまとめる
      const csvFiles: Record<string, string> = {
        [`支出一覧${yearSuffix}.csv`]: generateExpenseCsv(
          journals,
          subAccountMap,
        ),
        [`収入一覧${yearSuffix}.csv`]: generateRevenueCsv(
          journals,
          subAccountMap,
        ),
        [`科目別集計${yearSuffix}.csv`]: generateSummaryCsv(journals),
        [`資産等一覧${yearSuffix}.csv`]: generateAssetsCsv(journals),
      };

      // fflate で ZIP 作成
      const encoder = new TextEncoder();
      const zipData: Record<string, Uint8Array> = {};
      for (const [filename, content] of Object.entries(csvFiles)) {
        zipData[filename] = encoder.encode(content);
      }

      // 領収書画像を含める（include_images=true のとき）
      if (includeImages) {
        const journalIds = journals.map((j) => j.id);
        const receipts = await fetchReceiptsForJournals(userId, journalIds);

        // 仕訳IDと日付のマップを作成
        const journalDateMap = new Map<string, string>();
        for (const j of journals) {
          journalDateMap.set(j.id, j.journal_date);
        }

        let imageIndex = 1;
        for (const receipt of receipts) {
          const binary = await fetchReceiptBinary(userId, receipt.storage_path);
          if (!binary) continue;

          const date = journalDateMap.get(receipt.journal_id) ?? "unknown";
          const ext = receipt.file_name.split(".").pop() || "jpg";
          const safeFileName = receipt.file_name
            .replace(/[/\\?%*:|"<>]/g, "_")
            .substring(0, 60);
          const zipKey = `receipts/${date}_${String(imageIndex).padStart(3, "0")}_${safeFileName}.${ext}`;
          zipData[zipKey] = binary;
          imageIndex++;
        }
      }

      const zipped = zipSync(zipData);
      const zipFilename = `収支報告補助データ${yearSuffix}${includeImages ? "（領収書含む）" : ""}_${dateStr}.zip`;

      const zipBuffer = zipped.slice().buffer as ArrayBuffer;
      return new Response(zipBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
            zipFilename,
          )}`,
        },
      });
    } else {
      // 個別 CSV
      let csvContent: string;
      let filenamePrefix: string;

      switch (type) {
        case "expense":
          csvContent = generateExpenseCsv(journals, subAccountMap);
          filenamePrefix = "支出一覧";
          break;
        case "revenue":
          csvContent = generateRevenueCsv(journals, subAccountMap);
          filenamePrefix = "収入一覧";
          break;
        case "summary":
          csvContent = generateSummaryCsv(journals);
          filenamePrefix = "科目別集計";
          break;
        case "assets":
          csvContent = generateAssetsCsv(journals);
          filenamePrefix = "資産等一覧";
          break;
        default:
          return c.json({ error: "不正な type です" }, 400);
      }

      const filename = `${filenamePrefix}${yearSuffix}_${dateStr}.csv`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
            filename,
          )}`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "エクスポートに失敗しました",
      },
      500,
    );
  }
});
