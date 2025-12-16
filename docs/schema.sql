-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2.10. Profiles（Auth 補助情報）
-- ※ full_name, email は Supabase Auth の user_metadata を使用
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  avatar_url text,
  updated_at timestamptz default now()
);

-- 2.4. Political Organizations
create table if not exists political_organizations (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamptz default now()
);

-- 2.5. Politicians
create table if not exists politicians (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamptz default now()
);

-- 2.6. Elections
create table if not exists elections (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  politician_id uuid references politicians(id) not null,
  election_name text not null,
  election_date date not null,
  created_at timestamptz default now()
);

-- 2.1. Sub Accounts
create table if not exists sub_accounts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  ledger_type text not null, -- 'political_organization' or 'election'
  parent_account_code text not null,
  name text not null,
  created_at timestamptz default now()
);

-- 2.7. Contacts
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  contact_type text not null, -- 'person' or 'corporation'
  name text not null,
  address text,
  occupation text,
  is_name_private boolean not null default false,
  is_address_private boolean not null default false,
  is_occupation_private boolean not null default false,
  privacy_reason_type text, -- 'personal_info' or 'other'
  privacy_reason_other text,
  created_at timestamptz default now()
);

-- 2.2. Journals
create table if not exists journals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  journal_date date not null,
  description text not null,
  status text not null, -- 'draft' or 'approved'
  submitted_by_user_id uuid references auth.users(id) not null,
  approved_by_user_id uuid references auth.users(id),
  contact_id uuid references contacts(id), -- NULL許容: 振替の場合は関係者不要
  classification text, -- 'pre-campaign' or 'campaign'
  non_monetary_basis text,
  notes text,
  amount_political_grant integer default 0,
  amount_political_fund integer default 0,
  amount_public_subsidy integer default 0, -- v3.11: 公費負担額
  is_receipt_hard_to_collect boolean not null default false,
  receipt_hard_to_collect_reason text,
  created_at timestamptz default now()
);

-- 2.3. Journal Entries
create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  journal_id uuid references journals(id) on delete cascade not null,
  account_code text not null,
  sub_account_id uuid references sub_accounts(id),
  debit_amount integer not null default 0,
  credit_amount integer not null default 0
);

-- 2.8. Media Assets（領収証・証憑添付）
create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  journal_id uuid references journals(id) on delete cascade,
  uploaded_by_user_id uuid references auth.users(id),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer,
  created_at timestamptz default now()
);

create index if not exists idx_media_assets_journal on media_assets(journal_id);
create index if not exists idx_media_assets_user on media_assets(uploaded_by_user_id);

-- 2.9. Ledger Members
create table if not exists ledger_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  role text not null, -- 'admin', 'approver', 'submitter', 'viewer'
  invited_by_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 9. Ownership Transfers (from README.md)
create table if not exists ownership_transfers (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid references auth.users(id) not null,
  to_user_id uuid references auth.users(id) not null,
  status text not null check (status in ('pending', 'completed', 'declined')),
  requested_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 10. Transaction Drafts (取引下書き) v3.14
-- Freee等のクラウド会計ソフトや銀行明細から取り込んだ取引データ
-- ユーザーが確認・科目割当後に仕訳(journals)に変換
-- ※ 未実装: 外部連携機能実装時に DB 作成予定
create table if not exists transaction_drafts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  
  -- 取引データ（外部ソースから取得）
  transaction_date date not null,
  amount integer not null,                -- 金額（正: 入金、負: 出金）
  description text,                       -- 摘要（Freee等から取得）
  counterparty text,                      -- 取引先名
  
  -- ソース情報
  source_type text not null,              -- 'freee', 'moneytree', 'csv', 'manual'
  source_account_name text,               -- '三菱UFJ銀行 普通預金'
  source_transaction_id text,             -- 外部サービスの取引ID（重複防止）
  source_raw_data jsonb,                  -- 元データ全体（デバッグ用）
  
  -- 仕訳変換用（ユーザーが設定 or AI推奨）
  suggested_account_code text,            -- 推奨科目コード
  suggested_contact_id uuid references contacts(id),
  
  -- ステータス
  status text not null default 'pending'
    check (status in ('pending', 'converted', 'ignored')),
  converted_journal_id uuid references journals(id),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- 重複防止
  unique (owner_user_id, source_type, source_transaction_id)
);

create index if not exists idx_drafts_owner on transaction_drafts(owner_user_id);
create index if not exists idx_drafts_status on transaction_drafts(status);
create index if not exists idx_drafts_date on transaction_drafts(transaction_date);

-- RLS for transaction_drafts
alter table transaction_drafts enable row level security;

drop policy if exists "Users can CRUD their own drafts" on transaction_drafts;
create policy "Users can CRUD their own drafts" on transaction_drafts
  for all using (auth.uid() = owner_user_id);

-- ============================================
-- 11. 年度締めステータス（政治団体台帳用）
-- ============================================
-- 政治団体の台帳は年度ごとに締め処理を行う
-- 選挙台帳は選挙終了後に一括で締めるため、このテーブルは使用しない
create table if not exists ledger_year_closures (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references political_organizations(id) on delete cascade,
  fiscal_year integer not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'locked', 'temporary_unlock')),
  -- open: 編集可能
  -- closed: 締め済み（読み取り専用、1年後に自動ロック）
  -- locked: ロック済み（画像は Hub に移行、テキストは Ledger に残る）
  -- temporary_unlock: 一時解除中（7日後に自動再ロック）
  closed_at timestamptz,              -- 年度締め日時
  locked_at timestamptz,              -- ロック日時
  storage_migrated_at timestamptz,    -- 画像移行完了日時
  temporary_unlock_at timestamptz,    -- 一時解除開始日時
  temporary_unlock_expires_at timestamptz, -- 一時解除期限
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, fiscal_year)
);

create index if not exists idx_year_closures_org on ledger_year_closures(organization_id);
create index if not exists idx_year_closures_status on ledger_year_closures(status);
create index if not exists idx_year_closures_fiscal_year on ledger_year_closures(fiscal_year);

-- RLS for ledger_year_closures
alter table ledger_year_closures enable row level security;

-- ユーザーは自分が所有する政治団体の年度締めステータスのみ操作可能
drop policy if exists "Users can manage closures for their organizations" on ledger_year_closures;
create policy "Users can manage closures for their organizations" on ledger_year_closures
  for all using (
    organization_id in (
      select id from political_organizations where owner_user_id = auth.uid()
    )
  );

-- Row Level Security (RLS) Policies

alter table profiles enable row level security;
alter table political_organizations enable row level security;
alter table politicians enable row level security;
alter table elections enable row level security;
alter table sub_accounts enable row level security;
alter table contacts enable row level security;
alter table journals enable row level security;
alter table journal_entries enable row level security;
alter table media_assets enable row level security;
alter table ledger_members enable row level security;
alter table ownership_transfers enable row level security;

-- Basic Policies (Idempotent)

drop policy if exists "Users can CRUD their own organizations" on political_organizations;
create policy "Users can CRUD their own organizations" on political_organizations
  for all using (auth.uid() = owner_user_id);

drop policy if exists "Users can CRUD their own politicians" on politicians;
create policy "Users can CRUD their own politicians" on politicians
  for all using (auth.uid() = owner_user_id);

drop policy if exists "Users can CRUD their own elections" on elections
  for all using (auth.uid() = owner_user_id);

drop policy if exists "Users can CRUD their own contacts" on contacts
  for all using (auth.uid() = owner_user_id);

drop policy if exists "Allow individual read access" on ownership_transfers;
create policy "Allow individual read access" on ownership_transfers
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Allow individual update access" on ownership_transfers;
create policy "Allow individual update access" on ownership_transfers
  for update using (auth.uid() = to_user_id);

-- Profiles policies
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Sub Accounts policies
drop policy if exists "Users can CRUD their own sub_accounts" on sub_accounts;
create policy "Users can CRUD their own sub_accounts" on sub_accounts
  for all using (auth.uid() = owner_user_id);

-- Media Assets policies
drop policy if exists "Users can manage their media assets" on media_assets;
create policy "Users can manage their media assets" on media_assets
  for all using (
    auth.uid() = uploaded_by_user_id
    or journal_id in (
      select j.id from journals j
      where j.submitted_by_user_id = auth.uid()
    )
  );
