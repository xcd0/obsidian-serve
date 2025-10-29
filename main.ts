import { Notice, Plugin } from 'obsidian';
import { GitHubPagesPublishSettingTab } from './src/settings';
import { DEFAULT_SETTINGS, type PluginSettings } from './src/types';
import { GitHubActionsSetup } from './src/github-actions-setup';
import { LocalPublishManager } from './src/local-publish-manager';

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
			'settings',
			'GitHub Actions セットアップ',
			(evt: MouseEvent) => {
				this.setupGitHubActions();
			}
		);
		ribbonIconEl.addClass('github-pages-publish-ribbon-class');

		//! ステータスバーアイテムを追加。
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('GitHub Pages: GitHub Actions方式');

		//! コマンドパレットにコマンドを追加。
		this.addCommand({
			id: 'setup-github-actions',
			name: 'GitHub Actions をセットアップ',
			callback: () => {
				this.setupGitHubActions();
			}
		});

		this.addCommand({
			id: 'publish-now',
			name: '今すぐ公開',
			callback: () => {
				this.publishNow();
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
	 * GitHub Actions をセットアップ。
	 */
	async setupGitHubActions() {
		//! 設定の検証。
		if (!this.validateSettings()) {
			return;
		}

		try {
			const setup = new GitHubActionsSetup(this.app, this.settings);
			await setup.setup();
		} catch (error) {
			console.error('GitHub Actions セットアップエラー:', error);
			new Notice(`セットアップエラー: ${error.message}`);
		}
	}

	/**
	 * 今すぐ公開（GitHub Actionsのセットアップを確認）。
	 */
	async publishNow() {
		//! 設定の検証。
		if (!this.validateSettings()) {
			return;
		}

		try {
			// GitHub Actionsのセットアップを確認・実行。
			const setup = new GitHubActionsSetup(this.app, this.settings);
			await setup.ensureSetup();

			new Notice('GitHub Actionsのセットアップを確認しました。\n\n' +
				'obsidian-gitの自動commit & pushまたは手動でgit pushを実行してください。', 8000);

		} catch (error) {
			console.error('セットアップエラー:', error);
			new Notice(`セットアップエラー: ${error.message}\n\n` +
				'設定タブから手動でセットアップを実行してください。', 8000);
		}
	}

	/**
	 * 設定の検証。
	 */
	private validateSettings(): boolean {
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
