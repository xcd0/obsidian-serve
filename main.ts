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
	 * 今すぐ公開（obsidian-gitのcommit & pushを実行）。
	 */
	async publishNow() {
		//! 設定の検証。
		if (!this.validateSettings()) {
			return;
		}

		try {
			// obsidian-gitプラグインがインストールされているか確認。
			const obsidianGitPlugin = (this.app as any).plugins.getPlugin('obsidian-git');

			if (!obsidianGitPlugin) {
				new Notice('obsidian-gitプラグインがインストールされていません。\n\n' +
					'このプラグインはobsidian-gitと連携して動作します。\n' +
					'obsidian-gitをインストールしてから再試行してください。', 10000);
				return;
			}

			// obsidian-gitが有効になっているか確認。
			if (!obsidianGitPlugin._loaded) {
				new Notice('obsidian-gitプラグインが有効になっていません。\n\n' +
					'設定 → Community plugins でobsidian-gitを有効化してください。', 10000);
				return;
			}

			new Notice('変更をコミット・プッシュしています...');

			// obsidian-gitのcommit & pushコマンドを実行。
			const success = await (this.app as any).commands.executeCommandById('obsidian-git:commit-push-specified-message');

			if (success === false) {
				// コマンドが見つからない場合は別のコマンドIDを試す。
				const fallbackSuccess = await (this.app as any).commands.executeCommandById('obsidian-git:commit-push');

				if (fallbackSuccess === false) {
					new Notice('obsidian-gitのコマンド実行に失敗しました。\n\n' +
						'コマンドパレットから「Obsidian Git: Commit and push」を手動で実行してください。', 10000);
					return;
				}
			}

			// 成功時のメッセージはobsidian-gitが表示するため、ここでは表示しない。
			console.log('obsidian-gitのcommit & pushコマンドを実行しました');

		} catch (error) {
			console.error('公開エラー:', error);
			new Notice(`公開エラー: ${error.message}\n\n` +
				'コマンドパレットから「Obsidian Git: Commit and push」を手動で実行してください。', 10000);
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
