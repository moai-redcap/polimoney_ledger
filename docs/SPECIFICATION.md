# **Polimoney Ledger \- 機能仕様書 (v2.4 完全版)**

## **1\. 機能概要 (Feature Overview)**

この機能は、政治団体や候補者の会計担当者を対象としています。  
会計担当者が、自身が管理する\*\*「政治団体」または「政治家（候補者）」を登録し、それぞれに紐づく「選挙」\*\*の台帳を作成します。そして、\*\*台帳ごと（政治団体 / 選選挙）\*\*に日々の収入と支出を、\*\*収支報告書の要件（寄付者・支出先の情報、交付金充当額、領収証情報を含む）\*\*に合わせて入力・一覧管理できるようにすることを目的とします。

## **2\. データモデル (Data Model)**

アーキテクチャの変更に伴い、管理主体を「政治団体」「政治家」「選挙」の3つに明確に分離します。  
さらに、収支の相手方（寄付者・支出先）を管理する「関係者」テーブルと、証憑ファイルを管理する「メディア」テーブルを新設します。

### **2.1. 政治団体テーブル**

ユーザーが管理する政治団体を登録します。

* **テーブル名:** political\_organizations

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (政治団体ID) | 主キー, uuid\_generate\_v4() |
| user\_id | uuid | このレコードの管理ユーザーID | auth.users.idへの参照 (RLS用) |
| name | text | 政治団体の名称 | 必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.2. 政治家テーブル**

ユーザーが管理する政治家（候補者）を登録します。

* **テーブル名:** politicians

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (政治家ID) | 主キー, uuid\_generate\_v4() |
| user\_id | uuid | このレコードの管理ユーザーID | auth.users.idへの参照 (RLS用) |
| name | text | 政治家の氏名 | 必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.3. 選挙テーブル**

「選挙」台帳を登録します。必ず特定の「政治家」に紐づきます。

* **テーブル名:** elections

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (選挙ID) | 主キー, uuid\_generate\_v4() |
| user\_id | uuid | このレコードの管理ユーザーID | auth.users.idへの参照 (RLS用) |
| politician\_id | uuid | 紐づく政治家のID | politicians.idへのFK。必須 |
| election\_name | text | 選挙の名称 | 必須。例: 「2025年 〇〇市議会議員選挙」 |
| election\_date | date | 選挙の投開票日 | 必須 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.4. 関係者テーブル**

収支の相手方（寄付をした者、支出を受けた者）の情報を管理するマスターテーブル。

* **テーブル名:** contacts

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID (関係者ID) | 主キー, uuid\_generate\_v4() |
| user\_id | uuid | このレコードの管理ユーザーID | auth.users.idへの参照 (RLS用) |
| name | text | 氏名 又は 団体名 | 必須 |
| address | text | 住所 | NULL許容 |
| occupation | text | 職業 | NULL許容 |
| created\_at | timestamptz | レコード作成日時 | デフォルトで now() |

### **2.5. 収支テーブル**

収支は、特定の「台帳」と、特定の「関係者」に紐づきます。

* **テーブル名:** transactions

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID | 主キー |
| created\_at | timestamptz | レコード作成日時 | now() |
| user\_id | uuid | 作成したユーザーのID | auth.users.idへの参照 (RLS用) |
| organization\_id | uuid | 紐づく政治団体のID | **NULL許容**, political\_organizations.idへのFK |
| election\_id | uuid | 紐づく選挙台帳のID | **NULL許容**, elections.idへのFK |
| contact\_id | uuid | **紐づく関係者ID** | **NULL許容** (例: 自己資金), contacts.idへのFK |
| transaction\_date | date | 取引が発生した日付 | 必須 |
| type | text | 収支の種別 | income (収入) or expense (支出)。必須 |
| classification | text | **選挙運動**の活動区分 | pre-campaign (立候補準備), campaign (選挙運動)。election\_idが設定されている場合のみ使用 |
| amount | integer | 金額 (円) | 必須。正の整数 |
| purpose | text | **支出の目的** / 収入の概要 | **type='expense' の場合は必須。**type='income' の場合はNULL許容 |
| category | text | 分類（費目・収入種別） | 必須。選択肢は台帳種別に応じて変動 |
| non\_monetary\_basis | text | **金銭以外の見積の根拠** | NULL許容。例: 「看板1枚」 |
| notes | text | 備考 | 任意入力。NULL許容 |
| amount\_political\_grant | integer | **政党交付金充当額** | 【v2.3追加】NULL許容, デフォルト0 |
| amount\_political\_fund | integer | **政党基金充当額** | 【v2.3追加】NULL許容, デフォルト0 |
| is\_receipt\_hard\_to\_collect | boolean | **領収証徴収困難フラグ** | 【v2.3追加】必須, デフォルト false |
| receipt\_hard\_to\_collect\_reason | text | **領収証徴収困難理由** | 【v2.3追加】NULL許容。例: 「振込のため」「その他：(自由記述)」 |

### **2.6. メディア（証憑）テーブル (【v2.4 新規】)**

領収証などの証憑ファイルを管理します。Supabase Storageと連携します。

* **テーブル名:** media\_assets

| 列名 (Column Name) | データ型 (Data Type) | 説明 (Description) | 備考 (Notes) |
| :---- | :---- | :---- | :---- |
| id | uuid | 一意なID | 主キー, uuid\_generate\_v4() |
| user\_id | uuid | アップロードしたユーザーID | auth.users.idへの参照 (RLS用) |
| transaction\_id | uuid | 紐づく収支レコードID | transactions.idへのFK |
| storage\_path | text | Storage内のファイルパス | 必須。例: public/user\_id/tx\_id/file.jpg |
| file\_name | text | 元のファイル名 | 必須 |
| mime\_type | text | ファイルのMIMEタイプ | 必須。例: image/jpeg |
| created\_at | timestamptz | アップロード日時 | デフォルトで now() |

## **3\. 画面仕様 (Screen Specifications)**

### **3.1. 台帳選択画面 (LedgerSelectionScreen)**

ログイン後、ユーザーが操作対象とする台帳（「政治団体」または「選挙」）を選択する画面。

* **ファイル (推奨):** lib/pages/home\_page.dart
* **レイアウト:**
    * AppBar の title に Text('台帳選択') を表示。
    * AppBar の bottom に TabBar を配置し、「政治団体」と「選挙」の2つのタブを設ける。
    * body に TabBarView を配置。
    * **「政治団体」タブ:**
        * StreamBuilder で political\_organizations テーブルから user\_id が一致するデータを取得し、ListView.builder で表示する。
        * ListTile:
            * title: Text(organization.name)
            * trailing: Icon(Icons.arrow\_forward\_ios)
    * **「選挙」タブ:**
        * StreamBuilder で elections テーブルから user\_id が一致するデータを取得（politiciansテーブルとJOINして政治家名も取得）。
        * ListView.builder で表示する。
        * ListTile:
            * title: Text(election.election\_name)
            * subtitle: Text('${politician.name} / ${election.election\_date}')
            * trailing: Icon(Icons.arrow\_forward\_ios)
    * FloatingActionButton: Icon(Icons.add) を配置。
* **機能:**
    * いずれかのタブの ListTile をタップすると、その台帳のID（organization\_id または election\_id）を引数として「収支一覧画面 (TransactionListScreen)」に Navigator.push で遷移する。
    * FloatingActionButton をタップすると、「台帳登録画面 (AddLedgerScreen)」をモーダル (showModalBottomSheet) で表示する。

### **3.2. 台帳登録画面 (AddLedgerScreen)**

新しい「政治団体」または「選挙」の台帳を登録するためのモーダル画面。

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
                * items: politicians テーブルから user\_id が一致するリストを取得して表示。
                * decoration: InputDecoration(labelText: '政治家', suffixIcon: IconButton(icon: Icon(Icons.person\_add), onPressed: \_addNewPolitician))
            * TextFormField (選挙名) \- decoration: InputDecoration(labelText: '選挙名 (例: 2025年〇〇市議選)')
            * DatePicker (選挙の投開票日)
* **機能:**
    * **\_saveLedger (保存):**
        * 選択された \_ledgerType に応じて、対応するテーブル (political\_organizations または elections) に insert を実行する。
        * elections を保存する際は、ドロップダウンで選択された politician\_id を含める。
        * 保存後、モーダルを閉じる (Navigator.pop)。
    * **\_addNewPolitician (新規政治家追加):**
        * suffixIcon の \+ ボタンが押されたら、小さなアラートダイアログ（AlertDialog）を表示する。
        * ダイアログには TextFormField (政治家名)と「追加」ボタンを配置。
        * 「追加」ボタンでpoliticians テーブルに新しい政治家を保存し、ダイアログを閉じる。
        * DropdownButtonFormField の政治家リストが自動でリフレッシュされ、今追加した政治家が選択状態になる。

### **3.3. 収支一覧画面 (TransactionListScreen)**

特定の台帳（政治団体または選挙）に紐づく収支の一覧を表示します。

* **ファイル (推奨):** lib/pages/transaction\_list\_page.dart
* **前提:** この画面は必ず organization\_id または election\_id の**どちらか一方**を引数として受け取ります。
* **レイアウト:**
    * AppBar の title に、選択された台帳名を表示する。（AppBar内で StreamBuilder を使い、引数のIDから台帳名を取得）
    * body: StreamBuilder を使用。
        * **データ取得:** transactionsテーブルから、引数のorganization\_idまたはelection\_idが一致するレコードを取得する。その際、contact\_idを使ってcontactsテーブルと**JOIN**し、関係者名(contacts.name)も同時に取得する必要があります。
    * ListView.builder:
        * ListTile:
            * title: Text(transaction.purpose ?? '概要なし') (目的または概要)
            * subtitle: Text('${transaction.category} / ${contact.name ?? '関係者未設定'}') (分類 / 関係者名)
            * leading: Text(transaction.date) (日付。DateFormatなどで MM/dd にフォーマット)
            * trailing: Text('¥${transaction.amount}', style: TextStyle(color: transaction.type \== 'income' ? Colors.green : Colors.red)) (金額。収入/支出で色分け)
    * FloatingActionButton: Icon(Icons.add) を配置。
* **機能:**
    * FloatingActionButton をタップすると、「収支登録画面 (AddTransactionScreen)」にモーダル (showModalBottomSheet) で遷移する。その際、現在開いている台帳のID（organization\_id または election\_id）を引数として渡す。

### **3.4. 収支登録画面 (AddTransactionScreen)**

特定の台帳に収支を登録します。

* **ファイル (推奨):** lib/widgets/add\_transaction\_sheet.dart
* **前提:** この画面は必ず organization\_id または election\_id の**どちらか一方**を引数として受け取ります。
* **レイアウト:**
    * AppBar に Text('新規収支の登録') と ElevatedButton(child: Text('保存'))
    * Form ウィジェットでラップされた ListView (スクロール可能にするため)
    * **入力フォーム:**
        * DatePicker (取引日)
        * SegmentedButton (種別: 収入/支出) \- \_transactionType (State変数) に連動
        * TextFormField (金額) \- TextInputType.number
        * SegmentedButton (区分) \- **election\_idが引数の場合のみ表示**（選択肢: pre-campaign (立候補準備), campaign (選挙運動)）
        * DropdownButtonFormField (分類) \- (引数の台帳種別(organization\_id / election\_id)に応じて選択肢を動的に変更)
        * **if (\_transactionType \== TransactionType.expense):**
            * TextFormField (目的) \- decoration: InputDecoration(labelText: '目的 (必須)'), **必須バリデーション**
        * **else (収入の場合):**
            * TextFormField (概要) \- decoration: InputDecoration(labelText: '概要 (任意)'), 任意入力
        * **関係者 (寄付者/支出先):** DropdownButtonFormField
            * items: contactsテーブルからuser\_idが一致するリストを取得して表示。
            * decoration: InputDecoration(labelText: '関係者 (寄付者/支出先)', suffixIcon: IconButton(icon: Icon(Icons.person\_add), onPressed: \_addNewContact))
            * (※「自己資金」など、contact\_idがNULLになるケースもUIで考慮が必要。ドロップダウンの選択肢に「なし(自己資金等)」を含めるか、別チェックボックスで対応)
        * TextFormField (金銭以外の見積の根拠) \- decoration: InputDecoration(labelText: '金銭以外の見積の根拠 (任意)')
        * **充当額:**
            * TextFormField (政党交付金充当額) \- TextInputType.number, デフォルト'0'
            * TextFormField (政党基金充当額) \- TextInputType.number, デフォルト'0'
        * **領収証情報:**
            * CheckboxListTile(title: Text('領収証を徴し難い'), value: \_isReceiptHardToCollect, ...)
            * if (\_isReceiptHardToCollect):
                * DropdownButtonFormField (理由) \- items: \['振込のため', 'その他'\]
                * if (\_reason \== 'その他'):
                    * TextFormField (具体的理由) \- decoration: InputDecoration(labelText: '具体的理由')
            * if (\!\_isReceiptHardToCollect): **(領収証添付UI)**
                * OutlinedButton.icon(icon: Icon(Icons.attach\_file), label: Text('領収証ファイルを添付'), onPressed: \_pickFile)
                * ListView (添付されたファイル（画像/PDF）のサムネイルとファイル名、削除ボタンを表示する)
        * TextFormField (備考) \- decoration: InputDecoration(labelText: '備考 (任意)'), maxLines: 3
* **機能 (データ保存):**
    * \_saveTransaction メソッド:
        *
            1. 最初にtransactionsテーブルにデータをinsertし、**新しいtransaction\_idを取得**します。（このinsertにはorganization\_id or election\_id, contact\_id, purpose, amountなどすべてのデータを含めます）
        *
            2. \_pickFileでStateに保持されている添付ファイルリスト（List\<File\>）をループ処理します。
        *
            3. 各ファイルを、transaction\_idを含めたパス（例: user\_id/transaction\_id/file\_name.jpg）で **Supabase Storageにアップロード**します。
        *
            4. アップロードが成功したら、そのstorage\_pathやfile\_name、transaction\_idを使ってmedia\_assetsテーブルにレコードをinsertします。
        *
            5. 全ての処理が完了したら、モーダルを閉じます。
    * **\_addNewContact (新規関係者追加):**
        * suffixIconの+ボタンが押されたら、小さなアラートダイアログ（AlertDialog）を表示する。
        * ダイアログにはTextField（氏名/団体名）、TextField（住所）、TextField（職業）と「追加」ボタンを配置。
        * 「追加」ボタンでcontactsテーブルに新しい関係者を保存し、ダイアログを閉じる。
        * DropdownButtonFormFieldの関係者リストが自動でリフレッシュされ、今追加した関係者が選択状態になる。
    * **\_pickFile (ファイル選択):**
        * file\_picker などのパッケージを使用し、画像やPDFを選択できるようにします。
        * 選択されたファイルをState変数（List\<File\>）に追加し、UIを更新（サムネイル表示）します。

### **3.5. メディア（証憑）管理画面 (【v2.4 新規】)**

台帳に紐づく、アップロード済みの領収証ファイルを一覧・管理する画面です。

* **ファイル (推奨):** lib/pages/media\_library\_page.dart
* **前提:** この画面は必ず organization\_id または election\_id の**どちらか一方**を引数として受け取ります。（TransactionListScreenから遷移することを想定）
* **レイアウト:**
    * AppBar に Text('領収証ライブラリ')
    * body:
        * GridView.builder を使用し、アップロードされた領収証のサムネイルを一覧表示する。
        * **データ取得:**
            1. まず、引数のorganization\_idまたはelection\_idに紐づくtransactionsのリスト（transaction\_idのみで可）を取得します。
            2. 次に、取得したtransaction\_idのリストに合致するmedia\_assetsのレコードをすべて取得します。（StorageからgetPublicUrlで画像URLも取得）
* **機能:**
    * サムネイルをタップすると、全画面で画像を表示したり、ファイルをダウンロードしたりできます。
    * （将来的に）どのtransactionにも紐づいていない孤立したファイルを削除する機能などを追加します。