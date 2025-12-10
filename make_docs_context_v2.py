import os
import pandas as pd
from pypdf import PdfReader

# 読み込む対象のディレクトリ
target_dir = os.path.join("docs", "reference")
# 出力するファイル名（同ディレクトリに出力）
output_file = os.path.join(target_dir, "agent_reference_context.md")
# 除外するファイル（自己参照を避けるため）
exclude_files = {"agent_reference_context.md"}

def extract_text_from_pdf(file_path):
    """PDFからテキストを抽出する"""
    try:
        reader = PdfReader(file_path)
        text = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text.append(f"--- Page {i+1} ---\n{page_text}")
        return "\n".join(text)
    except Exception as e:
        return f"[PDF読み込みエラー: {e}]"

def extract_text_from_excel(file_path):
    """Excelから全シートのデータをテキスト（Markdown表）として抽出する"""
    try:
        xl = pd.ExcelFile(file_path)
        text_output = []
        for sheet_name in xl.sheet_names:
            df = xl.parse(sheet_name)
            # 空の列や行を削除してクリーニング
            df = df.dropna(how='all').dropna(axis=1, how='all')

            # Markdown形式の表に変換
            markdown_table = df.to_markdown(index=False)
            text_output.append(f"### Sheet: {sheet_name}\n\n{markdown_table}")
        return "\n\n".join(text_output)
    except Exception as e:
        return f"[Excel読み込みエラー: {e}]"

def create_context_file():
    if not os.path.exists(target_dir):
        print(f"エラー: ディレクトリが見つかりません: {target_dir}")
        return

    with open(output_file, "w", encoding="utf-8") as outfile:
        outfile.write(f"# Polimoney Ledger Reference Documentation (Full)\n")
        outfile.write(f"Source: {target_dir}\n\n")

        files_processed = 0

        # ファイルリストを取得してソート
        for filename in sorted(os.listdir(target_dir)):
            # 除外ファイルをスキップ
            if filename in exclude_files:
                print(f"スキップ（除外対象）: {filename}")
                continue

            file_path = os.path.join(target_dir, filename)
            content = ""
            file_type = ""

            # 拡張子に応じて処理を分岐
            if filename.endswith(".md") or filename.endswith(".txt"):
                try:
                    with open(file_path, "r", encoding="utf-8") as infile:
                        content = infile.read()
                    file_type = "Text/Markdown"
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
                    continue

            elif filename.endswith(".pdf"):
                print(f"処理中 (PDF): {filename} ...")
                content = extract_text_from_pdf(file_path)
                file_type = "PDF Content"

            elif filename.endswith(".xlsx") or filename.endswith(".xls"):
                print(f"処理中 (Excel): {filename} ...")
                content = extract_text_from_excel(file_path)
                file_type = "Excel Content"

            else:
                # その他のファイルはスキップ
                continue

            # ファイルごとの書き込み
            if content:
                outfile.write(f"\n{'='*40}\n")
                outfile.write(f"## File: {filename} ({file_type})\n")
                outfile.write(f"{'='*40}\n\n")
                outfile.write(content)
                outfile.write("\n")
                files_processed += 1
                print(f"追加完了: {filename}")

    print(f"\n完了: '{output_file}' を作成しました。（計 {files_processed} ファイル）")

if __name__ == "__main__":
    create_context_file()