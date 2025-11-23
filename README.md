# polimoney_ledger

Polimoney へインポート可能な json と、政治資金収支報告書もしくは選挙運動費用収支報告書をエクスポートできる会計ソフトを目指します。

## 内容が古い場合があります

最新の情報に更新したいと思っていますが、特に外部サービスの内容はアップデートにより古くなりがちです。

気付いた場合はぜひコントリビュートしてください！

コントリビュートガイド（作成中）

## セットアップ方法

開発する場合はこちら（作成中）をごらんください。以下はノンエンジニア向けのガイドです。

### Step1. Appwrite Cloud

このプロダクトはオープンソースとして簡単に（GUI で）セットアップできるよう Supabase いうサービスの使用を想定しています。

入力した収支等、Polimoney Ledger のデータは、基本的に Supabase に保存されます。

[Supabase の公式サイト](https://supabase.com/)より、Supabase に登録できます。

通常は無料プランで問題なくご使用いただけると思いますが、場合によっては有料となる場合があります。

**※有料となっても弊団体は一切責任を負えません。**

[参照: Supabase の料金プラン](https://supabase.com/pricing)

### Step 1: Supabase プロジェクトの作成

1.  [Supabase の公式サイト](https://supabase.com/)にアクセスし、アカウントを作成してログインします。
2.  「New Project」ボタンを押し、組織（Organization）を選択します。
3.  プロジェクト名（例: `polimoney-ledger`）を決め、データベースのパスワードを**安全な場所に**保存します。
4.  リージョン（サーバーの場所）を選択し、「Create new project」をクリックします。プロジェクトの準備が完了するまで数分待ちます。

### Step 2: 認証メールを「コード形式」に変更する (UI 操作)

ユーザー登録時に、確認用の 6 桁の数字コードがメールで送られるように、メールのテンプレートを修正します。

1.  プロジェクトのダッシュボードで、左側のメニューから**Authentication（南京錠のアイコン）**をクリックします。
2.  左側の認証設定メニューから「**Emails**」をクリックします。
3.  リストの中から「**Confirm sign up**」タブを見つけ、クリックしてエディタを開きます。
4.  **件名（Subject）**と**本文（Body）**を、以下のように書き換えてください。（コピー＆ペーストを推奨します）

- **件名 (Subject):**

  ```
  Polimoney Ledger: 本人確認を完了してください
  ```

- **本文 (Message):**
  ```html
  <h2>本人確認を完了してください</h2>
  <p>あなたの本人確認コードは次の通りです。</p>
  <h1>{{ .Token }}</h1>
  <p>このコードをアプリケーションの画面で入力してください。</p>
  ```

5.  右下の「**Save changes**」ボタンを押して保存します。

### Step 3: データベースを初期化する (SQL 実行)

アプリケーションが必要とするテーブルや関数を、以下の SQL で一度に作成します。

1.  プロジェクトのダッシュボードで、左側のメニューから**SQL Editor**をクリックします。
2.  「**+**」ボタンを押し**Create a new snippet**をクリックします。
3.  以下の`-- ここから下を全てコピー --`から`-- ここまで --`までの SQL コードを**全てコピー**し、画面右側のエディタ画面に**貼り付け**ます。
4.  緑色の「**RUN**」ボタンをクリックします。「Success. No rows returned」と表示されれば成功です。

```sql
-- ここから下を全てコピー --
-- このスクリプトは何度実行しても安全です --
-- 1. マスターアカウント譲渡の状態を管理するテーブル (存在しない場合のみ作成)
CREATE TABLE IF NOT EXISTS public.ownership_transfers (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
from_user_id UUID NOT NULL REFERENCES auth.users(id),
to_user_id UUID NOT NULL REFERENCES auth.users(id),
status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'declined')),
requested_at TIMESTAMTz DEFAULT NOW() NOT NULL,
updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 上記テーブルに対する行レベルセキュリティ(RLS)ポリシー (存在すれば上書き)
ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual read access" ON public.ownership_transfers;
CREATE POLICY "Allow individual read access" ON public.ownership_transfers FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "Allow individual update access" ON public.ownership_transfers;
CREATE POLICY "Allow individual update access" ON public.ownership_transfers FOR UPDATE USING (auth.uid() = to_user_id);

-- 3. ユーザーが一人も存在しないかを確認するための安全な関数 (存在すれば上書き)
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT count(*)::integer FROM auth.users;
$$;
-- ここまで --
```

### Step 4: アプリケーションの設定

最後に、作成した Supabase プロジェクトの情報をアプリケーションに設定します。

1.  **接続情報の取得:**

    - Supabase のダッシュボードで、左側のメニュー下部にある**設定（歯車アイコン）**をクリックし、「**API**」を選択します。
    - `Project URL` と `anon` `public` と書かれた**API Key** の 2 つの情報をコピーします。

2.  **アプリケーションの起動と設定:**

    - `polimoney_ledger`のアプリケーションを起動します。
    - 最初に表示される「Supabase 設定」画面で、先ほどコピーした`プロジェクトURL`と`Anonキー`をそれぞれ入力し、「保存して続行」ボタンを押します。

3.  **マスターアカウントの作成:**

# polimoney_ledger

Polimoney へインポート可能な json と、政治資金収支報告書もしくは選挙運動費用収支報告書をエクスポートできる会計ソフトを目指します。

## 内容が古い場合があります

最新の情報に更新したいと思っていますが、特に外部サービスの内容はアップデートにより古くなりがちです。

気付いた場合はぜひコントリビュートしてください！

コントリビュートガイド（作成中）

## セットアップ方法

開発する場合はこちら（作成中）をごらんください。以下はノンエンジニア向けのガイドです。

### Step1. Appwrite Cloud

このプロダクトはオープンソースとして簡単に（GUI で）セットアップできるよう Supabase いうサービスの使用を想定しています。

入力した収支等、Polimoney Ledger のデータは、基本的に Supabase に保存されます。

[Supabase の公式サイト](https://supabase.com/)より、Supabase に登録できます。

通常は無料プランで問題なくご使用いただけると思いますが、場合によっては有料となる場合があります。

**※有料となっても弊団体は一切責任を負えません。**

[参照: Supabase の料金プラン](https://supabase.com/pricing)

### Step 1: Supabase プロジェクトの作成

1.  [Supabase の公式サイト](https://supabase.com/)にアクセスし、アカウントを作成してログインします。
2.  「New Project」ボタンを押し、組織（Organization）を選択します。
3.  プロジェクト名（例: `polimoney-ledger`）を決め、データベースのパスワードを**安全な場所に**保存します。
4.  リージョン（サーバーの場所）を選択し、「Create new project」をクリックします。プロジェクトの準備が完了するまで数分待ちます。

### Step 2: 認証メールを「コード形式」に変更する (UI 操作)

ユーザー登録時に、確認用の 6 桁の数字コードがメールで送られるように、メールのテンプレートを修正します。

1.  プロジェクトのダッシュボードで、左側のメニューから**Authentication（南京錠のアイコン）**をクリックします。
2.  左側の認証設定メニューから「**Emails**」をクリックします。
3.  リストの中から「**Confirm sign up**」タブを見つけ、クリックしてエディタを開きます。
4.  **件名（Subject）**と**本文（Body）**を、以下のように書き換えてください。（コピー＆ペーストを推奨します）

- **件名 (Subject):**

  ```
  Polimoney Ledger: 本人確認を完了してください
  ```

- **本文 (Message):**
  ```html
  <h2>本人確認を完了してください</h2>
  <p>あなたの本人確認コードは次の通りです。</p>
  <h1>{{ .Token }}</h1>
  <p>このコードをアプリケーションの画面で入力してください。</p>
  ```

5.  右下の「**Save changes**」ボタンを押して保存します。

### Step 3: データベースを初期化する (SQL 実行)

アプリケーションが必要とするテーブルや関数を、以下の SQL で一度に作成します。

1.  プロジェクトのダッシュボードで、左側のメニューから**SQL Editor**をクリックします。
2.  「**+**」ボタンを押し**Create a new snippet**をクリックします。
3.  以下の`-- ここから下を全てコピー --`から`-- ここまで --`までの SQL コードを**全てコピー**し、画面右側のエディタ画面に**貼り付け**ます。
4.  緑色の「**RUN**」ボタンをクリックします。「Success. No rows returned」と表示されれば成功です。

```sql
-- ここから下を全てコピー --
-- このスクリプトは何度実行しても安全です --
-- 1. マスターアカウント譲渡の状態を管理するテーブル (存在しない場合のみ作成)
CREATE TABLE IF NOT EXISTS public.ownership_transfers (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
from_user_id UUID NOT NULL REFERENCES auth.users(id),
to_user_id UUID NOT NULL REFERENCES auth.users(id),
status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'declined')),
requested_at TIMESTAMTz DEFAULT NOW() NOT NULL,
updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 上記テーブルに対する行レベルセキュリティ(RLS)ポリシー (存在すれば上書き)
ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual read access" ON public.ownership_transfers;
CREATE POLICY "Allow individual read access" ON public.ownership_transfers FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "Allow individual update access" ON public.ownership_transfers;
CREATE POLICY "Allow individual update access" ON public.ownership_transfers FOR UPDATE USING (auth.uid() = to_user_id);

-- 3. ユーザーが一人も存在しないかを確認するための安全な関数 (存在すれば上書き)
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT count(*)::integer FROM auth.users;
$$;
-- ここまで --
```

### Step 4: アプリケーションの設定

最後に、作成した Supabase プロジェクトの情報をアプリケーションに設定します。

1.  **接続情報の取得:**

    - Supabase のダッシュボードで、左側のメニュー下部にある**設定（歯車アイコン）**をクリックし、「**API**」を選択します。
    - `Project URL` と `anon` `public` と書かれた**API Key** の 2 つの情報をコピーします。

2.  **アプリケーションの起動と設定:**

    - `polimoney_ledger`のアプリケーションを起動します。
    - 最初に表示される「Supabase 設定」画面で、先ほどコピーした`プロジェクトURL`と`Anonキー`をそれぞれ入力し、「保存して続行」ボタンを押します。

3.  **マスターアカウントの作成:**
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
