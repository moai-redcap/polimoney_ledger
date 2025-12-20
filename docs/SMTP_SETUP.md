# SMTP 設定ガイド（Supabase + Google Workspace）

このドキュメントでは、Supabase から送信されるメールの送信元を `noreply@polimoney.jp` などのカスタムドメインに変更する方法を説明します。

## 前提条件

- Google Workspace の管理者権限
- カスタムドメインが Google Workspace に設定済み
- Supabase プロジェクトの管理者権限

---

## 方法: Google Workspace SMTP Relay

### 料金

Google Workspace の契約料金に含まれる（追加料金なし）

### 制限

| プラン            | 1 日あたりの送信制限 |
| :---------------- | :------------------- |
| Business Starter  | 約 500 通/日         |
| Business Standard | 約 2,000 通/日       |
| Business Plus     | 約 2,000 通/日       |
| Enterprise        | 約 2,000 通/日       |

---

## Step 1: Google Admin Console で SMTP Relay を設定

1. [Google Admin Console](https://admin.google.com) にログイン

2. **アプリ** → **Google Workspace** → **Gmail** → **ルーティング** に移動

3. **SMTP リレーサービス** セクションで「設定」をクリック

4. 以下の設定を行う：

   | 項目           | 設定値                                                                               |
   | :------------- | :----------------------------------------------------------------------------------- |
   | 許可する送信者 | 「組織内のアドレスのみ」または「すべてのアドレス」                                   |
   | 認証           | 「指定した IP アドレスからのメールのみを受け入れる」を OFF、「SMTP 認証が必要」を ON |
   | 暗号化         | 「TLS 暗号化を要求」を ON                                                            |

5. 「保存」をクリック

---

## Step 2: 送信用メールアドレスの準備

### オプション A: 既存ユーザーを使用

既存の Google Workspace ユーザー（例: `admin@polimoney.jp`）を使用

### オプション B: 専用アカウントを作成

1. Google Admin Console → **ユーザー** → **新しいユーザーを追加**
2. `noreply@polimoney.jp` などのアカウントを作成
3. パスワードを設定

### オプション C: グループエイリアスを使用（受信のみ）

Google Groups は受信専用です。送信には使えませんが、返信先として設定可能です。

---

## Step 3: アプリパスワードを生成

SMTP 認証にはアプリパスワードが必要です。

1. 送信に使用する Google アカウントにログイン

2. [Google アカウント](https://myaccount.google.com) → **セキュリティ** に移動

3. **2 段階認証プロセス** が有効になっていることを確認（無効なら有効化）

4. **2 段階認証プロセス** → **アプリパスワード** に移動

5. アプリを選択：「その他（カスタム名）」→「Supabase SMTP」と入力

6. 「生成」をクリック

7. 表示された 16 文字のパスワードをコピー（スペースは除去）

   ```
   例: xxxx xxxx xxxx xxxx → xxxxxxxxxxxxxxxx
   ```

---

## Step 4: Supabase で SMTP を設定

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン

2. 対象プロジェクトを選択

3. **Project Settings** → **Authentication** → **SMTP Settings** に移動

4. 「Enable Custom SMTP」を ON

5. 以下の情報を入力：

   | 項目         | 値                                                 |
   | :----------- | :------------------------------------------------- |
   | Host         | `smtp-relay.gmail.com`                             |
   | Port         | `587`                                              |
   | Username     | 送信元メールアドレス（例: `noreply@polimoney.jp`） |
   | Password     | Step 3 で生成したアプリパスワード                  |
   | Sender email | 送信元メールアドレス（例: `noreply@polimoney.jp`） |
   | Sender name  | `Polimoney Ledger`                                 |

6. 「Save」をクリック

---

## Step 5: テスト送信

1. Supabase Dashboard → **Authentication** → **SMTP Settings**

2. 「Send test email」をクリック

3. テスト用メールアドレスを入力して送信

4. メールが届くことを確認

---

## トラブルシューティング

### エラー: 認証に失敗する

- アプリパスワードが正しいか確認
- 2 段階認証が有効になっているか確認
- Google Admin Console で SMTP リレーが正しく設定されているか確認

### エラー: 送信制限に達した

- 1 日あたりの送信制限を超えた場合、翌日まで待つ
- 大量送信が必要な場合は、SendGrid/Resend などの専用サービスを検討

### メールが届かない

- 迷惑メールフォルダを確認
- SPF/DKIM/DMARC レコードが正しく設定されているか確認

---

## 代替案: Resend（推奨）

大量のメール送信が必要な場合や、設定の簡便さを重視する場合は [Resend](https://resend.com) を推奨します。

| 項目       | Google Workspace SMTP    | Resend              |
| :--------- | :----------------------- | :------------------ |
| 料金       | Workspace 料金に含まれる | 月 3,000 通まで無料 |
| 設定難易度 | 中〜高                   | 低                  |
| 送信制限   | 500〜2,000 通/日         | 無料枠は月 3,000 通 |
| 配信率     | 中                       | 高                  |

### Resend の設定

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [APIキー]
Sender email: noreply@polimoney.jp
Sender name: Polimoney Ledger
```

---

## 参考リンク

- [Google Workspace SMTP リレーサービス](https://support.google.com/a/answer/2956491)
- [Supabase SMTP Settings](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend](https://resend.com)
