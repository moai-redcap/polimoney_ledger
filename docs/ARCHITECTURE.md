# Polimoney Ledger - アーキテクチャ設計

## 1. システム概要

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
          ┌───────────────────────────────────┐
          │       Supabase (PostgreSQL)       │
          │  ┌─────────────────────────────┐  │
          │  │ 仕訳データ (journals)       │  │
          │  │ 関係者 (contacts)           │  │
          │  │ 補助科目 (sub_accounts)     │  │
          │  └─────────────────────────────┘  │
          │  ┌─────────────────────────────┐  │
          │  │ 共通マスタ（Polimoney共有） │  │
          │  │ - 選挙識別子 (elections)    │  │
          │  │ - 政治団体 (organizations)  │  │
          │  │ - 政治家 (politicians)      │  │
          │  └─────────────────────────────┘  │
          │  ┌─────────────────────────────┐  │
          │  │ Supabase Auth               │  │
          │  │ Supabase Storage (領収証)   │  │
          │  └─────────────────────────────┘  │
          └───────────────────────────────────┘
                          ▲
                          │ API連携
          ┌───────────────┴───────────────┐
          │         Polimoney             │
          │   (政治資金可視化サービス)    │
          └───────────────────────────────┘
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

### 6.1. 共通識別子

**詳細:** `docs/IDENTITY_DESIGN.md` を参照

| 識別子      | 形式                           | 保存先    | 例                  |
| ----------- | ------------------------------ | --------- | ------------------- |
| 選挙 ID     | `{type}-{area}-{date}`         | Azure DB  | `HR-13-01-20241027` |
| 政治団体 ID | UUID v4                        | Azure DB  | `123e4567-e89b-...` |
| 政治家 ID   | UUID v4                        | Azure DB  | `987fcdeb-51a2-...` |
| ユーザー ID | UUID v4                        | Supabase  | `auth.uid()`        |

### 6.2. データ配置

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure DB (共通識別子)                     │
│              ← Polimoney / Polimoney Ledger 共有            │
│  - politicians (政治家マスタ)                               │
│  - political_orgs (政治団体マスタ)                          │
│  - elections (選挙マスタ)                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ 参照
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌───────────────────┐         ┌───────────────────────────────┐
│ Polimoney Ledger  │         │ Polimoney (可視化サービス)    │
│ (Supabase Cloud)  │         │                               │
│ - 仕訳データ      │────────→│ - 収支データの可視化          │
│ - 関係者          │  API    │ - 比較分析                    │
│ - Auth/Storage    │         │                               │
└───────────────────┘         └───────────────────────────────┘
```

---

## 7. 正確性・整合性の担保

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

## 8. 今後の検討事項

- [ ] Azure への移行（Supabase Self-Host）
- [ ] CI/CD パイプライン（GitHub Actions）
- [ ] E2E テスト（Playwright）
- [ ] パフォーマンスモニタリング（Sentry）
- [ ] バックアップ戦略

---

## 更新履歴

- 初版作成
