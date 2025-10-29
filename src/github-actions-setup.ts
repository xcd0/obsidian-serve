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
			.replace(/{{PUBLISH_REPO}}/g, this.settings.publishRepo)
			.replace(/{{ENABLE_AUTO_SETUP}}/g, String(this.settings.quartz.enableAutoSetup))
			.replace(/{{SITE_TITLE}}/g, this.escapeYaml(this.settings.customization.siteTitle))
			.replace(/{{LOCALE}}/g, this.settings.quartz.locale)
			.replace(/{{ENABLE_SPA}}/g, String(this.settings.quartz.enableSPA))
			.replace(/{{ENABLE_POPOVERS}}/g, String(this.settings.quartz.enablePopovers))
			.replace(/{{FONT_HEADER}}/g, this.escapeYaml(this.settings.quartz.theme.typography.header))
			.replace(/{{FONT_BODY}}/g, this.escapeYaml(this.settings.quartz.theme.typography.body))
			.replace(/{{FONT_CODE}}/g, this.escapeYaml(this.settings.quartz.theme.typography.code))
			.replace(/{{QUARTZ_CONFIG}}/g, this.generateQuartzConfig());

		const filePath = path.join(this.vaultBasePath, '.github', 'workflows', 'sync-to-quartz.yml');
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
	 * Quartz設定オブジェクトをJSON文字列として生成。
	 */
	private generateQuartzConfig(): string {
		const config = {
			siteTitle: this.settings.customization.siteTitle,
			locale: this.settings.quartz.locale,
			enableSPA: this.settings.quartz.enableSPA,
			enablePopovers: this.settings.quartz.enablePopovers,
			baseUrl: `${this.settings.githubUsername}.github.io/${this.settings.publishRepo}`,
			typography: this.settings.quartz.theme.typography,
			colors: this.settings.quartz.theme.colors,
		};
		return JSON.stringify(config, null, 2).replace(/\$/g, '\\$');
	}


	/**
	 * ワークフローファイルのテンプレートを取得（Quartz方式 + 自動セットアップ）。
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

      - name: Setup Node.js
        if: {{ENABLE_AUTO_SETUP}} == true
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Auto-setup Quartz (if not already setup)
        if: {{ENABLE_AUTO_SETUP}} == true
        working-directory: quartz-repo
        env:
          QUARTZ_CONFIG: '{{QUARTZ_CONFIG}}'
        run: |
          # Quartzがセットアップ済みかチェック。
          if [ ! -f "package.json" ] || ! grep -q "quartz" package.json; then
            echo "Quartz is not setup. Setting up now..."

            # package.jsonを作成。
            cat > package.json << 'EOF'
{
  "name": "@jackyzha0/quartz",
  "description": "Quartz - a fast, batteries-included static-site generator",
  "version": "4.0.0",
  "type": "module",
  "author": "jackyzha0 <j.zhao2k19@gmail.com>",
  "license": "MIT",
  "homepage": "https://quartz.jzhao.xyz",
  "repository": {
    "type": "git",
    "url": "https://github.com/jackyzha0/quartz.git"
  },
  "scripts": {
    "build": "npx quartz build",
    "serve": "npx quartz build --serve"
  },
  "dependencies": {
    "@jackyzha0/quartz": "^4.0.0"
  }
}
EOF

            # Quartzをインストール。
            npm install

            # quartz.config.tsを生成。
            npx quartz create --strategy=empty

            # 設定ファイルを上書き。
            cat > quartz.config.ts << 'EOFCONFIG'
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config = \$QUARTZ_CONFIG

const quartzConfig: QuartzConfig = {
  configuration: {
    pageTitle: config.siteTitle,
    enableSPA: config.enableSPA,
    enablePopovers: config.enablePopovers,
    analytics: {
      provider: "plausible",
    },
    locale: config.locale,
    baseUrl: config.baseUrl,
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: config.typography,
      colors: config.colors,
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default quartzConfig
EOFCONFIG

            # deploy.ymlを生成。
            mkdir -p .github/workflows
            cat > .github/workflows/deploy.yml << 'EOFDEPLOY'
name: Build and Deploy Quartz

on:
  push:
    branches:
      - main
    paths:
      - 'content/**'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Dependencies
        run: npm ci

      - name: Build Quartz
        run: npx quartz build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    runs-on: ubuntu-22.04
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOFDEPLOY

            git add .
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git commit -m "feat: Auto-setup Quartz" || echo "No changes to commit"
            git push

            echo "Quartz setup completed!"
          else
            echo "Quartz is already setup."
          fi

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

      - name: Commit and push content to Quartz repository
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
