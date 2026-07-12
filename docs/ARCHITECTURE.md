# Polimoney Ledger - アーキテクチャ設計

## 1. システム概要

> ⚠️ **重要**: Ledger と Hub は **別々の Supabase プロジェクト**
> を使用しています。
>
> | プロジェクト                    | 用途                                         |
> | ------------------------------- | -------------------------------------------- |
> | **🅰️ Supabase A (Ledger 専用)** | 政治家のプライベートデータ、認証、領収書保存 |
> | **🅱️ Supabase B (Hub 専用)**    | 共通識別子、公開データ、管理者認証           |

```
┌─────────────────────────────────────────────────────────────┐
│                   Fresh (Deno)                               │
│                   (フロントエンド)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────────┐         ┌───────────────────────────────┐
│  Supabase Edge    │         │      Supabase Realtime        │
│  Functions (API)  │         │        (WebSocket)            │
│  - Hono + Deno    │         │  - 仕訳変更のリアルタイム通知 │
└─────────┬─────────┘         └───────────────┬───────────────┘
          │                                   │
          └───────────────┬───────────────────┘
                          ▼
          ┌───────────────────────────────────────────────────┐
          │  🅰️ Supabase Project A (Ledger 専用)              │
          │  ┌─────────────────────────────┐                  │
          │  │ [PostgreSQL]                │                  │
          │  │ - journals (仕訳)           │                  │
          │  │ - journal_entries (明細)    │                  │
          │  │ - contacts (関係者)         │                  │
          │  │ - sub_accounts (補助科目)   │                  │
          │  │ - ledgers (台帳)            │                  │
          │  └─────────────────────────────┘                  │
          │  ┌─────────────────────────────┐                  │
          │  │ [Supabase Auth]             │                  │
          │  │ - OTP 認証（政治家向け）    │                  │
          │  └─────────────────────────────┘                  │
          │  ┌─────────────────────────────┐                  │
          │  │ [Supabase Storage]          │                  │
          │  │ - 領収書画像                │                  │
          │  └─────────────────────────────┘                  │
          └───────────────────────────────────────────────────┘
                          │
                          │ API 連携 (X-API-Key)
                          ▼
          ┌───────────────────────────────────────────────────┐
          │              Polimoney Hub (API)                  │
          │  - 共通識別子取得 (GET /api/v1/elections 等)      │
          │  - 公開データ同期 (POST /api/v1/sync)             │
          │                                                   │
          │  → 🅱️ Supabase Project B (Hub 専用) に接続       │
          └───────────────────────────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────────────────────────┐
          │              Polimoney (可視化)                   │
          │  - Hub API から公開データを取得                   │
          └───────────────────────────────────────────────────┘
```

---

## 2. 技術スタック

### 2.1. フロントエンド

| 項目           | 選択                  | 理由                                       |
| -------------- | --------------------- | ------------------------------------------ |
| フレームワーク | **Fresh (Deno)**      | Deno ネイティブ、Islands Architecture、SSR |
| UI             | Preact + Tailwind CSS | 軽量、高速                                 |
| ホスティング   | **Deno Deploy**       | Fresh と最適化、グローバルエッジ配信       |

### 2.2. バックエンド API

| 項目           | 選択                               | 理由                                 |
| -------------- | ---------------------------------- | ------------------------------------ |
| ランタイム     | **Deno (Supabase Edge Functions)** | TypeScript ネイティブ、Supabase 統合 |
| フレームワーク | **Hono**                           | 軽量、Edge 最適化、TypeScript        |
| デプロイ       | Supabase Edge Functions            | グローバルエッジ配信                 |

### 2.3. データベース

| 項目         | 選択                      | 理由                             |
| ------------ | ------------------------- | -------------------------------- |
| DB           | **PostgreSQL (Supabase)** | RLS、トランザクション、JSON 対応 |
| 認証         | Supabase Auth             | OTP 方式、RLS との統合           |
| ストレージ   | Supabase Storage          | 領収証画像の保存                 |
| リアルタイム | Supabase Realtime         | WebSocket による変更通知         |

### 2.4. インフラ

| 項目            | 選択                       | 理由                       |
| --------------- | -------------------------- | -------------------------- |
| フロントエンド  | **Deno Deploy**            | Fresh と最適化、無料枠充実 |
| バックエンド/DB | **Supabase Cloud** (初期)  | 運用負荷最小化             |
| 将来的移行先    | Azure + Supabase Self-Host | データ主権、コスト最適化   |

---

## 3. 開発環境

### 3.1. 推奨構成

```
polimoney-ledger/
├── .devcontainer/              # Dev Container設定
│   ├── devcontainer.json
│   └── Dockerfile
├── deno.json                   # Deno設定（fmt/lint含む）
├── packages/
│   ├── web/                    # Fresh (フロントエンド)
│   │   ├── routes/             # ページルーティング
│   │   ├── islands/            # インタラクティブコンポーネント
│   │   ├── components/         # 静的コンポーネント
│   │   ├── fresh.gen.ts
│   │   └── deno.json
│   ├── api/                    # Supabase Edge Functions
│   │   ├── functions/
│   │   │   ├── _shared/        # 共通コード
│   │   │   ├── journals/       # 仕訳API
│   │   │   └── elections/      # 選挙マスタAPI
│   │   └── import_map.json
│   └── shared/                 # 共通型定義 (TypeScript)
├── supabase/
│   ├── migrations/             # DBマイグレーション
│   ├── seed.sql                # 開発用ダミーデータ
│   └── config.toml
└── docs/
```

### 3.2. 開発ツール

| ツール            | 用途                               |
| ----------------- | ---------------------------------- |
| **Dev Container** | VS Code / Cursor での統一環境      |
| **Supabase CLI**  | ローカル DB 起動、マイグレーション |
| **Deno**          | Fresh + Edge Functions 開発        |
| **deno fmt**      | フォーマッター（組み込み）         |
| **deno lint**     | リンター（組み込み）               |

### 3.3. ローカル開発フロー

```bash
# 1. リポジトリクローン
git clone https://github.com/digitaldemocracy2030/polimoney_ledger.git
cd polimoney_ledger

# 2. Supabase ローカル起動
supabase start

# 3. マイグレーション適用
supabase db push

# 4. ダミーデータ投入
supabase db seed

# 5. Edge Functions起動
supabase functions serve

# 6. Fresh (フロントエンド) 起動
cd packages/web && deno task start
```

### 3.4. VS Code / Cursor 設定

```json
// .vscode/settings.json
{
  "deno.enable": true,
  "deno.enablePaths": ["./packages/web", "./packages/api/functions"],
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

---

## 4. セキュリティ設計

### 4.1. 認証・認可

```
┌─────────────────────────────────────────────────────────────┐
│ 認証フロー (OTP)                                            │
├─────────────────────────────────────────────────────────────┤
│ 1. ユーザーがメールアドレスを入力                          │
│ 2. Supabase Auth が OTP をメール送信                        │
│ 3. ユーザーが OTP を入力                                    │
│ 4. JWT トークン発行                                         │
│ 5. 以降のリクエストに JWT を付与                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. Row Level Security (RLS)

```sql
-- 例: journals テーブルの RLS
CREATE POLICY "Users can only access their own journals"
ON journals FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM ledger_members
    WHERE organization_id = journals.organization_id
       OR election_id = journals.election_id
  )
);
```

### 4.3. データ保護

| 層       | 対策                        |
| -------- | --------------------------- |
| 通信     | HTTPS (TLS 1.3)             |
| 保存     | PostgreSQL 暗号化 (At-rest) |
| アクセス | RLS + JWT 検証              |
| 監査     | 変更ログの自動記録          |

---

## 5. API 設計

### 5.1. エンドポイント一覧

| メソッド | パス                        | 説明                       |
| -------- | --------------------------- | -------------------------- |
| GET      | `/api/journals`             | 仕訳一覧取得               |
| POST     | `/api/journals`             | 仕訳登録                   |
| PUT      | `/api/journals/:id`         | 仕訳更新                   |
| DELETE   | `/api/journals/:id`         | 仕訳削除                   |
| POST     | `/api/journals/:id/approve` | 仕訳承認                   |
| GET      | `/api/elections`            | 選挙マスタ取得             |
| GET      | `/api/organizations`        | 政治団体マスタ取得         |
| POST     | `/api/export/polimoney`     | Polimoney 向けエクスポート |

### 5.2. リアルタイム通知

```typescript
// Supabase Realtime でリッスン
const channel = supabase
  .channel("journals")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "journals",
      filter: `organization_id=eq.${orgId}`,
    },
    (payload) => {
      // UIを更新
    }
  )
  .subscribe();
```

---

## 6. Polimoney 連携

### 6.1. 共通識別子の管理方針（重要）【v2 更新】

> ⚠️ **Hub は共通識別子の唯一の情報源 (Single Source of Truth) です。**
>
> Ledger は政治家・政治団体・選挙の **マスタデータ** を保存しません。
> Hub API から取得し、`hub_politician_id`、`hub_organization_id`、`hub_election_id` で参照します。

**詳細:** `docs/IDENTITY_DESIGN.md` を参照

| 識別子         | 形式 | 保存先                 | Ledger での扱い                                      |
| -------------- | ---- | ---------------------- | ---------------------------------------------------- |
| 選挙マスタ     | UUID | 🅱️ Hub (Supabase B)    | `elections.hub_election_id` で参照                   |
| 政治団体マスタ | UUID | 🅱️ Hub (Supabase B)    | `political_organizations.hub_organization_id` で参照 |
| 政治家マスタ   | UUID | 🅱️ Hub (Supabase B)    | `profiles.hub_politician_id` で参照                  |
| 選挙台帳       | UUID | 🅰️ Ledger (Supabase A) | `elections.id` で管理                                |
| 政治団体台帳   | UUID | 🅰️ Ledger (Supabase A) | `political_organizations.id` で管理                  |
| ユーザー ID    | UUID | 🅰️ Ledger (Supabase A) | `auth.uid()` で管理                                  |

> **注意:** Ledger に `politicians` テーブルは存在しません（Hub で一元管理）。

### 6.2. 連携アーキテクチャ【v2 更新】

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🅱️ Hub (Supabase B)                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 共通識別子（Single Source of Truth）                          │ │
│  │ - politicians, organizations, elections                       │ │
│  │ - public_ledgers, public_journals (公開データ)                │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ アカウント認証【v2 追加】                                     │ │
│  │ - politician_verifications（政治家認証申請）                  │ │
│  │ - organization_manager_verifications（団体管理者認証申請）    │ │
│  │ - organization_managers（団体管理者マッピング）               │ │
│  │ - impersonation_reports（なりすまし通報）                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    Hub API (認証: X-API-Key)
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Ledger        │         │ Polimoney     │         │ 将来の消費者  │
│ (ID参照のみ)  │         │ (可視化)      │         │               │
└───────┬───────┘         └───────────────┘         └───────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────┐
│                    🅰️ Ledger (Supabase A)                         │
│  - ledgers: 台帳（organization_id / election_id + Hub ID 参照）  │
│  - journals: ledger_id で台帳に紐付け（1:N）                     │
│  - contacts: 台帳間で共有（ledger_contacts 中間テーブル M:N）    │
│  - elections: hub_politician_id, hub_election_id で Hub 参照     │
│  - political_organizations: hub_organization_id で Hub 参照      │
│  - profiles: hub_politician_id で認証済み政治家を紐付け          │
│  - politicians テーブルは存在しない（Hub で一元管理）            │
└───────────────────────────────────────────────────────────────────┘
```

### 6.3. Hub の役割

| 機能           | 説明                                             |
| -------------- | ------------------------------------------------ |
| 共通識別子管理 | politicians, organizations, elections を一元管理 |
| 公開データ保存 | Ledger から同期された公開用仕訳データを保存      |
| 公開データ表示 | `is_name_private` 等のフラグと非公開理由を保持   |
| 匿名化         | Ledger が同期時に匿名化（Hub は匿名化済みデータを受領） |
| API 提供       | Ledger / Polimoney / 将来の消費者へ API 提供     |

### 6.4. 認証方式

| 通信              | 認証方式                       |
| ----------------- | ------------------------------ |
| ユーザー → Ledger | JWT (🅰️ Supabase A Auth)       |
| Ledger → Hub      | API Key (`X-API-Key` ヘッダー) |
| 管理者 → Hub      | JWT (🅱️ Supabase B Auth)       |
| Polimoney → Hub   | API Key (`X-API-Key` ヘッダー) |

### 6.5. Hub がダウンした場合

**Hub がダウン = Polimoney 3 プロダクト全体がダウン**

これは許容される設計判断です。理由：

- Hub は Deno Deploy + Supabase で高可用性
- 共通識別子の二重管理による不整合リスクを避ける
- 同期ロジックの複雑さを避ける

---

## 7. ストレージ戦略

### 7.1. 年度締め機能（政治団体台帳）

政治団体台帳は 1 台帳で複数年度のデータを管理（年度フィルタ方式）。
各年度は個別に「締め処理」が可能。

**ステータス遷移:**

```
open（編集可能）
    │
    │ ユーザーが「年度締め」（手動）
    │ または 年度終了から 3年経過（自動）
    ▼
closed（読み取り専用）
    │
    │ 締めから 1年経過（自動）
    ▼
locked（完全ロック）
    │ - 領収書画像: Ledger DB → Hub DB に移行
    │ - Ledger Storage から削除
    │
    │ 修正が必要な場合
    ▼
temporary_unlock（一時解除、7日間）
    │
    │ 修正完了 or 期限切れ
    ▼
locked（再ロック）
```

**年度締めのトリガー:**

| 方式 | タイミング              | 説明                 |
| ---- | ----------------------- | -------------------- |
| 手動 | 随時                    | ダッシュボードで促す |
| 自動 | 年度終了から **3 年後** | 法定保存期間に基づく |

### 7.2. データ保存場所

| 期間   | 仕訳データ                          | 領収書画像           | 編集    |
| ------ | ----------------------------------- | -------------------- | ------- |
| open   | Ledger DB                           | Ledger Storage       | ✅ 可   |
| closed | Ledger DB                           | Ledger Storage       | ❌ 不可 |
| locked | Ledger DB（非公開）+ Hub DB（公開） | **Hub Storage のみ** | ❌ 不可 |

**非公開データの扱い:**

- 非公開情報（`is_name_private` 等）は **Ledger DB に残す**
- Hub DB には匿名化済みの公開データのみ保存
- Hub Admin は非公開データにアクセス不可

### 7.3. ロック解除リクエスト

ロックされたデータの修正が必要な場合:

```
1. ユーザーが Ledger から「修正依頼」を送信
   - 対象: 台帳 + 年度（または選挙台帳）
   - 理由: 修正が必要な理由を記載

2. Hub Admin が確認・承認
   - 形式的なチェックのみ
   - 「承認」クリックで一時解除

3. 一時解除（7日間）
   - ユーザーが修正を実施
   - 修正完了後「再締め」をクリック
   - または 7日経過で自動再ロック
```

**管理者の作業は最小限:**

| 作業             | 担当         | 工数 |
| ---------------- | ------------ | ---- |
| 修正理由の確認   | Admin        | 1 分 |
| 「承認」クリック | Admin        | 5 秒 |
| 実際の修正作業   | **ユーザー** | -    |
| 再ロック         | **自動**     | -    |

### 7.4. データモデル

```sql
-- 年度締めステータス
CREATE TABLE ledger_year_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id UUID NOT NULL REFERENCES ledgers(id),
    fiscal_year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    -- open / closed / locked / temporary_unlock
    closed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    storage_migrated_at TIMESTAMPTZ,
    UNIQUE(ledger_id, fiscal_year)
);

-- ロック解除リクエスト
CREATE TABLE unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id UUID REFERENCES ledgers(id),
    election_id UUID REFERENCES elections(id),
    fiscal_year INTEGER,
    reason TEXT NOT NULL,
    requested_by_user_id UUID NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    -- pending / approved / rejected / completed / expired
    reviewed_by_admin_id UUID,
    reviewed_at TIMESTAMPTZ,
    unlocked_at TIMESTAMPTZ,
    unlock_expires_at TIMESTAMPTZ,
    relocked_at TIMESTAMPTZ,
    CHECK (ledger_id IS NOT NULL OR election_id IS NOT NULL)
);
```

---

## 8. 正確性・整合性の担保

### 7.1. 複式簿記のバリデーション

```typescript
// 借方合計 = 貸方合計 のチェック
function validateJournal(entries: JournalEntry[]): boolean {
  const debitSum = entries.reduce((sum, e) => sum + e.debit_amount, 0);
  const creditSum = entries.reduce((sum, e) => sum + e.credit_amount, 0);
  return debitSum === creditSum;
}
```

### 7.2. トランザクション

```sql
BEGIN;
  INSERT INTO journals (...) VALUES (...) RETURNING id;
  INSERT INTO journal_entries (...) VALUES (...);
  INSERT INTO journal_entries (...) VALUES (...);
COMMIT;
```

### 7.3. 楽観的ロック

```sql
UPDATE journals
SET description = '...', updated_at = now()
WHERE id = $1 AND updated_at = $2;  -- 競合検知
```

---

## 9. 今後の検討事項

- [ ] Azure への移行（Supabase Self-Host）
- [ ] CI/CD パイプライン（GitHub Actions）
- [ ] E2E テスト（Playwright）
- [ ] パフォーマンスモニタリング（Sentry）
- [ ] バックアップ戦略

---

## 更新履歴

- 初版作成
- ストレージ戦略セクションを追加
- 年度締め・ロック機構を追加
