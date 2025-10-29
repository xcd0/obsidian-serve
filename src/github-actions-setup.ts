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

			// 変換スクリプトを生成。
			await this.generateConvertScript();

			// package.jsonを生成。
			await this.generatePackageJson();

			new Notice('GitHub Actions のセットアップが完了しました!');
			new Notice('Vaultをcommit & pushすると自動的に公開されます。');
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
		const scriptsDir = path.join(this.vaultBasePath, '.github', 'scripts');

		const fs = require('fs');
		if (!fs.existsSync(workflowDir)) {
			fs.mkdirSync(workflowDir, { recursive: true });
		}
		if (!fs.existsSync(scriptsDir)) {
			fs.mkdirSync(scriptsDir, { recursive: true });
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
			.replace(/{{SITE_TITLE}}/g, this.escapeYaml(this.settings.customization.siteTitle || 'Published Notes'))
			.replace(/{{CUSTOM_CSS}}/g, this.escapeYaml(this.settings.customization.customCSS || ''))
			.replace(/{{EXCLUDE_PATTERNS}}/g, this.settings.excludePatterns.join(','))
			.replace(/{{RESPECT_FRONTMATTER}}/g, String(this.settings.respectFrontmatter));

		const filePath = path.join(this.vaultBasePath, '.github', 'workflows', 'publish-to-pages.yml');
		const fs = require('fs');
		fs.writeFileSync(filePath, content, 'utf-8');

		console.log(`ワークフローファイルを生成しました: ${filePath}`);
	}

	/**
	 * 変換スクリプトを生成。
	 */
	private async generateConvertScript(): Promise<void> {
		const template = this.getConvertScriptTemplate();

		const filePath = path.join(this.vaultBasePath, '.github', 'scripts', 'convert.mjs');
		const fs = require('fs');
		fs.writeFileSync(filePath, template, 'utf-8');

		console.log(`変換スクリプトを生成しました: ${filePath}`);
	}

	/**
	 * package.jsonを生成。
	 */
	private async generatePackageJson(): Promise<void> {
		const template = this.getPackageJsonTemplate();

		const filePath = path.join(this.vaultBasePath, '.github', 'scripts', 'package.json');
		const fs = require('fs');
		fs.writeFileSync(filePath, template, 'utf-8');

		console.log(`package.jsonを生成しました: ${filePath}`);
	}

	/**
	 * YAML文字列をエスケープ。
	 */
	private escapeYaml(str: string): string {
		// 改行を含む場合やクオートが必要な場合は適切にエスケープ。
		if (str.includes('\n') || str.includes(':') || str.includes('#')) {
			return JSON.stringify(str);
		}
		return str;
	}

	/**
	 * ワークフローファイルのテンプレートを取得。
	 */
	private getWorkflowTemplate(): string {
		return `name: Publish to GitHub Pages

on:
  push:
    branches: [main, master]
    paths:
      - '{{PUBLISH_DIR}}/**'

permissions:
  contents: write

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout vault repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: .github/scripts/package.json

      - name: Install dependencies
        working-directory: .github/scripts
        run: npm ci

      - name: Convert Markdown to HTML
        working-directory: .github/scripts
        run: node convert.mjs
        env:
          PUBLISH_DIR: {{PUBLISH_DIR}}
          SITE_TITLE: {{SITE_TITLE}}
          CUSTOM_CSS: {{CUSTOM_CSS}}
          EXCLUDE_PATTERNS: {{EXCLUDE_PATTERNS}}
          RESPECT_FRONTMATTER: {{RESPECT_FRONTMATTER}}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: .github/scripts/dist
          external_repository: {{GITHUB_USERNAME}}/{{PUBLISH_REPO}}
          publish_branch: main
          user_name: 'github-actions[bot]'
          user_email: 'github-actions[bot]@users.noreply.github.com'
          commit_message: 'docs: Update published content'
          force_orphan: true
`;
	}

	/**
	 * 変換スクリプトのテンプレートを取得。
	 */
	private getConvertScriptTemplate(): string {
		// templates/convert.mjsの内容を返す。
		// 実際の実装では、ファイルから読み込むか、ここに直接埋め込む。
		return `#!/usr/bin/env node

/**
 * Obsidian Markdown → HTML 変換スクリプト (GitHub Actions用)
 */

import MarkdownIt from 'markdown-it';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数から設定を取得。
const PUBLISH_DIR = process.env.PUBLISH_DIR || 'memolog';
const SITE_TITLE = process.env.SITE_TITLE || 'Published Notes';
const CUSTOM_CSS = process.env.CUSTOM_CSS || '';
const EXCLUDE_PATTERNS = process.env.EXCLUDE_PATTERNS
	? process.env.EXCLUDE_PATTERNS.split(',').map(p => p.trim())
	: [];
const RESPECT_FRONTMATTER = process.env.RESPECT_FRONTMATTER === 'true';

const REPO_ROOT = path.resolve(__dirname, '../..');
const DIST_DIR = path.join(__dirname, 'dist');

console.log('=== Obsidian GitHub Pages Publish ===');
console.log(\`Repository root: \${REPO_ROOT}\`);
console.log(\`Publish directory: \${PUBLISH_DIR}\`);
console.log(\`Site title: \${SITE_TITLE}\`);
console.log(\`Dist directory: \${DIST_DIR}\`);

function setupMarkdownIt() {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
	});

	// Wikiリンク変換プラグイン。
	md.inline.ruler.before('link', 'wikilink', (state, silent) => {
		if (state.src.charCodeAt(state.pos) !== 0x5B ||
			state.src.charCodeAt(state.pos + 1) !== 0x5B) {
			return false;
		}

		const start = state.pos + 2;
		const max = state.posMax;
		let pos = start;
		let found = false;

		while (pos < max - 1) {
			if (state.src.charCodeAt(pos) === 0x5D &&
				state.src.charCodeAt(pos + 1) === 0x5D) {
				found = true;
				break;
			}
			pos++;
		}

		if (!found) return false;

		if (!silent) {
			const content = state.src.slice(start, pos);
			const parts = content.split('|');
			const link = parts[0].trim();
			const text = parts.length > 1 ? parts[1].trim() : link;

			let linkPath = link.replace(/\\\\/g, '/');
			if (linkPath.endsWith('.md')) {
				linkPath = linkPath.slice(0, -3);
			}
			if (!linkPath.startsWith('/')) {
				linkPath = '/' + linkPath;
			}
			const href = linkPath + '.html';

			const token = state.push('link_open', 'a', 1);
			token.attrSet('href', href);
			token.attrSet('class', 'internal-link');

			const textToken = state.push('text', '', 0);
			textToken.content = text;

			state.push('link_close', 'a', -1);
		}

		state.pos = pos + 2;
		return true;
	});

	// 画像パス変換プラグイン。
	md.inline.ruler.before('emphasis', 'obsidian_image', (state, silent) => {
		if (state.src.charCodeAt(state.pos) !== 0x21 ||
			state.src.charCodeAt(state.pos + 1) !== 0x5B ||
			state.src.charCodeAt(state.pos + 2) !== 0x5B) {
			return false;
		}

		const start = state.pos + 3;
		const max = state.posMax;
		let pos = start;
		let found = false;

		while (pos < max - 1) {
			if (state.src.charCodeAt(pos) === 0x5D &&
				state.src.charCodeAt(pos + 1) === 0x5D) {
				found = true;
				break;
			}
			pos++;
		}

		if (!found) return false;

		if (!silent) {
			const content = state.src.slice(start, pos);
			const parts = content.split('|');
			let imagePath = parts[0].trim();
			const alt = parts.length > 1 ? parts[1].trim() : '';

			imagePath = imagePath.replace(/\\\\/g, '/');
			if (!imagePath.startsWith('/')) {
				imagePath = '/assets/images/' + imagePath;
			}

			const token = state.push('image', 'img', 0);
			token.attrSet('src', imagePath);
			token.attrSet('alt', alt);
		}

		state.pos = pos + 2;
		return true;
	});

	return md;
}

function extractFrontmatter(content) {
	const frontmatterRegex = /^---\\n([\\s\\S]*?)\\n---\\n([\\s\\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return { frontmatter: {}, body: content };
	}

	const frontmatterText = match[1];
	const body = match[2];

	const frontmatter = {};
	const lines = frontmatterText.split('\\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim();
		let value = line.slice(colonIndex + 1).trim();

		if (value.startsWith('[') && value.endsWith(']')) {
			value = value.slice(1, -1).split(',').map(s => s.trim());
		} else if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}

		frontmatter[key] = value;
	}

	return { frontmatter, body };
}

function collectMarkdownFiles() {
	const publishDirPath = path.join(REPO_ROOT, PUBLISH_DIR);

	if (!fs.existsSync(publishDirPath)) {
		console.error(\`Error: Publish directory not found: \${publishDirPath}\`);
		process.exit(1);
	}

	const files = [];

	function walk(dir, baseDir = '') {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const relativePath = path.join(baseDir, entry.name);

			if (entry.isDirectory()) {
				walk(fullPath, relativePath);
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				let excluded = false;
				const relativeFromPublish = path.join(PUBLISH_DIR, relativePath);

				for (const pattern of EXCLUDE_PATTERNS) {
					const regex = new RegExp(
						'^' + pattern
							.replace(/\\*/g, '.*')
							.replace(/\\?/g, '.')
							.replace(/\\//g, '\\\\/')
						+ '$'
					);
					if (regex.test(relativeFromPublish)) {
						excluded = true;
						break;
					}
				}

				if (!excluded) {
					files.push({
						fullPath,
						relativePath: relativeFromPublish,
					});
				}
			}
		}
	}

	walk(publishDirPath);
	return files;
}

function generateFullHTML(title, html, siteTitle, customCSS) {
	return \`<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>\${title} - \${siteTitle}</title>
	<link rel="stylesheet" href="/assets/css/theme.css">
	\${customCSS ? \`<style>\${customCSS}</style>\` : ''}
</head>
<body>
	<div class="container">
		<nav class="sidebar">
			<!-- サイドバーナビゲーション -->
		</nav>
		<main class="content">
			<article>
				<h1>\${title}</h1>
				\${html}
			</article>
		</main>
		<aside class="toc">
			<!-- 目次 -->
		</aside>
	</div>
	<script src="/assets/js/app.js"></script>
</body>
</html>\`;
}

function generateIndexHTML(notes) {
	const grouped = {};
	for (const note of notes) {
		const dir = note.htmlPath.includes('/')
			? note.htmlPath.substring(0, note.htmlPath.lastIndexOf('/'))
			: '.';
		if (!grouped[dir]) {
			grouped[dir] = [];
		}
		grouped[dir].push(note);
	}

	const dirs = Object.keys(grouped).sort();

	let fileListHTML = '';
	for (const dir of dirs) {
		const dirNotes = grouped[dir];
		dirNotes.sort((a, b) => b.htmlPath.localeCompare(a.htmlPath));

		if (dir !== '.') {
			fileListHTML += \`<h2>\${dir}</h2>\\n\`;
		}

		fileListHTML += '<ul class="file-list">\\n';
		for (const note of dirNotes) {
			const title = note.frontmatter.title || note.htmlPath.replace(/\\.html$/, '');
			const tags = note.tags.length > 0
				? \`<span class="tags">\${note.tags.map(t => \`#\${t}\`).join(' ')}</span>\`
				: '';
			fileListHTML += \`  <li>
    <a href="/\${note.htmlPath}">\${title}</a>
    \${tags}
  </li>\\n\`;
		}
		fileListHTML += '</ul>\\n';
	}

	return \`<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>\${SITE_TITLE}</title>
	<style>
		:root {
			--bg-color: #ffffff;
			--text-color: #2e3440;
			--link-color: #5e81ac;
			--border-color: #e5e9f0;
			--hover-bg: #f8f9fa;
		}

		@media (prefers-color-scheme: dark) {
			:root {
				--bg-color: #2e3440;
				--text-color: #eceff4;
				--link-color: #88c0d0;
				--border-color: #4c566a;
				--hover-bg: #3b4252;
			}
		}

		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
			line-height: 1.6;
			color: var(--text-color);
			background-color: var(--bg-color);
			padding: 2rem;
			max-width: 900px;
			margin: 0 auto;
		}

		h1 {
			font-size: 2.5rem;
			margin-bottom: 0.5rem;
			border-bottom: 2px solid var(--border-color);
			padding-bottom: 1rem;
		}

		h2 {
			font-size: 1.5rem;
			margin-top: 2rem;
			margin-bottom: 1rem;
			color: var(--link-color);
		}

		.file-list {
			list-style: none;
			margin-bottom: 2rem;
		}

		.file-list li {
			padding: 0.75rem;
			margin-bottom: 0.5rem;
			border: 1px solid var(--border-color);
			border-radius: 6px;
			transition: background-color 0.2s ease;
		}

		.file-list li:hover {
			background-color: var(--hover-bg);
		}

		.file-list a {
			color: var(--link-color);
			text-decoration: none;
			font-weight: 500;
			font-size: 1.1rem;
		}

		.file-list a:hover {
			text-decoration: underline;
		}

		.tags {
			display: inline-block;
			margin-left: 1rem;
			font-size: 0.9rem;
			color: #888;
		}

		.footer {
			margin-top: 3rem;
			padding-top: 2rem;
			border-top: 1px solid var(--border-color);
			text-align: center;
			font-size: 0.9rem;
			color: #888;
		}

		\${CUSTOM_CSS}
	</style>
</head>
<body>
	<h1>\${SITE_TITLE}</h1>
	<p>公開されているノート一覧です。</p>

	\${fileListHTML}

	<div class="footer">
		<p>Generated by Obsidian GitHub Pages Publish</p>
	</div>
</body>
</html>\`;
}

async function main() {
	console.log('\\n=== Starting conversion ===');

	const md = setupMarkdownIt();
	const files = collectMarkdownFiles();
	console.log(\`Found \${files.length} markdown files\`);

	if (files.length === 0) {
		console.log('No files to publish');
		process.exit(0);
	}

	if (fs.existsSync(DIST_DIR)) {
		fs.rmSync(DIST_DIR, { recursive: true });
	}
	fs.mkdirSync(DIST_DIR, { recursive: true });

	const convertedNotes = [];

	for (const file of files) {
		console.log(\`Processing: \${file.relativePath}\`);

		const content = fs.readFileSync(file.fullPath, 'utf-8');
		const { frontmatter, body } = extractFrontmatter(content);

		if (RESPECT_FRONTMATTER && frontmatter.published === false) {
			console.log(\`  Skipped (published: false)\`);
			continue;
		}

		const html = md.render(body);

		const tags = Array.isArray(frontmatter.tags)
			? frontmatter.tags
			: frontmatter.tags
				? [frontmatter.tags]
				: [];

		const publishDirPrefix = PUBLISH_DIR.replace(/\\/$/, '') + '/';
		let relativePath = file.relativePath;
		if (relativePath.startsWith(publishDirPrefix)) {
			relativePath = relativePath.slice(publishDirPrefix.length);
		}
		const htmlPath = relativePath.replace(/\\.md$/, '.html').replace(/\\\\/g, '/');

		const title = frontmatter.title || htmlPath.replace(/\\.html$/, '');
		const fullHTML = generateFullHTML(title, html, SITE_TITLE, CUSTOM_CSS);

		const outputPath = path.join(DIST_DIR, htmlPath);
		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}
		fs.writeFileSync(outputPath, fullHTML, 'utf-8');

		console.log(\`  Generated: \${htmlPath}\`);

		convertedNotes.push({
			htmlPath,
			frontmatter,
			tags,
		});
	}

	console.log(\`\\nConverted \${convertedNotes.length} files\`);

	console.log('\\nGenerating index.html...');
	const indexHTML = generateIndexHTML(convertedNotes);
	fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHTML, 'utf-8');
	console.log('index.html generated');

	console.log('\\n=== Conversion completed ===');
	console.log(\`Output directory: \${DIST_DIR}\`);
}

main().catch(error => {
	console.error('Error:', error);
	process.exit(1);
});
`;
	}

	/**
	 * package.jsonのテンプレートを取得。
	 */
	private getPackageJsonTemplate(): string {
		return `{
  "name": "obsidian-github-pages-converter",
  "version": "1.0.0",
  "description": "Markdown to HTML converter for Obsidian GitHub Pages Publish",
  "type": "module",
  "scripts": {
    "convert": "node convert.mjs"
  },
  "dependencies": {
    "markdown-it": "^14.1.0"
  }
}
`;
	}
}
