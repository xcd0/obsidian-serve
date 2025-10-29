import { App, PluginSettingTab, Setting } from 'obsidian';
import type GitHubPagesPublishPlugin from '../main';
import type { PluginSettings } from './types';

/**
 * プラグイン設定タブ。
 */
export class GitHubPagesPublishSettingTab extends PluginSettingTab {
	plugin: GitHubPagesPublishPlugin;

	/**
	 * コンストラクタ。
	 */
	constructor(app: App, plugin: GitHubPagesPublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * 設定画面を表示。
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		//! 初期設定ガイドセクション。
		containerEl.createEl('h2', { text: '📋 初期設定ガイド' });

		const guideDiv = containerEl.createDiv({ cls: 'setting-item-description' });
		guideDiv.createEl('p', { text: 'GitHub Pagesで公開するための専用リポジトリを作成します。以下の手順で設定してください:' });

		const ol = guideDiv.createEl('ol');
		ol.createEl('li', { text: 'GitHub Personal Access Tokenを作成 (Settings → Developer settings → Personal access tokens → Tokens (classic))' });
		ol.createEl('li', { text: '必要な権限: repo (Full control of private repositories)' });
		ol.createEl('li', { text: '下記の「GitHub設定」にTokenとユーザー名を入力' });
		ol.createEl('li', { text: '「リポジトリ設定」で公開用リポジトリ名を指定 (例: my-published-notes)' });
		ol.createEl('li', { text: '「公開設定」で公開対象ディレクトリを指定 (例: Public/)' });
		ol.createEl('li', { text: 'コマンドパレットから「GitHub公開用リポジトリを初期化」を実行' });
		ol.createEl('li', { text: 'リポジトリが作成され、GitHub Pagesが自動的に有効化されます' });

		const noteDiv = guideDiv.createDiv({ cls: 'mod-warning' });
		noteDiv.createEl('strong', { text: '注意: ' });
		noteDiv.createSpan({ text: 'GitHub無料プランでは、公開用リポジトリをPublicにする必要があります。Privateリポジトリを使用する場合はGitHub Pro ($4/月) が必要です。' });

		containerEl.createEl('br');

		//! GitHub設定セクション。
		containerEl.createEl('h2', { text: 'GitHub設定' });

		new Setting(containerEl)
			.setName('GitHub Personal Access Token')
			.setDesc('repo権限を持つトークンを入力してください')
			.addText(text => text
				.setPlaceholder('ghp_xxxxxxxxxxxx')
				.setValue(this.plugin.settings.githubToken)
				.onChange(async (value) => {
					this.plugin.settings.githubToken = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('GitHubユーザー名')
			.setDesc('あなたのGitHubユーザー名')
			.addText(text => text
				.setPlaceholder('username')
				.setValue(this.plugin.settings.githubUsername)
				.onChange(async (value) => {
					this.plugin.settings.githubUsername = value;
					await this.plugin.saveSettings();
				}));

		//! リポジトリ設定セクション。
		containerEl.createEl('h2', { text: 'リポジトリ設定' });

		new Setting(containerEl)
			.setName('公開用リポジトリ名')
			.setDesc('作成する公開用リポジトリの名前')
			.addText(text => text
				.setPlaceholder('my-published-notes')
				.setValue(this.plugin.settings.publishRepo)
				.onChange(async (value) => {
					this.plugin.settings.publishRepo = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('リポジトリの可視性')
			.setDesc('public: 無料、private: GitHub Pro以上が必要')
			.addDropdown(dropdown => dropdown
				.addOption('public', 'Public')
				.addOption('private', 'Private')
				.setValue(this.plugin.settings.publishRepoVisibility)
				.onChange(async (value) => {
					this.plugin.settings.publishRepoVisibility = value as 'public' | 'private';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('リポジトリ自動作成')
			.setDesc('存在しない場合、リポジトリを自動作成')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCreateRepo)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateRepo = value;
					await this.plugin.saveSettings();
				}));

		//! 公開設定セクション。
		containerEl.createEl('h2', { text: '公開設定' });

		new Setting(containerEl)
			.setName('公開対象ディレクトリ')
			.setDesc('Vault内で公開するディレクトリ (例: Public/)')
			.addText(text => text
				.setPlaceholder('Public/')
				.setValue(this.plugin.settings.publishDirectory)
				.onChange(async (value) => {
					this.plugin.settings.publishDirectory = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('除外パターン')
			.setDesc('カンマ区切りで除外パターンを指定 (例: draft/*,*.tmp)')
			.addText(text => text
				.setPlaceholder('draft/*,*.tmp')
				.setValue(this.plugin.settings.excludePatterns.join(','))
				.onChange(async (value) => {
					this.plugin.settings.excludePatterns = value.split(',').map(s => s.trim());
					await this.plugin.saveSettings();
				}));

		//! Git連動設定セクション。
		containerEl.createEl('h2', { text: 'Git連動設定' });

		new Setting(containerEl)
			.setName('Gitフックを有効化')
			.setDesc('post-commitフックを使用して自動公開')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.gitHookEnabled)
				.onChange(async (value) => {
					this.plugin.settings.gitHookEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('コミット時に自動公開')
			.setDesc('コミット時に自動的にGitHub Pagesに公開')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPushOnCommit)
				.onChange(async (value) => {
					this.plugin.settings.autoPushOnCommit = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('フロントマターを尊重')
			.setDesc('published: falseを尊重して非公開にする')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.respectFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.respectFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		//! 機能設定セクション。
		containerEl.createEl('h2', { text: '機能設定' });

		new Setting(containerEl)
			.setName('グラフビュー')
			.setDesc('ノード間の関係をグラフ表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.features.graphView)
				.onChange(async (value) => {
					this.plugin.settings.features.graphView = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('バックリンク')
			.setDesc('被リンク一覧を表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.features.backlinks)
				.onChange(async (value) => {
					this.plugin.settings.features.backlinks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('検索機能')
			.setDesc('全文検索機能を有効化')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.features.search)
				.onChange(async (value) => {
					this.plugin.settings.features.search = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('タグ一覧')
			.setDesc('タグ一覧とフィルタリング')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.features.tagList)
				.onChange(async (value) => {
					this.plugin.settings.features.tagList = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('目次')
			.setDesc('右サイドバーに目次を表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.features.toc)
				.onChange(async (value) => {
					this.plugin.settings.features.toc = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('ダークモード')
			.setDesc('ダークモード対応')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.features.darkMode)
				.onChange(async (value) => {
					this.plugin.settings.features.darkMode = value;
					await this.plugin.saveSettings();
				}));

		//! カスタマイズセクション。
		containerEl.createEl('h2', { text: 'カスタマイズ' });

		new Setting(containerEl)
			.setName('サイトタイトル')
			.setDesc('公開サイトのタイトル')
			.addText(text => text
				.setPlaceholder('My Published Notes')
				.setValue(this.plugin.settings.customization.siteTitle)
				.onChange(async (value) => {
					this.plugin.settings.customization.siteTitle = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('カスタムCSS')
			.setDesc('カスタムCSSファイルのパス')
			.addText(text => text
				.setPlaceholder('custom.css')
				.setValue(this.plugin.settings.customization.customCSS)
				.onChange(async (value) => {
					this.plugin.settings.customization.customCSS = value;
					await this.plugin.saveSettings();
				}));

		//! アクションボタン。
		containerEl.createEl('h2', { text: 'アクション' });

		new Setting(containerEl)
			.setName('リポジトリ初期化')
			.setDesc('公開用リポジトリを作成してGitHub Pagesを有効化')
			.addButton(button => button
				.setButtonText('初期化')
				.onClick(async () => {
					// TODO: リポジトリ初期化処理を実装。
					console.log('リポジトリ初期化');
				}));

		new Setting(containerEl)
			.setName('手動公開')
			.setDesc('今すぐ公開用リポジトリにpush')
			.addButton(button => button
				.setButtonText('公開')
				.onClick(async () => {
					// TODO: 手動公開処理を実装。
					console.log('手動公開');
				}));
	}
}
