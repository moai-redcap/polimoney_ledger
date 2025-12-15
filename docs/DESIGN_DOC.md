# polimoney_ledger 設計方針書

> ⚠️ **注意**: 詳細なアーキテクチャ設計は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

## 1. バックエンド

- **Supabase** を使用する。
- DD2030 がホスティングする共有インスタンスを使用（詳細は [SERVICE_POLICY.md](./SERVICE_POLICY.md) 参照）。
- **利点:** データの一貫性、Polimoney との連携、ユーザビリティ向上。

## 2. フロントエンド

| 項目           | 選択             | 理由                            |
| -------------- | ---------------- | ------------------------------- |
| フレームワーク | **Fresh (Deno)** | Islands Architecture、SSR、軽量 |
| UI             | Tailwind CSS     | 効率的なスタイリング            |
| ホスティング   | **Deno Deploy**  | グローバルエッジ配信            |

## 3. 初回セットアップ

- **方針:** DD2030 ホスティングにより、ユーザーは Supabase セットアップ不要。
- **ユーザーフロー:** アカウント作成 → OTP 認証 → 利用開始

## 4. 権限管理

- **Row Level Security (RLS):** PostgreSQL の RLS で論理的にデータ分離。
- **役割ベース:** admin / approver / submitter / viewer の 4 段階。
- **詳細:** [SPECIFICATION.md](./SPECIFICATION.md) の 2.11 節参照。

## 5. ディレクトリ構成

```
polimoney_ledger/
├── packages/
│   ├── web/                    # Fresh (フロントエンド)
│   │   ├── routes/             # ページルーティング
│   │   ├── islands/            # インタラクティブコンポーネント
│   │   └── components/         # 静的コンポーネント
│   ├── api/                    # Supabase Edge Functions
│   └── shared/                 # 共通型定義
├── supabase/
│   ├── migrations/             # DBマイグレーション
│   └── seed.sql                # 開発用ダミーデータ
├── legacy/
│   └── flutter/                # Flutter版（レガシー）
└── docs/
```

## 6. レガシーコード

Flutter 版のコードは `legacy/flutter/` に保存されています。
新規開発は Fresh (Deno) で行います。
