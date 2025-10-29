# 仕様書

## 概要

Obsidian vault内の指定ディレクトリをGitHub Pagesで公開するプラグイン。

### 特徴

- **別リポジトリ方式**: vaultのprivateリポジトリとは別に、公開用リポジトリを使用
- **GitHub Actions方式**: Personal Access Token不要、セキュア
- **Git連動**: vaultのcommit & pushで自動ビルド・公開
- **Obsidian Publish風**: グラフビュー、バックリンク、検索機能を搭載予定
- **GitHub無料プラン対応**: publicリポジトリを使用

## アーキテクチャ

### リポジトリ構成

```
┌─────────────────────────────────────┐
│  Private Repository (Vault全体)     │
│  ・既存のvault管理用                 │
│  ・すべてのノート、設定、非公開ファイル │
│  ・.github/workflows/ (プラグインが生成) │
│  ・ユーザーが通常通りgit commit/push  │
└──────────────┬──────────────────────┘
               │ git push
               ↓
┌─────────────────────────────────────┐
│  GitHub Actions                     │
│  1. 公開対象ディレクトリの変更を検知  │
│  2. Node.js環境をセットアップ        │
│  3. Markdown→HTML変換スクリプト実行  │
│  4. 変換結果を公開用リポジトリにpush  │
└──────────────┬──────────────────────┘
               │ GITHUB_TOKEN使用
               ↓
┌─────────────────────────────────────┐
│  Public Repository (公開用)          │
│  ・ブラウザから手動作成               │
│  ・変換済みHTML + index.html         │
│  ・公開したいコンテンツのみ           │
│  └─ GitHub Pages有効化（手動）       │
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
├── .github/                # プラグインが自動生成
│   ├── workflows/
│   │   └── publish-to-pages.yml  # GitHub Actionsワークフロー
│   └── scripts/
│       ├── convert.mjs     # Markdown→HTML変換スクリプト
│       └── package.json    # 変換スクリプトの依存関係
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

#### Public Repository (手動作成)
```
my-public-notes/            # publicリポジトリ (GitHub Actionsが管理)
├── index.html              # トップページ（自動生成）
├── tech/                   # 変換済みHTML
│   ├── typescript.html
│   └── obsidian.html
└── blog/
    └── 2025-01-01.html
```

注: GitHub Actions方式では、assets/やdata/などの静的ファイルは今後のフェーズで実装予定。
現在はシンプルなHTMLファイルのみを生成。

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
   - GitHub Pagesを有効化 (Settings → Pages)
3. 設定画面で入力:
   - GitHubユーザー名
   - 公開用リポジトリ名 (例: "my-public-notes")
   - 公開対象ディレクトリ (例: "Public/")
4. 「GitHub Actions をセットアップ」コマンドを実行
   - Vaultリポジトリに .github/workflows/ が自動生成される
   - .github/scripts/convert.mjs も自動生成される
5. Vaultをcommit & push
   ```bash
   git add .
   git commit -m "Setup GitHub Actions"
   git push
   ```

### 日常運用フロー

```
[ユーザー操作]
1. Obsidianでノート編集
2. Vaultをgit commit
3. git push origin main

[GitHub Actionsが自動実行]
4. 公開対象ディレクトリの変更を検知
5. Node.js環境をセットアップ
6. 変換スクリプト (convert.mjs) を実行:
   - Markdownファイルを収集
   - note1.md → note1.html
   - index.htmlを生成
7. 変換結果を公開用リポジトリにpush (GITHUB_TOKEN使用)
8. GitHub Pagesが自動デプロイ (数分以内)
```

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
