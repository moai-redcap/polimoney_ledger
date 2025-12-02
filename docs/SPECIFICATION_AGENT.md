# **Polimoney Ledger - 機能仕様書 (v3.10 更新案)**

## **1. 機能概要 (Feature Overview)**

この機能は、政治団体や候補者の会計担当者を対象としています。
会計担当者が、自身が管理する**「政治団体」または「政治家（候補者）」を登録し、それぞれに紐づく「選挙」**の台帳を作成します。

**【v3.10 更新】**
本アプリケーションは、日本の政治資金規正法に基づき、**毎年1月1日から12月31日**を一つの会計年度として扱います。ユーザーは年度を切り替えて、各年の収支を確認できます。

### **1.1. 繰越処理の方針**
現バージョンでは、年度の締め処理と繰越は、ユーザーによる**手動入力**で行います。
新しい年度の開始時（1月1日付）に、ユーザーが「前期繰越」という特別な勘定科目を使い、前期末の資産・負債残高を期首残高として入力することを想定しています。

v3.0 より、複式簿記モデルを導入します。
v3.5 より、台帳タイプ（政治団体 / 選挙運動）に応じて、使用する勘定科目が自動で切り替わります。
v3.6 より、**勘定科目マスタ（accounts）は、アプリ側で定義された共通マスタのみ**を使用します。「みずほ銀行」や「〇〇信用金庫」といった特定の銀行口座や借入先は、「**関係者マスタ（contacts）**」に登録し、仕訳の際に紐付ける方式（会計ソフトの標準方式）に変更します。
v3.8 では、選挙運動費用の公費負担対応と、支払元の複数行入力（複合仕訳）対応を行いました。

役割（ロール）と権限の関係は、Flutter アプリ側で静的に定義されます。
アカウント発行と認証は、ディープリンクが不要な「OTP（ワンタイムパスコード）」方式を採用します。
関係者（contacts）のプライバシー設定（匿名化・非公開理由の明記）に対応します。

## **2. データモデル (Data Model)**

### **2.1. 勘定科目マスタ (【v3.9 更新】)**

**方針変更:**
勘定科目（Master Accounts）は、Supabase のテーブルではなく、**アプリケーション内の定数（コード）として静的に定義**します。
ユーザーが任意に追加できるのは、各勘定科目に紐づく「**補助科目 (Sub Accounts)**」のみとし、これを Supabase に保存します。

**テーブル名:** sub_accounts (旧 accounts テーブルを廃止・代替)
| 列名 (Column Name)  | データ型 (Data Type) | 説明 (Description)         | 備考 (Notes)                                                             |
| :------------------ | :------------------- | :------------------------- | :----------------------------------------------------------------------- |
| id                  | uuid                 | 一意な ID (補助科目 ID)    | 主キー, uuid_generate_v4()                                               |
| owner_user_id       | uuid                 | 台帳のオーナーユーザー ID  | auth.users.id への参照 (RLS 用)                                          |
| ledger_type         | text                 | **台帳タイプ**             | **political_organization** (政治団体) or **election** (選挙運動)。必須   |
| parent_account_code | text                 | **親となる勘定科目コード** | アプリ側で定義された Master Account のコード (例: 'EXP_UTILITIES')。必須 |
| name                | text                 | **補助科目名**             | 必須。例: 「電気代」「水道代」                                           |
| created_at          | timestamptz          | レコード作成日時           | デフォルトで now()                                                       |

#### **2.1.1. 静的勘定科目マスタ（アプリ内定義）**

`lib/core/constants/account_master.dart` 等で定義します。

**共通プロパティ:**

- `code`: 一意な識別子 (例: 'ASSET_CASH', 'EXP_PERSONNEL')
- `name`: 表示名 (例: '現金', '人件費')
- `type`: 勘定タイプ (asset, liability, equity, revenue, expense)
- `reportCategory`: 報告書上の分類 (例: '経常経費', '政治活動費')

##### **(例)**

- `EXP_UTILITIES`: { name: '光熱水費', type: expense, category: '経常経費' }
- `EQUITY_CARRYOVER`: { name: '前期繰越', type: equity, category: '資産等' }

## **3. 画面仕様 (Screen Specifications)**

### **3.3. 仕訳一覧画面 (JournalListScreen) (【v3.10 大幅更新】)**

- **ファイル (推奨):** `lib/features/journal/presentation/pages/journal_list_page.dart`
- **前提:**
  - `ledgerId`（`organization_id` または `election_id`）
  - `ledgerType`（文字列）
  - `myRole`（文字列）
  - `ledgerName`（文字列） を受け取る。
- **ロジック (State):**
  - この画面は `StatefulWidget` として実装する。
  - **`_currentYear` (int):** 現在表示している会計年度を保持する状態変数。初期値は現在の暦年 (`DateTime.now().year`)。
  - **権限フラグ:** `initState`で、`myRole`に基づき各種権限（`canManageMembers`など）をbool変数として保持する。
- **レイアウト:**
  - **AppBar:**
    - `title`: `Text(widget.ledgerName)`
    - `actions`:
      - **年度選択ドロップダウン:**
        - `DropdownButton<int>` を配置。
        - 選択肢: この台帳に存在する仕訳の`journal_date`から、重複を除いた「年」のリストを降順で表示する。（例: `[2024, 2023]`）
        - `onChanged`: 新しい年が選択されたら、`setState`を呼び出して `_currentYear` を更新し、データ再取得をトリガーする。
      - `IconButton` (関係者マスタ) ※権限に応じて表示
      - `IconButton` (台帳設定) ※権限に応じて表示
  - **body:**
    - `Column` を配置。
    - **繰越残高表示エリア:**
      - `ListView` の上に `Card` や `ListTile` を使って、「**前期繰越: ¥〇〇,〇〇〇**」を表示する。
      - この金額は、`(_currentYear - 1)`年度の期末残高（全ての資産 - 負債 - 純資産）を計算して表示する。（この計算は`JournalRepository`に新しいメソッドとして実装することを推奨）
    - **仕訳リスト:**
      - `StreamBuilder` または `FutureBuilder` を使用。
      - **データ取得:** `journals` テーブルから、`ledger_id`が一致し、かつ`journal_date`が `_currentYear` の **1月1日から12月31日まで**のレコードを、日付の降順で取得する。
      - `ListView.builder`:
        - `ListTile`:
          - `title`: `Text(journal.description)` (摘要)
          - `subtitle`: （勘定科目名を表示）
          - `leading`: （承認ステータスアイコン）
          - `trailing`: （金額）
- **機能:**
  - **ListTile タップ:** `status` と権限に応じて「仕訳承認画面」をモーダル表示する。
  - **FloatingActionButton:** 権限に応じて表示。タップすると「仕訳登録画面」に遷移。
  - `_navigateToContacts`
  - `_navigateToSettings`
