/**
 * Hub 同期 API
 */

import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import {
  isTestUser,
  recordChangeLog,
  syncContacts,
  type SyncContactInput,
  type SyncJournalInput,
  syncJournals,
  syncLedger,
  type SyncLedgerInput,
} from "../../../lib/hub-client.ts";
import {
  type LedgerContact,
  type LedgerJournal,
  type LedgerJournalEntry,
  isFullyPublicContact,
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

/** 正規化後の ledgers テーブル */
interface LedgerRecord {
  id: string;
  ledger_type: "political_fund" | "election_fund";
  organization_id: string | null;
  election_id: string | null;
  hub_ledger_id: string | null;
  hub_politician_organization_id: string | null;
  hub_politician_election_id: string | null;
}

interface JournalWithEntries extends LedgerJournal {
  journal_entries: LedgerJournalEntry[];
  contacts: LedgerContact | null;
}

async function getApprovedJournals(
  supabase: ReturnType<typeof getSupabase>,
  ledger: LedgerRecord
): Promise<JournalWithEntries[]> {
  const query = supabase
    .from("journals")
    .select(
      `
      *,
      journal_entries (*),
      contacts (*)
    `
    )
    .eq("status", "approved")
    .eq("ledger_id", ledger.id);

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

/**
 * journals から公開可能な contacts を収集し、Hub に同期する
 *
 * contact_source_id（Ledger contacts.id — UUID）をユニークキーとして同期。
 * 同姓同名でも UUID で確実に区別される。
 *
 * @returns Ledger contact_id → Hub public_contacts.id のマッピング
 */
async function syncContactsForJournals(
  journals: JournalWithEntries[],
  hubLedgerId: string,
  userId: string | undefined,
): Promise<Map<string, string>> {
  // Ledger contact_id → Hub public_contacts.id
  const contactIdMap = new Map<string, string>();

  // 全公開の contact を収集（重複排除）
  const contactsToSync = new Map<string, SyncContactInput>();

  for (const journal of journals) {
    const contact = journal.contacts;
    if (!contact || !contact.id) continue;
    if (contactsToSync.has(contact.id)) continue;

    // 全フィールド公開の場合のみ Hub に同期
    if (isFullyPublicContact(contact)) {
      contactsToSync.set(contact.id, {
        contact_source_id: contact.id,
        ledger_id: hubLedgerId,
        contact_type: contact.contact_type,
        name: contact.name,
        address: contact.address ?? null,
        occupation: contact.occupation ?? null,
        is_name_private: false,
        is_address_private: false,
        is_occupation_private: false,
      });
    } else {
      // 一部非公開の場合も非公開フラグ付きで同期
      contactsToSync.set(contact.id, {
        contact_source_id: contact.id,
        ledger_id: hubLedgerId,
        contact_type: contact.contact_type,
        name: contact.is_name_private ? null : contact.name,
        address: contact.is_address_private ? null : (contact.address ?? null),
        occupation: contact.is_occupation_private
          ? null
          : (contact.occupation ?? null),
        is_name_private: contact.is_name_private,
        is_address_private: contact.is_address_private,
        is_occupation_private: contact.is_occupation_private,
      });
    }
  }

  if (contactsToSync.size === 0) {
    return contactIdMap;
  }

  try {
    const syncResult = await syncContacts(
      Array.from(contactsToSync.values()),
      { userId },
    );

    // マッピングを構築
    for (const result of syncResult.data) {
      contactIdMap.set(result.contact_source_id, result.hub_contact_id);
    }

    console.log(
      `[Sync] Contacts synced: ${syncResult.data.length} (map size: ${contactIdMap.size})`
    );
  } catch (error) {
    console.error("[Sync] Failed to sync contacts (non-fatal):", error);
  }

  return contactIdMap;
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
      ledgersQuery = ledgersQuery.eq("ledger_type", "election_fund");
    } else if (ledgerType === "organization") {
      ledgersQuery = ledgersQuery.eq("ledger_type", "political_fund");
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
      contacts_synced: 0,
    };

    for (const ledger of ledgers) {
      try {
        const ledgerRecord: LedgerRecord = {
          id: ledger.id,
          ledger_type: ledger.ledger_type,
          organization_id: ledger.organization_id,
          election_id: ledger.election_id,
          hub_ledger_id: ledger.hub_ledger_id,
          hub_politician_organization_id:
            ledger.hub_politician_organization_id,
          hub_politician_election_id: ledger.hub_politician_election_id,
        };

        const journals = await getApprovedJournals(supabase, ledgerRecord);

        if (journals.length === 0) {
          console.log(`[Sync] No approved journals for ledger ${ledger.id}`);
          continue;
        }

        const totals = calculateLedgerTotals(journals);

        // 1. 台帳を同期
        const ledgerInput: SyncLedgerInput = {
          ledger_source_id: ledger.id,
          ledger_type: ledgerRecord.ledger_type,
          politician_organization_id:
            ledgerRecord.hub_politician_organization_id || undefined,
          politician_election_id:
            ledgerRecord.hub_politician_election_id || undefined,
          fiscal_year: new Date().getFullYear(),
          is_test: isTest,
          ...totals,
        };

        const ledgerResult = await syncLedger(ledgerInput, {
          userId: userId || undefined,
        });

        // Hub の public_ledgers.id を取得
        const hubLedgerId =
          ledgerResult.data?.id || ledger.hub_ledger_id || ledger.id;

        // 2. contacts を先に同期（UUID でユニーク識別）
        const contactIdMap = await syncContactsForJournals(
          journals,
          hubLedgerId,
          userId || undefined,
        );
        result.contacts_synced += contactIdMap.size;

        // 3. journals を同期（contact_id は Hub の public_contacts.id を使用）
        const syncInputs: SyncJournalInput[] = [];

        for (const journal of journals) {
          if (!shouldSync(journal)) {
            result.skipped++;
            continue;
          }

          // Ledger の contact_id → Hub の public_contacts.id にマッピング
          const hubContactId = journal.contact_id
            ? contactIdMap.get(journal.contact_id) || null
            : null;

          const transformed = await transformJournalForSync({
            journal,
            entries: journal.journal_entries,
            contact: journal.contacts,
            ledgerSourceId: ledger.id,
            hubContactId,
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
              contacts_synced: contactIdMap.size,
              created: result.created,
              updated: result.updated,
            },
          },
          { userId: userId || undefined }
        );

        console.log(
          `[Sync] Ledger ${ledger.id}: ${syncInputs.length} journals, ${contactIdMap.size} contacts synced`
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
