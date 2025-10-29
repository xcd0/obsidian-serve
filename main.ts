import { Notice, Plugin } from 'obsidian';
import { GitHubPagesPublishSettingTab } from './src/settings';
import { DEFAULT_SETTINGS, type PluginSettings } from './src/types';
import { PublishManager } from './src/publish-manager';

/**
 * GitHub Pages Publishプラグインのメインクラス。
 */
export default class GitHubPagesPublishPlugin extends Plugin {
	settings: PluginSettings;
	publishManager: PublishManager | null = null;

	/**
	 * プラグインの読み込み時に実行。
	 */
	async onload() {
		await this.loadSettings();

		//! PublishManagerを初期化。
		this.initializePublishManager();

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

		this.addCommand({
			id: 'test-github-auth',
			name: 'GitHub認証をテスト',
			callback: () => {
				this.testAuthentication();
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
		try {
			const loadedData = await this.loadData();
			this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
			console.log('設定を読み込みました:', this.getSettingsPath());
		} catch (error) {
			console.error('設定の読み込みに失敗しました:', error);
			this.settings = Object.assign({}, DEFAULT_SETTINGS);
		}
	}

	/**
	 * 設定を保存。
	 */
	async saveSettings() {
		try {
			await this.saveData(this.settings);
			console.log('設定を保存しました:', this.getSettingsPath());
			//! 設定が変更されたらPublishManagerを再初期化。
			this.initializePublishManager();
		} catch (error) {
			console.error('設定の保存に失敗しました:', error);
			new Notice('設定の保存に失敗しました');
		}
	}

	/**
	 * 設定ファイルのパスを取得。
	 */
	private getSettingsPath(): string {
		return `${this.manifest.dir}/data.json`;
	}

	/**
	 * PublishManagerを初期化。
	 */
	private initializePublishManager() {
		//! 必要な設定が揃っている場合のみ初期化。
		if (this.settings.githubToken && this.settings.githubUsername) {
			this.publishManager = new PublishManager(this.app, this.settings);
		}
	}

	/**
	 * GitHub Pagesに公開。
	 */
	async publishToGitHubPages() {
		//! 設定の検証。
		if (!this.validateSettings()) {
			return;
		}

		try {
			if (!this.publishManager) {
				this.initializePublishManager();
			}

			if (!this.publishManager) {
				new Notice('PublishManagerの初期化に失敗しました');
				return;
			}

			await this.publishManager.publish();
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

		try {
			if (!this.publishManager) {
				this.initializePublishManager();
			}

			if (!this.publishManager) {
				new Notice('PublishManagerの初期化に失敗しました');
				return;
			}

			await this.publishManager.initializeRepository();
		} catch (error) {
			console.error('初期化エラー:', error);
			new Notice(`初期化エラー: ${error.message}`);
		}
	}

	/**
	 * GitHub認証をテスト。
	 */
	async testAuthentication() {
		if (!this.settings.githubToken || !this.settings.githubUsername) {
			new Notice('GitHub TokenとUsernameを設定してください');
			return;
		}

		try {
			if (!this.publishManager) {
				this.initializePublishManager();
			}

			if (!this.publishManager) {
				new Notice('PublishManagerの初期化に失敗しました');
				return;
			}

			const success = await this.publishManager.testAuthentication();
			if (success) {
				new Notice('GitHub認証に成功しました!');
			} else {
				new Notice('GitHub認証に失敗しました');
			}
		} catch (error) {
			console.error('認証テストエラー:', error);
			new Notice(`認証エラー: ${error.message}`);
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
