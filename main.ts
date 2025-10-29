import { Notice, Plugin } from 'obsidian';
import { GitHubPagesPublishSettingTab } from './src/settings';
import { DEFAULT_SETTINGS, type PluginSettings } from './src/types';

/**
 * GitHub Pages Publishプラグインのメインクラス。
 */
export default class GitHubPagesPublishPlugin extends Plugin {
	settings: PluginSettings;

	/**
	 * プラグインの読み込み時に実行。
	 */
	async onload() {
		await this.loadSettings();

		//! リボンアイコンを追加。
		const ribbonIconEl = this.addRibbonIcon(
			'upload-cloud',
			'GitHub Pagesに公開',
			(evt: MouseEvent) => {
				this.publishToGitHubPages();
			}
		);
		ribbonIconEl.addClass('github-pages-publish-ribbon-class');

		//! ステータスバーアイテムを追加。
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('GitHub Pages: 準備完了');

		//! コマンドパレットにコマンドを追加。
		this.addCommand({
			id: 'publish-to-github-pages',
			name: 'GitHub Pagesに公開',
			callback: () => {
				this.publishToGitHubPages();
			}
		});

		this.addCommand({
			id: 'init-github-repository',
			name: 'GitHub公開用リポジトリを初期化',
			callback: () => {
				this.initializeRepository();
			}
		});

		//! 設定タブを追加。
		this.addSettingTab(new GitHubPagesPublishSettingTab(this.app, this));

		console.log('GitHub Pages Publishプラグインを読み込みました。');
	}

	/**
	 * プラグインのアンロード時に実行。
	 */
	onunload() {
		console.log('GitHub Pages Publishプラグインをアンロードしました。');
	}

	/**
	 * 設定を読み込み。
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * 設定を保存。
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * GitHub Pagesに公開。
	 */
	async publishToGitHubPages() {
		//! 設定の検証。
		if (!this.validateSettings()) {
			return;
		}

		new Notice('GitHub Pagesへの公開を開始します...');

		try {
			//! TODO: 公開処理を実装。
			// 1. 公開対象ファイルを収集。
			// 2. Markdown→HTML変換。
			// 3. グラフデータ等を生成。
			// 4. 公開用リポジトリにpush。

			new Notice('GitHub Pagesへの公開が完了しました!');
		} catch (error) {
			console.error('公開エラー:', error);
			new Notice(`公開エラー: ${error.message}`);
		}
	}

	/**
	 * 公開用リポジトリを初期化。
	 */
	async initializeRepository() {
		//! 設定の検証。
		if (!this.validateSettings()) {
			return;
		}

		new Notice('公開用リポジトリを初期化しています...');

		try {
			//! TODO: リポジトリ初期化処理を実装。
			// 1. GitHub APIでリポジトリ作成。
			// 2. GitHub Pagesを有効化。
			// 3. Gitフックを設定。

			new Notice('リポジトリの初期化が完了しました!');
		} catch (error) {
			console.error('初期化エラー:', error);
			new Notice(`初期化エラー: ${error.message}`);
		}
	}

	/**
	 * 設定の検証。
	 */
	private validateSettings(): boolean {
		if (!this.settings.githubToken) {
			new Notice('GitHub Personal Access Tokenを設定してください。');
			return false;
		}

		if (!this.settings.githubUsername) {
			new Notice('GitHubユーザー名を設定してください。');
			return false;
		}

		if (!this.settings.publishRepo) {
			new Notice('公開用リポジトリ名を設定してください。');
			return false;
		}

		if (!this.settings.publishDirectory) {
			new Notice('公開対象ディレクトリを設定してください。');
			return false;
		}

		return true;
	}
}
