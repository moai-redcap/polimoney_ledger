# 識別子設計書 - Polimoney 連携

## 1. 背景と課題

### 1.1. 現状の問題

| 問題 | 詳細 |
|------|------|
| 識別子の分散 | 政治家・政治団体・選挙の識別子が Polimoney と別々に管理されている |
| contact_id の誤用 | 「自分自身」を contact（関係者）として登録する設計は不自然 |
| SaaS 化の課題 | DD2030 ホスティングに伴い、Auth/アカウント設計の見直しが必要 |

### 1.2. 目標

1. **Polimoney との識別子共通化**: 政治家・政治団体・選挙の識別子を Azure DB で一元管理
2. **contact_id の正しい使い方**: 外部関係者（寄附者・支出先）のみに限定
3. **SaaS 化対応**: DD2030 ホスティング前提の Auth/アカウント設計

---

## 2. 識別子アーキテクチャ

### 2.1. データの配置

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure DB (共通識別子)                     │
│              ← Polimoney / Polimoney Ledger 共有            │
├─────────────────────────────────────────────────────────────┤
│ politicians        │ 政治家マスタ                           │
│ political_orgs     │ 政治団体マスタ                         │
│ elections          │ 選挙マスタ                             │
│ constituencies     │ 選挙区マスタ                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 参照 (politician_id, org_id, election_id)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Cloud (ユーザーデータ)           │
│              ← Polimoney Ledger 専用                        │
├─────────────────────────────────────────────────────────────┤
│ auth.users         │ ユーザー認証                           │
│ profiles           │ ユーザープロファイル                   │
│ ledgers            │ 台帳（政治家/政治団体への参照を持つ）  │
│ journals           │ 仕訳データ                             │
│ journal_entries    │ 仕訳明細                               │
│ contacts           │ 外部関係者（寄附者・支出先のみ）       │
│ sub_accounts       │ 補助科目                               │
│ media_assets       │ 領収証等                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. 識別子の形式

| 識別子 | 形式 | 保存先 | 例 |
|--------|------|--------|-----|
| 政治家 ID | UUID v4 | Azure DB | `987fcdeb-51a2-4abc-...` |
| 政治団体 ID | UUID v4 | Azure DB | `123e4567-e89b-4abc-...` |
| 選挙 ID | `{type}-{area}-{date}` | Azure DB | `HR-13-01-20241027` |
| ユーザー ID | UUID v4 | Supabase Auth | `auth.uid()` |
| 台帳 ID | UUID v4 | Supabase | `ledgers.id` |

### 2.3. 選挙 ID の形式詳細

```
{type}-{area}-{date}

type:   HR (衆議院), HC (参議院), PG (都道府県議会), 
        CM (市区町村議会), GM (首長選)
area:   都道府県コード(2桁) + 選挙区番号(2桁)
date:   投開票日 (YYYYMMDD)

例: HR-13-01-20241027 = 衆議院 東京都 第1区 2024年10月27日
```

---

## 3. アカウント・認証設計

### 3.1. ユーザーと政治家の関係

```
┌─────────────────────────────────────────────────────────────┐
│ Azure DB                                                    │
│ ┌─────────────────┐                                         │
│ │ politicians     │ ← 政治家マスタ（公開情報）              │
│ │ - id (UUID)     │                                         │
│ │ - name          │                                         │
│ │ - ...           │                                         │
│ └────────┬────────┘                                         │
└──────────│──────────────────────────────────────────────────┘
           │
           │ politician_id (参照)
           ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase                                                    │
│ ┌─────────────────┐     ┌─────────────────┐                 │
│ │ auth.users      │────→│ profiles        │                 │
│ │ - id (UUID)     │     │ - user_id (FK)  │                 │
│ │ - email         │     │ - politician_id │ ← Azure参照     │
│ │ - ...           │     │ - full_name     │                 │
│ └─────────────────┘     │ - plan          │                 │
│                         └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. 新規登録フロー

```
1. ユーザーがメールアドレスで登録
   └→ Supabase Auth: auth.users にレコード作成

2. OTP 認証完了
   └→ profiles テーブルにレコード作成

3. プラン選択（Free / 選挙 / 議員 / 政党）
   └→ profiles.plan を更新

4. 政治家 ID 発行（Free以上）
   └→ Azure DB: politicians に新規レコード作成
   └→ profiles.politician_id を更新

5. 台帳作成（選挙プラン以上）
   └→ ledgers テーブルに台帳作成
   └→ politician_id / org_id を紐付け
```

### 3.3. 認証方式

| 項目 | 方式 | 備考 |
|------|------|------|
| 新規登録 | Email + OTP | ディープリンク不要 |
| ログイン | Email + Password / OTP | 選択可能 |
| 2段階認証 | TOTP (Google Authenticator等) | 将来実装 |
| パスワードリセット | OTP | メール送信 |

---

## 4. contacts テーブルの役割変更

### 4.1. 変更前

```
contacts:
- 寄附者（個人・法人）
- 支出先
- 銀行・借入先
- 自分自身（政治家本人）← 不自然 ❌
```

### 4.2. 変更後

```
contacts:
- 寄附者（個人・法人）
- 支出先
- 銀行・借入先

※ 政治家本人は profiles.politician_id で管理
※ 「自己資金」の仕訳は contact_id = NULL（振替扱い）
```

### 4.3. 「自己資金」の仕訳パターン

```sql
-- 変更前: 自分自身を contact に登録 ❌
INSERT INTO journals (contact_id, ...) VALUES ('自分のcontact_id', ...);

-- 変更後: contact_id = NULL ✅
INSERT INTO journals (contact_id, ...) VALUES (NULL, ...);
-- journal_entries で REV_SELF_FINANCING を使用
```

---

## 5. 実装タスク

### Phase 1: 設計確定
- [ ] Azure DB のスキーマ設計（Polimoney チームと合意）
- [ ] 選挙 ID の形式確定（合同選挙区等の特殊ケース対応）
- [ ] profiles テーブルの拡張設計

### Phase 2: Azure DB 構築
- [ ] Azure PostgreSQL / Cosmos DB の選定
- [ ] 識別子マスタテーブル作成
- [ ] Polimoney との API 設計

### Phase 3: Supabase 変更
- [ ] profiles テーブルに politician_id カラム追加
- [ ] ledgers テーブルの参照を Azure DB に変更
- [ ] contacts の使用ガイドライン更新

### Phase 4: アプリケーション実装
- [ ] 新規登録フローの実装
- [ ] プラン選択 UI
- [ ] 政治家 ID 発行ロジック

---

## 6. 未決定事項

| 項目 | 選択肢 | 決定期限 |
|------|--------|----------|
| Azure DB の種類 | PostgreSQL / Cosmos DB | 要検討 |
| API 認証方式 | JWT / API Key | 要検討 |
| 識別子の不変性 | 変更可 / 不変 | 要検討 |
| 既存データの移行 | マイグレーション方針 | 要検討 |

---

## 更新履歴

- 初版作成

