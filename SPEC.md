# 仕様書

## 概要

Obsidian vault内の指定ディレクトリをGitHub Pagesで公開するプラグイン。

### 特徴

- **別リポジトリ方式**: vaultのprivateリポジトリとは別に、公開用リポジトリを自動作成
- **Git連動**: vaultのコミット時に自動でビルド・公開
- **Obsidian Publish風**: グラフビュー、バックリンク、検索機能を搭載
- **GitHub無料プラン対応**: publicリポジトリを使用

## アーキテクチャ

### リポジトリ構成

```
┌─────────────────────────────────────┐
│  Private Repository (Vault全体)     │
│  ・既存のvault管理用                 │
│  ・すべてのノート、設定、非公開ファイル │
│  ・ユーザーが通常通りgit commit/push  │
└──────────────┬──────────────────────┘
               │ Git hook検知
               │ (post-commit)
               ↓
┌─────────────────────────────────────┐
│  Obsidian Plugin                    │
│  1. コミットされたファイルを検出      │
│  2. 公開対象ディレクトリのみフィルタ  │
│  3. Markdown→HTML変換 + データ生成   │
│  4. 変換結果を公開用リポジトリにpush  │
└──────────────┬──────────────────────┘
               │ GitHub API経由でpush
               ↓
┌─────────────────────────────────────┐
│  Public Repository (公開用)          │
│  ・プラグインが自動作成/管理          │
│  ・変換済みHTML + JS/CSS + データ    │
│  ・公開したいコンテンツのみ           │
│  └─ GitHub Pages有効化               │
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
│           └── data.json    # 設定ファイル (gitignore推奨)
├── Private/                # 非公開ノート
│   ├── diary.md
│   └── secrets.md
├── Public/                 # 公開対象ディレクトリ
│   ├── tech/
│   │   ├── typescript.md
│   │   └── obsidian.md
│   └── blog/
│       └── 2025-01-01.md
└── .git/
    └── hooks/
        └── post-commit     # プラグインが自動生成
```

#### Public Repository (自動生成)
```
my-public-notes/            # publicリポジトリ (プラグインが管理)
├── index.html              # トップページ
├── notes/                  # 変換済みHTML
│   ├── tech/
│   │   ├── typescript.html
│   │   └── obsidian.html
│   └── blog/
│       └── 2025-01-01.html
├── assets/                 # 静的ファイル
│   ├── css/
│   │   ├── theme.css       # Obsidian風テーマ
│   │   └── graph.css       # グラフビュー用
│   ├── js/
│   │   ├── app.js          # メインアプリ
│   │   ├── graph.js        # グラフビュー
│   │   ├── search.js       # 検索機能
│   │   └── navigation.js   # ナビゲーション
│   └── images/             # 画像ファイル
│       └── image.png
└── data/                   # 生成データ
    ├── graph.json          # グラフデータ
    ├── search-index.json   # 検索インデックス
    ├── backlinks.json      # バックリンク情報
    └── file-tree.json      # ファイルツリー構造
```

## データ構造

### 設定 (PluginSettings)

```typescript
interface PluginSettings {
	// GitHub認証。
	githubToken: string;                    // Personal Access Token。
	githubUsername: string;                 // GitHubユーザー名。

	// リポジトリ設定。
	publishRepo: string;                    // 公開用リポジトリ名。
	publishRepoVisibility: 'public' | 'private'; // public推奨(無料)。
	autoCreateRepo: boolean;                // リポジトリ自動作成。

	// Vault設定。
	publishDirectory: string;               // 公開対象ディレクトリ(例: "Public/")。

	// Git連動。
	gitHookEnabled: boolean;                // post-commitフックを使用。
	autoPushOnCommit: boolean;              // コミット時に自動公開。

	// 除外設定。
	excludePatterns: string[];              // 除外パターン(例: ["draft/*", "*.tmp"])。
	respectFrontmatter: boolean;            // published: falseを尊重。

	// 機能設定。
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
2. 設定画面で入力:
   - GitHub Personal Access Token (repo権限)
   - 公開用リポジトリ名 (例: "my-public-notes")
   - 公開対象ディレクトリ (例: "Public/")
3. プラグインが自動実行:
   - 公開用リポジトリを作成(username/my-public-notes)
   - GitHub Pagesを有効化
   - Gitフックを設定(.git/hooks/post-commit)

### 日常運用フロー

```
[ユーザー操作]
1. Obsidianでノート編集
2. Vaultをgit commit
3. git push origin main (任意)

[プラグインが自動実行]
4. post-commitフック発火
5. 公開ディレクトリ内の変更検出
   例: Public/note1.md が変更された
6. 変換処理:
   - note1.md → note1.html
   - グラフデータ更新
   - 検索インデックス更新
   - バックリンク情報更新
7. 公開用リポジトリにpush
   - git clone/pull (最新状態取得)
   - 変換ファイルをコピー
   - git commit & push
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

- Personal Access Tokenは暗号化してdata.jsonに保存
- data.jsonは.gitignoreに追加推奨
- 必要最小限の権限(`repo`スコープのみ)

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
- Octokit (GitHub API)
- markdown-it (Markdown parser)
- simple-git (Git操作)

### 公開サイト側
- 静的HTML/CSS/JS
- D3.js or Force-Graph (グラフビュー)
- Lunr.js (検索)
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
