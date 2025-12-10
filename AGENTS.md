# AI エージェントへの指示書

このファイルは、AI アシスタント（特に Android Studio を使用する場合）がこのプロジェクトで作業する上での、中心的なコンテキストを定義します。

## 担当エージェント

- **人間開発者:** プロジェクトリード
- **AI アシスタント:** ペアプログラマー

---

## 1. コア設計書 (DESIGN_DOC)

アプリケーションのアーキテクチャと技術仕様に関する唯一の信頼できる情報源です。

@./docs/DESIGN_DOC.md

---

## 2. 機能仕様書 (SPECIFICATION)

実装すべき機能の具体的なデータモデルや画面仕様を定義します。

@./docs/SPECIFICATION.md

---

## 3. リファレンスドキュメント (REFERENCE)

政治資金規正法、収支報告書の記載例、Polimoney との連携に必要な情報源です。

### 参照タイミング

以下のタイミングで `docs/REFERENCE.md` を参照してください：

- **勘定科目・補助科目の追加・変更時** - 収支報告書の項目分類を確認
- **仕訳登録フォームの設計時** - 領収書等の要件、明細記載基準を確認
- **Polimoney 連携機能の実装時** - city_code 等の形式を確認
- **DB スキーマや仕様の変更時** - 法令上の要件との整合性を確認

### リファレンス資料

@./docs/REFERENCE.md

### 自動生成されたコンテキスト

`docs/reference/` フォルダ内の PDF・Excel ファイルの内容は、以下のコマンドで統合ファイルに変換できます：

```bash
python make_docs_context_v2.py
```

生成されたファイル: `agent_reference_context.md`

**注意:** REFERENCE.md のリンク先を直接読めない場合は、上記コマンドを実行してから `agent_reference_context.md` を参照してください。

---

## 4. 開発環境とツール (Environment & Tooling)

- **IDE:** VS Code (推奨)
- **Configuration:** `.vscode/` ディレクトリ内の設定ファイルに従ってください。
- **Extensions:** `extensions.json` に定義された推奨拡張機能を使用します。
- **Formatting:** 保存時に自動フォーマット (`editor.formatOnSave`) が有効になっています。
