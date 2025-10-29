# 仕様書

## 概要

Obsidian vault内の指定ディレクトリをGitHub Pagesで公開するプラグイン。

### 特徴

- **別リポジトリ方式**: vaultのprivateリポジトリとは別に、公開用リポジトリを使用
- **GitHub Actions方式**: Personal Access Token不要、セキュア
- **Git連動**: vaultのcommit & pushで自動ビルド・公開
- **Quartz統合**: Quartz v4を使用した美しいサイト生成
- **GitHub無料プラン対応**: publicリポジトリを使用

## アーキテクチャ

### リポジトリ構成

```
┌─────────────────────────────────────┐
│  Private Repository (Vault全体)     │
│  ・既存のvault管理用                 │
│  ・すべてのノート、設定、非公開ファイル │
│  ・.github/workflows/sync-to-quartz.yml │
│  ・ユーザーが通常通りgit commit/push  │
└──────────────┬──────────────────────┘
               │ git push
               ↓
┌─────────────────────────────────────┐
│  GitHub Actions (Vault側)           │
│  1. 公開対象ディレクトリの変更を検知  │
│  2. Markdownファイルを収集           │
│  3. 公開用リポジトリのcontent/にpush │
└──────────────┬──────────────────────┘
               │ GITHUB_TOKEN使用
               ↓
┌─────────────────────────────────────┐
│  Public Repository (Quartz)          │
│  ・ブラウザから手動作成 + Quartz初期化│
│  ・content/ (Vaultから同期)          │
│  ・quartz/ (Quartzのソースコード)    │
│  ・.github/workflows/deploy.yml      │
└──────────────┬──────────────────────┘
               │ content/の変更を検知
               ↓
┌─────────────────────────────────────┐
│  GitHub Actions (公開用リポジトリ側) │
│  1. Quartz環境をセットアップ          │
│  2. npx quartz build                │
│  3. public/をGitHub Pagesにデプロイ  │
└──────────────┬──────────────────────┘
               │ 自動デプロイ
               ↓
         ┌──────────────┐
         │ GitHub Pages │
         │ (公開サイト)  │
         └──────────────┘
```

### ディレクトリ構造

#### Private Repository (Vault)
```
my-obsidian-vault/          # privateリポジトリ
├── .obsidian/
│   └── plugins/
│       └── github-pages-publish/
│           ├── main.js
│           ├── manifest.json
│           └── data.json    # 設定ファイル
├── .obsidian-publish-tmp/  # ローカル公開用（.gitignore推奨）
│   └── my-public-notes/    # 公開用リポジトリのclone
├── .github/                # プラグインが自動生成
│   ├── workflows/
│   │   └── publish-to-pages.yml  # GitHub Actionsワークフロー
│   └── scripts/
│       ├── convert.mjs     # Markdown→HTML変換スクリプト
│       └── package.json    # 変換スクリプトの依存関係
├── .gitignore              # .obsidian-publish-tmp/を追加推奨
├── Private/                # 非公開ノート
│   ├── diary.md
│   └── secrets.md
└── Public/                 # 公開対象ディレクトリ
    ├── tech/
    │   ├── typescript.md
    │   └── obsidian.md
    └── blog/
        └── 2025-01-01.md
```

#### Public Repository (Quartz)
```
my-public-notes/            # publicリポジトリ (Quartz統合)
├── content/                # Vaultから同期されるMarkdown
│   ├── tech/
│   │   ├── typescript.md
│   │   └── obsidian.md
│   └── blog/
│       └── 2025-01-01.md
├── quartz/                 # Quartzのソースコード
├── .github/
│   └── workflows/
│       └── deploy.yml      # Quartzビルド・デプロイワークフロー
├── quartz.config.ts        # Quartz設定ファイル
├── quartz.layout.ts        # レイアウト設定
├── package.json
└── public/                 # Quartzでビルドされた静的サイト（自動生成）
    ├── index.html
    ├── tech/
    │   ├── typescript/
    │   │   └── index.html
    │   └── obsidian/
    │       └── index.html
    └── assets/
```

注: public/ディレクトリはQuartzが自動生成するため、Gitリポジトリには含めません。

## データ構造

### 設定 (PluginSettings)

```typescript
interface PluginSettings {
	// GitHub設定。
	githubUsername: string;                 // GitHubユーザー名。

	// リポジトリ設定。
	publishRepo: string;                    // 公開用リポジトリ名。

	// Vault設定。
	publishDirectory: string;               // 公開対象ディレクトリ(例: "Public/")。

	// 除外設定。
	excludePatterns: string[];              // 除外パターン(例: ["draft/*", "*.tmp"])。
	respectFrontmatter: boolean;            // published: falseを尊重。

	// 機能設定（今後実装予定）。
	features: {
		graphView: boolean;                 // グラフビュー表示。
		backlinks: boolean;                 // バックリンク表示。
		search: boolean;                    // 検索機能。
		tagList: boolean;                   // タグ一覧。
		toc: boolean;                       // 目次。
		darkMode: boolean;                  // ダークモード。
	};

	// カスタマイズ。
	customization: {
		siteTitle: string;                  // サイトタイトル。
		favicon: string;                    // ファビコンパス。
		logo: string;                       // ロゴパス。
		customCSS: string;                  // カスタムCSS。
		customJS: string;                   // カスタムJS。
	};
}
```

注: GitHub Actions方式では、Personal Access Tokenやgitフック設定は不要。

### グラフデータ (graph.json)

```typescript
interface GraphNode {
	id: string;           // ファイルパス。
	title: string;        // ノートタイトル。
	links: string[];      // リンク先。
	backlinks: string[];  // バックリンク。
	tags: string[];       // タグ。
}

interface GraphData {
	nodes: GraphNode[];
	edges: Array<{ source: string; target: string; }>;
}
```

### バックリンクデータ (backlinks.json)

```typescript
interface BacklinkData {
	[filePath: string]: {
		incomingLinks: Array<{
			fromFile: string;       // リンク元ファイル。
			fromTitle: string;      // リンク元タイトル。
			context: string;        // リンク周辺のテキスト。
		}>;
	};
}
```

### ファイルツリー (file-tree.json)

```typescript
interface FileNode {
	name: string;           // ファイル/フォルダ名。
	path: string;           // パス。
	type: 'file' | 'folder'; // タイプ。
	children?: FileNode[];  // 子要素(フォルダの場合)。
}
```

## ワークフロー

### 初回セットアップ

1. プラグインインストール
2. ブラウザからGitHubで公開用リポジトリを作成:
   - Public リポジトリを作成 (例: "my-public-notes")
3. 公開用リポジトリにQuartzをセットアップ:
   ```bash
   git clone https://github.com/<username>/my-public-notes.git
   cd my-public-notes
   npx quartz create  # Empty Quartz を選択
   # .github/workflows/deploy.yml を作成 (QUARTZ_SETUP.md参照)
   git add . && git commit -m "feat: Setup Quartz" && git push
   ```
4. GitHub Pagesを有効化:
   - リポジトリ設定 → Pages → Source: GitHub Actions
5. 設定画面で入力:
   - GitHubユーザー名
   - 公開用リポジトリ名 (例: "my-public-notes")
   - 公開対象ディレクトリ (例: "Public/")
6. （推奨）Vaultの`.gitignore`に`.obsidian-publish-tmp/`を追加:
   ```bash
   echo ".obsidian-publish-tmp/" >> .gitignore
   ```
   ※「今すぐ公開」機能を使用する場合に必要
7. 「GitHub Actions をセットアップ」コマンドを実行
   - Vaultリポジトリに .github/workflows/sync-to-quartz.yml が自動生成される
8. Vaultをcommit & push
   ```bash
   git add .
   git commit -m "Setup GitHub Actions"
   git push
   ```

### 日常運用フロー

#### 方式1: GitHub Actions自動公開（推奨）

```
[ユーザー操作]
1. Obsidianでノート編集
2. Vaultをgit commit
3. git push origin main

[Vault側のGitHub Actions]
4. 公開対象ディレクトリの変更を検知
5. Markdownファイルを収集
6. 公開用リポジトリのcontent/ディレクトリにpush (GITHUB_TOKEN使用)

[公開用リポジトリ側のGitHub Actions]
7. content/の変更を検知
8. Node.js v22環境をセットアップ
9. npx quartz buildを実行
10. public/ディレクトリをGitHub Pagesにデプロイ
11. サイトが公開される (数分以内)
```

#### 方式2: 今すぐ公開ボタン（ローカル変換）

```
[ユーザー操作]
1. Obsidianでノート編集
2. 設定画面の「今すぐ公開」ボタンをクリック

[プラグインがローカルで実行]
3. Vault配下の.obsidian-publish-tmp/に公開用リポジトリをclone/pull
4. Markdownファイルを収集して変換:
   - note1.md → note1.html
   - index.htmlを生成
5. .obsidian-publish-tmp/<repo>/内でgit commit
6. 公開用リポジトリにpush
7. GitHub Pagesが自動デプロイ (数分以内)
```

注: 方式2はVaultのcommit/pushを必要としないため、Vault自体の変更を残さずに公開できます。

## 変換処理

### Markdown → HTML

1. **フロントマター解析**
   ```yaml
   ---
   title: タイトル
   published: true
   tags: [tag1, tag2]
   ---
   ```

2. **Wikiリンク変換**
   ```
   [[note1]] → <a href="/notes/note1.html">note1</a>
   [[note1|表示名]] → <a href="/notes/note1.html">表示名</a>
   ```

3. **画像パス変換**
   ```
   ![[image.png]] → <img src="/assets/images/image.png">
   ```

4. **埋め込み変換**
   ```
   ![[note2]] → note2の内容を展開
   ```

## セキュリティ

### トークン管理

GitHub Actions方式では、Personal Access Tokenは不要。
- GitHub Actionsの `GITHUB_TOKEN` を自動使用
- トークンをローカルに保存しない（セキュリティ向上）
- ワークフローファイルはVaultリポジトリにcommit可能

### 誤公開防止

1. **フロントマター制御**
   ```yaml
   ---
   published: false  # 明示的に非公開指定
   ---
   ```

2. **除外パターン**
   - 設定で除外パターンを指定 (例: `["Private/*", "draft/*", "*.tmp"]`)

3. **公開前確認**
   - 初回公開時に確認ダイアログ表示

## 技術スタック

### プラグイン側
- TypeScript
- Obsidian Plugin API
- esbuild (ビルドツール)

### GitHub Actions変換スクリプト
- Node.js (ES Modules)
- markdown-it (Markdown parser)

### 公開サイト側
- 静的HTML/CSS
- 将来的に: D3.js or Force-Graph (グラフビュー)
- 将来的に: Lunr.js (検索)
- vanilla JavaScript (フレームワークレス)

## 開発フェーズ

### Phase 1: 基本機能
- プラグイン骨格作成
- 設定画面実装
- GitHub連携(手動公開)
- 基本的なHTML生成

### Phase 2: Git連動
- Gitフック実装
- コミット検知機能
- 差分ビルド機能

### Phase 3: Obsidian風機能
- グラフビュー実装
- バックリンク機能
- 検索機能

### Phase 4: UI/UX改善
- Obsidian Publish風デザイン
- ダークモード
- レスポンシブ対応

### Phase 5: 高度な機能
- タグフィルタリング
- カスタムテーマ
- パフォーマンス最適化

## 制限事項

- GitHub無料プランの場合、公開用リポジトリはpublicにする必要がある
- GitHub Pagesのビルド時間により、公開まで数分かかる場合がある
- 大量のファイル（数千ファイル以上）の場合、初回ビルドに時間がかかる
