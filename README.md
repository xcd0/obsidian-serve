# Obsidian GitHub Pages Publish Plugin

Obsidian vault内の指定ディレクトリをGitHub Pagesで公開するプラグインです。

## 特徴

- ✅ **完全自動公開**: [obsidian-git](https://github.com/Vinzent03/obsidian-git)と組み合わせてノート編集だけで自動デプロイ
- ✅ **シンプルな構成**: Vault側のGitHub Actionsで全処理が完結
- ✅ **セキュア**: Personal Access Tokenは公開用リポジトリへのpush時のみ使用
- ✅ **プライバシー保護**: vaultのprivateリポジトリとは別の公開用リポジトリを使用
- ✅ **選択的公開**: 指定ディレクトリのみを公開対象に
- ✅ **Quartz統合**: Quartz v4を使用した美しいサイト生成
- ✅ **Windows環境対応**: obsidian-gitとの併用で安定動作

## アーキテクチャ

```
┌─────────────────────────────────────┐
│  Vault Repository (Private)          │
│  - obsidian-gitが自動commit & push  │
│  - Private/ (非公開)                 │
│  - Public/ (公開対象)                │
└──────────────┬──────────────────────┘
               │ obsidian-gitが自動push
               ↓
┌─────────────────────────────────────┐
│  GitHub Actions (Vault側)            │
│  1. 公開用リポジトリをclone          │
│  2. Quartzをセットアップ             │
│  3. Public/をcontent/にコピー        │
│  4. npx quartz build                 │
│  5. public/を公開用リポジトリにpush  │
└──────────────┬──────────────────────┘
               │ 静的サイトをpush
               ↓
┌─────────────────────────────────────┐
│  公開用リポジトリ (Public)           │
│  - public/ (Quartzでビルド済み)     │
│  - GitHub Pages設定のみ (CI不要)    │
└──────────────┬──────────────────────┘
               │ GitHub Pagesが自動デプロイ
               ↓
         GitHub Pages (公開サイト)
```

### この設計のメリット

1. **シンプル**: 公開用リポジトリはGitHub Pagesの設定だけ（Quartzセットアップ不要）
2. **高速**: 1つのワークフローで完結（2段階CI不要）
3. **コスト削減**: GitHub Actionsの実行時間が半分に
4. **デバッグしやすい**: 全ての処理が1箇所に集約
5. **Quartzの豊富な機能**: グラフビュー、検索、タグ、美しいデザイン

## セットアップ

### 前提条件

1. [obsidian-git](https://github.com/Vinzent03/obsidian-git)プラグインがインストールされ、Vaultが Gitで管理されている
2. GitHubアカウント（無料プラン可）

**なぜobsidian-gitが必要なのか:**
- Obsidian内での安定したgit操作を提供
- 自動commit & push機能により、手動操作不要
- Windows環境での問題が解決済み
- このプラグインと組み合わせることで、完全自動公開が実現

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

#### 1. 公開用リポジトリを作成

GitHub上で新しいPublicリポジトリを作成します（空でOK、Quartzセットアップ不要）:

```
GitHub → New repository
リポジトリ名: my-published-notes（任意の名前）
公開設定: Public（⚠️ 無料プランでGitHub Pagesを使用するため必須）
Initialize: 空のリポジトリ（README等は不要）
```

#### 2. Personal Access Tokenを作成

Vault側のGitHub Actionsから公開用リポジトリにpushするため、Personal Access Tokenが必要です:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 設定:
   - Note: `Obsidian Publish Token`
   - Expiration: `No expiration`（または任意）
   - Scopes: `repo` 全体にチェック
4. "Generate token" をクリック
5. **トークンをコピー**（後で使用）

#### 3. Personal Access TokenをVaultリポジトリのSecretsに登録

1. VaultのGitHubリポジトリページを開く
2. Settings → Secrets and variables → Actions
3. "New repository secret" をクリック
4. 設定:
   - Name: `PUBLISH_TOKEN`
   - Secret: 先ほどコピーしたトークンを貼り付け
5. "Add secret" をクリック

#### 4. プラグイン設定を入力

Obsidianで:
1. 設定 → Community plugins → GitHub Pages Publish
2. 基本設定タブで入力:
   - **GitHubユーザー名**: あなたのGitHubユーザー名
   - **公開用リポジトリ名**: `my-published-notes`（手順1で作成したもの）
   - **公開対象ディレクトリ**: `Public/`（または任意）

#### 5. GitHub Actionsをセットアップ

1. コマンドパレット (`Ctrl+P`) を開く
2. 「GitHub Actions をセットアップ」を実行
3. Vaultリポジトリに `.github/workflows/build-and-publish.yml` が自動生成されます

#### 6. Vaultをcommit & push

```bash
git add .
git commit -m "feat: Setup GitHub Actions for publishing"
git push
```

#### 7. 公開用リポジトリでGitHub Pagesを有効化

1. 公開用リポジトリ (`my-published-notes`) のページを開く
2. Settings → Pages
3. Source: **Deploy from a branch** を選択
4. Branch: **main** / **(root)** を選択
5. Save

#### 8. 完了！

これで設定完了です。以降、**Public/ディレクトリのノートを編集するだけ**で:

1. obsidian-gitが自動commit & push（例: 5分ごと）
2. Vault側のGitHub ActionsがQuartzでビルド
3. 公開用リポジトリに自動push
4. GitHub Pagesが自動デプロイ（数分以内）

公開URLは `https://<username>.github.io/<repository-name>/` です。

## 使い方

### 日常的な使い方

セットアップ完了後は、**ノートを編集するだけ**で自動的に公開されます:

1. Obsidianで`Public/`ディレクトリ内のノートを編集
2. obsidian-gitが自動的にcommit & push（例: 5分ごと）
3. Vault側のGitHub Actionsが:
   - 公開用リポジトリをclone
   - Quartzでビルド
   - 結果をpush
4. GitHub Pagesが自動デプロイ（数分以内）

**手動操作は一切不要です！**

### obsidian-gitの設定例

obsidian-gitプラグインの推奨設定:

- Vault backup interval: `5`（5分ごとに自動バックアップ）
- Auto pull interval: `10`（10分ごとに自動pull）
- Auto backup after file change: `ON`（ファイル変更後にバックアップ）
- Pull updates on startup: `ON`（起動時にpull）

これにより、**ノートを編集後5分以内に自動公開**されます。

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

プラグインが自動生成する `.github/workflows/build-and-publish.yml` の内容:

- **トリガー**: `Public/`ディレクトリへのpush
- **実行内容**:
  1. Node.js 22環境のセットアップ
  2. 公開用リポジトリをclone（`PUBLISH_TOKEN`使用）
  3. Quartzのセットアップ（初回のみ）
  4. `Public/`のMarkdownファイルを`content/`にコピー
  5. `npx quartz build`でサイトをビルド
  6. `public/`ディレクトリを公開用リポジトリにpush
- **使用権限**: `PUBLISH_TOKEN`（Secretsに設定）

**メリット:**
- 公開用リポジトリは静的ファイルのみ（CI不要）
- 1つのワークフローで全処理が完結
- デバッグしやすい

## トラブルシューティング

### GitHub Actionsが動作しない

**Vault側のGitHub Actionsが実行されない:**

1. Vault側のワークフローファイル `.github/workflows/build-and-publish.yml` が存在するか確認
2. Vault側の Settings → Actions → General で、Workflowの実行が許可されているか確認
3. `Public/`ディレクトリに変更があるか確認（workflowはこのパスの変更で起動）
4. Vault側のGitHub Actionsログを確認（リポジトリの Actions タブ）

**よくあるエラー:**

- `PUBLISH_TOKEN`が設定されていない → 手順3を確認
- `Permission denied`エラー → `PUBLISH_TOKEN`のスコープに`repo`が含まれているか確認
- Quartzのビルドエラー → GitHub Actionsのログで詳細を確認

### 公開用リポジトリが更新されない

1. Vault側のGitHub Actionsが成功しているか確認
2. 公開用リポジトリに`public/`ディレクトリが存在するか確認
3. 公開用リポジトリの Settings → Pages で、Source が「Deploy from a branch」、Branch が「main / (root)」になっているか確認

### ファイルが公開されない

1. 公開対象ディレクトリの設定を確認（例: `Public/`）
2. フロントマターで `published: false` が設定されていないか確認
3. 除外パターンに該当していないか確認

### obsidian-gitがcommitしない

1. obsidian-gitの設定を確認（Vault backup intervalが設定されているか）
2. ファイルに変更があるか確認
3. obsidian-gitのログを確認（Obsidianのコンソール）

## ライセンス

CC0 1.0 Universal (CC0 1.0) Public Domain Dedication

## 作者

xcd0 - https://github.com/xcd0

## 問題報告

https://github.com/xcd0/obsidian-github-pages-publish/issues
