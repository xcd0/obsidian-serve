# Obsidian GitHub Pages Publish Plugin

Obsidian vault内の指定ディレクトリをGitHub Pagesで公開するプラグインです。

## 特徴

- ✅ **Personal Access Token不要**: GitHub Actionsの自動トークンを使用
- ✅ **セキュア**: ローカルにトークンを保存しない
- ✅ **自動公開**: Vaultをcommit & pushするだけで自動デプロイ
- ✅ **プライバシー保護**: vaultのprivateリポジトリとは別の公開用リポジトリを使用
- ✅ **選択的公開**: 指定ディレクトリのみを公開対象に
- ✅ **index.html自動生成**: 公開されたノート一覧ページを自動生成

## アーキテクチャ

```
Private Vault Repository
  ↓ (commit & push)
GitHub Actions
  ↓ (Markdown→HTML変換)
Public Repository
  ↓ (GitHub Pages)
公開サイト
```

### リポジトリ構成

- **Private Repository**: Vault全体を管理（既存のリポジトリ）
- **Public Repository**: ブラウザから手動作成する公開用リポジトリ

### GitHub Actions方式のメリット

1. Personal Access Tokenが不要（セキュリティ向上）
2. 変換処理がGitHub上で実行される（ローカル負荷軽減）
3. CI/CD的な透明性（GitHub ActionsのUIで実行状況確認可能）

## セットアップ

### 前提条件

1. ObsidianのvaultがGitで管理されている
2. GitHubアカウント（無料プラン可）

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

1. **公開用リポジトリをブラウザから作成**
   - GitHub → New repository → Public リポジトリを作成
   - 例: `my-published-notes`
   - ⚠️ 必ずPublicリポジトリにしてください（無料プランでGitHub Pagesを使用するため）

2. **GitHub Pagesを有効化**
   - リポジトリ設定 → Pages
   - Source: Deploy from a branch
   - Branch: main / (root) → Save

3. **プラグイン設定を入力**
   - 設定 → Community plugins → GitHub Pages Publish
   - GitHubユーザー名を入力
   - 公開用リポジトリ名を入力（例: "my-published-notes"）
   - 公開対象ディレクトリを指定（例: "Public/"）

4. **（推奨）Vaultの`.gitignore`に`.obsidian-publish-tmp/`を追加**
   ```bash
   echo ".obsidian-publish-tmp/" >> .gitignore
   ```
   ※「今すぐ公開」機能を使用する場合に必要

5. **GitHub Actions をセットアップ**
   - コマンドパレット (Ctrl+P) → 「GitHub Actions をセットアップ」を実行
   - Vaultリポジトリに `.github/workflows/` が自動生成されます

6. **Vaultを commit & push**
   ```bash
   git add .
   git commit -m "Setup GitHub Actions for publishing"
   git push
   ```

7. **完了！**
   - 公開対象ディレクトリを編集してpushすると、自動的にGitHub Pagesに公開されます

## 使い方

### 基本的な使い方（GitHub Actions自動公開）

1. Obsidianでノートを編集
2. Vaultをgit commit & push
3. GitHub Actionsが自動的にMarkdown→HTML変換
4. 公開用リポジトリに自動push
5. GitHub Pagesが自動デプロイ（数分以内）

### 今すぐ公開ボタンの使い方

Vaultのcommit/pushを待たずに、すぐに公開したい場合:

1. Obsidianでノートを編集
2. 設定画面の「今すぐ公開」ボタンをクリック
3. プラグインがローカルでMarkdown→HTML変換
4. 公開用リポジトリに自動push
5. GitHub Pagesが自動デプロイ（数分以内）

注: この方式では、Vault自体をcommit/pushする必要がありません。

### 公開URLの確認

- `https://<username>.github.io/<repository-name>/` にアクセス
- 例: `https://xcd0.github.io/public-memo/`

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

プラグイン本体:
- Obsidian Plugin API
- esbuild（ビルドツール）

GitHub Actions変換スクリプト:
- `markdown-it`: Markdown→HTML変換

## 設定項目

| 項目 | 説明 | デフォルト |
|------|------|------------|
| GitHub Username | GitHubユーザー名 | - |
| Repository Name | 公開用リポジトリ名 | - |
| Publish Directory | 公開対象ディレクトリ | "Public/" |
| Exclude Patterns | 除外パターン（カンマ区切り） | "draft/*,*.tmp,Private/*" |
| Respect Frontmatter | published: falseを尊重 | true |
| Graph View | グラフビュー表示 | true |
| Backlinks | バックリンク表示 | true |
| Search | 検索機能 | true |

## GitHub Actionsワークフロー

プラグインが自動生成する `.github/workflows/publish-to-pages.yml` の内容:

- **トリガー**: 公開対象ディレクトリへのpush
- **実行内容**:
  1. Node.js環境のセットアップ
  2. Markdown→HTML変換スクリプトの実行
  3. 変換結果を公開用リポジトリにpush
- **使用権限**: `GITHUB_TOKEN`（自動提供）

## ライセンス

MIT License

## 作者

xcd0 - https://github.com/xcd0

## 問題報告

https://github.com/xcd0/obsidian-github-pages-publish/issues
