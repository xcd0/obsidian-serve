import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import type GitHubPagesPublishPlugin from '../main';
import { DEFAULT_SETTINGS, type PluginSettings } from './types';

/**
 * 初期設定ガイドのダイアログ。
 */
class SetupGuideModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '📋 初期設定ガイド' });

		contentEl.createEl('p', {
			text: 'GitHub Actionsを使用してGitHub Pagesに自動公開します。以下の手順で設定してください:'
		});

		const ol = contentEl.createEl('ol');

		const li1 = ol.createEl('li');
		li1.createEl('strong', { text: '公開用リポジトリをブラウザから作成' });
		li1.createEl('br');
		li1.createSpan({ text: 'GitHub → New repository → Public リポジトリを作成 (例: my-published-notes)' });
		li1.createEl('br');
		li1.createSpan({ text: '⚠️ 必ずPublicリポジトリにしてください（無料プランでGitHub Pagesを使用するため）' });

		const li2 = ol.createEl('li');
		li2.createEl('strong', { text: 'GitHub Pagesを有効化' });
		li2.createEl('br');
		li2.createSpan({ text: 'リポジトリ設定 → Pages → Source: Deploy from a branch → Branch: main / (root) → Save' });

		const li3 = ol.createEl('li');
		li3.createEl('strong', { text: 'プラグイン設定を入力' });
		li3.createEl('br');
		li3.createSpan({ text: 'GitHubユーザー名、公開用リポジトリ名、公開対象ディレクトリを設定' });

		const li4 = ol.createEl('li');
		li4.createEl('strong', { text: 'GitHub Actions をセットアップ' });
		li4.createEl('br');
		li4.createSpan({ text: 'コマンドパレット (Ctrl+P) から「GitHub Actions をセットアップ」を実行' });
		li4.createEl('br');
		li4.createSpan({ text: 'Vaultリポジトリに .github/workflows/ が自動生成されます' });

		const li5 = ol.createEl('li');
		li5.createEl('strong', { text: 'Vaultを commit & push' });
		li5.createEl('br');
		li5.createSpan({ text: 'git add . && git commit -m "Setup GitHub Actions" && git push' });

		const li6 = ol.createEl('li');
		li6.createEl('strong', { text: '完了！' });
		li6.createEl('br');
		li6.createSpan({ text: '公開対象ディレクトリを編集してpushすると、自動的にGitHub Pagesに公開されます' });

		contentEl.createEl('br');

		const noteDiv = contentEl.createDiv({ cls: 'mod-warning' });
		noteDiv.createEl('strong', { text: '💡 仕組み' });
		noteDiv.createEl('br');
		noteDiv.createSpan({
			text: 'GitHub Actionsが自動的にMarkdown→HTML変換を行い、公開用リポジトリにpushします。Personal Access Tokenは不要です。'
		});

		contentEl.createEl('br');

		const linkDiv = contentEl.createDiv();
		linkDiv.createEl('p', { text: '詳細は以下のリンクを参照してください:' });
		const ul = linkDiv.createEl('ul');
		const linkLi1 = ul.createEl('li');
		linkLi1.createEl('a', {
			text: 'GitHub Pagesについて',
			href: 'https://docs.github.com/ja/pages/getting-started-with-github-pages'
		});
		const linkLi2 = ul.createEl('li');
		linkLi2.createEl('a', {
			text: 'GitHub Actionsについて',
			href: 'https://docs.github.com/ja/actions'
		});

		// 閉じるボタン。
		const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
		const closeButton = buttonDiv.createEl('button', { text: '閉じる' });
		closeButton.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

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

		//! 初期設定ガイドボタン。
		new Setting(containerEl)
			.setName('📋 初期設定ガイド')
			.setDesc('GitHub Pagesで公開するための手順を確認')
			.addButton(button => button
				.setButtonText('ガイドを表示')
				.setCta()
				.onClick(() => {
					new SetupGuideModal(this.app).open();
				}));

		//! GitHub設定セクション。
		containerEl.createEl('h2', { text: 'GitHub設定' });

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
			.setDesc('ブラウザから作成した公開用リポジトリの名前 (初期設定ガイド参照)')
			.addText(text => text
				.setPlaceholder('my-published-notes')
				.setValue(this.plugin.settings.publishRepo)
				.onChange(async (value) => {
					this.plugin.settings.publishRepo = value;
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

		//! アクションセクション。
		containerEl.createEl('h2', { text: 'アクション' });

		new Setting(containerEl)
			.setName('GitHub Actions をセットアップ')
			.setDesc('Vaultリポジトリに .github/workflows/ を自動生成します')
			.addButton(button => button
				.setButtonText('セットアップ')
				.setCta()
				.onClick(async () => {
					await this.plugin.setupGitHubActions();
				}));

		//! 設定管理セクション。
		containerEl.createEl('h2', { text: '設定管理' });

		// 設定保存場所の表示。
		const settingsPath = `${this.plugin.manifest.dir}/data.json`;
		new Setting(containerEl)
			.setName('設定ファイルの保存場所')
			.setDesc(`設定は自動的にJSONファイルとして保存されます: ${settingsPath}`)
			.setClass('setting-item-description');

		// 設定エクスポート。
		new Setting(containerEl)
			.setName('設定をエクスポート')
			.setDesc('現在の設定をJSONファイルとしてダウンロード')
			.addButton(button => button
				.setButtonText('エクスポート')
				.onClick(async () => {
					try {
						const json = JSON.stringify(this.plugin.settings, null, 2);
						const blob = new Blob([json], { type: 'application/json' });
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = 'obsidian-github-pages-settings.json';
						a.click();
						URL.revokeObjectURL(url);
						new Notice('設定をエクスポートしました');
					} catch (error) {
						console.error('エクスポートエラー:', error);
						new Notice('設定のエクスポートに失敗しました');
					}
				}));

		// 設定インポート。
		new Setting(containerEl)
			.setName('設定をインポート')
			.setDesc('JSONファイルから設定を読み込み')
			.addButton(button => button
				.setButtonText('インポート')
				.onClick(async () => {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = '.json';
					input.onchange = async (e) => {
						try {
							const file = (e.target as HTMLInputElement).files?.[0];
							if (!file) return;

							const text = await file.text();
							const settings = JSON.parse(text);

							// 設定を適用。
							Object.assign(this.plugin.settings, settings);
							await this.plugin.saveSettings();

							// 設定画面を再描画。
							this.display();

							new Notice('設定をインポートしました');
						} catch (error) {
							console.error('インポートエラー:', error);
							new Notice('設定のインポートに失敗しました');
						}
					};
					input.click();
				}));

		// 設定リセット。
		new Setting(containerEl)
			.setName('設定をリセット')
			.setDesc('すべての設定をデフォルト値に戻します')
			.addButton(button => button
				.setButtonText('リセット')
				.setWarning()
				.onClick(async () => {
					// 確認ダイアログ。
					const confirmed = confirm('すべての設定をデフォルト値に戻します。よろしいですか？');
					if (!confirmed) return;

					try {
						// デフォルト設定に戻す。
						Object.assign(this.plugin.settings, DEFAULT_SETTINGS);
						await this.plugin.saveSettings();

						// 設定画面を再描画。
						this.display();

						new Notice('設定をリセットしました');
					} catch (error) {
						console.error('リセットエラー:', error);
						new Notice('設定のリセットに失敗しました');
					}
				}));
	}
}
