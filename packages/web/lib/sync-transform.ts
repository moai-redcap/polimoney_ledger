/**
 * Ledger → Hub 同期用データ変換ロジック
 *
 * Ledger の journals/journal_entries/contacts を
 * Hub の public_journals 形式に変換する
 */

import type { SyncJournalInput } from "./hub-client.ts";

// ============================================
// 型定義（Ledger 側のデータ構造）
// ============================================

/** Ledger journals テーブル */
export interface LedgerJournal {
  id: string;
  organization_id: string | null;
  election_id: string | null;
  journal_date: string;
  description: string;
  status: "draft" | "approved";
  contact_id: string | null;
  classification: string | null; // 'pre-campaign' | 'campaign'
  non_monetary_basis: string | null;
  notes: string | null;
  amount_public_subsidy: number | null;
}

/** Ledger journal_entries テーブル */
export interface LedgerJournalEntry {
  id: string;
  journal_id: string;
  account_code: string;
  sub_account_id: string | null;
  debit_amount: number;
  credit_amount: number;
}

/** Ledger contacts テーブル */
export interface LedgerContact {
  id: string;
  contact_type: "person" | "corporation";
  name: string;
  address: string | null;
  occupation: string | null;
  is_name_private: boolean;
  is_address_private: boolean;
  is_occupation_private: boolean;
}

/** Hub 側の台帳情報 */
export interface HubLedger {
  id: string;
  election_id: string | null;
  organization_id: string | null;
}

// ============================================
// 匿名化ロジック
// ============================================

/**
 * 関係者名を匿名化
 */
export function anonymizeContactName(
  contact: LedgerContact | null
): string | null {
  if (!contact) return null;
  if (contact.is_name_private) return "非公開";
  return contact.name;
}

/**
 * 関係者種別を取得
 */
export function getContactType(contact: LedgerContact | null): string | null {
  if (!contact) return null;
  return contact.contact_type;
}

// ============================================
// 金額計算
// ============================================

/**
 * 仕訳エントリから金額を計算（借方合計）
 */
export function calculateAmount(entries: LedgerJournalEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.debit_amount, 0);
}

/**
 * 仕訳エントリから勘定科目コードを取得（借方の最初のエントリ）
 */
export function getAccountCode(entries: LedgerJournalEntry[]): string {
  const debitEntry = entries.find((e) => e.debit_amount > 0);
  return debitEntry?.account_code || entries[0]?.account_code || "UNKNOWN";
}

// ============================================
// コンテンツハッシュ生成
// ============================================

/**
 * 同期データのハッシュを生成（重複検知・変更検知用）
 */
export async function generateContentHash(data: {
  journal_date: string;
  description: string;
  amount: number;
  account_code: string;
  classification: string | null;
  notes: string | null;
}): Promise<string> {
  const content = JSON.stringify({
    date: data.journal_date,
    desc: data.description,
    amt: data.amount,
    code: data.account_code,
    cls: data.classification,
    note: data.notes,
  });

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================
// メイン変換関数
// ============================================

export interface TransformInput {
  journal: LedgerJournal;
  entries: LedgerJournalEntry[];
  contact: LedgerContact | null;
  /** Ledger 側の台帳 ID（Hub では ledger_source_id として使用） */
  ledgerSourceId: string;
}

/**
 * Ledger の仕訳データを Hub 同期形式に変換
 */
export async function transformJournalForSync(
  input: TransformInput
): Promise<SyncJournalInput> {
  const { journal, entries, contact, ledgerSourceId } = input;

  const amount = calculateAmount(entries);
  const accountCode = getAccountCode(entries);

  const contentHash = await generateContentHash({
    journal_date: journal.journal_date,
    description: journal.description,
    amount,
    account_code: accountCode,
    classification: journal.classification,
    notes: journal.notes,
  });

  return {
    journal_source_id: journal.id,
    ledger_source_id: ledgerSourceId,
    date: journal.journal_date,
    description: journal.description,
    amount,
    contact_name: anonymizeContactName(contact),
    contact_type: getContactType(contact),
    account_code: accountCode,
    classification: journal.classification,
    non_monetary_basis: journal.non_monetary_basis,
    note: journal.notes,
    public_expense_amount: journal.amount_public_subsidy,
    content_hash: contentHash,
  };
}

/**
 * 複数の仕訳を一括変換
 */
export async function transformJournalsForSync(
  inputs: TransformInput[]
): Promise<SyncJournalInput[]> {
  return Promise.all(inputs.map(transformJournalForSync));
}

// ============================================
// フィルタリング
// ============================================

/**
 * 同期対象の仕訳かどうかを判定
 * - approved ステータスのみ
 * - 選挙台帳の場合は election_id が必要
 */
export function shouldSync(journal: LedgerJournal): boolean {
  // 承認済みのみ同期
  if (journal.status !== "approved") {
    return false;
  }

  // 台帳に紐づいているか確認
  if (!journal.election_id && !journal.organization_id) {
    return false;
  }

  return true;
}

