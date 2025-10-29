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
	async setup(): Promise<void> {
		try {
			new Notice('GitHub Actions をセットアップしています...');

			// ディレクトリを作成。
			await this.createDirectories();

			// ワークフローファイルを生成。
			await this.generateWorkflowFile();

			new Notice('GitHub Actions のセットアップが完了しました!');
			new Notice('次に公開用リポジトリにQuartzをセットアップしてください。');
		} catch (error) {
			console.error('GitHub Actions セットアップエラー:', error);
			new Notice(`セットアップエラー: ${error.message}`);
			throw error;
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
			.replace(/{{PUBLISH_REPO}}/g, this.settings.publishRepo);

		const filePath = path.join(this.vaultBasePath, '.github', 'workflows', 'sync-to-quartz.yml');
		const fs = require('fs');
		fs.writeFileSync(filePath, content, 'utf-8');

		console.log(`ワークフローファイルを生成しました: ${filePath}`);
	}


	/**
	 * ワークフローファイルのテンプレートを取得（Quartz方式）。
	 */
	private getWorkflowTemplate(): string {
		return `name: Sync Markdown to Quartz Repository

on:
  push:
    branches: [main, master]
    paths:
      - '{{PUBLISH_DIR}}/**'

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout vault repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Checkout Quartz repository
        uses: actions/checkout@v4
        with:
          repository: {{GITHUB_USERNAME}}/{{PUBLISH_REPO}}
          token: \${{ secrets.GITHUB_TOKEN }}
          path: quartz-repo

      - name: Copy Markdown files to Quartz content directory
        run: |
          # 公開用リポジトリのcontent/ディレクトリをクリア（.gitは保持）。
          find quartz-repo/content -mindepth 1 ! -path '*/\\.git/*' -delete 2>/dev/null || true

          # 公開対象ディレクトリのMarkdownファイルをコピー。
          mkdir -p quartz-repo/content
          if [ -d "{{PUBLISH_DIR}}" ]; then
            cp -r {{PUBLISH_DIR}}/* quartz-repo/content/ || true
          fi

          # ファイル数を確認。
          file_count=\$(find quartz-repo/content -name "*.md" | wc -l)
          echo "Copied \$file_count Markdown files"

      - name: Commit and push to Quartz repository
        working-directory: quartz-repo
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          git add content/

          # 変更があればコミット。
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "docs: Sync content from vault (\$(date -u +%Y-%m-%d\ %H:%M:%S))"
            git push
            echo "Changes pushed to Quartz repository"
          fi
`;
	}

}
