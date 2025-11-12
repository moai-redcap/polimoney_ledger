# **Polimoney Ledger \- 機能仕様書 (v3.6 完全版)**

## **1\. 機能概要 (Feature Overview)**

この機能は、政治団体や候補者の会計担当者を対象としています。  
会計担当者が、自身が管理する\*\*「政治団体」または「政治家（候補者）」を登録し、それぞれに紐づく「選挙」\*\*の台帳を作成します。  
v3.0より、複式簿記モデルを導入します。  
v3.5より、台帳タイプ（政治団体 / 選挙運動）に応じて、使用する勘定科目が自動で切り替わります。  
（例：「選挙」台帳では「人件費」「自己資金」、「政治団体」台帳では「経常経費」「政治活動費」が選択肢となります）  
v3.6より、**勘定科目マスタ（accounts）は、アプリ側で定義された共通マスタのみ**を使用します。「みずほ銀行」や「〇〇信用金庫」といった特定の銀行口座や借入先は、「**関係者マスタ（contacts）**」に登録し、仕訳の際に紐付ける方式（会計ソフトの標準方式）に変更します。

役割（ロール）と権限の関係は、Flutterアプリ側で静的に定義されます。  
アカウント発行と認証は、ディープリンクが不要な「OTP（ワンタイムパスコード）」方式を採用します。  
関係者（contacts）のプライバシー設定（匿名化・非公開理由の明記）に対応します。

## **2\. データモデル (Data Model)**

### **2.1. 勘定科目マスタ (【v3.6 更新】)**

owner\_user\_id カラムを削除。accounts テーブルは、OSSユーザーが README.md のSQLで投入する「共通マスタ」専用テーブルとなります。

* **テーブル名:** accounts

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID | 主キー, uuid\_generate\_v4() |
| ledger\_type | text | **台帳タイプ** | **political\_organization** (政治団体) or **election** (選挙運動)。必須 |
| account\_code | text | 勘定科目コード (任意) | 例: 111 (現金), 511 (人件費) |
| account\_name | text | 勘定科目名 | 必須。例: 「現金」「普通預金」「人件費」「自己資金」 |
| account\_type | text | 勘定タイプ | asset (資産), liability (負債), equity (純資産), revenue (収益/収入), expense (費用/支出) |
| report\_category | text | 報告書上の分類 | 必須。例: 「経常経費」「政治活動費」 |
| is\_debit\_positive | boolean | 借方(Debit)がプラス側か | true (資産, 費用), false (負債, 純資産, 収益) |
| is\_active | boolean | 現在使用可能か | デフォルト true |

#### **2.1.1. 勘定科目一覧（ledger\_type \= 'political\_organization'）**

OSSユーザーがセットアップ時にREADME.mdのSQLで投入する、**政治資金収支報告書**用の共通マスタ科目。（Polimoney.xlsx \- 勘定科目マスタ.csv に準拠）

* **account\_type \= 'asset' (資産):**
    * 現金, 普通預金, 当座預金, 備品, 建物, ...
* **account\_type \= 'liability' (負債):**
    * 借入金, 未払金, ...
* **account\_type \= 'equity' (純資産):**
    * 期首残高（純資産）, ...
* **account\_type \= 'revenue' (収益/収入):**
    * 個人が負担する党費又は会費
    * 寄附（政党匿名寄附以外のもの）
    * 政党匿名寄附
    * 機関紙誌の発行その他の事業による収入
    * 本部又は支部から供与された交付金に係る収入
    * その他の収入
    * ( ... Polimoney.xlsx に準拠した科目 ...)
* **account\_type \= 'expense' (費用/支出):**
    * **経常経費:** (人件費, 光熱水費, 備品・消耗品費, 事務所費)
    * **政治活動費:** (組織活動費, 選挙関係費, 機関紙誌の発行その他の事業費, 調査研究費, 寄附・交付金, その他の経費, ...)

#### **2.1.2. 勘定科目一覧（ledger\_type \= 'election'）**

OSSユーザーがセットアップ時にREADME.mdのSQLで投入する、**選挙運動費用収支報告書**用の共通マスタ科目。（選挙収支報告書\_... .csv に準拠）

* **account\_type \= 'asset' (資産):**
    * 現金, 普通預金, 当座預金, ... (2.1.1と共通する科目)
* **account\_type \= 'liability' (負債):**
    * 借入金, ...
* **account\_type \= 'equity' (純資産):**
    * 期首残高（純資産）, ...
* **account\_type \= 'revenue' (収益/収入):**
    * **寄附**
    * **自己資金**
    * **その他の収入** (公費負担金など)
* **account\_type \= 'expense' (費用/支出):**
    * 人件費, 家屋費, 通信費, 交通費, 印刷費, 広告費, 文具費, 食料費, 休泊費, 雑費

### **2.2. 仕訳ヘッダ (【v3.4 更新】)**

v2.10の transactions テーブルの「メタデータ」部分を引き継ぎ、contact\_id を必須に変更。

* **テーブル名:** journals

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (仕訳ID) | 主キー, uuid\_generate\_v4() |
| organization\_id | uuid | 紐づく政治団体のID | NULL許容, political\_organizations.idへのFK |
| election\_id | uuid | 紐づく選挙台帳のID | NULL許容, elections.idへのFK |
| journal\_date | date | 仕訳日（取引日） | 必須 |
| description | text | 摘要（取引内容） | 必須。例: 「事務所家賃 5月分」 |
| status | text | 承認ステータス | draft (起票/承認前), approved (承認済)。必須 |
| submitted\_by\_user\_id | uuid | 起票したユーザーID | auth.users.idへの参照。必須 |
| approved\_by\_user\_id | uuid | 承認したユーザーID | status='approved'の場合必須 |
| contact\_id | uuid | **紐づく関係者ID** | **必須**, contacts.idへのFK。 （「自己資金」仕訳の場合、contactsマスタの「自分」を選択） （「みずほ銀行」からの借入の場合、「みずほ銀行」を選択） |
| classification | text | 選挙運動の活動区分 | pre-campaign (立候補準備), campaign (選挙運動)。election\_idが設定されている場合のみ使用 |
| non\_monetary\_basis | text | 金銭以外の見積の根拠 | NULL許容。 |
| notes | text | 備考 | 任意入力。NULL許容 |
| amount\_political\_grant | integer | 政党交付金充当額 | NULL許容, デフォルト0 |
| amount\_political\_fund | integer | 政党基金充当額 | NULL許容, デフォルト0 |
| is\_receipt\_hard\_to\_collect | boolean | 領収証徴収困難フラグ | 必須, デフォルト false |
| receipt\_hard\_to\_collect\_reason | text | 領収証徴収困難理由 | NULL許容。 |
| created\_at | timestamptz | レコード作成日時 | now() |

### **2.3. 仕訳明細 (【v3.0 新規】)**

複式簿記の「借方(Debit)」「貸方(Credit)」を記録します。

* **テーブル名:** journal\_entries

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID | 主キー, uuid\_generate\_v4() |
| journal\_id | uuid | 紐づく仕訳ヘッダID | journals.id へのFK (Cascade Delete) |
| account\_id | uuid | 紐づく勘定科目ID | accounts.id へのFK |
| debit\_amount | integer | 借方金額 (円) | 必須, デフォルト 0 |
| credit\_amount | integer | 貸方金額 (円) | 必須, デフォルト 0 |

### **2.4. 政治団体テーブル**

* **テーブル名:** political\_organizations

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (政治団体ID) | 主キー, uuid\_generate\_v4() |
| owner\_user\_id | uuid | 台帳のオーナーユーザーID | auth.users.idへの参照 (RLS用) |
| name | text | 政治団体の名称 | 必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.5. 政治家テーブル**

* **テーブル名:** politicians

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (政治家ID) | 主キー, uuid\_generate\_v4() |
| owner\_user\_id | uuid | このマスターの管理ユーザーID | auth.users.idへの参照 (RLS用) |
| name | text | 政治家の氏名 | 必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.6. 選挙テーブル**

* **テーブル名:** elections

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (選挙ID) | 主キー, uuid\_generate\_v4() |
| owner\_user\_id | uuid | 台帳のオーナーユーザーID | auth.users.idへの参照 (RLS用) |
| politician\_id | uuid | 紐づく政治家のID | politicians.idへのFK。必須 |
| election\_name | text | 選挙の名称 | 必須。例: 「2025年 〇〇市議会議員選挙」 |
| election\_date | date | 選挙の投開票日 | 必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.7. 関係者テーブル (【v3.4 大幅更新】)**

プライバシー設定（匿名化）のためのカラムを追加。

* **テーブル名:** contacts

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (関係者ID) | 主キー, uuid\_generate\_v4() |
| owner\_user\_id | uuid | このマスターの管理ユーザーID | auth.users.idへの参照 (RLS用) |
| contact\_type | text | **関係者種別** | **person (個人) or corporation (法人/団体)**。必須 |
| name | text | 氏名 又は 団体名 | 必須。例: 「田中太郎（寄付者）」, 「みずほ銀行」 |
| address | text | 住所 | NULL許容 |
| occupation | text | 職業 | NULL許容 (contact\_type \= 'person' の場合のみ使用) |
| is\_name\_private | boolean | **氏名/団体名を非公開にするか** | 必須, デフォルト false |
| is\_address\_private | boolean | **住所を非公開にするか** | 必須, デフォルト false |
| is\_occupation\_private | boolean | **職業を非公開にするか** | 必須, デフォルト false |
| privacy\_reason\_type | text | **非公開理由（種別）** | personal\_info (個人情報保護), other (その他)。いずれかが \_private \= true の場合必須 |
| privacy\_reason\_other | text | **非公開理由（その他）** | privacy\_reason\_type \= 'other' の場合必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.8. メディア（証憑）テーブル**

transaction\_id (廃止) の代わりに journal\_id に紐づけます。

* **テーブル名:** media\_assets

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID | 主キー, uuid\_generate\_v4() |
| journal\_id | uuid | **紐づく仕訳ヘッダID** | journals.idへのFK |
| uploaded\_by\_user\_id | uuid | アップロードしたユーザーID | auth.users.idへの参照 |
| storage\_path | text | Storage内のファイルパス | 必須。 |
| file\_name | text | 元のファイル名 | 必須 |
| mime\_type | text | ファイルのMIMEタイプ | 必須。 |
| created\_at | timestamptz | アップロード日時 | デフォルトで now() |

### **2.9. 台帳メンバーテーブル**

v2.6の仕様に基づき、役割名をtextで直接保持します。

* **テーブル名:** ledger\_members

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID | 主キー, uuid\_generate\_v4() |
| user\_id | uuid | 招待されたユーザーのID | auth.users.idへの参照 |
| organization\_id | uuid | 紐づく政治団体のID | **NULL許容**, political\_organizations.idへのFK |
| election\_id | uuid | 紐づく選挙台帳のID | **NULL許容**, elections.idへのFK |
| role | text | **役割（権限）** | アプリ側で定義した文字列キー。下記 2.11 参照。 例: **admin**, **approver**, **submitter**, **viewer** |
| invited\_by\_user\_id | uuid | 招待したユーザーID | auth.users.idへの参照 |
| created\_at | timestamptz | 招待日時 | デフォルトで now() |

### **2.10. ユーザープロファイル**

* **テーブル名:** profiles

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | ユーザーID | auth.users.idへのFK, 主キー |
| full\_name | text | ユーザーの氏名 | 招待時に表示するため |
| email | text | ユーザーのEmail | auth.users.email と同期。招待検索用 |
| updated\_at | timestamptz | 更新日時 |  |

### **2.11. 役割と権限の定義（アプリ側） (【v3.4 更新】)**

manageContacts 権限を追加。

#### **2.11.1. 権限 (Permission) の定義**

アプリ内でユーザーが実行可能な操作（権限）を enum（または const String）で定義します。

```
// lib/models/permissions.dart (実装例)

/// アプリ内でチェックされる権限の種類  
enum AppPermission {  
  // 仕訳（収支）関連  
  submitJournal,   // 仕訳を起票（承認申請）する権限  
  registerJournal, // 仕訳を即時登録（自己承認）する権限  
  approveJournal,  // 他人の仕訳を承認・却下する権限

  // メンバー関連  
  manageMembers,     // メンバーの招待・削除・役割変更を行う権限

  // 台帳設定関連  
  editLedgerSettings,  // 台帳名の変更など、設定を編集する権限

  // 閲覧権限  
  viewLedger,          // 台帳（仕訳一覧など）を閲覧する権限  
    
  // v3.4で「関係者マスタ」管理権限を追加  
  manageContacts, // ★関係者マスタ（非公開設定含む）を編集する権限  
}
```

#### **2.11.2. 役割 (Role) の定義**

ledger\_members.role カラムに保存される役割キーを enum で定義します。

```
// lib/models/roles.dart (実装例)

/// ユーザーに割り当てられる役割。  
/// この enum の \`name\` (例: 'admin') が DB の \`ledger\_members.role\` (text) に保存される。  
enum AppRole {  
  admin,  
  approver,  
  submitter,  
  viewer,  
}

/// DBの文字列から AppRole enum に変換するヘルパー  
AppRole roleFromString(String roleString) {  
  return AppRole.values.firstWhere(  
    (role) \=\> role.name \== roleString,  
    orElse: () \=\> AppRole.viewer, // 不正な値の場合は閲覧者扱い  
  );  
}

/// UI表示用の役割名（日本語）  
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
```

#### **2.11.3. 役割と権限の紐付け**

どの役割（Role）がどの権限（Permission）のセットを持つかを Map で定義します。

```
// lib/services/permission\_service.dart (実装例)

/// 各役割が持つ権限の静的な定義マップ  
const Map\<AppRole, Set\<AppPermission\>\> rolePermissions \= {  
  // 管理者  
  AppRole.admin: {  
    AppPermission.viewLedger,  
    AppPermission.registerJournal,  
    AppPermission.approveJournal,  
    AppPermission.manageMembers,  
    AppPermission.editLedgerSettings,  
    AppPermission.manageContacts, // ★管理者に関係者マスタ編集権限を付与  
  },

  // 承認者  
  AppRole.approver: {  
    AppPermission.viewLedger,  
    AppPermission.submitJournal,  
    AppPermission.approveJournal,  
    AppPermission.manageContacts, // ★承認者にも付与（起票時に必要になるため）  
  },

  // 起票者  
  AppRole.submitter: {  
    AppPermission.viewLedger,  
    AppPermission.submitJournal,  
    AppPermission.manageContacts, // ★起票者にも付与  
  },

  // 閲覧者  
  AppRole.viewer: {  
    AppPermission.viewLedger,  
  },  
};

/// 権限チェックを行うためのヘルパークラス（またはProvider）  
class PermissionService {  
  /// 現在のユーザー（\`myRole\`）が、指定された権限（\`permission\`）を持つかチェックする  
  bool hasPermission(AppRole myRole, AppPermission permission) {  
    final permissions \= rolePermissions\[myRole\];  
    if (permissions \== null) {  
      return false;  
    }  
    return permissions.contains(permission);  
  }  
}
```

## **3\. 画面仕様 (Screen Specifications)**

### **3.1. 台帳選択画面 (LedgerSelectionScreen)**

* **ファイル (推奨):** lib/pages/home\_page.dart
* **レイアウト:**
    * AppBar の title に Text('台帳選択') を表示。
    * AppBar の bottom に TabBar を配置し、「政治団体」と「選挙」の2つのタブを設ける。
    * body に TabBarView を配置。
    * **「政治団体」タブ:**
        * StreamBuilder で political\_organizations の owner\_user\_id が自分、**または** ledger\_members の user\_id が自分で organization\_id がNULLでない台帳を**両方**取得し、マージして表示する。
        * ListTile:
            * title: Text(organization.name)
            * trailing: Icon(Icons.arrow\_forward\_ios)
    * **「選挙」タブ:**
        * StreamBuilder で elections の owner\_user\_id が自分、**または** ledger\_members の user\_id が自分で election\_id がNULLでない台帳を**両方**取得し、マージして表示する。（politiciansテーブルとJOINして政治家名も取得）
        * ListTile:
            * title: Text(election.election\_name)
            * subtitle: Text('${politician.name} / ${election.election\_date}')
            * trailing: Icon(Icons.arrow\_forward\_ios)
    * FloatingActionButton: Icon(Icons.add) を配置。
* **機能:**
    * **ListTileタップ (変更):**
        * タップした台帳に紐づく自分の role（owner\_user\_idが自分なら'admin'、ledger\_membersにあればそのrole）を取得する。
        * political\_organizations の ListTile をタップした場合:
            * Navigator.push ( ledger\_id: org.id, **ledger\_type: 'political\_organization'**, my\_role: 'admin' (または member.role) )
        * elections の ListTile をタップした場合:
            * Navigator.push ( ledger\_id: elec.id, **ledger\_type: 'election'**, my\_role: 'admin' (または member.role) )
        * 遷移先は JournalListScreen。
    * FloatingActionButton をタップすると、「台帳登録画面 (AddLedgerScreen)」をモーダル (showModalBottomSheet) で表示する。

### **3.2. 台帳登録画面 (AddLedgerScreen)**

* **ファイル (推奨):** lib/widgets/add\_ledger\_sheet.dart
* **レイアウト:**
    * AppBar に Text('新規台帳の登録') と ElevatedButton(child: Text('保存')) を配置。
    * Form ウィジェットでラップされた ListView (スクロール可能にするため)
    * **入力フォーム:**
        * SegmentedButton (トグル) で、「政治団体」(LedgerType.organization) と「選挙」(LedgerType.election) のどちらを登録するか選択する。
        * **if (\_ledgerType \== LedgerType.organization):**
            * TextFormField (政治団体名) \- decoration: InputDecoration(labelText: '政治団体名')
        * **if (\_ledgerType \== LedgerType.election):**
            * DropdownButtonFormField (政治家)
                * items: politicians テーブルから owner\_user\_id が一致するリストを取得して表示。
                * decoration: InputDecoration(labelText: '政治家', suffixIcon: IconButton(icon: Icon(Icons.person\_add), onPressed: \_addNewPolitician))
            * TextFormField (選挙名) \- decoration: InputDecoration(labelText: '選挙名 (例: 2025年〇〇市議選)')
            * DatePicker (選挙の投開票日)
* **機能:**
    * **\_saveLedger (保存):**
        * 選択された \_ledgerType に応じて、owner\_user\_id \= auth.uid を設定して、対応するテーブル (political\_organizations または elections) に insert を実行する。
        * elections を保存する際は、ドロップダウンで選択された politician\_id を含める。
        * （accountsテーブルへのデータ投入は、README.mdの初期SQLで行われている前提のため、この画面でのロジックは不要）
        * 保存後、モーダルを閉じる (Navigator.pop)。
    * **\_addNewPolitician (新規政治家追加):**
        * suffixIcon の \+ ボタンが押されたら、小さなアラートダイアログ（AlertDialog）を表示する。
        * ダイアログには TextFormField (政治家名)と「追加」ボタンを配置。
        * 「追加」ボタンでpoliticians テーブルに owner\_user\_id \= auth.uid を設定して新しい政治家を保存し、ダイアログを閉じる。
        * DropdownButtonFormField の政治家リストが自動でリフレッシュされ、今追加した政治家が選択状態になる。

### **3.3. 仕訳一覧画面 (JournalListScreen)**

* **ファイル (推奨):** lib/pages/journal\_list\_page.dart
* **前提:** ledger\_id（organization\_id または election\_id）、**ledger\_type (文字列)**、my\_role (文字列) を受け取る。
* **ロジック:**
    * initState で PermissionService と roleFromString を使い、各種権限（canManageMembers, canApprove, canSubmit, canRegister, canManageContacts）をbool変数として保持する。
    * final AppRole myAppRole \= roleFromString(widget.my\_role);
    * final bool canManageMembers \= permissionService.hasPermission(myAppRole, AppPermission.manageMembers);
    * final bool canManageContacts \= permissionService.hasPermission(myAppRole, AppPermission.manageContacts);
    * final bool canApprove \= permissionService.hasPermission(myAppRole, AppPermission.approveJournal);
* **レイアウト:**
    * AppBar に、選択された台帳名を表示する。
    * AppBar の actions:
        * if (canManageContacts): IconButton(icon: Icon(Icons.contacts), onPressed: \_navigateToContacts)
        * if (canManageMembers): IconButton(icon: Icon(Icons.settings), onPressed: \_navigateToSettings)
    * body: StreamBuilder を使用。
        * **データ取得:** journals テーブルから、ledger\_id が一致するレコードを journal\_date の降順で取得。
    * ListView.builder:
        * ListTile:
            * title: Text(journal.description) (摘要)
            * subtitle: FutureBuilder を使用し、journal.id に紐づく journal\_entries と accounts をJOIN。account.type \== 'expense' または account.type \== 'revenue' の科目の account\_name を表示。
            * leading: status が draft なら Icon(Icons.pending\_actions, color: Colors.orange)、approved なら Icon(Icons.check\_circle, color: Colors.green)。
            * trailing: FutureBuilder を使用し、journal.id に紐づく journal\_entries から合計金額（SUM(debit\_amount)など）を計算して表示。
* **機能:**
    * **ListTileタップ:**
        * status \== 'draft' かつ canApprove が true の場合:
            * 「仕訳承認画面 (ApproveJournalScreen)」(3.6) をモーダルで表示する。
    * **FloatingActionButton:**
        * final bool canSubmit \= permissionService.hasPermission(myAppRole, AppPermission.submitJournal);
        * final bool canRegister \= permissionService.hasPermission(myAppRole, AppPermission.registerJournal);
        * if (canSubmit || canRegister) の場合のみ FloatingActionButton を表示。
        * タップすると「仕訳登録画面 (AddJournalScreen)」に遷移。その際、ledger\_id、**ledger\_type**、my\_role を引数として渡す。
    * **\_navigateToContacts (関係者マスタへ移動):**
        * 「関係者マスタ管理画面 (ContactsScreen)」(3.8) に Navigator.push で遷移する。
    * **\_navigateToSettings (設定へ移動):**
        * 「台帳設定・メンバー管理画面 (LedgerSettingsScreen)」(3.7) に Navigator.push で遷移する。

### **3.4. 仕訳登録画面 (AddJournalScreen)**

* **ファイル (推奨):** lib/widgets/add\_journal\_sheet.dart
* **前提:** ledger\_id（organization\_id または election\_id）、**ledger\_type (文字列)**、my\_role (文字列) を受け取る。
* **ロジック:**
    * final AppRole myAppRole \= roleFromString(widget.my\_role);
    * final bool canRegister \= permissionService.hasPermission(myAppRole, AppPermission.registerJournal);
* **レイアウト:**
    * AppBar に Text('新規仕訳の登録') と ElevatedButton
        * ElevatedButton のテキスト: canRegister ? Text('登録 (承認済み)') : Text('承認申請 (起票)')
    * Form ウィジェットでラップされた ListView
    * **入力フォーム:**
        * DatePicker (仕訳日)
        * TextFormField (摘要) \- 例: 「事務所家賃 5月分」
        * SegmentedButton (取引タイプ) \- \_entryType (State変数): expense (支出), revenue (収入), transfer (振替)
        * TextFormField (金額) \- TextInputType.number
        * if (\_entryType \== 'expense'):
            * DropdownButtonFormField (支出科目（借方）)
                * items: \_loadAccounts でロードした account\_type \= 'expense' のリスト
            * DropdownButtonFormField (支払元（貸方）)
                * items: \_loadAccounts でロードした account\_type \= 'asset' のリスト
        * if (\_entryType \== 'revenue'):
            * DropdownButtonFormField (入金先（借方）)
                * items: \_loadAccounts でロードした account\_type \= 'asset' のリスト
            * DropdownButtonFormField (収入科目（貸方）)
                * items: \_loadAccounts でロードした account\_type \= 'revenue' または 'equity' のリスト
        * if (\_entryType \== 'transfer'):
            * DropdownButtonFormField (振替元（貸方）)
                * items: \_loadAccounts でロードした account\_type \= 'asset' のリスト
            * DropdownButtonFormField (振替先（借方）)
                * items: \_loadAccounts でロードした account\_type \= 'asset' のリスト
        * if (widget.ledger\_type \== 'election'):
            * SegmentedButton (区分) \- （選択肢: pre-campaign (立候補準備), campaign (選挙運動)）
        * **関係者 (寄付者/支出先/銀行/借入先):** DropdownButtonFormField
            * items: contactsテーブルから取得。
            * decoration: InputDecoration(labelText: '関係者', suffixIcon: IconButton(icon: Icon(Icons.person\_add), onPressed: \_navigateToContacts))
        * TextFormField (金銭以外の見積の根拠)
        * TextFormField (政党交付金充当額) \- TextInputType.number, デフォルト'0'
        * TextFormField (政党基金充当額) \- TextInputType.number, デフォルト'0'
        * CheckboxListTile(title: Text('領収証を徴し難い'), value: \_isReceiptHardToCollect, ...)
        * if (\_isReceiptHardToCollect): (徴収困難理由のUI)
        * if (\!\_isReceiptHardToCollect): (領収証添付UI)
        * TextFormField (備考) \- maxLines: 3
* **機能:**
    * **\_loadAccounts (データ取得ロジック):**
        * initState で、supabase.from('accounts').select().eq('ledger\_type', widget.ledger\_type) を実行し、勘定科目リストをロードする。
    * **\_navigateToContacts (関係者マスタへ移動):**
        * suffixIconの+ボタンが押されたら、「関係者マスタ管理画面 (ContactsScreen)」(3.8) に Navigator.push で遷移する。
    * **\_saveJournal (保存):**
        *
            1. ユーザーの権限に基づき status を決定。
            * canRegister が true の場合: status \= 'approved', approved\_by\_user\_id \= auth.uid
            * canRegister が false の場合: status \= 'draft', approved\_by\_user\_id \= null
        *
            2. journals テーブルにヘッダ情報（journal\_date, description, status, contact\_id, ledger\_id 等）を insert し、new\_journal\_id を取得。
        *
            3. journal\_entries テーブルに明細を insert（2行）。
            * （例：支出の場合）
            * insert into journal\_entries (journal\_id, account\_id, debit\_amount, credit\_amount)
            * values (new\_journal\_id, (支出科目ID), (金額), 0\)
            * insert into journal\_entries (journal\_id, account\_id, debit\_amount, credit\_amount)
            * values (new\_journal\_id, (支払元ID), 0, (金額))
        *
            4. 領収証ファイルが添付されている場合、Storageにアップロードし、media\_assets に new\_journal\_id を紐付けて保存。
        *
            5. モーダルを閉じる。

### **3.5. メディア（証憑）管理画面**

* **ファイル (推奨):** lib/pages/media\_library\_page.dart
* **前提:** この画面は必ず organization\_id または election\_id の**どちらか一方**を引数として受け取ります。（JournalListScreenから遷移することを想定）
* **レイアウト:**
    * AppBar に Text('領収証ライブラリ')
    * body:
        * GridView.builder を使用し、アップロードされた領収証のサムネイルを一覧表示する。
        * **データ取得:**
            1. まず、引数のorganization\_idまたはelection\_idに紐づくjournalsのリスト（journal\_idのみで可）を取得します。
            2. 次に、取得したjournal\_idのリストに合致するmedia\_assetsのレコードをすべて取得します。（StorageからgetPublicUrlで画像URLも取得）
* **機能:**
    * サムネイルをタップすると、全画面で画像を表示したり、ファイルをダウンロードしたりできます。

### **3.6. （新設）仕訳承認画面 (ApproveJournalScreen)**

「起票」された仕訳（status \== 'draft'）を承認または却下するためのモーダル画面。

* **ファイル (推奨):** lib/widgets/approve\_journal\_sheet.dart
* **前提:** journal\_id を引数として受け取る。
* **レイアウト:**
    * AppBar に Text('仕訳の承認')
    * body:
        * FutureBuilder で journal\_id に紐づく仕訳データ（journals, journal\_entries, contacts, media\_assets）を全て取得する。
        * 登録画面 (3.4) と同様のフォームを表示するが、**すべてのフィールドを読み取り専用 (readOnly: true)** にする。（勘定科目、金額、関係者、添付ファイルなどをすべて表示）
        * Text('起票者: ${profile.full\_name}') を表示。（submitted\_by\_user\_id から profiles を引いて表示）
        * 画面下部に Row でボタンを配置:
            * if (journal.submitted\_by\_user\_id \== auth.uid) (起票者が自分自身の場合):
                * Text('ご自身が起票した取引は承認できません。') を表示。
            * else (起票者が他人の場合):
                * ElevatedButton(child: Text('承認する'), onPressed: \_approve, style: successStyle)
                * OutlinedButton(child: Text('却下する'), onPressed: \_reject, style: errorStyle)
* **機能:**
    * **\_approve (承認):**
        * journals テーブルの該当レコードを update する。
        * status \= 'approved'
        * approved\_by\_user\_id \= auth.uid
        * Navigator.pop() でモーダルを閉じる。
    * **\_reject (却下):**
        * journals テーブルから該当レコードを delete する。（media\_assets も on delete cascade で削除されることが望ましい）
        * Navigator.pop() でモーダルを閉じる。

### **3.7. （新設）台帳設定・メンバー管理画面 (LedgerSettingsScreen)**

* **ファイル (推奨):** lib/pages/ledger\_settings\_page.dart
* **前提:** ledger\_id（organization\_id または election\_id） と my\_role (文字列) を引数として受け取る。（3.3の制御により admin のみアクセス可能）
* **ロジック:**
    * final AppRole myAppRole \= roleFromString(widget.my\_role);
    * final bool canManageMembers \= permissionService.hasPermission(myAppRole, AppPermission.manageMembers);
    * final bool canEditSettings \= permissionService.hasPermission(myAppRole, AppPermission.editLedgerSettings);
* **レイアウト:**
    * AppBar に Text('台帳設定')
    * ListView:
        * ListTile(title: Text('台帳名の変更'), enabled: canEditSettings)
        * Divider()
        * Padding(padding: EdgeInsets.all(16), child: Text('メンバー管理', style: Theme.of(context).textTheme.titleLarge))
        * **メンバー招待UI:**
            * if (canManageMembers) ブロックで表示:
                * TextFormField (Email)
                * DropdownButtonFormField (役割): AppRole.values からリストを生成
                    * items: AppRole.values.map((role) \=\> DropdownMenuItem(value: role.name, child: Text(getRoleDisplayName(role)))).toList()
                * ElevatedButton(child: Text('招待する'), onPressed: \_inviteMember)
        * **メンバー一覧UI:**
            * if (canManageMembers) ブロックで表示:
                * StreamBuilder で ledger\_members を取得（profiles をJOIN）。
                * ListTile:
                    * title: Text(profile.full\_name ?? profile.email)
                    * subtitle: Text(getRoleDisplayName(roleFromString(member.role))) (役割名)
                    * trailing: IconButton(icon: Icon(Icons.delete), onPressed: () \=\> \_removeMember(member.id)) (オーナー自身は削除不可にする)
* **機能:**
    * **\_inviteMember (招待) (OTP方式):**
        * この機能は **Supabase Edge Function** の呼び出しを推奨（auth.admin操作のため）。
        *
            1. Flutterアプリから、入力された Email と選択された role (文字列) を引数として、Edge Function (/invite-user-otp) を呼び出す。
        *
            2. Edge Function側（サーバーサイド）:
            * a. const { data: existingUser } \= await supabase.auth.admin.getUserByEmail(email) でユーザー存在チェック。
            * b. user\_id を取得。もし existingUser がいない場合:
                * const { data: newUser } \= await supabase.auth.admin.createUser({ email: email, email\_confirm: true }) を実行し、**アカウントを強制作成**する。
                * user\_id \= newUser.user.id
            * c. ledger\_members テーブルにレコードを insert する。（user\_id, ledger\_id, role (文字列), invited\_by\_user\_id \= auth.uid）
            * d. **OTP（数字コード）を送信する:**
                * await supabase.auth.signInWithOtp({ email: email }) を（またはパスワードリセットOTPを）実行する。
                * これにより、ディープリンク不要の「**6桁の数字コード**」が記載されたメールがユーザーに送信される。
        *
            3. 招待されたユーザーは、**4.2 招待されたユーザーの初回ログイン** のフローに従い、認証を完了する。
    * **\_removeMember (削除):**
        * ledger\_members テーブルから、該当する id のレコードを delete する。

### **3.8. （新設）関係者マスタ管理画面 (ContactsScreen)**

仕訳登録に必要な「関係者（寄付者・支出先）」を作成・編集・管理する画面。

* **ファイル (推奨):** lib/pages/contacts\_page.dart
* **前提:** 3.3 仕訳一覧画面 または 3.4 仕訳登録画面 から遷移してくる。
* **レイアウト:**
    * AppBar に Text('関係者マスタ')
    * body: StreamBuilder で contacts テーブルから owner\_user\_id が一致するデータを取得し、ListView.builder で表示する。
    * ListTile:
        * title: Text(contact.name)
        * subtitle: Text('${contact.contact\_type \== 'person' ? '個人' : '法人/団体'} / ${contact.address ?? '住所未設定'}')
        * trailing: Icon(Icons.edit)
    * FloatingActionButton: Icon(Icons.add) を配置。
* **機能:**
    * **ListTileタップ (編集):**
        * タップすると、「関係者登録・編集画面 (AddContactSheet)」(3.9) をモーダルで表示する。引数として contact オブジェクトを渡す。
    * **FABタップ (新規):**
        * タップすると、「関係者登録・編集画面 (AddContactSheet)」(3.9) をモーダルで表示する。（引数なし）

### **3.9. （新設）関係者登録・編集画面 (AddContactSheet) (【v3.6 更新】)**

関係者の詳細情報とプライバシー設定を入力するモーダル。

* **ファイル (推奨):** lib/widgets/add\_contact\_sheet.dart
* **前提:** （任意）編集対象の contact オブジェクトを受け取る。
* **レイアウト:**
    * AppBar に Text('関係者の登録') と ElevatedButton(child: Text('保存'))
    * Form ウィジェットでラップされた ListView:
        * **注記 (変更):** フォームの上部 (または name フィールドの下) に、「自己資金 の仕訳を登録する場合はご自身（候補者・代表者）を『個人』として登録してください。

          **『みずほ銀行』『〇〇信用金庫』などの銀行口座や借入先**も、『法人/団体』としてここから登録してください。」といった案内文を表示する。
        * SegmentedButton (種別): person (個人) / corporation (法人/団体)。（\_contactType State変数）
        * TextFormField (氏名 / 団体名)
        * CheckboxListTile(title: Text('氏名/団体名を非公開にする'), value: \_isNamePrivate, ...)
        * TextFormField (住所)
        * CheckboxListTile(title: Text('住所を非公開にする'), value: \_isAddressPrivate, ...)
        * if (\_contactType \== 'person'):
            * TextFormField (職業)
            * CheckboxListTile(title: Text('職業を非公開にする'), value: \_isOccupationPrivate, ...)
        * Divider()
        * if (\_isNamePrivate || \_isAddressPrivate || \_isOccupationPrivate): (非公開設定が1つでもある場合)
            * Text('非公開理由 (必須)')
            * DropdownButtonFormField (理由): personal\_info (個人情報保護のため) / other (その他)
            * if (\_privacyReasonType \== 'other'):
                * TextFormField (その他の理由を具体的に入力)
* **機能:**
    * **\_saveContact (保存):**
        * owner\_user\_id \= auth.uid を設定する。
        * フォームのバリデーション（非公開設定がONなのに理由が未入力、など）を実行。
        * contacts テーブルに insert または update を実行する。
        * Navigator.pop() でモーダルを閉じる。

## **4\. 認証フロー仕様 (【v3.3 新規】)**

アカウント管理と認証は、ディープリンク不要の「OTP（ワンタイムパスコード）」方式を前提として実装する。

### **4.1. 新規アカウント作成（マスターアカウント）**

* **ファイル (推奨):** lib/pages/signup\_page.dart
* **機能:**
    *
        1. ユーザーが Email, Password, 氏名 を入力して「登録」ボタンを押下。
    *
        2. supabase.auth.signUp() を実行。（data: {'full\_name': fullName} も同時に渡し、auth.users.raw\_user\_meta\_data に保存する）
    *
        3. SupabaseからOTP（数字コード）付きの確認メールが送信される。
    *
        4. アプリはOTP入力画面に遷移。
    *
        5. ユーザーがメールで受信したOTPコードを入力し supabase.auth.verifyOtp(email: email, token: otp, type: OtpType.signup) を実行して認証を完了する。
    *
        6. （SupabaseのAuthトリガー（README.md参照）により、profilesテーブルにもfull\_name, emailが自動でコピーされる）

### **4.2. 招待されたユーザーの初回ログイン**

* **ファイル (推奨):** lib/pages/login\_page.dart (または専用の lib/pages/invited\_user\_login\_page.dart)
* **前提:** 招待されたユーザーは、3.7 のフローにより、パスワード未設定のアカウントが作成され、OTPコード付きのメールを受信している。
* **レイアウト:**
    * login\_page.dart に「招待された方はこちら」などのタブ/ボタンを追加する。
    * 遷移先の画面（またはタブ）に以下のフォームを設置する。
        * TextFormField (Email)
        * TextFormField (受信したOTPコード)
        * TextFormField (新しいパスワード)
        * TextFormField (新しいパスワードの確認)
* **機能:**
    *
        1. ユーザーがEmailとOTPコードを入力し「認証」ボタンを押下。
    *
        2. supabase.auth.verifyOtp(email: email, token: otp, type: OtpType.invite) （または OtpType.recovery）を実行し、OTP認証を行う。
    *
        3. 認証が成功したら、続けて入力された「新しいパスワード」を使い supabase.auth.updateUser() を実行し、パスワードを設定する。
    *
        4. パスワード設定後、HomePage (台帳選択画面) に遷移する。

### **4.3. パスワードリセット**

* **ファイル (推奨):** lib/pages/login\_page.dart
* **機能:**
    *
        1. ログイン画面に「パスワードをお忘れですか？」リンクを設置。
    *
        2. タップすると AlertDialog または別画面で Email 入力欄を表示。
    *
        3. supabase.auth.resetPasswordForEmail(email) を実行。（**注意:** Supabase側で「OTPを使用する」設定が有効になっている必要がある）
    *
        4. SupabaseからOTP（数字コード）付きのパスワードリセットメールが送信される。
    *
        5. ユーザーは 4.2 と同様の「Email \+ OTP \+ 新パスワード」入力フォームを使い、パスワードをリセットする。（verifyOtp の type は OtpType.recovery を使用）

## **5\. アウトプット仕様（将来機能） (【v3.6 更新】)**

Polimoney互換JSONをエクスポートする際、仕訳データ（journals, journal\_entries）と、勘定科目（accounts）、関係者（contacts）をJOINする。

* **「自己資金」の判別:**
    * アウトプット（Polimoney）側は、journal\_entries が accounts.account\_name \= '自己資金' の account\_id に紐づいているか否かで、その取引が自己資金であるかを明確に判別できる。
* **「銀行口座別」の集計:**
    * アウトプット（Polimoney）側は、journals.contact\_id と contacts.name \= 'みずほ銀行' を紐付けることで、accounts.account\_name \= '普通預金' の内訳（補助科目）として残高を追跡できる。
* **関係者情報の匿名化:**
    * contacts.contact\_type (person / corporation) は**常に公開**する。
    * contacts.name は、is\_name\_private \== true の場合、null または「非公開」という文字列で上書きする。
    * contacts.address は、is\_address\_private \== true の場合、null または「非公開」という文字列で上書きする。
    * contacts.occupation は、is\_occupation\_private \== true の場合、null または「非公開」という文字列で上書きする。
    * 非公開項目が1つでもある場合、privacy\_reason\_type と privacy\_reason\_other の内容もエクスポート対象に含める。

