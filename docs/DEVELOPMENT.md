# 開発環境セットアップ

## 前提条件

- Docker Desktop
- VS Code または Cursor
- Dev Containers 拡張機能

## 共有ネットワークの作成（初回のみ）

Polimoney の各サービス（Hub, Ledger）が通信できるように、共有 Docker ネットワークを作成します。

```bash
docker network create polimoney-network
```

## Dev Container の起動

1. このリポジトリを VS Code / Cursor で開く
2. `Ctrl + Shift + P` → `Dev Containers: Reopen in Container`
3. コンテナのビルドと起動を待つ

## サービスの起動

コンテナ内で以下を実行：

```bash
cd packages/web
deno task start
```

サーバーが `http://localhost:3001` で起動します。

## ポート一覧

| サービス   | ポート | 説明                 |
| ---------- | ------ | -------------------- |
| Ledger Web | 3001   | Fresh フロントエンド |

### Hub API への接続

### 環境変数の設定

`.env` を作成：

```bash
# Hub API
HUB_API_URL=http://localhost:3722
HUB_API_KEY=dev-api-key-12345
```

### 接続確認

```bash
# Hub に ping
curl http://localhost:3722/health
```

## 構成図

```
┌─────────────────────────────────────────────┐
│          polimoney-network                  │
│                                             │
│  ┌─────────────┐      ┌─────────────────┐  │
│  │   Ledger    │ ──→  │      Hub        │  │
│  │   :3001     │      │     :3722       │  │
│  └─────────────┘      └────────┬────────┘  │
│                                │            │
│                       ┌────────┴────────┐  │
│                       │   Supabase      │  │
│                       │   (PostgreSQL)  │  │
│                       └─────────────────┘  │
└─────────────────────────────────────────────┘
```

## ウィンドウの色

Dev Container を開くと、ウィンドウが **赤色** になります。
これにより、他のプロジェクト（Hub: 緑）と区別できます。

## Hub を先に起動する

Ledger は Hub API に依存しているため、**Hub を先に起動**してください。

1. `polimoney_hub` を Dev Container で開く
2. `deno task dev` で Hub を起動
3. `polimoney_ledger` を Dev Container で開く
4. `deno task start` で Ledger を起動

## トラブルシューティング

### ネットワークが見つからない

```
Error: network polimoney-network not found
```

→ 共有ネットワークを作成してください：

```bash
docker network create polimoney-network
```

### Hub に接続できない

1. Hub が起動しているか確認
2. 同じネットワークに参加しているか確認：

```bash
docker network inspect polimoney-network
```

3. 環境変数が正しいか確認：

```bash
echo $HUB_API_URL
```

### コンテナを完全にリセット

```bash
# VS Code: Dev Containers: Rebuild Container
```

## 技術スタック

- **フレームワーク**: Fresh 1.7.3 (Deno)
- **UI**: Preact + Tailwind CSS + daisyUI
- **ランタイム**: Deno
