/**
 * Hub 同期 API
 *
 * Ledger の仕訳データを Hub に同期するエンドポイント
 * - POST: 承認済み仕訳を Hub に送信
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
import {
  syncJournals,
  syncLedger,
  recordChangeLog,
  isTestUser,
  type SyncJournalInput,
  type SyncLedgerInput,
} from "../../lib/hub-client.ts";
import {
  transformJournalForSync,
  shouldSync,
  type LedgerJournal,
  type LedgerJournalEntry,
  type LedgerContact,
} from "../../lib/sync-transform.ts";

// Supabase クライアント
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * リクエストの Cookie からユーザー ID を取得
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const cookies = req.headers.get("Cookie") || "";
  const accessTokenMatch = cookies.match(/sb-access-token=([^;]+)/);

  if (!accessTokenMatch) {
    return null;
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessTokenMatch[1]);

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch {
    return null;
  }
}

// ============================================
// 型定義
// ============================================

interface LedgerRecord {
  id: string;
  type: "election" | "organization";
  election_id: string | null;
  organization_id: string | null;
  politician_id: string;
  fiscal_year: number;
}

interface JournalWithEntries extends LedgerJournal {
  journal_entries: LedgerJournalEntry[];
  contacts: LedgerContact | null;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 台帳に紐づく承認済み仕訳を取得
 */
async function getApprovedJournals(
  supabase: ReturnType<typeof getSupabase>,
  ledger: LedgerRecord
): Promise<JournalWithEntries[]> {
  let query = supabase
    .from("journals")
    .select(
      `
      *,
      journal_entries (*),
      contacts (*)
    `
    )
    .eq("status", "approved");

  if (ledger.type === "election") {
    query = query.eq("election_id", ledger.election_id);
  } else {
    query = query.eq("organization_id", ledger.organization_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Sync] Failed to fetch journals:", error);
    throw new Error(`Failed to fetch journals: ${error.message}`);
  }

  return data || [];
}

/**
 * 台帳の集計を計算
 */
function calculateLedgerTotals(journals: JournalWithEntries[]): {
  total_income: number;
  total_expense: number;
  journal_count: number;
} {
  let total_income = 0;
  let total_expense = 0;

  for (const journal of journals) {
    for (const entry of journal.journal_entries) {
      // 収入: credit_amount（貸方）
      // 支出: debit_amount（借方）
      if (entry.account_code.startsWith("REV_")) {
        total_income += entry.credit_amount;
      } else if (entry.account_code.startsWith("EXP_")) {
        total_expense += entry.debit_amount;
      }
    }
  }

  return {
    total_income,
    total_expense,
    journal_count: journals.length,
  };
}

// ============================================
// API ハンドラ
// ============================================

export const handler: Handlers = {
  /**
   * POST /api/sync
   *
   * クエリパラメータ:
   * - type: "election" | "organization" (必須)
   * - ledger_id: 特定の台帳のみ同期する場合
   * - force: "true" で強制再同期（Hub の既存データを上書き）
   */
  async POST(req) {
    const url = new URL(req.url);
    const ledgerType = url.searchParams.get("type") as
      | "election"
      | "organization"
      | null;
    const ledgerId = url.searchParams.get("ledger_id");
    const force = url.searchParams.get("force") === "true";

    if (!ledgerType && !ledgerId) {
      return new Response(
        JSON.stringify({ error: "type or ledger_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ユーザー ID を取得してテストユーザーかどうか判定
    const userId = await getUserIdFromRequest(req);
    const isTest = isTestUser(userId);

    if (isTest) {
      console.log("[Sync] Running in test mode (TEST_USER_ID)");
    }

    try {
      const supabase = getSupabase();

      // 台帳を取得
      let ledgersQuery = supabase.from("ledgers").select("*");

      if (ledgerId) {
        ledgersQuery = ledgersQuery.eq("id", ledgerId);
      } else if (ledgerType === "election") {
        ledgersQuery = ledgersQuery.not("election_id", "is", null);
      } else if (ledgerType === "organization") {
        ledgersQuery = ledgersQuery.not("organization_id", "is", null);
      }

      const { data: ledgers, error: ledgersError } = await ledgersQuery;

      if (ledgersError) {
        throw new Error(`Failed to fetch ledgers: ${ledgersError.message}`);
      }

      if (!ledgers || ledgers.length === 0) {
        return new Response(JSON.stringify({ error: "No ledgers found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 結果集計
      const result = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        ledgers_synced: 0,
      };

      // 各台帳を処理
      for (const ledger of ledgers) {
        try {
          const ledgerRecord: LedgerRecord = {
            id: ledger.id,
            type: ledger.election_id ? "election" : "organization",
            election_id: ledger.election_id,
            organization_id: ledger.organization_id,
            politician_id: ledger.politician_id,
            fiscal_year: ledger.fiscal_year || new Date().getFullYear(),
          };

          // 承認済み仕訳を取得
          const journals = await getApprovedJournals(supabase, ledgerRecord);

          if (journals.length === 0) {
            console.log(`[Sync] No approved journals for ledger ${ledger.id}`);
            continue;
          }

          // 台帳の集計を計算
          const totals = calculateLedgerTotals(journals);

          // 台帳を Hub に同期
          const ledgerInput: SyncLedgerInput = {
            ledger_source_id: ledger.id,
            politician_id: ledgerRecord.politician_id,
            organization_id: ledgerRecord.organization_id || undefined,
            election_id: ledgerRecord.election_id || undefined,
            fiscal_year: ledgerRecord.fiscal_year,
            is_test: isTest,
            ...totals,
          };

          await syncLedger(ledgerInput);

          // 仕訳を変換
          const syncInputs: SyncJournalInput[] = [];

          for (const journal of journals) {
            if (!shouldSync(journal)) {
              result.skipped++;
              continue;
            }

            const transformed = await transformJournalForSync({
              journal,
              entries: journal.journal_entries,
              contact: journal.contacts,
              ledgerSourceId: ledger.id,
            });

            // テストユーザーの場合は is_test フラグを設定
            syncInputs.push({
              ...transformed,
              is_test: isTest,
            });
          }

          // 仕訳を Hub に送信
          if (syncInputs.length > 0) {
            const syncResult = await syncJournals(syncInputs);
            result.created += syncResult.created;
            result.updated += syncResult.updated;
            result.skipped += syncResult.skipped;
            result.errors += syncResult.errors;
          }

          result.ledgers_synced++;

          // 変更ログを記録
          await recordChangeLog({
            ledger_source_id: ledger.id,
            change_summary: force ? "強制再同期" : "同期",
            change_details: {
              journal_count: syncInputs.length,
              created: result.created,
              updated: result.updated,
            },
          });

          console.log(
            `[Sync] Ledger ${ledger.id}: ${syncInputs.length} journals synced`
          );
        } catch (ledgerError) {
          console.error(
            `[Sync] Error processing ledger ${ledger.id}:`,
            ledgerError
          );
          result.errors++;
        }
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Sync] Error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Sync failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
