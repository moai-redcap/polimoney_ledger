# Polimoney Ledger タスク状況

> **注意**: Hub との共通タスクは `polimoney_hub/docs/TASK_STATUS.md` で一元管理しています。
> このファイルは Ledger 固有のタスクのみ記載します。

最終更新: 2024-12-14

---

## 🔧 SQL エディターで実行が必要な作業

| タスク                              | 状態    | 備考     |
| ----------------------------------- | ------- | -------- |
| `ledger_year_closures` テーブル作成 | ✅ 完了 | 実行済み |

```sql
-- Ledger DB (Supabase) で実行
CREATE TABLE IF NOT EXISTS ledger_year_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES political_organizations(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'locked', 'temporary_unlock')),
  closed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  storage_migrated_at TIMESTAMPTZ,
  temporary_unlock_at TIMESTAMPTZ,
  temporary_unlock_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_year_closures_org ON ledger_year_closures(organization_id);
CREATE INDEX IF NOT EXISTS idx_year_closures_status ON ledger_year_closures(status);
CREATE INDEX IF NOT EXISTS idx_year_closures_fiscal_year ON ledger_year_closures(fiscal_year);

ALTER TABLE ledger_year_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage closures for their organizations" ON ledger_year_closures
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM political_organizations WHERE owner_user_id = auth.uid()
    )
  );
```

---

## 📋 Ledger 固有タスク

### 🔥 高優先度

| #   | タスク         | 状態      | 詳細                                      |
| --- | -------------- | --------- | ----------------------------------------- |
| 1   | Hub 同期機能   | ⏳ 進行中 | ✅ API + 変換ロジック / 🔲 承認時自動同期 |
| 2   | 領収証添付機能 | 🔲 未着手 | media_assets + Supabase Storage           |
| 3   | 年度締め機能   | 🔲 未着手 | UI + ロック解除リクエスト                 |

### 📋 中優先度

| #   | タスク                 | 状態      | 詳細                     |
| --- | ---------------------- | --------- | ------------------------ |
| 4   | 仕訳承認画面           | 🔲 未着手 | ApproveJournalScreen     |
| 5   | 台帳設定・メンバー管理 | 🔲 未着手 | LedgerSettingsScreen     |
| 6   | 複合仕訳対応           | 🔲 未着手 | 複数行の支払元           |
| 7   | 匿名化処理             | ✅ 完了   | sync-transform.ts で実装 |

### 📝 低優先度

| #   | タスク                         | 状態      |
| --- | ------------------------------ | --------- |
| 8   | 外部連携 (Freee, MoneyForward) | 🔲 未着手 |
| 9   | AI 科目推奨                    | 🔲 未着手 |
| 10  | deprecated API 修正            | 🔲 未着手 |

---

## 🔗 Hub 連携タスク

詳細は `polimoney_hub/docs/TASK_STATUS.md` を参照。

| タスク            | Ledger 側の作業    |
| ----------------- | ------------------ |
| Ledger → Hub 同期 | 送信ロジック実装   |
| ロック解除フロー  | リクエスト送信 UI  |
| contacts 匿名化   | 送信前に匿名化処理 |

---

## ✅ 完了済みタスク

- [x] 関係者マスタ管理画面
- [x] 関係者登録・編集画面
- [x] 仕訳登録画面の基本機能
- [x] 振替時の contact_id 必須問題解決
- [x] classification, non_monetary_basis 等のフィールド実装

---

## 更新履歴

- 2024-12-14: Hub 同期 API 実装（/api/sync エンドポイント、変換ロジック）
- 2024-12-14: 初版作成（Hub との統合管理を開始）
