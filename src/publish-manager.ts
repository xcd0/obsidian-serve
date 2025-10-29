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
			const htmlPath = 'notes/' + relativePath.replace(/\.md$/, '.html');

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
	 * 認証をテスト。
	 */
	async testAuthentication(): Promise<boolean> {
		return await this.githubAPI.testAuthentication();
	}
}
