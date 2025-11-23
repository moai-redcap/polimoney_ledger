# AI エージェントへの指示書

このファイルは、AI アシスタントがこのプロジェクトで作業する上での、中心的なコンテキストを定義します。

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

## 3. 開発環境とツール (Environment & Tooling)

- **IDE:** VS Code (推奨)
- **Configuration:** `.vscode/` ディレクトリ内の設定ファイルに従ってください。
- **Extensions:** `extensions.json` に定義された推奨拡張機能を使用します。
- **Formatting:** 保存時に自動フォーマット (`editor.formatOnSave`) が有効になっています。
