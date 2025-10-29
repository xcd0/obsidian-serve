//! プラグインで使用する型定義。

/**
 * プラグイン設定。
 */
export interface PluginSettings {
	//! GitHub認証。
	githubToken: string;                    // Personal Access Token。
	githubUsername: string;                 // GitHubユーザー名。

	//! リポジトリ設定。
	publishRepo: string;                    // 公開用リポジトリ名。
	publishRepoVisibility: 'public' | 'private'; // public推奨(無料)。
	autoCreateRepo: boolean;                // リポジトリ自動作成。

	//! Vault設定。
	publishDirectory: string;               // 公開対象ディレクトリ(例: "Public/")。

	//! Git連動。
	gitHookEnabled: boolean;                // post-commitフックを使用。
	autoPushOnCommit: boolean;              // コミット時に自動公開。

	//! 除外設定。
	excludePatterns: string[];              // 除外パターン(例: ["draft/*", "*.tmp"])。
	respectFrontmatter: boolean;            // published: falseを尊重。

	//! 機能設定。
	features: {
		graphView: boolean;                 // グラフビュー表示。
		backlinks: boolean;                 // バックリンク表示。
		search: boolean;                    // 検索機能。
		tagList: boolean;                   // タグ一覧。
		toc: boolean;                       // 目次。
		darkMode: boolean;                  // ダークモード。
	};

	//! カスタマイズ。
	customization: {
		siteTitle: string;                  // サイトタイトル。
		favicon: string;                    // ファビコンパス。
		logo: string;                       // ロゴパス。
		customCSS: string;                  // カスタムCSS。
		customJS: string;                   // カスタムJS。
	};
}

/**
 * デフォルト設定値。
 */
export const DEFAULT_SETTINGS: PluginSettings = {
	githubToken: '',
	githubUsername: '',
	publishRepo: '',
	publishRepoVisibility: 'public',
	autoCreateRepo: true,
	publishDirectory: 'Public/',
	gitHookEnabled: true,
	autoPushOnCommit: true,
	excludePatterns: ['draft/*', '*.tmp', 'Private/*'],
	respectFrontmatter: true,
	features: {
		graphView: true,
		backlinks: true,
		search: true,
		tagList: true,
		toc: true,
		darkMode: true,
	},
	customization: {
		siteTitle: 'My Published Notes',
		favicon: '',
		logo: '',
		customCSS: '',
		customJS: '',
	},
};

/**
 * グラフノード。
 */
export interface GraphNode {
	id: string;           // ファイルパス。
	title: string;        // ノートタイトル。
	links: string[];      // リンク先。
	backlinks: string[];  // バックリンク。
	tags: string[];       // タグ。
}

/**
 * グラフデータ。
 */
export interface GraphData {
	nodes: GraphNode[];
	edges: Array<{ source: string; target: string; }>;
}

/**
 * バックリンク情報。
 */
export interface BacklinkInfo {
	fromFile: string;       // リンク元ファイル。
	fromTitle: string;      // リンク元タイトル。
	context: string;        // リンク周辺のテキスト。
}

/**
 * バックリンクデータ。
 */
export interface BacklinkData {
	[filePath: string]: {
		incomingLinks: BacklinkInfo[];
	};
}

/**
 * ファイルノード。
 */
export interface FileNode {
	name: string;           // ファイル/フォルダ名。
	path: string;           // パス。
	type: 'file' | 'folder'; // タイプ。
	children?: FileNode[];  // 子要素(フォルダの場合)。
}

/**
 * フロントマター。
 */
export interface Frontmatter {
	title?: string;         // タイトル。
	published?: boolean;    // 公開フラグ。
	tags?: string[];        // タグ。
	[key: string]: unknown; // その他のフィールド。
}

/**
 * 変換されたノート。
 */
export interface ConvertedNote {
	filePath: string;       // 元のファイルパス。
	htmlPath: string;       // 出力HTMLパス。
	html: string;           // 変換後のHTML。
	frontmatter: Frontmatter; // フロントマター。
	links: string[];        // このノートからのリンク。
	tags: string[];         // タグ。
}
