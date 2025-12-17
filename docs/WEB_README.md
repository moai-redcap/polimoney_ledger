# Polimoney Ledger - Web (Fresh)

Fresh (Deno) で構築された Polimoney Ledger のフロントエンドアプリケーションです。

## 機能

### 1. 選挙・政治団体の選択 UI

- **選挙一覧** (`/elections`)

  - Hub API から選挙マスターデータを取得
  - 年別グループ化、種別フィルタ、検索機能
  - 選挙の選択で台帳作成フローへ遷移

- **政治団体一覧** (`/organizations`)
  - Hub API から政治団体マスターデータを取得
  - 種別別グループ化、検索機能
  - 団体の選択で台帳作成フローへ遷移

### 2. 登録リクエスト機能

該当する選挙や政治団体が見つからない場合、登録をリクエストできます。

- **選挙登録リクエスト**

  - 選挙名、種別、選挙区、選挙日を入力
  - 証明 URL（選管サイト等）を任意で添付

- **政治団体登録リクエスト**
  - 団体名、種別、届出先を入力
  - **証明書類のアップロード必須**（Supabase Storage に保存）
    - 政治団体設立届出書（控え）
    - 政治団体名簿のスクリーンショット
    - 政治資金収支報告書の表紙

### 3. 管理画面

管理者がリクエストを確認・承認・却下できる画面です。

- **ダッシュボード** (`/admin`)

  - ステータス別カウント表示
  - 選挙/政治団体リクエストの一覧

- **リクエスト詳細・処理**
  - 申請内容の確認
  - 証明書類のプレビュー
  - 承認（選挙の場合は選挙区コード入力が必要）
  - 却下（理由入力必須）

## 技術スタック

- **フレームワーク**: Fresh 1.7.3 (Deno)
- **UI**: Preact + Tailwind CSS
- **ランタイム**: Deno

## ディレクトリ構成

```
packages/web/
├── components/          # 静的コンポーネント
├── islands/             # インタラクティブコンポーネント
│   ├── AdminDashboard.tsx
│   ├── ElectionSelector.tsx
│   └── OrganizationSelector.tsx
├── lib/
│   └── hub-client.ts    # Hub API クライアント
├── routes/
│   ├── admin/
│   │   └── index.tsx    # 管理画面
│   ├── api/
│   │   ├── admin/       # 管理者用API
│   │   │   ├── election-requests/[id]/approve.ts
│   │   │   ├── election-requests/[id]/reject.ts
│   │   │   ├── organization-requests/[id]/approve.ts
│   │   │   └── organization-requests/[id]/reject.ts
│   │   ├── election-requests.ts
│   │   ├── organization-requests.ts
│   │   └── upload.ts    # ファイルアップロード
│   ├── elections.tsx    # 選挙一覧
│   ├── organizations.tsx # 政治団体一覧
│   └── index.tsx        # ダッシュボード
├── static/
│   └── styles.css
├── deno.json
├── fresh.config.ts
├── fresh.gen.ts
├── dev.ts
├── main.ts
└── tailwind.config.ts
```

## セットアップ

### 1. 環境変数の設定

`env-example.txt` を参考に `.env` ファイルを作成:

```bash
# Polimoney Hub API 設定
HUB_API_URL=http://localhost:8000
HUB_API_KEY=your-api-key-here
HUB_ADMIN_KEY=your-admin-key-here

# Supabase 設定（証明書類のアップロード用）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Supabase Storage の設定

証明書類のアップロード用に、Supabase で Storage バケットを作成:

1. Supabase Dashboard → Storage → New bucket
2. バケット名: `evidence-files`
3. Public bucket: Yes（公開 URL 生成のため）

### 3. 開発サーバーの起動

```bash
# packages/web ディレクトリで
deno task start
```

`http://localhost:8000` でアクセス可能です。

## Hub API との連携

このアプリケーションは [Polimoney Hub](https://github.com/your-org/polimoney-hub) の API を使用します。

### 使用するエンドポイント

| メソッド | エンドポイント                                 | 説明                             |
| -------- | ---------------------------------------------- | -------------------------------- |
| GET      | `/api/v1/elections`                            | 選挙一覧取得                     |
| GET      | `/api/v1/organizations`                        | 政治団体一覧取得                 |
| POST     | `/api/v1/election-requests`                    | 選挙登録リクエスト作成           |
| POST     | `/api/v1/organization-requests`                | 政治団体登録リクエスト作成       |
| GET      | `/api/admin/election-requests`                 | 選挙リクエスト一覧（管理者）     |
| PUT      | `/api/admin/election-requests/:id/approve`     | 選挙リクエスト承認               |
| PUT      | `/api/admin/election-requests/:id/reject`      | 選挙リクエスト却下               |
| GET      | `/api/admin/organization-requests`             | 政治団体リクエスト一覧（管理者） |
| PUT      | `/api/admin/organization-requests/:id/approve` | 政治団体リクエスト承認           |
| PUT      | `/api/admin/organization-requests/:id/reject`  | 政治団体リクエスト却下           |

## 今後の予定

- [ ] 認証機能の統合（Supabase Auth）
- [ ] 台帳作成・編集機能
- [ ] 仕訳登録機能
- [ ] 収支報告書エクスポート

## 更新履歴

- 2024-12-13: 初版作成
  - 選挙・政治団体の選択 UI
  - 登録リクエスト機能（証明書アップロード付き）
  - 管理画面（承認/却下）
