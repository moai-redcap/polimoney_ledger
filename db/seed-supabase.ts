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
 *   - 本番環境のダミーデータは USE_MOCK_MODE=true 時のみ表示されます
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

// テスト用ユーザー（開発用ダミーデータの所有者）
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_EMAIL = "test-dev@polimoney.local";
const TEST_USER_PASSWORD = "test-dev-password-12345";

// ============================================
// ダミーデータ: 政治家
// ============================================

const testPoliticians = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    name: "テスト 太郎",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    name: "テスト 花子",
  },
];

// ============================================
// ダミーデータ: 政治団体
// ============================================

const testOrganizations = [
  {
    id: "aaaa1111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    name: "テスト太郎後援会",
  },
  {
    id: "aaaa2222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    name: "テスト花子を応援する会",
  },
];

// ============================================
// ダミーデータ: 選挙
// ============================================

const testElections = [
  {
    id: "eeee1111-1111-1111-1111-111111111111",
    owner_user_id: TEST_USER_ID,
    politician_id: "11111111-1111-1111-1111-111111111111",
    election_name: "2024年 第50回衆議院議員総選挙（テスト）",
    election_date: "2024-10-27",
  },
  {
    id: "eeee2222-2222-2222-2222-222222222222",
    owner_user_id: TEST_USER_ID,
    politician_id: "22222222-2222-2222-2222-222222222222",
    election_name: "令和7年東京都知事選挙（テスト）",
    election_date: "2025-07-06",
  },
];

// ============================================
// ダミーデータ: 関係者（取引先）
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
// ダミーデータ: 仕訳
// ============================================

const testJournals = [
  // 選挙台帳: テスト太郎の選挙
  {
    id: "jjjj1111-1111-1111-1111-111111111111",
    organization_id: null,
    election_id: "eeee1111-1111-1111-1111-111111111111",
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
    id: "jjjj1111-2222-2222-2222-222222222222",
    organization_id: null,
    election_id: "eeee1111-1111-1111-1111-111111111111",
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
    id: "jjjj1111-3333-3333-3333-333333333333",
    organization_id: null,
    election_id: "eeee1111-1111-1111-1111-111111111111",
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
    id: "jjjj2222-1111-1111-1111-111111111111",
    organization_id: "aaaa1111-1111-1111-1111-111111111111",
    election_id: null,
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
    id: "jjjj2222-2222-2222-2222-222222222222",
    organization_id: "aaaa1111-1111-1111-1111-111111111111",
    election_id: null,
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
    id: "entry-1111-1111-1111-111111111111",
    journal_id: "jjjj1111-1111-1111-1111-111111111111",
    account_code: "EXP_PRINTING_ELEC",
    debit_amount: 150000,
    credit_amount: 0,
  },
  {
    id: "entry-1111-1111-1111-222222222222",
    journal_id: "jjjj1111-1111-1111-1111-111111111111",
    account_code: "ASSET_CASH",
    debit_amount: 0,
    credit_amount: 150000,
  },
  // 個人寄附（収入）
  {
    id: "entry-1111-2222-2222-111111111111",
    journal_id: "jjjj1111-2222-2222-2222-222222222222",
    account_code: "ASSET_CASH",
    debit_amount: 50000,
    credit_amount: 0,
  },
  {
    id: "entry-1111-2222-2222-222222222222",
    journal_id: "jjjj1111-2222-2222-2222-222222222222",
    account_code: "REV_DONATION_INDIVIDUAL",
    debit_amount: 0,
    credit_amount: 50000,
  },
  // 事務所借り上げ（支出）
  {
    id: "entry-1111-3333-3333-111111111111",
    journal_id: "jjjj1111-3333-3333-3333-333333333333",
    account_code: "EXP_BUILDING_ELEC",
    debit_amount: 80000,
    credit_amount: 0,
  },
  {
    id: "entry-1111-3333-3333-222222222222",
    journal_id: "jjjj1111-3333-3333-3333-333333333333",
    account_code: "ASSET_CASH",
    debit_amount: 0,
    credit_amount: 80000,
  },
  // 会費収入
  {
    id: "entry-2222-1111-1111-111111111111",
    journal_id: "jjjj2222-1111-1111-1111-111111111111",
    account_code: "ASSET_CASH",
    debit_amount: 10000,
    credit_amount: 0,
  },
  {
    id: "entry-2222-1111-1111-222222222222",
    journal_id: "jjjj2222-1111-1111-1111-111111111111",
    account_code: "REV_MEMBERSHIP_FEE",
    debit_amount: 0,
    credit_amount: 10000,
  },
  // 事務用品購入
  {
    id: "entry-2222-2222-2222-111111111111",
    journal_id: "jjjj2222-2222-2222-2222-222222222222",
    account_code: "EXP_SUPPLIES_POL",
    debit_amount: 5000,
    credit_amount: 0,
  },
  {
    id: "entry-2222-2222-2222-222222222222",
    journal_id: "jjjj2222-2222-2222-2222-222222222222",
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

  // 既存ユーザーをチェック
  const { data: existingUser } = await supabase.auth.admin.getUserById(
    TEST_USER_ID
  );

  if (existingUser?.user) {
    console.log(`  ✓ テストユーザーは既に存在します: ${TEST_USER_EMAIL}`);
    return true;
  }

  // 新規作成
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

async function seedPoliticians() {
  console.log("\n📝 政治家データを投入中...");
  for (const politician of testPoliticians) {
    const { error } = await supabase.from("politicians").upsert(politician, {
      onConflict: "id",
    });
    if (error) {
      console.error(`  ❌ ${politician.name}:`, error.message);
    } else {
      console.log(`  ✓ ${politician.name}`);
    }
  }
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
        }円)`
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
  await seedPoliticians();
  await seedOrganizations();
  await seedElections();
  await seedContacts();

  // 3. トランザクションデータ
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
  await seedPoliticians();
  await seedOrganizations();
  await seedElections();
  await seedContacts();
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
