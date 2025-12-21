#!/bin/bash

# Chromeウェブストア提出用のZIPファイルを作成するスクリプト

# 出力先ディレクトリ
OUTPUT_DIR="dist"

# manifest.jsonからバージョンを取得
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

# ZIPファイル名にバージョンを含める
ZIP_NAME="index-tab-v${VERSION}.zip"

# 作業ディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Chromeウェブストア提出用のZIPファイルを作成します..."

# distディレクトリが存在する場合は削除
if [ -d "$OUTPUT_DIR" ]; then
  echo "既存のdistディレクトリを削除します..."
  rm -rf "$OUTPUT_DIR"
fi

# distディレクトリを作成
mkdir -p "$OUTPUT_DIR"

# 必要なファイルをリストアップ
FILES_TO_INCLUDE=(
  "manifest.json"
  "background.js"
  "tabs.html"
  "tabs.js"
  "tabs.css"
  "README.md"
  "icons/"
  "_locales/"
)

# ZIPファイルを作成
echo "ZIPファイルを作成中..."
zip -r "$OUTPUT_DIR/$ZIP_NAME" "${FILES_TO_INCLUDE[@]}" \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x ".git/*" \
  -x ".vscode/*" \
  -x "*.map" \
  -x "node_modules/*" \
  -x "dist/*"

# 結果を表示
if [ -f "$OUTPUT_DIR/$ZIP_NAME" ]; then
  FILE_SIZE=$(du -h "$OUTPUT_DIR/$ZIP_NAME" | cut -f1)
  echo "✓ ZIPファイルの作成が完了しました！"
  echo "  ファイル: $OUTPUT_DIR/$ZIP_NAME"
  echo "  サイズ: $FILE_SIZE"
  echo ""
  echo "このZIPファイルをChromeウェブストアにアップロードできます。"
else
  echo "✗ ZIPファイルの作成に失敗しました。"
  exit 1
fi
