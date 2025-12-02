# **Polimoney Ledger - 機能仕様書 (v3.10)**

## **1. 機能概要 (Feature Overview)**

この機能は、政治団体や候補者の会計担当者を対象としています。  
会計担当者が、自身が管理する**「政治団体」または「政治家（候補者）」を登録し、それぞれに紐づく「選挙」**の台帳を作成します。  
年度の締め処理と繰越は、ユーザーによる**手動入力**で行います。  
新しい年度の開始時（1月1日付）に、ユーザーが「前期繰越」という特別な勘定科目を使い、前期末の資産・負債残高を期首残高として手動登録することを想定しています。  
その際、前期末の資産・負債残高を期首残高をサジェストする様にします。

役割（ロール）と権限の関係は、Flutter アプリ側で静的に定義されます。  
アカウント発行と認証は、ディープリンクが不要な「OTP（ワンタイムパスコード）」方式を採用します。  
関係者（contacts）のプライバシー設定（匿名化・非公開理由の明記）に対応します。

### 更新履歴概要
v3.0 より、複式簿記モデルを導入します。  
v3.5 より、台帳タイプ（政治団体 / 選挙運動）に応じて、使用する勘定科目が自動で切り替わります。  
（例：「選挙」台帳では「人件費」「自己資金」、「政治団体」台帳では「経常経費」「政治活動費」が選択肢となります）  
v3.6 より、**勘定科目マスタ（accounts）は、アプリ側で定義された共通マスタのみ**を使用します。「みずほ銀行」や「〇〇信用金庫」といった特定の銀行口座や借入先は、「**関係者マスタ（contacts）**」に登録し、仕訳の際に紐付ける方式（会計ソフトの標準方式）に変更します。

v3.7 では、テーブル定義の明確化と、仕様書のフォーマット修正を行いました。
v3.8 では、選挙運動費用の公費負担対応と、支払元の複数行入力（複合仕訳）対応を行いました。

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

##### **(例: 政治団体用)**

- `EXP_UTILITIES`: { name: '光熱水費', type: expense, category: '経常経費' }
  - ユーザーはこれに対して「電気代」「ガス代」などの `sub_accounts` を作成可能。
- EQUITY_CARRYOVER: { name: '前期繰越', type: equity, category: '資産等' }

### **2.2. 仕訳ヘッダ (【v3.4 更新】)**

v2.10 の transactions テーブルの「メタデータ」部分を引き継ぎ、contact_id を必須に変更。

**テーブル名:** journals

| 列名 (Column Name)             | データ型 (Data Type) | 説明 (Description)   | 備考 (Notes)                                                                                                                                         |
| :----------------------------- | :------------------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                             | uuid                 | 一意な ID (仕訳 ID)  | 主キー, uuid_generate_v4()                                                                                                                           |
| organization_id                | uuid                 | 紐づく政治団体の ID  | NULL 許容, political_organizations.id への FK                                                                                                        |
| election_id                    | uuid                 | 紐づく選挙台帳の ID  | NULL 許容, elections.id への FK                                                                                                                      |
| journal_date                   | date                 | 仕訳日（取引日）     | 必須                                                                                                                                                 |
| description                    | text                 | 摘要（取引内容）     | 必須。例: 「事務所家賃 5 月分」                                                                                                                      |
| status                         | text                 | 承認ステータス       | draft (起票/承認前), approved (承認済)。必須                                                                                                         |
| submitted_by_user_id           | uuid                 | 起票したユーザー ID  | auth.users.id への参照。必須                                                                                                                         |
| approved_by_user_id            | uuid                 | 承認したユーザー ID  | status='approved'の場合必須                                                                                                                          |
| contact_id                     | uuid                 | **紐づく関係者 ID**  | **必須**, contacts.id への FK。 （「自己資金」仕訳の場合、contacts マスタの「自分」を選択） （「みずほ銀行」からの借入の場合、「みずほ銀行」を選択） |
| classification                 | text                 | 選挙運動の活動区分   | pre-campaign (立候補準備), campaign (選挙運動)。election_id が設定されている場合のみ使用                                                             |
| non_monetary_basis             | text                 | 金銭以外の見積の根拠 | NULL 許容。                                                                                                                                          |
| notes                          | text                 | 備考                 | 任意入力。NULL 許容                                                                                                                                  |
| amount_political_grant         | integer              | 政党交付金充当額     | NULL 許容, デフォルト 0                                                                                                                              |
| amount_political_fund          | integer              | 政党基金充当額       | NULL 許容, デフォルト 0                                                                                                                              |
| is_receipt_hard_to_collect     | boolean              | 領収証徴収困難フラグ | 必須, デフォルト false                                                                                                                               |
| receipt_hard_to_collect_reason | text                 | 領収証徴収困難理由   | NULL 許容。                                                                                                                                          |
| created_at                     | timestamptz          | レコード作成日時     | now()                                                                                                                                                |

### **2.3. 仕訳明細 (【v3.9 更新】)**

複式簿記の「借方(Debit)」「貸方(Credit)」を記録します。
`account_id` (FK) を廃止し、`account_code` (Static) と `sub_account_id` (FK, Optional) の組み合わせに変更します。

**テーブル名:** journal_entries

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description)  | 備考 (Notes)                                 |
| :----------------- | :------------------- | :------------------ | :------------------------------------------- |
| id                 | uuid                 | 一意な ID           | 主キー, uuid_generate_v4()                   |
| journal_id         | uuid                 | 紐づく仕訳ヘッダ ID | journals.id への FK (Cascade Delete)         |
| account_code       | text                 | **勘定科目コード**  | **必須**。アプリ内の Master Account コード。 |
| sub_account_id     | uuid                 | **補助科目 ID**     | **NULL 許容**。sub_accounts.id への FK。     |
| debit_amount       | integer              | 借方金額 (円)       | 必須, デフォルト 0                           |
| credit_amount      | integer              | 貸方金額 (円)       | 必須, デフォルト 0                           |

### **2.4. 政治団体テーブル**

**テーブル名:** political_organizations

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description)        | 備考 (Notes)                    |
| :----------------- | :------------------- | :------------------------ | :------------------------------ |
| id                 | uuid                 | 一意な ID (政治団体 ID)   | 主キー, uuid_generate_v4()      |
| owner_user_id      | uuid                 | 台帳のオーナーユーザー ID | auth.users.id への参照 (RLS 用) |
| name               | text                 | 政治団体の名称            | 必須                            |
| created_at         | timestamptz          | レコード作成日時          | デフォルトで now()              |

### **2.5. 政治家テーブル**

**テーブル名:** politicians

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description)            | 備考 (Notes)                    |
| :----------------- | :------------------- | :---------------------------- | :------------------------------ |
| id                 | uuid                 | 一意な ID (政治家 ID)         | 主キー, uuid_generate_v4()      |
| owner_user_id      | uuid                 | このマスターの管理ユーザー ID | auth.users.id への参照 (RLS 用) |
| name               | text                 | 政治家の氏名                  | 必須                            |
| created_at         | timestamptz          | レコード作成日時              | デフォルトで now()              |

### **2.6. 選挙テーブル**

**テーブル名:** elections

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description)        | 備考 (Notes)                             |
| :----------------- | :------------------- | :------------------------ | :--------------------------------------- |
| id                 | uuid                 | 一意な ID (選挙 ID)       | 主キー, uuid_generate_v4()               |
| owner_user_id      | uuid                 | 台帳のオーナーユーザー ID | auth.users.id への参照 (RLS 用)          |
| politician_id      | uuid                 | 紐づく政治家の ID         | politicians.id への FK。必須             |
| election_name      | text                 | 選挙の名称                | 必須。例: 「2025 年 〇〇市議会議員選挙」 |
| election_date      | date                 | 選挙の投開票日            | 必須                                     |
| created_at         | timestamptz          | レコード作成日時          | デフォルトで now()                       |

### **2.7. 関係者テーブル (【v3.4 大幅更新】)**

プライバシー設定（匿名化）のためのカラムを追加。

**テーブル名:** contacts

| 列名 (Column Name)    | データ型 (Data Type) | 説明 (Description)              | 備考 (Notes)                                                                         |
| :-------------------- | :------------------- | :------------------------------ | :----------------------------------------------------------------------------------- |
| id                    | uuid                 | 一意な ID (関係者 ID)           | 主キー, uuid_generate_v4()                                                           |
| owner_user_id         | uuid                 | このマスターの管理ユーザー ID   | auth.users.id への参照 (RLS 用)                                                      |
| contact_type          | text                 | **関係者種別**                  | **person (個人) or corporation (法人/団体)**。必須                                   |
| name                  | text                 | 氏名 又は 団体名                | 必須。例: 「田中太郎（寄付者）」, 「みずほ銀行」                                     |
| address               | text                 | 住所                            | NULL 許容                                                                            |
| occupation            | text                 | 職業                            | NULL 許容 (contact_type = 'person' の場合のみ使用)                                   |
| is_name_private       | boolean              | **氏名/団体名を非公開にするか** | 必須, デフォルト false                                                               |
| is_address_private    | boolean              | **住所を非公開にするか**        | 必須, デフォルト false                                                               |
| is_occupation_private | boolean              | **職業を非公開にするか**        | 必須, デフォルト false                                                               |
| privacy_reason_type   | text                 | **非公開理由（種別）**          | personal_info (個人情報保護), other (その他)。いずれかが \_private = true の場合必須 |
| privacy_reason_other  | text                 | **非公開理由（その他）**        | privacy_reason_type = 'other' の場合必須                                             |
| created_at            | timestamptz          | レコード作成日時                | デフォルトで now()                                                                   |

### **2.8. メディア（証憑）テーブル**

transaction_id (廃止) の代わりに journal_id に紐づけます。

**テーブル名:** media_assets

| 列名 (Column Name)  | データ型 (Data Type) | 説明 (Description)          | 備考 (Notes)               |
| :------------------ | :------------------- | :-------------------------- | :------------------------- |
| id                  | uuid                 | 一意な ID                   | 主キー, uuid_generate_v4() |
| journal_id          | uuid                 | **紐づく仕訳ヘッダ ID**     | journals.id への FK        |
| uploaded_by_user_id | uuid                 | アップロードしたユーザー ID | auth.users.id への参照     |
| storage_path        | text                 | Storage 内のファイルパス    | 必須。                     |
| file_name           | text                 | 元のファイル名              | 必須                       |
| mime_type           | text                 | ファイルの MIME タイプ      | 必須。                     |
| created_at          | timestamptz          | アップロード日時            | デフォルトで now()         |

### **2.9. 台帳メンバーテーブル**

v2.6 の仕様に基づき、役割名を text で直接保持します。

**テーブル名:** ledger_members

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description)      | 備考 (Notes)                                                                                          |
| :----------------- | :------------------- | :---------------------- | :---------------------------------------------------------------------------------------------------- |
| id                 | uuid                 | 一意な ID               | 主キー, uuid_generate_v4()                                                                            |
| user_id            | uuid                 | 招待されたユーザーの ID | auth.users.id への参照                                                                                |
| organization_id    | uuid                 | 紐づく政治団体の ID     | **NULL 許容**, political_organizations.id への FK                                                     |
| election_id        | uuid                 | 紐づく選挙台帳の ID     | **NULL 許容**, elections.id への FK                                                                   |
| role               | text                 | **役割（権限）**        | アプリ側で定義した文字列キー。下記 2.11 参照。 例: **admin**, **approver**, **submitter**, **viewer** |
| invited_by_user_id | uuid                 | 招待したユーザー ID     | auth.users.id への参照                                                                                |
| created_at         | timestamptz          | 招待日時                | デフォルトで now()                                                                                    |

### **2.10. ユーザープロファイル**

**テーブル名:** profiles

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes)                        |
| :----------------- | :------------------- | :----------------- | :---------------------------------- |
| id                 | uuid                 | ユーザー ID        | auth.users.id への FK, 主キー       |
| full_name          | text                 | ユーザーの氏名     | 招待時に表示するため                |
| email              | text                 | ユーザーの Email   | auth.users.email と同期。招待検索用 |
| updated_at         | timestamptz          | 更新日時           |                                     |

### **2.11. 役割と権限の定義（アプリ側） (【v3.4 更新】)**

manageContacts 権限を追加。

#### **2.11.1. 権限 (Permission) の定義**

アプリ内でユーザーが実行可能な操作（権限）を enum（または const String）で定義します。

// lib/core/models/permissions.dart (実装例)

/// アプリ内でチェックされる権限の種類  
enum AppPermission {  
 // 仕訳（収支）関連  
 submitJournal, // 仕訳を起票（承認申請）する権限  
 registerJournal, // 仕訳を即時登録（自己承認）する権限  
 approveJournal, // 他人の仕訳を承認・却下する権限

// メンバー関連  
 manageMembers, // メンバーの招待・削除・役割変更を行う権限

// 台帳設定関連  
 editLedgerSettings, // 台帳名の変更など、設定を編集する権限

// 閲覧権限  
 viewLedger, // 台帳（仕訳一覧など）を閲覧する権限

// v3.4 で「関係者マスタ」管理権限を追加  
 manageContacts, // ★ 関係者マスタ（非公開設定含む）を編集する権限  
}

#### **2.11.2. 役割 (Role) の定義**

ledger_members.role カラムに保存される役割キーを enum で定義します。

// lib/core/models/roles.dart (実装例)

/// ユーザーに割り当てられる役割。  
/// この enum の \`name\` (例: 'admin') が DB の \`ledger_members.role\` (text) に保存される。  
enum AppRole {  
 admin,  
 approver,  
 submitter,  
 viewer,  
}

/// DB の文字列から AppRole enum に変換するヘルパー  
AppRole roleFromString(String roleString) {  
 return AppRole.values.firstWhere(  
 (role) => role.name == roleString,  
 orElse: () => AppRole.viewer, // 不正な値の場合は閲覧者扱い  
 );  
}

/// UI 表示用の役割名（日本語）  
String getRoleDisplayName(AppRole role) {  
 switch (role) {  
 case AppRole.admin:  
 return '管理者';  
 case AppRole.approver:  
 return '承認者';  
 case AppRole.submitter:  
 return '起票者';  
 case AppRole.viewer:  
 return '閲覧者';  
 }  
}

#### **2.11.3. 役割と権限の紐付け**

どの役割（Role）がどの権限（Permission）のセットを持つかを Map で定義します。

// lib/core/services/permission_service.dart (実装例)

/// 各役割が持つ権限の静的な定義マップ  
const Map<AppRole, Set<AppPermission>> rolePermissions = {  
 // 管理者  
 AppRole.admin: {  
 AppPermission.viewLedger,  
 AppPermission.registerJournal,  
 AppPermission.approveJournal,  
 AppPermission.manageMembers,  
 AppPermission.editLedgerSettings,  
 AppPermission.manageContacts, // ★ 管理者に関係者マスタ編集権限を付与  
 },

// 承認者  
 AppRole.approver: {  
 AppPermission.viewLedger,  
 AppPermission.submitJournal,  
 AppPermission.approveJournal,  
 AppPermission.manageContacts, // ★ 承認者にも付与（起票時に必要になるため）  
 },

// 起票者  
 AppRole.submitter: {  
 AppPermission.viewLedger,  
 AppPermission.submitJournal,  
 AppPermission.manageContacts, // ★ 起票者にも付与  
 },

// 閲覧者  
 AppRole.viewer: {  
 AppPermission.viewLedger,  
 },  
};

/// 権限チェックを行うためのヘルパークラス（または Provider）  
class PermissionService {  
 /// 現在のユーザー（\`myRole\`）が、指定された権限（\`permission\`）を持つかチェックする  
 bool hasPermission(AppRole myRole, AppPermission permission) {  
 final permissions = rolePermissions[myRole];  
 if (permissions == null) {  
 return false;  
 }  
 return permissions.contains(permission);  
 }  
}

## **3. 画面仕様 (Screen Specifications)**

### **3.1. 台帳選択画面 (LedgerSelectionScreen)**

- **ファイル (推奨):** lib/features/home/presentation/pages/home_page.dart
- **レイアウト:**
  - AppBar の title に Text('台帳選択') を表示。
  - AppBar の bottom に TabBar を配置し、「政治団体」と「選挙」の 2 つのタブを設ける。
  - body に TabBarView を配置。
  - **「政治団体」タブ:**
    - StreamBuilder で political_organizations の owner_user_id が自分、**または** ledger_members の user_id が自分で organization_id が NULL でない台帳を**両方**取得し、マージして表示する。
    - ListTile:
      - title: Text(organization.name)
      - trailing: Icon(Icons.arrow_forward_ios)
  - **「選挙」タブ:**
    - StreamBuilder で elections の owner_user_id が自分、**または** ledger_members の user_id が自分で election_id が NULL でない台帳を**両方**取得し、マージして表示する。（politicians テーブルと JOIN して政治家名も取得）
    - ListTile:
      - title: Text(election.election_name)
      - subtitle: Text('${politician.name} / ${election.election_date}')
      - trailing: Icon(Icons.arrow_forward_ios)
  - FloatingActionButton: Icon(Icons.add) を配置。
- **機能:**
  - **ListTile タップ (変更):**
    - タップした台帳に紐づく自分の role（owner_user_id が自分なら'admin'、ledger_members にあればその role）を取得する。
    - political_organizations の ListTile をタップした場合:
      - Navigator.push ( ledger_id: org.id, **ledger_type: 'political_organization'**, my_role: 'admin' (または member.role) )
    - elections の ListTile をタップした場合:
      - Navigator.push ( ledger_id: elec.id, **ledger_type: 'election'**, my_role: 'admin' (または member.role) )
    - 遷移先は JournalListScreen。
  - FloatingActionButton をタップすると、「台帳登録画面 (AddLedgerScreen)」をモーダル (showModalBottomSheet) で表示する。

### **3.2. 台帳登録画面 (AddLedgerScreen)**

- **ファイル (推奨):** lib/features/ledger/presentation/widgets/add_ledger_sheet.dart
- **レイアウト:**
  - AppBar に Text('新規台帳の登録') と ElevatedButton(child: Text('保存')) を配置。
  - Form ウィジェットでラップされた ListView (スクロール可能にするため)
  - **入力フォーム:**
    - SegmentedButton (トグル) で、「政治団体」(LedgerType.organization) と「選挙」(LedgerType.election) のどちらを登録するか選択する。
    - **if (\_ledgerType == LedgerType.organization):**
      - TextFormField (政治団体名) - decoration: InputDecoration(labelText: '政治団体名')
    - **if (\_ledgerType == LedgerType.election):**
      - DropdownButtonFormField (政治家)
        - items: politicians テーブルから owner_user_id が一致するリストを取得して表示。
        - decoration: InputDecoration(labelText: '政治家', suffixIcon: IconButton(icon: Icon(Icons.person_add), onPressed: \_addNewPolitician))
      - TextFormField (選挙名) - decoration: InputDecoration(labelText: '選挙名 (例: 2025 年〇〇市議選)')
      - DatePicker (選挙の投開票日)
- **機能:**
  - **\_saveLedger (保存):**
    - 選択された \_ledgerType に応じて、owner_user_id = auth.uid を設定して、対応するテーブル (political_organizations または elections) に insert を実行する。
    - elections を保存する際は、ドロップダウンで選択された politician_id を含める。
    - （accounts テーブルへのデータ投入は、README.md の初期 SQL で行われている前提のため、この画面でのロジックは不要）
    - 保存後、モーダルを閉じる (Navigator.pop)。
  - **\_addNewPolitician (新規政治家追加):**
    - suffixIcon の + ボタンが押されたら、小さなアラートダイアログ（AlertDialog）を表示する。
    - ダイアログには TextFormField (政治家名)と「追加」ボタンを配置。
    - 「追加」ボタンで politicians テーブルに owner_user_id = auth.uid を設定して新しい政治家を保存し、ダイアログを閉じる。
    - DropdownButtonFormField の政治家リストが自動でリフレッシュされ、今追加した政治家が選択状態になる。

### **3.3. 仕訳一覧画面 (JournalListScreen)**

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
  - **ListTile タップ:**
  - status == 'draft' かつ canApprove が true の場合:
    - 「仕訳承認画面 (ApproveJournalScreen)」(3.6) をモーダルで表示する。
  - **FloatingActionButton:**
  - final bool canSubmit = permissionService.hasPermission(myAppRole, AppPermission.submitJournal);
  - final bool canRegister = permissionService.hasPermission(myAppRole, AppPermission.registerJournal);
  - if (canSubmit || canRegister) の場合のみ FloatingActionButton を表示。
  - タップすると「仕訳登録画面 (AddJournalScreen)」に遷移。その際、ledger_id、**ledger_type**、my_role を引数として渡す。
  - **\_navigateToContacts (関係者マスタへ移動):**
  - 「関係者マスタ管理画面 (ContactsScreen)」(3.8) に Navigator.push で遷移する。
  - **\_navigateToSettings (設定へ移動):**
  - 「台帳設定・メンバー管理画面 (LedgerSettingsScreen)」(3.7) に Navigator.push で遷移する。

### **3.4. 仕訳登録画面 (AddJournalScreen)**

- **ファイル (推奨):** lib/features/journal/presentation/widgets/add_journal_sheet.dart
- **前提:** ledger_id（organization_id または election_id）、**ledger_type (文字列)**、my_role (文字列) を受け取る。
- **ロジック:**
  - final AppRole myAppRole = roleFromString(widget.my_role);
  - final bool canRegister = permissionService.hasPermission(myAppRole, AppPermission.registerJournal);
- **レイアウト:**
  - AppBar に Text('新規仕訳の登録') と ElevatedButton
    - ElevatedButton のテキスト: canRegister ? Text('登録 (承認済み)') : Text('承認申請 (起票)')
  - Form ウィジェットでラップされた ListView
  - **入力フォーム:**
    - DatePicker (仕訳日)
    - TextFormField (摘要) - 例: 「事務所家賃 5 月分」
    - SegmentedButton (取引タイプ) - \_entryType (State 変数): expense (支出), revenue (収入), transfer (振替)
    - TextFormField (金額) - TextInputType.number
    - if (\_entryType == 'expense'):
      - DropdownButtonFormField (支出科目（借方）)
        - items: \_loadAccounts でロードした account_type = 'expense' のリスト
      - **支払元（貸方） - 複数行入力可 (【v3.8 更新】):**
        - ListView.builder で「支払元行」を動的に追加・削除可能にする。（デフォルト 1 行）
        - 各行:
          - DropdownButtonFormField (支払元科目): account_type = 'asset' (現金, 預金) **または** 'revenue' (自己資金, 公費負担)
          - TextFormField (金額)
        - **バリデーション:** 支払元金額の合計が、支出金額と一致すること。
    - if (\_entryType == 'revenue'):
      - DropdownButtonFormField (入金先（借方）)
        - items: \_loadAccounts でロードした account_type = 'asset' のリスト
      - DropdownButtonFormField (収入科目（貸方）)
        - items: \_loadAccounts でロードした account_type = 'revenue' または 'equity' のリスト
    - if (\_entryType == 'transfer'):
      - DropdownButtonFormField (振替元（貸方）)
        - items: \_loadAccounts でロードした account_type = 'asset' のリスト
      - DropdownButtonFormField (振替先（借方）)
        - items: \_loadAccounts でロードした account_type = 'asset' のリスト
    - if (widget.ledger_type == 'election'):
      - SegmentedButton (区分) - （選択肢: pre-campaign (立候補準備), campaign (選挙運動)）
    - **関係者 (寄付者/支出先/銀行/借入先):** DropdownButtonFormField
      - items: contacts テーブルから取得。
      - decoration: InputDecoration(labelText: '関係者', suffixIcon: IconButton(icon: Icon(Icons.person_add), onPressed: \_navigateToContacts))
    - TextFormField (金銭以外の見積の根拠)
    - TextFormField (政党交付金充当額) - TextInputType.number, デフォルト'0'
    - TextFormField (政党基金充当額) - TextInputType.number, デフォルト'0'
    - CheckboxListTile(title: Text('領収証を徴し難い'), value: \_isReceiptHardToCollect, ...)
    - if (\_isReceiptHardToCollect): (徴収困難理由の UI)
    - if (!\_isReceiptHardToCollect): (領収証添付 UI)
    - TextFormField (備考) - maxLines: 3
- **機能:**
  - **\_loadAccounts (データ取得ロジック):**
    - initState で、supabase.from('accounts').select().eq('ledger_type', widget.ledger_type) を実行し、勘定科目リストをロードする。
  - **\_navigateToContacts (関係者マスタへ移動):**
    - suffixIcon の+ボタンが押されたら、「関係者マスタ管理画面 (ContactsScreen)」(3.8) に Navigator.push で遷移する。
  - **\_saveJournal (保存):**
    1. ユーザーの権限に基づき status を決定。
       - canRegister が true の場合: status = 'approved', approved_by_user_id = auth.uid
       - canRegister が false の場合: status = 'draft', approved_by_user_id = null
    2. journals テーブルにヘッダ情報（journal_date, description, status, contact_id, ledger_id 等）を insert し、new_journal_id を取得。
    3. journal_entries テーブルに明細を insert（2 行）。
       - （例：支出の場合）
       - insert into journal_entries (journal_id, account_id, debit_amount, credit_amount)
       - values (new_journal_id, (支出科目 ID), (金額), 0)
       - **支払元（貸方）の行数分ループ:**
         - insert into journal_entries (journal_id, account_id, debit_amount, credit_amount)
         - values (new_journal_id, (支払元科目 ID), 0, (支払元金額))
    4. 領収証ファイルが添付されている場合、Storage にアップロードし、media_assets に new_journal_id を紐付けて保存。
    5. モーダルを閉じる。

### **3.5. メディア（証憑）管理画面**

- **ファイル (推奨):** lib/features/journal/presentation/pages/media_library_page.dart
- **前提:** この画面は必ず organization_id または election_id の**どちらか一方**を引数として受け取ります。（JournalListScreen から遷移することを想定）
- **レイアウト:**
  - AppBar に Text('領収証ライブラリ')
  - body:
    - GridView.builder を使用し、アップロードされた領収証のサムネイルを一覧表示する。
    - **データ取得:**
      1. まず、引数の organization_id または election_id に紐づく journals のリスト（journal_id のみで可）を取得します。
      2. 次に、取得した journal_id のリストに合致する media_assets のレコードをすべて取得します。（Storage から getPublicUrl で画像 URL も取得）
- **機能:**
  - サムネイルをタップすると、全画面で画像を表示したり、ファイルをダウンロードしたりできます。

### **3.6. （新設）仕訳承認画面 (ApproveJournalScreen)**

「起票」された仕訳（status == 'draft'）を承認または却下するためのモーダル画面。

- **ファイル (推奨):** lib/features/journal/presentation/widgets/approve_journal_sheet.dart
- **前提:** journal_id を引数として受け取る。
- **レイアウト:**
  - AppBar に Text('仕訳の承認')
  - body:
    - FutureBuilder で journal_id に紐づく仕訳データ（journals, journal_entries, contacts, media_assets）を全て取得する。
    - 登録画面 (3.4) と同様のフォームを表示するが、**すべてのフィールドを読み取り専用 (readOnly: true)** にする。（勘定科目、金額、関係者、添付ファイルなどをすべて表示）
    - Text('起票者: ${profile.full_name}') を表示。（submitted_by_user_id から profiles を引いて表示）
    - 画面下部に Row でボタンを配置:
      - if (journal.submitted_by_user_id == auth.uid) (起票者が自分自身の場合):
        - Text('ご自身が起票した取引は承認できません。') を表示。
      - else (起票者が他人の場合):
        - ElevatedButton(child: Text('承認する'), onPressed: \_approve, style: successStyle)
        - OutlinedButton(child: Text('却下する'), onPressed: \_reject, style: errorStyle)
- **機能:**
  - **\_approve (承認):**
    - journals テーブルの該当レコードを update する。
    - status = 'approved'
    - approved_by_user_id = auth.uid
    - Navigator.pop() でモーダルを閉じる。
  - **\_reject (却下):**
    - journals テーブルから該当レコードを delete する。（media_assets も on delete cascade で削除されることが望ましい）
    - Navigator.pop() でモーダルを閉じる。

### **3.7. （新設）台帳設定・メンバー管理画面 (LedgerSettingsScreen)**

- **ファイル (推奨):** lib/features/ledger/presentation/pages/ledger_settings_page.dart
- **前提:** ledger_id（organization_id または election_id） と my_role (文字列) を引数として受け取る。（3.3 の制御により admin のみアクセス可能）
- **ロジック:**
  - final AppRole myAppRole = roleFromString(widget.my_role);
  - final bool canManageMembers = permissionService.hasPermission(myAppRole, AppPermission.manageMembers);
  - final bool canEditSettings = permissionService.hasPermission(myAppRole, AppPermission.editLedgerSettings);
- **レイアウト:**
  - AppBar に Text('台帳設定')
  - ListView:
    - ListTile(title: Text('台帳名の変更'), enabled: canEditSettings)
    - Divider()
    - Padding(padding: EdgeInsets.all(16), child: Text('メンバー管理', style: Theme.of(context).textTheme.titleLarge))
    - **メンバー招待 UI:**
      - if (canManageMembers) ブロックで表示:
        - TextFormField (Email)
        - DropdownButtonFormField (役割): AppRole.values からリストを生成
          - items: AppRole.values.map((role) => DropdownMenuItem(value: role.name, child: Text(getRoleDisplayName(role)))).toList()
        - ElevatedButton(child: Text('招待する'), onPressed: \_inviteMember)
    - **メンバー一覧 UI:**
      - if (canManageMembers) ブロックで表示:
        - StreamBuilder で ledger_members を取得（profiles を JOIN）。
        - ListTile:
          - title: Text(profile.full_name ?? profile.email)
          - subtitle: Text(getRoleDisplayName(roleFromString(member.role))) (役割名)
          - trailing: IconButton(icon: Icon(Icons.delete), onPressed: () => \_removeMember(member.id)) (オーナー自身は削除不可にする)
- **機能:**
  - **\_inviteMember (招待) (OTP 方式):**
    - この機能は **Supabase Edge Function** の呼び出しを推奨（auth.admin 操作のため）。
    1. Flutter アプリから、入力された Email と選択された role (文字列) を引数として、Edge Function (/invite-user-otp) を呼び出す。
    1. Edge Function 側（サーバーサイド）:
    - a. const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email) でユーザー存在チェック。
    - b. user_id を取得。もし existingUser がいない場合:
      - const { data: newUser } = await supabase.auth.admin.createUser({ email: email, email_confirm: true }) を実行し、**アカウントを強制作成**する。
      - user_id = newUser.user.id
    - c. ledger_members テーブルにレコードを insert する。（user_id, ledger_id, role (文字列), invited_by_user_id = auth.uid）
    - d. **OTP（数字コード）を送信する:**
      - await supabase.auth.signInWithOtp({ email: email }) を（またはパスワードリセット OTP を）実行する。
      - これにより、ディープリンク不要の「**6 桁の数字コード**」が記載されたメールがユーザーに送信される。
    1. 招待されたユーザーは、**4.2 招待されたユーザーの初回ログイン** のフローに従い、認証を完了する。
  - **\_removeMember (削除):**
    - ledger_members テーブルから、該当する id のレコードを delete する。

### **3.8. （新設）関係者マスタ管理画面 (ContactsScreen)**

仕訳登録に必要な「関係者（寄付者・支出先）」を作成・編集・管理する画面。

- **ファイル (推奨):** lib/features/contacts/presentation/pages/contacts_page.dart
- **前提:** 3.3 仕訳一覧画面 または 3.4 仕訳登録画面 から遷移してくる。
- **レイアウト:**
  - AppBar に Text('関係者マスタ')
  - body: StreamBuilder で contacts テーブルから owner_user_id が一致するデータを取得し、ListView.builder で表示する。
  - ListTile:
    - title: Text(contact.name)
    - subtitle: Text('${contact.contact_type == 'person' ? '個人' : '法人/団体'} / ${contact.address ?? '住所未設定'}')
    - trailing: Icon(Icons.edit)
  - FloatingActionButton: Icon(Icons.add) を配置。
- **機能:**
  - **ListTile タップ (編集):**
    - タップすると、「関係者登録・編集画面 (AddContactSheet)」(3.9) をモーダルで表示する。引数として contact オブジェクトを渡す。
  - **FAB タップ (新規):**
    - タップすると、「関係者登録・編集画面 (AddContactSheet)」(3.9) をモーダルで表示する。（引数なし）

### **3.9. （新設）関係者登録・編集画面 (AddContactSheet) (【v3.6 更新】)**

関係者の詳細情報とプライバシー設定を入力するモーダル。

- **ファイル (推奨):** lib/features/contacts/presentation/widgets/add_contact_sheet.dart
- **前提:** （任意）編集対象の contact オブジェクトを受け取る。
- **レイアウト:**
  - AppBar に Text('関係者の登録') と ElevatedButton(child: Text('保存'))
  - Form ウィジェットでラップされた ListView:
    - 注記 (変更): フォームの上部 (または name フィールドの下) に、「自己資金 の仕訳を登録する場合はご自身（候補者・代表者）を『個人』として登録してください。  
      『みずほ銀行』『〇〇信用金庫』などの銀行口座や借入先も、『法人/団体』としてここから登録してください。」といった案内文を表示する。
    - SegmentedButton (種別): person (個人) / corporation (法人/団体)。（\_contactType State 変数）
    - TextFormField (氏名 / 団体名)
    - CheckboxListTile(title: Text('氏名/団体名を非公開にする'), value: \_isNamePrivate, ...)
    - TextFormField (住所)
    - CheckboxListTile(title: Text('住所を非公開にする'), value: \_isAddressPrivate, ...)
    - if (\_contactType == 'person'):
      - TextFormField (職業)
      - CheckboxListTile(title: Text('職業を非公開にする'), value: \_isOccupationPrivate, ...)
    - Divider()
    - if (\_isNamePrivate || \_isAddressPrivate || \_isOccupationPrivate): (非公開設定が 1 つでもある場合)
      - Text('非公開理由 (必須)')
      - DropdownButtonFormField (理由): personal_info (個人情報保護のため) / other (その他)
      - if (\_privacyReasonType == 'other'):
        - TextFormField (その他の理由を具体的に入力)
- **機能:**
  - **\_saveContact (保存):**
    - owner_user_id = auth.uid を設定する。
    - フォームのバリデーション（非公開設定が ON なのに理由が未入力、など）を実行。
    - contacts テーブルに insert または update を実行する。
    - Navigator.pop() でモーダルを閉じる。

## **4. 認証フロー仕様 (【v3.3 新規】)**

アカウント管理と認証は、ディープリンク不要の「OTP（ワンタイムパスコード）」方式を前提として実装する。

### **4.1. 新規アカウント作成（マスターアカウント）**

- **ファイル (推奨):** lib/features/auth/presentation/pages/signup_page.dart
- **機能:**
  1. ユーザーが Email, Password, 氏名 を入力して「登録」ボタンを押下。
  2. supabase.auth.signUp() を実行。（data: {'full_name': fullName} も同時に渡し、auth.users.raw_user_meta_data に保存する）
  3. Supabase から OTP（数字コード）付きの確認メールが送信される。
  4. アプリは OTP 入力画面に遷移。
  5. ユーザーがメールで受信した OTP コードを入力し supabase.auth.verifyOtp(email: email, token: otp, type: OtpType.signup) を実行して認証を完了する。
  6. （Supabase の Auth トリガー（README.md 参照）により、profiles テーブルにも full_name, email が自動でコピーされる）

### **4.2. 招待されたユーザーの初回ログイン**

- **ファイル (推奨):** lib/features/auth/presentation/pages/login_page.dart (または専用の lib/features/auth/presentation/pages/invited_user_login_page.dart)
- **前提:** 招待されたユーザーは、3.7 のフローにより、パスワード未設定のアカウントが作成され、OTP コード付きのメールを受信している。
- **レイアウト:**
  - login_page.dart に「招待された方はこちら」などのタブ/ボタンを追加する。
  - 遷移先の画面（またはタブ）に以下のフォームを設置する。
    - TextFormField (Email)
    - TextFormField (受信した OTP コード)
    - TextFormField (新しいパスワード)
    - TextFormField (新しいパスワードの確認)
- **機能:**
  1. ユーザーが Email と OTP コードを入力し「認証」ボタンを押下。
  2. supabase.auth.verifyOtp(email: email, token: otp, type: OtpType.invite) （または OtpType.recovery）を実行し、OTP 認証を行う。
  3. 認証が成功したら、続けて入力された「新しいパスワード」を使い supabase.auth.updateUser() を実行し、パスワードを設定する。
  4. パスワード設定後、HomePage (台帳選択画面) に遷移する。

### **4.3. パスワードリセット**

- **ファイル (推奨):** lib/features/auth/presentation/pages/login_page.dart
- **機能:**
  1. ログイン画面に「パスワードをお忘れですか？」リンクを設置。
  2. タップすると AlertDialog または別画面で Email 入力欄を表示。
  3. supabase.auth.resetPasswordForEmail(email) を実行。（**注意:** Supabase 側で「OTP を使用する」設定が有効になっている必要がある）
  4. Supabase から OTP（数字コード）付きのパスワードリセットメールが送信される。
  5. ユーザーは 4.2 と同様の「Email + OTP + 新パスワード」入力フォームを使い、パスワードをリセットする。（verifyOtp の type は OtpType.recovery を使用）

## **5. アウトプット仕様（将来機能） (【v3.6 更新】)**

Polimoney 互換 JSON をエクスポートする際、仕訳データ（journals, journal_entries）と、勘定科目（accounts）、関係者（contacts）を JOIN する。

- **「自己資金」の判別:**
  - アウトプット（Polimoney）側は、journal_entries が accounts.account_name = '自己資金' の account_id に紐づいているか否かで、その取引が自己資金であるかを明確に判別できる。
- **「銀行口座別」の集計:**
  - アウトプット（Polimoney）側は、journals.contact_id と contacts.name = 'みずほ銀行' を紐付けることで、accounts.account_name = '普通預金' の内訳（補助科目）として残高を追跡できる。
- **関係者情報の匿名化:**
  - contacts.contact_type (person / corporation) は**常に公開**する。
  - contacts.name は、is_name_private == true の場合、null または「非公開」という文字列で上書きする。
  - contacts.address は、is_address_private == true の場合、null または「非公開」という文字列で上書きする。
  - contacts.occupation は、is_occupation_private == true の場合、null または「非公開」という文字列で上書きする。
  - 非公開項目が 1 つでもある場合、privacy_reason_type と privacy_reason_other の内容もエクスポート対象に含める。
