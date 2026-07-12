/**
 * Ledger Supabase にテストユーザーとダミーデータを投入するスクリプト
 *
 * 使い方:
 * 1. .env に SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY を設定
 * 2. deno run --allow-net --allow-env --allow-read db/seed-supabase.ts [options]
 *
 * オプション:
 *   --all     テストユーザーとダミーデータを投入（デフォルト）
 *   --user    テストユーザーのみ作成
 *   --data    ダミーデータのみ投入（テストユーザーが既に存在する前提）
 *
 * 注意:
 *   - このスクリプトは service_role キーを使用します
 *   - テストユーザー（TEST_USER_ID）でログインすると、このダミーデータが表示されます
 *
 * v6 スキーマ対応:
 *   - politicians テーブル廃止（Hub がマスターデータ）
 *   - ledgers テーブル追加
 *   - contacts は台帳間で共有（ledger_contacts 中間テーブル）
 *   - journals は ledger_id 直接FK
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  console.error("   Set these in packages/web/.env or environment variables");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// 固定のテストユーザー ID
// ============================================

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_EMAIL = "test-dev@polimoney.local";
const TEST_USER_PASSWORD = "test-dev-password-12345";

// ============================================
// ダミーデータ: 政治団体
// ============================================

const testOrganizations = [
  {
    id: "aaaa1111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    name: "テスト太郎後援会",
    hub_organization_id: "aaaa1111-1111-1111-1111-111111111111",
  },
  {
    id: "aaaa2222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    name: "テスト花子を応援する会",
    hub_organization_id: "aaaa2222-2222-2222-2222-222222222222",
  },
];

// ============================================
// ダミーデータ: 選挙
// ============================================

const testElections = [
  {
    id: "eeee1111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    hub_politician_id: "11111111-1111-1111-1111-111111111111",
    election_name: "2024年 第50回衆議院議員総選挙（テスト）",
    election_date: "2024-10-27",
  },
  {
    id: "eeee2222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    hub_politician_id: "22222222-2222-2222-2222-222222222222",
    election_name: "令和7年東京都知事選挙（テスト）",
    election_date: "2025-07-06",
  },
];

// ============================================
// ダミーデータ: 台帳
// ============================================

const testLedgers = [
  {
    id: "bbbb1111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    ledger_type: "political_fund",
    organization_id: "aaaa1111-1111-1111-1111-111111111111",
    election_id: null,
  },
  {
    id: "bbbb2222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    ledger_type: "election_fund",
    organization_id: null,
    election_id: "eeee1111-1111-1111-1111-111111111111",
  },
];

// ============================================
// ダミーデータ: 関係者（台帳間で共有 — 同一人物は1レコード）
// ============================================

const testContacts = [
  {
    id: "cccc1111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    contact_type: "person",
    name: "山田 一郎",
    address: "東京都渋谷区〇〇1-2-3",
    occupation: "会社員",
    is_name_private: false,
    is_address_private: false,
    is_occupation_private: false,
  },
  {
    id: "cccc2222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    contact_type: "corporation",
    name: "株式会社テスト印刷",
    address: "東京都新宿区△△4-5-6",
    occupation: null,
    is_name_private: false,
    is_address_private: false,
    is_occupation_private: false,
  },
  {
    id: "cccc3333-3333-3333-3333-333333333333",
    owner_user_id: TEST_USER_ID,
    contact_type: "corporation",
    name: "〇〇不動産",
    address: "東京都千代田区××7-8-9",
    occupation: null,
    is_name_private: false,
    is_address_private: false,
    is_occupation_private: false,
  },
];

// ============================================
// ダミーデータ: 台帳 ↔ 関係者 紐付け
// ============================================

const testLedgerContacts = [
  // 選挙台帳 → 関係者
  {
    id: "lc001111-1111-1111-1111-111111111111",
    ledger_id: "bbbb2222-2222-2222-2222-222222222222",
    contact_id: "cccc1111-1111-1111-1111-111111111111",
  },
  {
    id: "lc002222-2222-2222-2222-222222222222",
    ledger_id: "bbbb2222-2222-2222-2222-222222222222",
    contact_id: "cccc2222-2222-2222-2222-222222222222",
  },
  {
    id: "lc003333-3333-3333-3333-333333333333",
    ledger_id: "bbbb2222-2222-2222-2222-222222222222",
    contact_id: "cccc3333-3333-3333-3333-333333333333",
  },
  // 政治団体台帳 → 関係者（山田一郎、テスト印刷は両台帳から参照）
  {
    id: "lc004444-4444-4444-4444-444444444444",
    ledger_id: "bbbb1111-1111-1111-1111-111111111111",
    contact_id: "cccc1111-1111-1111-1111-111111111111",
  },
  {
    id: "lc005555-5555-5555-5555-555555555555",
    ledger_id: "bbbb1111-1111-1111-1111-111111111111",
    contact_id: "cccc2222-2222-2222-2222-222222222222",
  },
];

// ============================================
// ダミーデータ: 仕訳（ledger_id で台帳に紐付け）
// ============================================

const testJournals = [
  // 選挙台帳: テスト太郎の選挙
  {
    id: "dddd1111-1111-1111-1111-111111111111",
    ledger_id: "bbbb2222-2222-2222-2222-222222222222",
    journal_date: "2024-10-01",
    description: "選挙ポスター印刷",
    status: "approved",
    submitted_by_user_id: TEST_USER_ID,
    approved_by_user_id: TEST_USER_ID,
    contact_id: "cccc2222-2222-2222-2222-222222222222",
    classification: "campaign",
    notes: "A1サイズ 500枚",
  },
  {
    id: "dddd1111-2222-2222-2222-222222222222",
    ledger_id: "bbbb2222-2222-2222-2222-222222222222",
    journal_date: "2024-10-05",
    description: "個人寄附",
    status: "approved",
    submitted_by_user_id: TEST_USER_ID,
    approved_by_user_id: TEST_USER_ID,
    contact_id: "cccc1111-1111-1111-1111-111111111111",
    classification: "pre-campaign",
    notes: null,
  },
  {
    id: "dddd1111-3333-3333-3333-333333333333",
    ledger_id: "bbbb2222-2222-2222-2222-222222222222",
    journal_date: "2024-10-15",
    description: "選挙事務所借り上げ",
    status: "approved",
    submitted_by_user_id: TEST_USER_ID,
    approved_by_user_id: TEST_USER_ID,
    contact_id: "cccc3333-3333-3333-3333-333333333333",
    classification: "campaign",
    notes: "10/1~10/31",
  },
  // 政治団体台帳: テスト太郎後援会
  {
    id: "dddd2222-1111-1111-1111-111111111111",
    ledger_id: "bbbb1111-1111-1111-1111-111111111111",
    journal_date: "2024-04-15",
    description: "会費収入",
    status: "approved",
    submitted_by_user_id: TEST_USER_ID,
    approved_by_user_id: TEST_USER_ID,
    contact_id: "cccc1111-1111-1111-1111-111111111111",
    classification: null,
    notes: "年会費",
  },
  {
    id: "dddd2222-2222-2222-2222-222222222222",
    ledger_id: "bbbb1111-1111-1111-1111-111111111111",
    journal_date: "2024-05-01",
    description: "事務用品購入",
    status: "approved",
    submitted_by_user_id: TEST_USER_ID,
    approved_by_user_id: TEST_USER_ID,
    contact_id: "cccc2222-2222-2222-2222-222222222222",
    classification: null,
    notes: "コピー用紙、文房具",
  },
];

// ============================================
// ダミーデータ: 仕訳明細
// ============================================

const testJournalEntries = [
  // ポスター印刷（支出）
  {
    id: "ff001111-1111-1111-1111-111111111111",
    journal_id: "dddd1111-1111-1111-1111-111111111111",
    account_code: "EXP_PRINTING_ELEC",
    debit_amount: 150000,
    credit_amount: 0,
  },
  {
    id: "ff001111-1111-1111-2222-222222222222",
    journal_id: "dddd1111-1111-1111-1111-111111111111",
    account_code: "ASSET_CASH",
    debit_amount: 0,
    credit_amount: 150000,
  },
  // 個人寄附（収入）
  {
    id: "ff001111-2222-2222-1111-111111111111",
    journal_id: "dddd1111-2222-2222-2222-222222222222",
    account_code: "ASSET_CASH",
    debit_amount: 50000,
    credit_amount: 0,
  },
  {
    id: "ff001111-2222-2222-2222-222222222222",
    journal_id: "dddd1111-2222-2222-2222-222222222222",
    account_code: "REV_DONATION_INDIVIDUAL_ELEC",
    debit_amount: 0,
    credit_amount: 50000,
  },
  // 事務所借り上げ（支出）
  {
    id: "ff001111-3333-3333-1111-111111111111",
    journal_id: "dddd1111-3333-3333-3333-333333333333",
    account_code: "EXP_BUILDING_ELEC",
    debit_amount: 80000,
    credit_amount: 0,
  },
  {
    id: "ff001111-3333-3333-2222-222222222222",
    journal_id: "dddd1111-3333-3333-3333-333333333333",
    account_code: "ASSET_CASH",
    debit_amount: 0,
    credit_amount: 80000,
  },
  // 会費収入
  {
    id: "ff002222-1111-1111-1111-111111111111",
    journal_id: "dddd2222-1111-1111-1111-111111111111",
    account_code: "ASSET_CASH",
    debit_amount: 10000,
    credit_amount: 0,
  },
  {
    id: "ff002222-1111-1111-2222-222222222222",
    journal_id: "dddd2222-1111-1111-1111-111111111111",
    account_code: "REV_MEMBERSHIP_FEE",
    debit_amount: 0,
    credit_amount: 10000,
  },
  // 事務用品購入
  {
    id: "ff002222-2222-2222-1111-111111111111",
    journal_id: "dddd2222-2222-2222-2222-222222222222",
    account_code: "EXP_SUPPLIES",
    debit_amount: 5000,
    credit_amount: 0,
  },
  {
    id: "ff002222-2222-2222-2222-222222222222",
    journal_id: "dddd2222-2222-2222-2222-222222222222",
    account_code: "ASSET_CASH",
    debit_amount: 0,
    credit_amount: 5000,
  },
];

// ============================================
// シード関数
// ============================================

async function createTestUser(): Promise<boolean> {
  console.log("\n📝 テストユーザーを作成中...");

  const { data: existingUser } = await supabase.auth.admin.getUserById(
    TEST_USER_ID,
  );

  if (existingUser?.user) {
    console.log(`  ✓ テストユーザーは既に存在します: ${TEST_USER_EMAIL}`);
    return true;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    id: TEST_USER_ID,
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "テスト開発ユーザー",
      is_test_user: true,
    },
  });

  if (error) {
    console.error(`  ❌ テストユーザー作成失敗:`, error.message);
    return false;
  }

  console.log(`  ✓ テストユーザー作成完了: ${data.user?.email}`);
  return true;
}

async function seedOrganizations() {
  console.log("\n📝 政治団体データを投入中...");
  for (const org of testOrganizations) {
    const { error } = await supabase
      .from("political_organizations")
      .upsert(org, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${org.name}:`, error.message);
    } else {
      console.log(`  ✓ ${org.name}`);
    }
  }
}

async function seedElections() {
  console.log("\n📝 選挙データを投入中...");
  for (const election of testElections) {
    const { error } = await supabase
      .from("elections")
      .upsert(election, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${election.election_name}:`, error.message);
    } else {
      console.log(`  ✓ ${election.election_name}`);
    }
  }
}

async function seedLedgers() {
  console.log("\n📝 台帳データを投入中...");
  for (const ledger of testLedgers) {
    const { error } = await supabase
      .from("ledgers")
      .upsert(ledger, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${ledger.ledger_type} (${ledger.id}):`, error.message);
    } else {
      console.log(`  ✓ ${ledger.ledger_type} (${ledger.id.substring(0, 8)}...)`);
    }
  }
}

async function seedContacts() {
  console.log("\n📝 関係者データを投入中...");
  for (const contact of testContacts) {
    const { error } = await supabase
      .from("contacts")
      .upsert(contact, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${contact.name}:`, error.message);
    } else {
      console.log(`  ✓ ${contact.name}`);
    }
  }
}

async function seedLedgerContacts() {
  console.log("\n📝 台帳↔関係者 紐付けデータを投入中...");
  for (const lc of testLedgerContacts) {
    const { error } = await supabase
      .from("ledger_contacts")
      .upsert(lc, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${lc.id}:`, error.message);
    } else {
      console.log(`  ✓ ledger ${lc.ledger_id.substring(0, 8)}... → contact ${lc.contact_id.substring(0, 8)}...`);
    }
  }
}

async function seedJournals() {
  console.log("\n📝 仕訳データを投入中...");
  for (const journal of testJournals) {
    const { error } = await supabase
      .from("journals")
      .upsert(journal, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${journal.description}:`, error.message);
    } else {
      console.log(`  ✓ ${journal.description}`);
    }
  }
}

async function seedJournalEntries() {
  console.log("\n📝 仕訳明細データを投入中...");
  for (const entry of testJournalEntries) {
    const { error } = await supabase
      .from("journal_entries")
      .upsert(entry, { onConflict: "id" });
    if (error) {
      console.error(`  ❌ ${entry.account_code}:`, error.message);
    } else {
      console.log(
        `  ✓ ${entry.account_code} (${
          entry.debit_amount || entry.credit_amount
        }円)`,
      );
    }
  }
}

async function seedAll() {
  console.log("🌱 Ledger テストデータのシード開始...\n");
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

  // 1. テストユーザー作成
  const userCreated = await createTestUser();
  if (!userCreated) {
    console.error("\n❌ テストユーザー作成に失敗しました。処理を中断します。");
    Deno.exit(1);
  }

  // 2. マスターデータ
  await seedOrganizations();
  await seedElections();

  // 3. 台帳
  await seedLedgers();

  // 4. 関係者（台帳間で共有）
  await seedContacts();
  await seedLedgerContacts();

  // 5. トランザクションデータ
  await seedJournals();
  await seedJournalEntries();

  console.log("\n✅ シード完了！");
  console.log("\n📋 テストユーザー情報:");
  console.log(`   Email: ${TEST_USER_EMAIL}`);
  console.log(`   Password: ${TEST_USER_PASSWORD}`);
  console.log(`   User ID: ${TEST_USER_ID}`);
}

async function seedUserOnly() {
  console.log("🌱 テストユーザーのみ作成...\n");
  await createTestUser();
  console.log("\n✅ 完了！");
}

async function seedDataOnly() {
  console.log("🌱 ダミーデータのみ投入（テストユーザー既存前提）...\n");
  await seedOrganizations();
  await seedElections();
  await seedLedgers();
  await seedContacts();
  await seedLedgerContacts();
  await seedJournals();
  await seedJournalEntries();
  console.log("\n✅ 完了！");
}

// ============================================
// メイン処理
// ============================================

const args = Deno.args;
const option = args[0] || "--all";

switch (option) {
  case "--user":
    await seedUserOnly();
    break;
  case "--data":
    await seedDataOnly();
    break;
  case "--all":
  default:
    await seedAll();
    break;
}
