# polimoney_ledger (AGENT PROPOSAL - DB Centric Accounts)

Polimoney へインポート可能な json と、政治資金収支報告書もしくは選挙運動費用収支報告書をエクスポートできる会計ソフトを目指します。

## 内容が古い場合があります

最新の情報に更新したいと思っていますが、特に外部サービスの内容はアップデートにより古くなりがちです。

気付いた場合はぜひコントリビュートしてください！

[コントリビュートガイド](./CONTRIBUTING.md)

## セットアップ方法

開発する場合はこちら（作成中）をごらんください。以下はノンエンジニア向けのガイドです。

### 準備

このプロダクトはオープンソースとして簡単に（GUI で）セットアップできるよう Supabase というサービスの使用を想定しています。

入力した収支等、Polimoney Ledger のデータは、基本的に Supabase に保存されます。

[Supabase の公式サイト](https://supabase.com/)より、Supabase に登録できます。

通常は無料プランで問題なくご使用いただけると思いますが、場合によっては有料となる場合があります。

**※有料となっても弊団体は一切責任を負えません。**

[参照: Supabase の料金プラン](https://supabase.com/pricing)

### Step 1: Supabase プロジェクトの作成
(内容は変更なし)

### Step 2: 認証メールを「コード形式」に変更する (UI 操作)
(内容は変更なし)

### Step 3: データベースを初期化する (SQL 実行)

アプリケーションが必要とするテーブルや関数を、以下の SQL で一度に作成します。

1. プロジェクトのダッシュボードで、左側のメニューから**SQL Editor**をクリックします。
2. 「**+**」ボタンを押し**Create a new snippet**をクリックします。
3. 以下の`-- ここから下を全てコピー --`から`-- ここまで --`までの SQL コードを**全てコピー**し、画面右側のエディタ画面に**貼り付け**ます。
4. 緑色の「**RUN**」ボタンをクリックします。「Success. No rows returned」と表示されれば成功です。

```sql
-- ここから下を全てコピー --
-- このスクリプトは何度実行しても安全です --

-- UUID拡張機能を有効化
create extension if not exists "uuid-ossp";

-- 1. テーブル作成
create table if not exists sub_accounts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  ledger_type text not null,
  parent_account_code text not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists political_organizations (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists politicians (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists elections (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  politician_id uuid references politicians(id) not null,
  election_name text not null,
  election_date date not null,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  contact_type text not null,
  name text not null,
  address text,
  occupation text,
  is_name_private boolean default false,
  is_address_private boolean default false,
  is_occupation_private boolean default false,
  privacy_reason_type text,
  privacy_reason_other text,
  created_at timestamptz default now()
);

create table if not exists journals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  journal_date date not null,
  description text not null,
  status text not null,
  submitted_by_user_id uuid references auth.users(id) not null,
  approved_by_user_id uuid references auth.users(id),
  contact_id uuid references contacts(id) not null,
  classification text,
  non_monetary_basis text,
  notes text,
  amount_political_grant integer default 0,
  amount_political_fund integer default 0,
  is_receipt_hard_to_collect boolean default false,
  receipt_hard_to_collect_reason text,
  created_at timestamptz default now()
);

create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  journal_id uuid references journals(id) on delete cascade not null,
  account_code text not null,
  sub_account_id uuid references sub_accounts(id),
  debit_amount integer default 0,
  credit_amount integer default 0
);

create table if not exists ledger_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  role text not null,
  invited_by_user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table if not exists ownership_transfers (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid references auth.users(id) not null,
  to_user_id uuid references auth.users(id) not null,
  status text not null check (status in ('pending', 'completed', 'declined')),
  requested_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ★★★ 新規追加 ★★★
-- 2. 勘定科目マスターテーブルの作成
create table if not exists account_master (
  code text primary key,
  name text not null,
  type text not null, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  report_category text not null,
  available_ledger_types text[] not null -- array of 'political_organization', 'election'
);

-- ★★★ 新規追加 ★★★
-- 3. 勘定科目マスターへの初期データ投入
-- (何度実行しても安全なように ON CONFLICT DO NOTHING を使用)
INSERT INTO public.account_master (code, name, type, report_category, available_ledger_types) VALUES
('ASSET_CASH', '現金', 'asset', '資産', '{"political_organization", "election"}'),
('ASSET_BANK', '普通預金', 'asset', '資産', '{"political_organization", "election"}'),
('ASSET_PREPAID', '前払金', 'asset', '資産', '{"political_organization", "election"}'),
('LIAB_LOAN', '借入金', 'liability', '負債', '{"political_organization", "election"}'),
('LIAB_ACCOUNTS_PAYABLE', '未払金', 'liability', '負債', '{"political_organization", "election"}'),
('EQUITY_CAPITAL', '元入金', 'equity', '純資産', '{"political_organization", "election"}'),
('EQUITY_CARRYOVER', '前期繰越', 'equity', '純資産', '{"political_organization", "election"}'),
('REV_DONATION_INDIVIDUAL', '個人からの寄付', 'revenue', '寄付', '{"political_organization", "election"}'),
('REV_DONATION_CORPORATE', '法人その他の団体からの寄付', 'revenue', '寄付', '{"political_organization"}'),
('REV_GRANT', '交付金', 'revenue', '交付金', '{"political_organization"}'),
('REV_SELF_FINANCING', '自己資金', 'revenue', 'その他収入', '{"election"}'),
('REV_MISC', '雑収入', 'revenue', 'その他収入', '{"political_organization", "election"}'),
('EXP_PERSONNEL_PO', '人件費', 'expense', '経常経費', '{"political_organization"}'),
('EXP_OFFICE_PO', '事務所費', 'expense', '経常経費', '{"political_organization"}'),
('EXP_UTILITIES_PO', '光熱水費', 'expense', '経常経費', '{"political_organization"}'),
('EXP_PERSONNEL_ELEC', '人件費', 'expense', '選挙運動費用', '{"election"}'),
('EXP_OFFICE_ELEC', '事務所費', 'expense', '選挙運動費用', '{"election"}'),
('EXP_TRANSPORT_ELEC', '交通費', 'expense', '選挙運動費用', '{"election"}'),
('EXP_SUPPLIES', '備品・消耗品費', 'expense', '経常経費', '{"political_organization", "election"}'),
('EXP_MISC', '雑費', 'expense', '経常経費', '{"political_organization", "election"}')
ON CONFLICT (code) DO NOTHING;

-- 4. パフォーマンス向上のためのインデックス作成 (変更なし)
CREATE INDEX IF NOT EXISTS idx_journals_organization_id ON public.journals (organization_id);
CREATE INDEX IF NOT EXISTS idx_journals_election_id ON public.journals (election_id);
CREATE INDEX IF NOT EXISTS idx_journals_journal_date ON public.journals (journal_date);

-- 5. 行レベルセキュリティ(RLS)の有効化 (account_master を追加)
alter table account_master enable row level security;
-- ... (他のテーブルのRLS有効化は変更なし) ...

-- 6. RLSポリシー (account_master を追加)
-- account_masterは公開情報なので、認証済みユーザーなら誰でも読み取り可能
drop policy if exists "Allow read access to all authenticated users" on account_master;
create policy "Allow read access to all authenticated users" on account_master for select using (auth.role() = 'authenticated');
-- ... (他のテーブルのRLSポリシーは変更なし) ...

-- 7. データベース関数の作成
-- ... (既存の関数は変更なし) ...
-- ★★★ 新規追加 ★★★
-- 前期繰越残高を計算する関数
CREATE OR REPLACE FUNCTION calculate_carry_over(p_ledger_id UUID, p_ledger_type TEXT, p_target_year INT)
RETURNS integer AS $$
DECLARE
    total integer;
BEGIN
    SELECT COALESCE(SUM(
        CASE
            WHEN am.type = 'asset' THEN (je.debit_amount - je.credit_amount)
            WHEN am.type = 'liability' THEN -(je.debit_amount - je.credit_amount)
            ELSE 0
        END
    ), 0)::integer
    INTO total
    FROM public.journals j
    JOIN public.journal_entries je ON j.id = je.journal_id
    JOIN public.account_master am ON je.account_code = am.code
    WHERE
        (CASE
            WHEN p_ledger_type = 'political_organization' THEN j.organization_id = p_ledger_id
            ELSE j.election_id = p_ledger_id
        END)
        AND j.journal_date < make_date(p_target_year, 1, 1);

    RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ここまで --
```
... (以降のセクションは変更なし) ...
