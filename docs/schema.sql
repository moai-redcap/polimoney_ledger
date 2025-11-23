-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2.10. Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  updated_at timestamptz
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
  contact_id uuid references contacts(id) not null,
  classification text, -- 'pre-campaign' or 'campaign'
  non_monetary_basis text,
  notes text,
  amount_political_grant integer default 0,
  amount_political_fund integer default 0,
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

-- 2.8. Media Assets
create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  journal_id uuid references journals(id),
  uploaded_by_user_id uuid references auth.users(id),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz default now()
);

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

-- Row Level Security (RLS) Policies

alter table political_organizations enable row level security;
alter table politicians enable row level security;
alter table elections enable row level security;
alter table contacts enable row level security;
alter table journals enable row level security;
alter table journal_entries enable row level security;
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
