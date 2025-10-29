//! プラグインで使用する型定義。

/**
 * プラグイン設定。
 */
export interface PluginSettings {
	//! GitHub設定。
	githubUsername: string;                 // GitHubユーザー名。

	//! リポジトリ設定。
	publishRepo: string;                    // 公開用リポジトリ名。

	//! Vault設定。
	publishDirectory: string;               // 公開対象ディレクトリ(例: "Public/")。

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

	//! Quartz設定。
	quartz: {
		enableAutoSetup: boolean;           // Quartz自動セットアップを有効化。
		locale: string;                     // ロケール (例: "ja-JP", "en-US")。
		enableSPA: boolean;                 // SPA（シングルページアプリケーション）を有効化。
		enablePopovers: boolean;            // ホバー時のプレビューポップアップを有効化。
		theme: {
			typography: {
				header: string;             // ヘッダーフォント。
				body: string;               // 本文フォント。
				code: string;               // コードフォント。
			};
			colors: {
				lightMode: {
					light: string;          // 背景色。
					lightgray: string;      // 薄いグレー。
					gray: string;           // グレー。
					darkgray: string;       // 濃いグレー。
					dark: string;           // テキスト色。
					secondary: string;      // セカンダリカラー。
					tertiary: string;       // ターシャリカラー。
					highlight: string;      // ハイライト色。
				};
				darkMode: {
					light: string;
					lightgray: string;
					gray: string;
					darkgray: string;
					dark: string;
					secondary: string;
					tertiary: string;
					highlight: string;
				};
			};
		};
	};
}

/**
 * デフォルト設定値。
 */
export const DEFAULT_SETTINGS: PluginSettings = {
	githubUsername: '',
	publishRepo: '',
	publishDirectory: 'Public/',
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
	quartz: {
		enableAutoSetup: true,
		locale: 'ja-JP',
		enableSPA: true,
		enablePopovers: true,
		theme: {
			typography: {
				header: 'Schibsted Grotesk',
				body: 'Source Sans Pro',
				code: 'IBM Plex Mono',
			},
			colors: {
				lightMode: {
					light: '#faf8f8',
					lightgray: '#e5e5e5',
					gray: '#b8b8b8',
					darkgray: '#4e4e4e',
					dark: '#2b2b2b',
					secondary: '#284b63',
					tertiary: '#84a59d',
					highlight: 'rgba(143, 159, 169, 0.15)',
				},
				darkMode: {
					light: '#161618',
					lightgray: '#393639',
					gray: '#646464',
					darkgray: '#d4d4d4',
					dark: '#ebebec',
					secondary: '#7b97aa',
					tertiary: '#84a59d',
					highlight: 'rgba(143, 159, 169, 0.15)',
				},
			},
		},
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
