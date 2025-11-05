# polimoney_ledger
Polimoneyへインポート可能なjsonと、政治資金収支報告書もしくは選挙運動費用収支報告書をエクスポートできる会計ソフトを目指します。

## 内容が古い場合があります

最新の情報に更新したいと思っていますが、特に外部サービスの内容はアップデートにより古くなりがちです。

気付いた場合はぜひコントリビュートしてください！

コントリビュートガイド（作成中）

## セットアップ方法
開発する場合はこちら（作成中）をごらんください。以下はノンエンジニア向けのガイドです。

### Step1. Appwrite Cloud
このプロダクトはオープンソースとして簡単に（GUIで）セットアップできるよう Appwrite Cloudというサービスの使用を想定しています。

[Appwriteの公式サイト](https://appwrite.io/)より、Appwrite Cloudに登録できます。

通常は無料プランで問題なくご使用いただけると思いますが、場合によっては有料となる場合があります。

**※有料となっても弊団体は一切責任を負えません。**

[参照: Appwriteの料金プラン](https://appwrite.io/pricing)

#### Step1-1: Projectの作成
1. Appwrite Cloudに登録します。 
1. Appwriteのコンソールにログインします。 
1. ダッシュボードからProjectを追加します。リージョンは通常は一番近い場所で問題ありません。 

#### Step1-2: Project情報の取得
Step1-1で作成したProjectの画面から「Settings」画面を開きます。
表示された画面に Project ID と API Endpoint があります。
※この2つの情報は後ほど入力してもらうものです。重要な情報なので取扱には注意してください。

#### Step1-3: Flutterアプリのプラットフォームを登録する
Step1-1で作成したProjectにアプリからの接続を許可する設定をします。
1. Projectのダッシュボードから、Platformを追加します。
   1. Futterを選択します。 
   1. サポートしたいOS（現状はWindowsのみ）を選択します。
   1. Nameは何でも構いません。
   1. Package nameは『org.dd2030.polimoneyledger』を入力すれば大丈夫です。 

#### Step1-4: 認証方法を有効にする
ユーザーがメールアドレスとパスワードでログインできるように、その認証方法を有効化します。
1. ProjectのダッシュボードからAuthの設定画面を開きます。
1. 「Settings」タブを選択します。
1. 「Email/Password」を見つけ、トグルスイッチをクリックして有効にします。

### アプリ
（アプリができていないためこれから書きます）

## Flutterで開発しています

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
