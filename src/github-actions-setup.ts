import { App, Notice, normalizePath } from 'obsidian';
import type { PluginSettings } from './types';
import * as path from 'path';

/**
 * GitHub Actions セットアップクラス。
 * ワークフローファイルと変換スクリプトをVaultリポジトリに配置する。
 */
export class GitHubActionsSetup {
	private app: App;
	private settings: PluginSettings;
	private vaultBasePath: string;

	/**
	 * コンストラクタ。
	 */
	constructor(app: App, settings: PluginSettings) {
		this.app = app;
		this.settings = settings;
		this.vaultBasePath = (this.app.vault.adapter as any).basePath;
	}

	/**
	 * GitHub Actions をセットアップ。
	 */
	async setup(silent: boolean = false): Promise<void> {
		try {
			if (!silent) {
				new Notice('GitHub Actions をセットアップしています...');
			}

			// ディレクトリを作成。
			await this.createDirectories();

			// ワークフローファイルを生成。
			await this.generateWorkflowFile();

			if (!silent) {
				new Notice('GitHub Actions のセットアップが完了しました!');
			}
			console.log('GitHub Actions のセットアップが完了しました');
		} catch (error) {
			console.error('GitHub Actions セットアップエラー:', error);
			if (!silent) {
				new Notice(`セットアップエラー: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * ワークフローが正しくセットアップされているかチェック。
	 */
	isSetupValid(): boolean {
		try {
			const fs = require('fs');
			const workflowPath = path.join(this.vaultBasePath, '.github', 'workflows', 'build-and-publish.yml');

			// ファイルが存在しない場合。
			if (!fs.existsSync(workflowPath)) {
				console.log('ワークフローファイルが存在しません:', workflowPath);
				return false;
			}

			// ファイル内容を読み込んで基本的な妥当性をチェック。
			const content = fs.readFileSync(workflowPath, 'utf-8');

			// 必須キーワードのチェック。
			const requiredKeywords = [
				'Build and Publish to GitHub Pages',
				'Clone publish repository',
				'Setup Quartz',
				'Build Quartz',
				'PUBLISH_TOKEN'
			];

			for (const keyword of requiredKeywords) {
				if (!content.includes(keyword)) {
					console.log(`ワークフローファイルに必須キーワードが含まれていません: ${keyword}`);
					return false;
				}
			}

			console.log('ワークフローファイルは正しくセットアップされています');
			return true;
		} catch (error) {
			console.error('ワークフローファイルのチェック中にエラー:', error);
			return false;
		}
	}

	/**
	 * セットアップが必要かチェックし、必要なら自動セットアップ。
	 */
	async ensureSetup(): Promise<void> {
		if (!this.isSetupValid()) {
			console.log('ワークフローが正しくセットアップされていません。自動セットアップを実行します。');
			await this.setup(true); // サイレントモードでセットアップ。
		}
	}

	/**
	 * 必要なディレクトリを作成。
	 */
	private async createDirectories(): Promise<void> {
		const workflowDir = path.join(this.vaultBasePath, '.github', 'workflows');

		const fs = require('fs');
		if (!fs.existsSync(workflowDir)) {
			fs.mkdirSync(workflowDir, { recursive: true });
		}
	}

	/**
	 * ワークフローファイルを生成。
	 */
	private async generateWorkflowFile(): Promise<void> {
		const template = this.getWorkflowTemplate();

		// プレースホルダーを置換。
		const content = template
			.replace(/{{PUBLISH_DIR}}/g, this.settings.publishDirectory)
			.replace(/{{GITHUB_USERNAME}}/g, this.settings.githubUsername)
			.replace(/{{PUBLISH_REPO}}/g, this.settings.publishRepo)
			.replace(/{{ENABLE_AUTO_SETUP}}/g, String(this.settings.quartz.enableAutoSetup))
			.replace(/{{SITE_TITLE}}/g, this.escapeYaml(this.settings.customization.siteTitle))
			.replace(/{{LOCALE}}/g, this.settings.quartz.locale)
			.replace(/{{ENABLE_SPA}}/g, String(this.settings.quartz.enableSPA))
			.replace(/{{ENABLE_POPOVERS}}/g, String(this.settings.quartz.enablePopovers))
			.replace(/{{FONT_HEADER}}/g, this.escapeYaml(this.settings.quartz.theme.typography.header))
			.replace(/{{FONT_BODY}}/g, this.escapeYaml(this.settings.quartz.theme.typography.body))
			.replace(/{{FONT_CODE}}/g, this.escapeYaml(this.settings.quartz.theme.typography.code));

		const filePath = path.join(this.vaultBasePath, '.github', 'workflows', 'build-and-publish.yml');
		const fs = require('fs');
		fs.writeFileSync(filePath, content, 'utf-8');

		console.log(`ワークフローファイルを生成しました: ${filePath}`);
	}

	/**
	 * YAML文字列をエスケープ。
	 */
	private escapeYaml(str: string): string {
		// 特殊文字を含む場合は引用符で囲む。
		if (str.includes(':') || str.includes('#') || str.includes('\n') || str.includes('"') || str.includes("'")) {
			return '"' + str.replace(/"/g, '\\"') + '"';
		}
		return str;
	}


	/**
	 * ワークフローファイルのテンプレートを取得（Vault側で完結する方式）。
	 */
	private getWorkflowTemplate(): string {
		return `name: Build and Publish to GitHub Pages

on:
  push:
    branches: [main, master]
    paths:
      - '{{PUBLISH_DIR}}/**'

permissions:
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout vault repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Clone publish repository
        env:
          PUBLISH_TOKEN: \${{ secrets.PUBLISH_TOKEN }}
        run: |
          git clone https://\${PUBLISH_TOKEN}@github.com/{{GITHUB_USERNAME}}/{{PUBLISH_REPO}}.git publish-repo
          cd publish-repo
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Setup Quartz in publish repository
        working-directory: publish-repo
        run: |
          # Quartzがセットアップ済みかチェック。
          if [ ! -f "package.json" ] || ! grep -q "quartz" package.json; then
            echo "Quartz is not setup. Setting up now..."

            # Quartzリポジトリをクローン。
            git clone https://github.com/jackyzha0/quartz.git quartz-temp

            # 必要なファイルをコピー。
            cp -r quartz-temp/quartz .
            cp quartz-temp/package.json .
            cp quartz-temp/package-lock.json .
            cp quartz-temp/tsconfig.json .
            cp quartz-temp/quartz.config.ts .
            cp quartz-temp/quartz.layout.ts .

            # contentディレクトリを作成。
            mkdir -p content

            # クローンしたディレクトリを削除。
            rm -rf quartz-temp

            # 依存関係をインストール。
            npm install

            echo "Quartz setup completed!"
            git add .
            git commit -m "feat: Auto-setup Quartz" || echo "No changes to commit"
          else
            echo "Quartz is already setup."
          fi

      - name: Clear and copy Markdown files to content directory
        run: |
          # content/ディレクトリをクリア（.gitは保持）。
          find publish-repo/content -mindepth 1 ! -path '*/\\.git/*' -delete 2>/dev/null || true

          # 公開対象ディレクトリのMarkdownファイルをコピー。
          mkdir -p publish-repo/content
          if [ -d "{{PUBLISH_DIR}}" ]; then
            cp -r {{PUBLISH_DIR}}/* publish-repo/content/ || true
          fi

          # ファイル数を確認。
          file_count=\$(find publish-repo/content -name "*.md" | wc -l)
          echo "Copied \$file_count Markdown files"

      - name: Build Quartz
        working-directory: publish-repo
        run: |
          # Node modules がない場合はインストール。
          if [ ! -d "node_modules" ]; then
            npm install
          fi

          # Quartzでビルド。
          npx quartz build

          echo "Quartz build completed!"
          ls -la public/

      - name: Push built site to publish repository
        working-directory: publish-repo
        env:
          PUBLISH_TOKEN: \${{ secrets.PUBLISH_TOKEN }}
        run: |
          git add .

          # 変更があればコミット。
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "docs: Update published site (\$(date -u +%Y-%m-%d\ %H:%M:%S))"
            git push https://\${PUBLISH_TOKEN}@github.com/{{GITHUB_USERNAME}}/{{PUBLISH_REPO}}.git main
            echo "Changes pushed to publish repository"
          fi
`;
	}

}
