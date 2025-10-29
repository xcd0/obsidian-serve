import { Notice, Plugin } from 'obsidian';
import { GitHubPagesPublishSettingTab } from './src/settings';
import { DEFAULT_SETTINGS, type PluginSettings } from './src/types';
import { GitHubActionsSetup } from './src/github-actions-setup';

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
	 * 今すぐ公開（commit & push）。
	 */
	async publishNow() {
		try {
			new Notice('公開処理を開始します...');

			const vaultPath = (this.app.vault.adapter as any).basePath;
			const { exec } = require('child_process');
			const { promisify } = require('util');
			const execAsync = promisify(exec);

			// Git statusで変更があるか確認。
			const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: vaultPath });

			if (!statusOut.trim()) {
				new Notice('変更がありません');
				return;
			}

			new Notice('変更をステージングしています...');

			// git add -A
			await execAsync('git add -A', { cwd: vaultPath });

			new Notice('コミットしています...');

			// git commit
			const commitMessage = `docs: Obsidianから公開 (${new Date().toISOString()})`;
			await execAsync(`git commit -m "${commitMessage}"`, { cwd: vaultPath });

			new Notice('リモートにpushしています...');

			// git push
			await execAsync('git push', { cwd: vaultPath });

			new Notice('公開が完了しました! GitHub Actionsが自動実行されます。');

		} catch (error) {
			console.error('公開エラー:', error);
			new Notice(`公開エラー: ${error.message}`);
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
