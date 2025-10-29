# Obsidian GitHub Pages Publish Plugin

Obsidian vault内の指定ディレクトリをGitHub Pagesで公開するプラグインです。

## 機能

- **Git連動**: vaultのコミット時に自動でGitHub Pagesに公開
- **Obsidian Publish風デザイン**: グラフビュー、バックリンク、検索機能を搭載
- **プライバシー保護**: vaultのprivateリポジトリとは別の公開用リポジトリを使用
- **選択的公開**: 指定ディレクトリのみを公開対象に

## アーキテクチャ

```
Private Vault Repository
  ↓ (Git hook)
Obsidian Plugin
  ↓ (変換 & push)
Public Repository
  ↓ (GitHub Pages)
公開サイト
```

### リポジトリ構成

- **Private Repository**: Vault全体を管理（既存のリポジトリ）
- **Public Repository**: プラグインが自動作成・管理する公開用リポジトリ

## セットアップ

### 前提条件

1. ObsidianのvaultがGitで管理されている
2. GitHub Personal Access Token (repo権限)

### インストール

1. このプラグインをObsidianのcommunity pluginsからインストール（将来）
2. または、手動でインストール:
   ```bash
   cd <vault>/.obsidian/plugins/
   git clone https://github.com/xcd0/obsidian-github-pages-publish
   cd obsidian-github-pages-publish
   npm install
   npm run build
   ```

### 初期設定

1. 設定 → Community plugins → GitHub Pages Publish
2. GitHub Personal Access Tokenを入力
3. 公開用リポジトリ名を指定（例: "my-published-notes"）
4. 公開対象ディレクトリを指定（例: "Public/"）
5. "Initialize Repository"をクリック

## 使い方

### 基本的な使い方

1. Obsidianでノートを編集
2. Vaultをgit commit
3. プラグインが自動的に公開用リポジトリにpush
4. GitHub Pagesが自動デプロイ（数分以内）

### ディレクトリ構造例

```
vault/
├── Private/           # 非公開ノート
│   └── diary.md
├── Public/            # 公開対象ディレクトリ
│   ├── tech/
│   │   └── typescript.md
│   └── blog/
│       └── article.md
└── .obsidian/
    └── plugins/
        └── github-pages-publish/
```

### 公開制御

フロントマターで個別に公開/非公開を指定できます:

```yaml
---
published: false  # このノートは公開されません
---
```

## 開発

### ビルド

```bash
npm install
npm run dev     # 開発モード（ファイル監視）
npm run build   # 本番ビルド
```

### 開発環境

- TypeScript
- Obsidian Plugin API
- esbuild

### 依存ライブラリ

- `@octokit/rest`: GitHub API連携
- `markdown-it`: Markdown→HTML変換
- `simple-git`: Git操作

## 設定項目

| 項目 | 説明 | デフォルト |
|------|------|------------|
| GitHub Token | Personal Access Token (repo権限) | - |
| Repository Name | 公開用リポジトリ名 | - |
| Publish Directory | 公開対象ディレクトリ | "Public/" |
| Auto Publish | コミット時に自動公開 | true |
| Graph View | グラフビュー表示 | true |
| Backlinks | バックリンク表示 | true |
| Search | 検索機能 | true |

## ライセンス

MIT License

## 作者

xcd0 - https://github.com/xcd0

## 問題報告

https://github.com/xcd0/obsidian-github-pages-publish/issues
