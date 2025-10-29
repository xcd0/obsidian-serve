#!/bin/bash
# ビルドファイルをObsidian vaultにコピーするスクリプト。

# コピー先のパス (必要に応じて変更してください)。
TARGET_DIR="/mnt/c/Users/y-hayasaki/Desktop/dummy/vault/.obsidian/plugins/obsidian-serve"

# ディレクトリを作成。
mkdir -p "$TARGET_DIR"

# ファイルをコピー。
echo "Copying files to $TARGET_DIR..."
cp main.js manifest.json styles.css "$TARGET_DIR/"

# 確認。
echo "Files copied:"
ls -lh "$TARGET_DIR/main.js" "$TARGET_DIR/manifest.json" "$TARGET_DIR/styles.css"

echo "Done! Please reload Obsidian to see changes."
