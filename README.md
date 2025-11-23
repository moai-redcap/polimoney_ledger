# polimoney_ledger

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

1. [Supabase の公式サイト](https://supabase.com/)にアクセスし、アカウントを作成してログインします。
2. 「New Project」ボタンを押し、組織（Organization）を選択します。
3. プロジェクト名（例: `polimoney-ledger`）を決め、データベースのパスワードを**安全な場所に**保存します。
4. リージョン（サーバーの場所）を選択し、「Create new project」をクリックします。プロジェクトの準備が完了するまで数分待ちます。

### Step 2: 認証メールを「コード形式」に変更する (UI 操作)

ユーザー登録時に、確認用の 6 桁の数字コードがメールで送られるように、メールのテンプレートを修正します。

1. プロジェクトのダッシュボードで、左側のメニューから**Authentication（南京錠のアイコン）**をクリックします。
2. 左側の認証設定メニューから「**Emails**」をクリックします。
3. リストの中から「**Confirm sign up**」タブを見つけ、クリックしてエディタを開きます。
4. **件名（Subject）**と**本文（Body）**を、以下のように書き換えてください。（コピー＆ペーストを推奨します）

   - **件名 (Subject):**

     ```text
     Polimoney Ledger: 本人確認を完了してください
     ```

   - **本文 (Message):**

     ```html
     <h2>本人確認を完了してください</h2>
     <p>あなたの本人確認コードは次の通りです。</p>
     <h1>{{ .Token }}</h1>
     <p>このコードをアプリケーションの画面で入力してください。</p>
     ```

5. 右下の「**Save changes**」ボタンを押して保存します。

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

-- 1. 補助科目マスタ (ユーザー定義)
-- ※勘定科目(Master Accounts)はアプリ側で静的に定義されるため、DBには補助科目のみ保存します。
create table if not exists sub_accounts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  ledger_type text not null, -- 'political_organization' or 'election'
  parent_account_code text not null, -- アプリ側のMaster Accountコード (例: 'EXP_UTILITIES')
  name text not null, -- 補助科目名 (例: '電気代')
  created_at timestamptz default now()
);

-- 2. 政治団体テーブル
create table if not exists political_organizations (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamptz default now()
);

-- 3. 政治家テーブル
create table if not exists politicians (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamptz default now()
);

-- 4. 選挙テーブル
create table if not exists elections (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  politician_id uuid references politicians(id) not null,
  election_name text not null,
  election_date date not null,
  created_at timestamptz default now()
);

-- 5. 関係者テーブル
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id) not null,
  contact_type text not null, -- 'person' (個人) または 'corporation' (法人/団体)
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

-- 6. 仕訳ヘッダテーブル
create table if not exists journals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  journal_date date not null,
  description text not null,
  status text not null, -- 'draft' (承認待ち), 'approved' (承認済み)
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

-- 7. 仕訳明細テーブル
create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  journal_id uuid references journals(id) on delete cascade not null,
  account_code text not null, -- アプリ側のMaster Accountコード
  sub_account_id uuid references sub_accounts(id), -- 補助科目ID (任意)
  debit_amount integer default 0,
  credit_amount integer default 0
);

-- 8. 台帳メンバーテーブル
create table if not exists ledger_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  organization_id uuid references political_organizations(id),
  election_id uuid references elections(id),
  role text not null,
  invited_by_user_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- 行レベルセキュリティ(RLS)の有効化
alter table political_organizations enable row level security;
alter table politicians enable row level security;
alter table elections enable row level security;
alter table contacts enable row level security;
alter table journals enable row level security;
alter table journal_entries enable row level security;
alter table ledger_members enable row level security;

-- 基本的なRLSポリシー (自分のデータは読み書き可能)
-- ※既存のポリシーがある場合はエラーになる可能性があるため、drop policy if exists を使用することを推奨しますが、
-- ここでは簡略化のため create policy のみ記述します。エラーが出た場合は無視してください。

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

-- 9. マスターアカウント譲渡管理テーブル
create table if not exists ownership_transfers (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid references auth.users(id) not null,
  to_user_id uuid references auth.users(id) not null,
  status text not null check (status in ('pending', 'completed', 'declined')),
  requested_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 10. ユーザー数取得関数 (マスターアカウント作成判定用)
create or replace function get_user_count()
returns integer
language sql
security definer
as $$
  select count(*)::integer from auth.users;
$$;

-- ownership_transfers のポリシー
alter table ownership_transfers enable row level security;

drop policy if exists "Allow individual read access" on ownership_transfers;
create policy "Allow individual read access" on ownership_transfers
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Allow individual update access" on ownership_transfers;
create policy "Allow individual update access" on ownership_transfers
  for update using (auth.uid() = to_user_id);

-- ここまで --
```

### Step 4: アプリケーションの設定

最後に、作成した Supabase プロジェクトの情報をアプリケーションに設定します。

1. **接続情報の取得:**

   - Supabase のダッシュボードで、左側のメニュー下部にある**設定（歯車アイコン）**をクリックし、「**API**」を選択します。
   - `Project URL` と `anon` `public` と書かれた**API Key** の 2 つの情報をコピーします。

2. **アプリケーションの起動と設定:**

   - `polimoney_ledger`のアプリケーションを起動します。
   - 最初に表示される「Supabase 設定」画面で、先ほどコピーした`プロジェクトURL`と`Anonキー`をそれぞれ入力し、「保存して続行」ボタンを押します。

3. **マスターアカウントの作成:**
   - マスターアカウントの作成画面が表示されます。画面の指示に従って、マスターアカウントを作成してください。

---

## 開発者向け情報

このプロジェクトは Flutter で開発されています。

## Development Setup

### Prerequisites

- Flutter SDK
- VS Code (Recommended)

### VS Code Setup

1. Open this folder in VS Code.
2. When prompted, install the recommended extensions (Flutter, Dart, etc.).
3. Press `F5` to start debugging (select "polimoney_ledger (Windows)").

## Getting Started

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)
