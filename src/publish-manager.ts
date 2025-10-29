import { App, Notice, TFile } from 'obsidian';
import { GitHubAPI } from './github-api';
import { MarkdownConverter } from './markdown-converter';
import { GitManager } from './git-manager';
import type { PluginSettings, ConvertedNote } from './types';
import * as path from 'path';

/**
 * 公開マネージャークラス。
 * 全体の処理を統括する。
 */
export class PublishManager {
	private app: App;
	private settings: PluginSettings;
	private githubAPI: GitHubAPI;
	private converter: MarkdownConverter;
	private gitManager: GitManager;

	/**
	 * コンストラクタ。
	 */
	constructor(app: App, settings: PluginSettings) {
		this.app = app;
		this.settings = settings;
		this.githubAPI = new GitHubAPI(
			settings.githubToken,
			settings.githubUsername
		);
		this.converter = new MarkdownConverter();
		this.gitManager = new GitManager(
			(this.app.vault.adapter as any).basePath
		);
	}

	/**
	 * リポジトリを初期化。
	 */
	async initializeRepository(): Promise<void> {
		try {
			new Notice('リポジトリを初期化しています...');

			// リポジトリが既に存在するか確認。
			const exists = await this.githubAPI.repositoryExists(
				this.settings.publishRepo
			);

			if (exists) {
				new Notice('リポジトリは既に存在します');
			} else {
				// リポジトリを作成。
				await this.githubAPI.createRepository(
					this.settings.publishRepo,
					this.settings.publishRepoVisibility === 'private',
					'Published notes from Obsidian'
				);
			}

			// GitHub Pagesを有効化。
			await this.githubAPI.enableGitHubPages(
				this.settings.publishRepo,
				'main'
			);

			// GitHub PagesのURLを取得。
			const url = await this.githubAPI.getGitHubPagesUrl(
				this.settings.publishRepo
			);
			if (url) {
				new Notice(`公開URL: ${url}`);
			}

			// Gitフックをセットアップ。
			if (this.settings.gitHookEnabled) {
				await this.setupGitHook();
			}

			new Notice('リポジトリの初期化が完了しました!');
		} catch (error) {
			console.error('初期化エラー:', error);
			new Notice(`初期化エラー: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Gitフックをセットアップ。
	 */
	private async setupGitHook(): Promise<void> {
		// TODO: プラグインのコマンドを実行するフックを作成。
		// 現在は簡易的な実装。
		const command = 'echo "Obsidian GitHub Pages Publish triggered"';
		await this.gitManager.setupPostCommitHook(command);
	}

	/**
	 * 公開を実行。
	 */
	async publish(): Promise<void> {
		try {
			new Notice('公開を開始します...');

			// リポジトリの存在確認。
			const repoExists = await this.githubAPI.repositoryExists(
				this.settings.publishRepo
			);

			if (!repoExists) {
				// リポジトリが存在しない場合、自動作成するか確認。
				if (this.settings.autoCreateRepo) {
					new Notice('公開用リポジトリが存在しないため、自動作成します...');
					await this.initializeRepository();
					new Notice('リポジトリを作成しました。公開を続行します...');
				} else {
					new Notice('公開用リポジトリが存在しません。先に「リポジトリ初期化」を実行してください。');
					return;
				}
			} else {
				// リポジトリは存在するが、GitHub Pagesが有効化されているか確認。
				const pagesUrl = await this.githubAPI.getGitHubPagesUrl(
					this.settings.publishRepo
				);
				if (!pagesUrl) {
					new Notice('GitHub Pagesが有効化されていないため、有効化します...');
					await this.githubAPI.enableGitHubPages(
						this.settings.publishRepo,
						'main'
					);
				}
			}

			// 既存のHTMLファイルを削除。
			await this.cleanupOldFiles();

			// 公開対象ファイルを収集。
			const files = await this.collectPublishableFiles();

			if (files.length === 0) {
				new Notice('公開するファイルがありません');
				return;
			}

			new Notice(`${files.length}個のファイルを変換しています...`);

			// ファイルを変換。
			const convertedNotes: ConvertedNote[] = [];
			for (const file of files) {
				const content = await this.app.vault.read(file);
				const note = this.converter.convert(file.path, content);

				// published: falseの場合はスキップ。
				if (this.settings.respectFrontmatter &&
					note.frontmatter.published === false) {
					console.log(`スキップ (published: false): ${file.path}`);
					continue;
				}

				convertedNotes.push(note);
			}

			if (convertedNotes.length === 0) {
				new Notice('公開対象のファイルがありません (全てpublished: false)');
				return;
			}

			new Notice(`${convertedNotes.length}個のファイルをアップロードしています...`);

			// GitHubにアップロード。
			await this.uploadToGitHub(convertedNotes);

			// index.htmlを生成してアップロード。
			await this.generateAndUploadIndex(convertedNotes);

			new Notice('公開が完了しました!');

			// 公開URLを表示。
			const url = await this.githubAPI.getGitHubPagesUrl(
				this.settings.publishRepo
			);
			if (url) {
				new Notice(`公開URL: ${url}`);
			}
		} catch (error) {
			console.error('公開エラー:', error);
			new Notice(`公開エラー: ${error.message}`);
			throw error;
		}
	}

	/**
	 * 公開対象ファイルを収集。
	 */
	private async collectPublishableFiles(): Promise<TFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();

		// 公開ディレクトリ配下のファイルのみをフィルタ。
		const publishDir = this.settings.publishDirectory.replace(/\/$/, '');
		const filesInPublishDir = allFiles.filter(file =>
			file.path.startsWith(publishDir + '/') || file.path === publishDir
		);

		// 除外パターンにマッチするファイルを除外。
		const filteredFiles = filesInPublishDir.filter(file => {
			for (const pattern of this.settings.excludePatterns) {
				const regex = new RegExp(
					'^' + pattern
						.replace(/\*/g, '.*')
						.replace(/\?/g, '.')
						.replace(/\//g, '\\/')
					+ '$'
				);
				if (regex.test(file.path)) {
					return false;
				}
			}
			return true;
		});

		return filteredFiles;
	}

	/**
	 * GitHubにアップロード。
	 */
	private async uploadToGitHub(notes: ConvertedNote[]): Promise<void> {
		for (const note of notes) {
			// HTMLを生成。
			const html = this.converter.generateFullHTML(
				note,
				this.settings.customization.siteTitle,
				this.settings.customization.customCSS
			);

			// 公開ディレクトリを除いたパスを生成。
			const publishDir = this.settings.publishDirectory.replace(/\/$/, '');
			let relativePath = note.filePath;
			if (relativePath.startsWith(publishDir + '/')) {
				relativePath = relativePath.slice(publishDir.length + 1);
			}

			// HTMLパスを生成 (.mdを.htmlに変換)。
			const htmlPath = relativePath.replace(/\.md$/, '.html');

			// GitHubにアップロード。
			await this.githubAPI.uploadFile(
				this.settings.publishRepo,
				htmlPath,
				html,
				`Update ${relativePath}`,
				'main'
			);

			console.log(`アップロード完了: ${htmlPath}`);
		}
	}

	/**
	 * 既存の古いファイルを削除。
	 */
	private async cleanupOldFiles(): Promise<void> {
		try {
			new Notice('既存ファイルを削除しています...');

			// リポジトリ内の全ファイルを取得。
			const allFiles = await this.githubAPI.getAllFiles(
				this.settings.publishRepo,
				'',
				'main'
			);

			// HTMLファイルのみをフィルタ。
			const htmlFiles = allFiles.filter(file => file.endsWith('.html'));

			if (htmlFiles.length === 0) {
				console.log('削除対象のファイルはありません');
				return;
			}

			console.log(`${htmlFiles.length}個のファイルを削除します`);

			// 各HTMLファイルを削除。
			for (const file of htmlFiles) {
				await this.githubAPI.deleteFile(
					this.settings.publishRepo,
					file,
					'Clean up old files',
					'main'
				);
				console.log(`削除完了: ${file}`);
			}

			new Notice(`${htmlFiles.length}個の古いファイルを削除しました`);
		} catch (error) {
			console.error('ファイル削除エラー:', error);
			// エラーが発生しても公開は続行する。
			new Notice('一部のファイルの削除に失敗しましたが、公開を続行します');
		}
	}

	/**
	 * index.htmlを生成してアップロード。
	 */
	private async generateAndUploadIndex(notes: ConvertedNote[]): Promise<void> {
		try {
			new Notice('index.htmlを生成しています...');

			// ファイルをディレクトリ別にグループ化。
			const grouped: { [dir: string]: ConvertedNote[] } = {};
			for (const note of notes) {
				const dir = note.htmlPath.includes('/')
					? note.htmlPath.substring(0, note.htmlPath.lastIndexOf('/'))
					: '.';
				if (!grouped[dir]) {
					grouped[dir] = [];
				}
				grouped[dir].push(note);
			}

			// index.htmlを生成。
			const html = this.generateIndexHTML(notes, grouped);

			// GitHubにアップロード。
			await this.githubAPI.uploadFile(
				this.settings.publishRepo,
				'index.html',
				html,
				'Update index.html',
				'main'
			);

			console.log('index.htmlをアップロードしました');
		} catch (error) {
			console.error('index.html生成エラー:', error);
			// エラーが発生しても公開は成功とする。
		}
	}

	/**
	 * index.htmlのHTMLを生成。
	 */
	private generateIndexHTML(notes: ConvertedNote[], grouped: { [dir: string]: ConvertedNote[] }): string {
		const siteTitle = this.settings.customization.siteTitle || 'Published Notes';
		const customCSS = this.settings.customization.customCSS || '';

		// ディレクトリをソート。
		const dirs = Object.keys(grouped).sort();

		// ファイルリストのHTMLを生成。
		let fileListHTML = '';
		for (const dir of dirs) {
			const dirNotes = grouped[dir];
			// 各ディレクトリ内でファイルをソート。
			dirNotes.sort((a, b) => b.htmlPath.localeCompare(a.htmlPath)); // 降順(新しい順)

			if (dir !== '.') {
				fileListHTML += `<h2>${dir}</h2>\n`;
			}

			fileListHTML += '<ul class="file-list">\n';
			for (const note of dirNotes) {
				const title = note.frontmatter.title || note.htmlPath.replace(/\.html$/, '');
				const tags = note.tags.length > 0 ? `<span class="tags">${note.tags.map(t => `#${t}`).join(' ')}</span>` : '';
				fileListHTML += `  <li>
    <a href="/${note.htmlPath}">${title}</a>
    ${tags}
  </li>\n`;
			}
			fileListHTML += '</ul>\n';
		}

		// 完全なHTMLを生成。
		return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${siteTitle}</title>
	<style>
		:root {
			--bg-color: #ffffff;
			--text-color: #2e3440;
			--link-color: #5e81ac;
			--border-color: #e5e9f0;
			--hover-bg: #f8f9fa;
		}

		@media (prefers-color-scheme: dark) {
			:root {
				--bg-color: #2e3440;
				--text-color: #eceff4;
				--link-color: #88c0d0;
				--border-color: #4c566a;
				--hover-bg: #3b4252;
			}
		}

		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
			line-height: 1.6;
			color: var(--text-color);
			background-color: var(--bg-color);
			padding: 2rem;
			max-width: 900px;
			margin: 0 auto;
		}

		h1 {
			font-size: 2.5rem;
			margin-bottom: 0.5rem;
			border-bottom: 2px solid var(--border-color);
			padding-bottom: 1rem;
		}

		h2 {
			font-size: 1.5rem;
			margin-top: 2rem;
			margin-bottom: 1rem;
			color: var(--link-color);
		}

		.file-list {
			list-style: none;
			margin-bottom: 2rem;
		}

		.file-list li {
			padding: 0.75rem;
			margin-bottom: 0.5rem;
			border: 1px solid var(--border-color);
			border-radius: 6px;
			transition: background-color 0.2s ease;
		}

		.file-list li:hover {
			background-color: var(--hover-bg);
		}

		.file-list a {
			color: var(--link-color);
			text-decoration: none;
			font-weight: 500;
			font-size: 1.1rem;
		}

		.file-list a:hover {
			text-decoration: underline;
		}

		.tags {
			display: inline-block;
			margin-left: 1rem;
			font-size: 0.9rem;
			color: #888;
		}

		.footer {
			margin-top: 3rem;
			padding-top: 2rem;
			border-top: 1px solid var(--border-color);
			text-align: center;
			font-size: 0.9rem;
			color: #888;
		}

		${customCSS}
	</style>
</head>
<body>
	<h1>${siteTitle}</h1>
	<p>公開されているノート一覧です。</p>

	${fileListHTML}

	<div class="footer">
		<p>Generated by Obsidian GitHub Pages Publish</p>
	</div>
</body>
</html>`;
	}

	/**
	 * 認証をテスト。
	 */
	async testAuthentication(): Promise<boolean> {
		return await this.githubAPI.testAuthentication();
	}
}
