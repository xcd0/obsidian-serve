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
			text: 'Quartz v4とGitHub Actionsを使用してGitHub Pagesに自動公開します。以下の手順で設定してください:'
		});

		const ol = contentEl.createEl('ol');

		// Step 1: 公開用リポジトリ作成
		const li1 = ol.createEl('li');
		li1.createEl('strong', { text: '公開用リポジトリをブラウザから作成' });
		li1.createEl('br');
		li1.createSpan({ text: 'GitHub → New repository → Public リポジトリを作成 (例: my-published-notes)' });
		li1.createEl('br');
		li1.createSpan({ text: '⚠️ 必ずPublicリポジトリにしてください（無料プランでGitHub Pagesを使用するため）' });

		// Step 2: Quartzセットアップ
		const li2 = ol.createEl('li');
		li2.createEl('strong', { text: '公開用リポジトリにQuartzをセットアップ' });
		li2.createEl('br');
		const codeBlock1 = li2.createEl('div', { cls: 'code-block' });
		codeBlock1.createEl('pre').createEl('code', {
			text: 'git clone https://github.com/<username>/<repository-name>.git\ncd <repository-name>\nnpx quartz create  # Empty Quartzを選択'
		});
		li2.createEl('br');
		li2.createSpan({ text: 'deploy.ymlを作成（プラグインのQUARTZ_SETUP.mdを参照）' });

		// Step 3: GitHub Pages設定
		const li3 = ol.createEl('li');
		li3.createEl('strong', { text: 'GitHub Pagesを有効化' });
		li3.createEl('br');
		li3.createSpan({ text: 'リポジトリ設定 → Pages → Source: GitHub Actions を選択 → Save' });

		// Step 4: プラグイン設定
		const li4 = ol.createEl('li');
		li4.createEl('strong', { text: 'プラグイン設定を入力' });
		li4.createEl('br');
		li4.createSpan({ text: 'GitHubユーザー名、公開用リポジトリ名、公開対象ディレクトリを設定' });

		// Step 5: .gitignore設定（推奨）
		const li5 = ol.createEl('li');
		li5.createEl('strong', { text: '（推奨）Vaultの.gitignoreに追加' });
		li5.createEl('br');
		const codeBlock2 = li5.createEl('div', { cls: 'code-block' });
		codeBlock2.createEl('pre').createEl('code', {
			text: 'echo ".obsidian-publish-tmp/" >> .gitignore'
		});
		li5.createEl('br');
		li5.createSpan({ text: '※「今すぐ公開」機能を使用する場合に必要' });

		// Step 6: GitHub Actionsセットアップ
		const li6 = ol.createEl('li');
		li6.createEl('strong', { text: 'GitHub Actions をセットアップ' });
		li6.createEl('br');
		li6.createSpan({ text: 'コマンドパレット (Ctrl+P) から「GitHub Actions をセットアップ」を実行' });
		li6.createEl('br');
		li6.createSpan({ text: 'Vaultリポジトリに .github/workflows/sync-to-quartz.yml が自動生成されます' });

		// Step 7: Vault commit & push
		const li7 = ol.createEl('li');
		li7.createEl('strong', { text: 'Vaultを commit & push' });
		li7.createEl('br');
		const codeBlock3 = li7.createEl('div', { cls: 'code-block' });
		codeBlock3.createEl('pre').createEl('code', {
			text: 'git add .\ngit commit -m "Setup GitHub Actions"\ngit push'
		});

		// Step 8: 完了
		const li8 = ol.createEl('li');
		li8.createEl('strong', { text: '完了！' });
		li8.createEl('br');
		li8.createSpan({ text: '公開対象ディレクトリを編集してpushすると、自動的にQuartz経由でGitHub Pagesに公開されます' });

		contentEl.createEl('br');

		// 仕組みの説明
		const noteDiv = contentEl.createDiv({ cls: 'mod-warning' });
		noteDiv.createEl('strong', { text: '💡 仕組み' });
		noteDiv.createEl('br');
		noteDiv.createSpan({
			text: 'Vault側のGitHub ActionsがMarkdownファイルを公開用リポジトリのcontent/に同期し、公開用リポジトリ側のGitHub ActionsがQuartzでビルドしてGitHub Pagesにデプロイします。Personal Access Tokenは不要です。'
		});

		contentEl.createEl('br');

		// リンク集
		const linkDiv = contentEl.createDiv();
		linkDiv.createEl('p', { text: '詳細は以下のリンクを参照してください:' });
		const ul = linkDiv.createEl('ul');
		const linkLi1 = ul.createEl('li');
		linkLi1.createEl('a', {
			text: 'Quartz公式ドキュメント',
			href: 'https://quartz.jzhao.xyz/'
		});
		const linkLi2 = ul.createEl('li');
		linkLi2.createEl('a', {
			text: 'QUARTZ_SETUP.md（詳細な手順）',
			href: 'https://github.com/xcd0/obsidian-serve/blob/master/QUARTZ_SETUP.md'
		});
		const linkLi3 = ul.createEl('li');
		linkLi3.createEl('a', {
			text: 'GitHub Pagesについて',
			href: 'https://docs.github.com/ja/pages/getting-started-with-github-pages'
		});
		const linkLi4 = ul.createEl('li');
		linkLi4.createEl('a', {
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
	private currentTab: string = 'basic';

	/**
	 * コンストラクタ。
	 */
	constructor(app: App, plugin: GitHubPagesPublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Windows環境かどうかを判定。
	 */
	private isWindows(): boolean {
		return navigator.platform.toLowerCase().includes('win');
	}

	/**
	 * タブナビゲーションを描画。
	 */
	private renderTabNavigation(containerEl: HTMLElement): void {
		const navDiv = containerEl.createDiv({ cls: 'settings-tab-nav' });

		const tabs = [
			{ id: 'basic', label: '基本設定' },
			{ id: 'homepage', label: 'ホームページ' },
			{ id: 'quartz', label: 'Quartz設定' },
			{ id: 'features', label: '機能設定' },
			{ id: 'actions', label: '管理' },
		];

		tabs.forEach(tab => {
			const button = navDiv.createEl('button', {
				text: tab.label,
				cls: 'settings-tab-button'
			});

			if (tab.id === this.currentTab) {
				button.addClass('is-active');
			}

			button.addEventListener('click', () => {
				this.currentTab = tab.id;
				this.display();
			});
		});
	}

	/**
	 * 設定画面を表示。
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// タブナビゲーションを描画。
		this.renderTabNavigation(containerEl);

		// 現在のタブに応じてコンテンツを描画。
		const tabContentDiv = containerEl.createDiv({ cls: 'settings-tab-content is-active' });

		switch (this.currentTab) {
			case 'basic':
				this.renderBasicTab(tabContentDiv);
				break;
			case 'homepage':
				this.renderHomepageTab(tabContentDiv);
				break;
			case 'quartz':
				this.renderQuartzTab(tabContentDiv);
				break;
			case 'features':
				this.renderFeaturesTab(tabContentDiv);
				break;
			case 'actions':
				this.renderActionsTab(tabContentDiv);
				break;
		}
	}

	/**
	 * 基本設定タブを描画。
	 */
	private renderBasicTab(containerEl: HTMLElement): void {
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
			.setName('除外プレフィックス')
			.setDesc('カンマ区切りで除外プレフィックスを指定。ファイル名/ディレクトリ名がこれらで始まる場合は非公開 (例: .,_,draft-)')
			.addText(text => text
				.setPlaceholder('.,_,draft-')
				.setValue(this.plugin.settings.excludePrefixes.join(','))
				.onChange(async (value) => {
					this.plugin.settings.excludePrefixes = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
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
	}

	/**
	 * ホームページタブを描画。
	 */
	private renderHomepageTab(containerEl: HTMLElement): void {
		const { IndexGenerator } = require('./index-generator');

		//! 説明セクション。
		containerEl.createEl('h2', { text: 'ホームページ設定' });

		const descDiv = containerEl.createDiv();
		descDiv.createEl('p', {
			text: 'Quartzサイトのホームページ (index.md) を生成します。公開対象ディレクトリの直下に配置されます。'
		});

		//! ページタイトル設定。
		containerEl.createEl('h3', { text: 'ページ情報' });

		new Setting(containerEl)
			.setName('ページタイトル')
			.setDesc('ホームページのタイトル（フロントマターに使用）')
			.addText(text => text
				.setPlaceholder('Home')
				.setValue(this.plugin.settings.indexPage.title)
				.onChange(async (value) => {
					this.plugin.settings.indexPage.title = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('ウェルカムメッセージの見出し')
			.setDesc('ホームページの最初の見出し')
			.addText(text => text
				.setPlaceholder('Welcome')
				.setValue(this.plugin.settings.indexPage.welcomeHeading)
				.onChange(async (value) => {
					this.plugin.settings.indexPage.welcomeHeading = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('説明文')
			.setDesc('ホームページの説明文')
			.addTextArea(text => text
				.setPlaceholder('This is my published notes.')
				.setValue(this.plugin.settings.indexPage.description)
				.onChange(async (value) => {
					this.plugin.settings.indexPage.description = value;
					await this.plugin.saveSettings();
				}));

		//! 最近のノート設定。
		containerEl.createEl('h3', { text: '最近のノート' });

		new Setting(containerEl)
			.setName('最近のノートを含める')
			.setDesc('ホームページに最近のノートのリストを表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indexPage.includeRecentNotes)
				.onChange(async (value) => {
					this.plugin.settings.indexPage.includeRecentNotes = value;
					await this.plugin.saveSettings();
					this.display(); // 設定変更時に再描画。
				}));

		if (this.plugin.settings.indexPage.includeRecentNotes) {
			new Setting(containerEl)
				.setName('最近のノートの件数')
				.setDesc('表示する最近のノートの件数')
				.addSlider(slider => slider
					.setLimits(1, 30, 1)
					.setValue(this.plugin.settings.indexPage.recentNotesCount)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.indexPage.recentNotesCount = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('最近のノートセクションの見出し')
				.setDesc('最近のノートセクションの見出し')
				.addText(text => text
					.setPlaceholder('Recent Notes')
					.setValue(this.plugin.settings.indexPage.recentNotesHeading)
					.onChange(async (value) => {
						this.plugin.settings.indexPage.recentNotesHeading = value;
						await this.plugin.saveSettings();
					}));
		}

		//! 生成ボタン。
		containerEl.createEl('h3', { text: 'index.md生成' });

		new Setting(containerEl)
			.setName('index.mdを生成')
			.setDesc(`上記の設定を使用してindex.mdを生成します。\n生成先: ${this.plugin.settings.publishDirectory}index.md`)
			.addButton(button => button
				.setButtonText('生成')
				.setCta()
				.onClick(async () => {
					try {
						button.setDisabled(true);
						button.setButtonText('生成中...');

						const generator = new IndexGenerator(this.app, this.plugin.settings);
						await generator.generate();

						button.setButtonText('生成完了!');
						setTimeout(() => {
							button.setButtonText('生成');
							button.setDisabled(false);
						}, 2000);
					} catch (error) {
						console.error('index.md生成エラー:', error);
						button.setButtonText('生成');
						button.setDisabled(false);
					}
				}));
	}

	/**
	 * Quartz設定タブを描画。
	 */
	private renderQuartzTab(containerEl: HTMLElement): void {
		//! Quartz設定セクション。
		containerEl.createEl('h2', { text: 'Quartz設定' });

		new Setting(containerEl)
			.setName('Quartz自動セットアップを有効化')
			.setDesc('GitHub Actions実行時に公開用リポジトリへQuartzを自動セットアップ')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.quartz.enableAutoSetup)
				.onChange(async (value) => {
					this.plugin.settings.quartz.enableAutoSetup = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('ロケール')
			.setDesc('サイトのロケール設定')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'ja-JP': '日本語',
					'en-US': 'English',
					'zh-CN': '简体中文',
					'zh-TW': '繁體中文',
					'ko-KR': '한국어',
				})
				.setValue(this.plugin.settings.quartz.locale)
				.onChange(async (value) => {
					this.plugin.settings.quartz.locale = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('SPA（シングルページアプリケーション）')
			.setDesc('ページ遷移を高速化（推奨）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.quartz.enableSPA)
				.onChange(async (value) => {
					this.plugin.settings.quartz.enableSPA = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('ホバープレビュー')
			.setDesc('リンクにホバーした時にプレビューを表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.quartz.enablePopovers)
				.onChange(async (value) => {
					this.plugin.settings.quartz.enablePopovers = value;
					await this.plugin.saveSettings();
				}));

		// テーマ設定（折りたたみ可能）
		containerEl.createEl('h3', { text: 'テーマ設定' });

		new Setting(containerEl)
			.setName('ヘッダーフォント')
			.setDesc('見出しに使用するフォント')
			.addText(text => text
				.setPlaceholder('Schibsted Grotesk')
				.setValue(this.plugin.settings.quartz.theme.typography.header)
				.onChange(async (value) => {
					this.plugin.settings.quartz.theme.typography.header = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('本文フォント')
			.setDesc('本文に使用するフォント')
			.addText(text => text
				.setPlaceholder('Source Sans Pro')
				.setValue(this.plugin.settings.quartz.theme.typography.body)
				.onChange(async (value) => {
					this.plugin.settings.quartz.theme.typography.body = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('コードフォント')
			.setDesc('コードブロックに使用するフォント')
			.addText(text => text
				.setPlaceholder('IBM Plex Mono')
				.setValue(this.plugin.settings.quartz.theme.typography.code)
				.onChange(async (value) => {
					this.plugin.settings.quartz.theme.typography.code = value;
					await this.plugin.saveSettings();
				}));
	}

	/**
	 * 機能設定タブを描画。
	 */
	private renderFeaturesTab(containerEl: HTMLElement): void {
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
	}

	/**
	 * 管理タブを描画。
	 */
	private renderActionsTab(containerEl: HTMLElement): void {
		//! アクションセクション。
		containerEl.createEl('h2', { text: 'アクション' });

		new Setting(containerEl)
			.setName('GitHub Actions をセットアップ')
			.setDesc('Vaultリポジトリに .github/workflows/build-and-publish.yml を生成します。「今すぐ公開」実行時に自動チェック・セットアップされるため、通常は手動実行不要です。')
			.addButton(button => button
				.setButtonText('セットアップ')
				.setCta()
				.onClick(async () => {
					await this.plugin.setupGitHubActions();
				}));

		new Setting(containerEl)
			.setName('セットアップ確認')
			.setDesc('GitHub Actionsのワークフローが正しくセットアップされているか確認します。未セットアップの場合は自動生成します。')
			.addButton(button => button
				.setButtonText('確認')
				.setCta()
				.onClick(async () => {
					await this.plugin.publishNow();
				}));

		// 公開手順の説明。
		const infoDiv = containerEl.createDiv({ cls: 'setting-item-description' });
		infoDiv.createEl('p', {
			text: '公開するには、obsidian-gitで自動commit & pushを設定するか、手動で git push を実行してください。pushされると、Vault側のGitHub Actionsが自動的にQuartzでビルドし、公開用リポジトリにデプロイします。'
		});

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
