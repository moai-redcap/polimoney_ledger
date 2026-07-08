/**
 * 共有型定義ファイル
 */

/**
 * 仕訳エントリ（借方・貸方の明細）
 */
export interface JournalEntry {
  id: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
}

/**
 * 仕訳データ
 */
export interface Journal {
  id: string;
  journal_date: string;
  description: string;
  status: "draft" | "approved";
  contact_id: string | null;
  created_at: string;
  journal_entries: JournalEntry[];
  contacts:
    | {
      name: string;
    }[]
    | null;
}
