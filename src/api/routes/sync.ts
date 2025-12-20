/**
 * Hub 同期 API
 */

import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import {
  isTestUser,
  recordChangeLog,
  type SyncJournalInput,
  syncJournals,
  syncLedger,
  type SyncLedgerInput,
} from "../../../lib/hub-client.ts";
import {
  type LedgerContact,
  type LedgerJournal,
  type LedgerJournalEntry,
  shouldSync,
  transformJournalForSync,
} from "../../../lib/sync-transform.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export const syncRouter = new Hono<{
  Variables: {
    userId: string;
  };
}>();

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

async function getApprovedJournals(
  supabase: ReturnType<typeof getSupabase>,
  ledger: LedgerRecord
): Promise<JournalWithEntries[]> {
  let query = supabase
    .from("journals")
    .select(`
      *,
      journal_entries (*),
      contacts (*)
    `)
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

function calculateLedgerTotals(journals: JournalWithEntries[]): {
  total_income: number;
  total_expense: number;
  journal_count: number;
} {
  let total_income = 0;
  let total_expense = 0;

  for (const journal of journals) {
    for (const entry of journal.journal_entries) {
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

// POST /sync - Hub に同期
syncRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const url = new URL(c.req.url);
  const ledgerType = url.searchParams.get("type") as
    | "election"
    | "organization"
    | null;
  const ledgerId = url.searchParams.get("ledger_id");
  const force = url.searchParams.get("force") === "true";

  if (!ledgerType && !ledgerId) {
    return c.json({ error: "type or ledger_id is required" }, 400);
  }

  const isTest = isTestUser(userId);

  if (isTest) {
    console.log("[Sync] Running in test mode (TEST_USER_ID)");
  }

  try {
    const supabase = getSupabase();

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
      return c.json({ error: "No ledgers found" }, 404);
    }

    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      ledgers_synced: 0,
    };

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

        const journals = await getApprovedJournals(supabase, ledgerRecord);

        if (journals.length === 0) {
          console.log(`[Sync] No approved journals for ledger ${ledger.id}`);
          continue;
        }

        const totals = calculateLedgerTotals(journals);

        const ledgerInput: SyncLedgerInput = {
          ledger_source_id: ledger.id,
          politician_id: ledgerRecord.politician_id,
          organization_id: ledgerRecord.organization_id || undefined,
          election_id: ledgerRecord.election_id || undefined,
          fiscal_year: ledgerRecord.fiscal_year,
          is_test: isTest,
          ...totals,
        };

        await syncLedger(ledgerInput, { userId: userId || undefined });

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

          syncInputs.push({
            ...transformed,
            is_test: isTest,
          });
        }

        if (syncInputs.length > 0) {
          const syncResult = await syncJournals(syncInputs, {
            userId: userId || undefined,
          });
          result.created += syncResult.created;
          result.updated += syncResult.updated;
          result.skipped += syncResult.skipped;
          result.errors += syncResult.errors;
        }

        result.ledgers_synced++;

        await recordChangeLog(
          {
            ledger_source_id: ledger.id,
            change_summary: force ? "強制再同期" : "同期",
            change_details: {
              journal_count: syncInputs.length,
              created: result.created,
              updated: result.updated,
            },
          },
          { userId: userId || undefined }
        );

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

    return c.json(result);
  } catch (error) {
    console.error("[Sync] Error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      500
    );
  }
});
