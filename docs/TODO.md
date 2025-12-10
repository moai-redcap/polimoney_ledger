# 開発 TODO リスト

## 🔴 高優先度

### 仕訳登録画面 (`add_journal_sheet.dart`) の改修

現在の実装と DB スキーマ（`journals` + `journal_entries` テーブル）の間に不整合があります。

#### 未実装フィールド（journals テーブル）

| フィールド                       | DB 型   | 説明                                   | 現状        |
| -------------------------------- | ------- | -------------------------------------- | ----------- |
| `classification`                 | text    | 選挙運動区分 (pre-campaign / campaign) | ✅ 実装済み |
| `non_monetary_basis`             | text    | 金銭以外の見積の根拠                   | ✅ 実装済み |
| `notes`                          | text    | 備考                                   | ✅ 実装済み |
| `amount_political_grant`         | integer | 政党交付金充当額                       | ✅ 実装済み |
| `amount_political_fund`          | integer | 政党基金充当額                         | ✅ 実装済み |
| `is_receipt_hard_to_collect`     | boolean | 領収証徴収困難フラグ                   | ✅ 実装済み |
| `receipt_hard_to_collect_reason` | text    | 領収証徴収困難理由                     | ✅ 実装済み |

#### 未実装フィールド（journal_entries テーブル）

| フィールド       | DB 型 | 説明        | 現状        |
| ---------------- | ----- | ----------- | ----------- |
| `sub_account_id` | uuid  | 補助科目 ID | ✅ 実装済み |

#### その他の未実装機能

- [x] `_saveJournal()` メソッドが空（`/* TODO */`）で、実際に DB へ保存されない → **実装済み**
- [ ] 複数行の支払元（複合仕訳）対応（仕様書 v3.8）
- [ ] 領収証添付（media_assets テーブル連携）
- [x] 関係者追加ボタン（`suffixIcon`）の遷移先 → **実装済み**

### 振替時の `contact_id` 必須問題

- [ ] 振替（資産 → 資産の移動）の場合、`contact_id` が必須になっているのは不適切
  - 自分の資産間の移動に「関係者」は不要
  - **選択肢 A:** DB スキーマを変更して `contact_id` を NULL 許容にする
  - **選択肢 B:** 「自分自身」を関係者として登録してもらう運用にする（現状の仕様書はこちら）
  - **要検討:** SPECIFICATION_AGENT.md で仕様を整理する

### 領収証添付機能

- [ ] `media_assets` テーブルとの連携（Supabase Storage）
- [ ] 仕訳登録画面に添付 UI を追加
- [ ] 仕訳一覧・詳細画面で添付ファイル表示

### 【保留】Polimoney 連携 - 選挙識別子

- **ステータス:** Polimoney 側に方針を提案するため、提案内容を考える。
- **課題:** `city_code` + 年月日だけでは選挙を一意に特定できない
  - 参議院合同選挙区（鳥取・島根、徳島・高知）
  - 衆院選・参院選・地方選で選挙区定義が異なる
- **詳細:** `docs/SPECIFICATION_AGENT.md` を参照

### 勘定科目マスタの拡充

- **ステータス:** SPECIFICATION_AGENT.md に全科目を記載済み（v3.11）
- [ ] README.md の SQL を更新（account_master への INSERT 文を追加）
- [ ] Supabase の account_master テーブルにデータ追加
- **詳細:** `docs/SPECIFICATION_AGENT.md` の「2.1.1. 静的勘定科目マスタ」を参照

#### 対応する仕様書セクション

- SPECIFICATION.md: 3.4. 仕訳登録画面 (AddJournalScreen)

---

## 🟡 中優先度

### 仕訳承認画面 (`ApproveJournalScreen`)

- [ ] 仕様書 3.6 に基づき新規作成
- [ ] draft ステータスの仕訳を承認/却下する UI
- [ ] `journal_list_page.dart` からの遷移を実装

### 台帳設定・メンバー管理画面 (`LedgerSettingsScreen`)

- [ ] 仕様書 3.7 に基づき新規作成
- [ ] メンバー招待機能（OTP 方式）
- [ ] `journal_list_page.dart` からの遷移を実装

---

## 🟢 低優先度

### deprecated API の修正

- [ ] `add_journal_sheet.dart`: `value` → `initialValue` への変更（Flutter 3.33.0+）
- [ ] `add_ledger_sheet.dart`: 同上

### パスワードリセット機能

- [ ] 仕様書 4.3 に基づき実装

### メディア（証憑）管理画面

- [ ] 仕様書 3.5 に基づき新規作成

### Polimoney JSON エクスポート

- [ ] 仕様書 5 に基づき実装

---

## ✅ 完了

- [x] 関係者マスタ管理画面 (`ContactsPage`) - 実装完了
  - `lib/features/contacts/presentation/pages/contacts_page.dart`
  - 関係者一覧表示、削除機能
- [x] 関係者登録・編集画面 (`AddContactSheet`) - 実装完了
  - `lib/features/contacts/presentation/widgets/add_contact_sheet.dart`
  - 個人/法人種別、氏名、住所、職業入力
  - プライバシー設定（非公開フラグ、理由）
- [x] 仕訳一覧画面から関係者マスタへの遷移 - 実装完了
