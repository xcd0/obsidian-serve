#!/usr/bin/env node

/**
 * Obsidian Markdown → HTML 変換スクリプト (GitHub Actions用)
 *
 * 環境変数:
 *   PUBLISH_DIR: 公開対象ディレクトリ (例: "memolog")
 *   SITE_TITLE: サイトタイトル (例: "My Published Notes")
 *   CUSTOM_CSS: カスタムCSS
 *   EXCLUDE_PATTERNS: 除外パターン (カンマ区切り)
 *   RESPECT_FRONTMATTER: フロントマターのpublishedフィールドを尊重するか
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

// 作業ディレクトリはリポジトリルート (../..)
const REPO_ROOT = path.resolve(__dirname, '../..');
const DIST_DIR = path.join(__dirname, 'dist');

console.log('=== Obsidian GitHub Pages Publish ===');
console.log(`Repository root: ${REPO_ROOT}`);
console.log(`Publish directory: ${PUBLISH_DIR}`);
console.log(`Site title: ${SITE_TITLE}`);
console.log(`Dist directory: ${DIST_DIR}`);
console.log(`Exclude patterns: ${EXCLUDE_PATTERNS.join(', ')}`);
console.log(`Respect frontmatter: ${RESPECT_FRONTMATTER}`);

/**
 * MarkdownItインスタンスをセットアップ。
 */
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

			// リンクパスを変換。
			let linkPath = link.replace(/\\/g, '/');
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

			// 画像パスを変換。
			imagePath = imagePath.replace(/\\/g, '/');
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

/**
 * フロントマターを抽出。
 */
function extractFrontmatter(content) {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return { frontmatter: {}, body: content };
	}

	const frontmatterText = match[1];
	const body = match[2];

	const frontmatter = {};
	const lines = frontmatterText.split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim();
		let value = line.slice(colonIndex + 1).trim();

		// 配列の処理。
		if (value.startsWith('[') && value.endsWith(']')) {
			value = value.slice(1, -1).split(',').map(s => s.trim());
		}
		// 真偽値の処理。
		else if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}

		frontmatter[key] = value;
	}

	return { frontmatter, body };
}

/**
 * Markdownファイルを収集。
 */
function collectMarkdownFiles() {
	const publishDirPath = path.join(REPO_ROOT, PUBLISH_DIR);

	if (!fs.existsSync(publishDirPath)) {
		console.error(`Error: Publish directory not found: ${publishDirPath}`);
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
				// 除外パターンチェック。
				let excluded = false;
				const relativeFromPublish = path.join(PUBLISH_DIR, relativePath);

				for (const pattern of EXCLUDE_PATTERNS) {
					const regex = new RegExp(
						'^' + pattern
							.replace(/\*/g, '.*')
							.replace(/\?/g, '.')
							.replace(/\//g, '\\/')
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

/**
 * HTMLテンプレートを生成。
 */
function generateFullHTML(title, html, siteTitle, customCSS) {
	return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} - ${siteTitle}</title>
	<link rel="stylesheet" href="/assets/css/theme.css">
	${customCSS ? `<style>${customCSS}</style>` : ''}
</head>
<body>
	<div class="container">
		<nav class="sidebar">
			<!-- サイドバーナビゲーション -->
		</nav>
		<main class="content">
			<article>
				<h1>${title}</h1>
				${html}
			</article>
		</main>
		<aside class="toc">
			<!-- 目次 -->
		</aside>
	</div>
	<script src="/assets/js/app.js"></script>
</body>
</html>`;
}

/**
 * index.htmlを生成。
 */
function generateIndexHTML(notes) {
	// ディレクトリ別にグループ化。
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

	// ディレクトリをソート。
	const dirs = Object.keys(grouped).sort();

	// ファイルリストのHTMLを生成。
	let fileListHTML = '';
	for (const dir of dirs) {
		const dirNotes = grouped[dir];
		// 各ディレクトリ内でファイルをソート (降順)。
		dirNotes.sort((a, b) => b.htmlPath.localeCompare(a.htmlPath));

		if (dir !== '.') {
			fileListHTML += `<h2>${dir}</h2>\n`;
		}

		fileListHTML += '<ul class="file-list">\n';
		for (const note of dirNotes) {
			const title = note.frontmatter.title || note.htmlPath.replace(/\.html$/, '');
			const tags = note.tags.length > 0
				? `<span class="tags">${note.tags.map(t => `#${t}`).join(' ')}</span>`
				: '';
			fileListHTML += `  <li>
    <a href="/${note.htmlPath}">${title}</a>
    ${tags}
  </li>\n`;
		}
		fileListHTML += '</ul>\n';
	}

	// 完全なHTMLを生成。
	return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${SITE_TITLE}</title>
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

		${CUSTOM_CSS}
	</style>
</head>
<body>
	<h1>${SITE_TITLE}</h1>
	<p>公開されているノート一覧です。</p>

	${fileListHTML}

	<div class="footer">
		<p>Generated by Obsidian GitHub Pages Publish</p>
	</div>
</body>
</html>`;
}

/**
 * メイン処理。
 */
async function main() {
	console.log('\n=== Starting conversion ===');

	// MarkdownItをセットアップ。
	const md = setupMarkdownIt();

	// Markdownファイルを収集。
	const files = collectMarkdownFiles();
	console.log(`Found ${files.length} markdown files`);

	if (files.length === 0) {
		console.log('No files to publish');
		process.exit(0);
	}

	// distディレクトリを作成。
	if (fs.existsSync(DIST_DIR)) {
		fs.rmSync(DIST_DIR, { recursive: true });
	}
	fs.mkdirSync(DIST_DIR, { recursive: true });

	// 変換処理。
	const convertedNotes = [];

	for (const file of files) {
		console.log(`Processing: ${file.relativePath}`);

		const content = fs.readFileSync(file.fullPath, 'utf-8');
		const { frontmatter, body } = extractFrontmatter(content);

		// published: falseの場合はスキップ。
		if (RESPECT_FRONTMATTER && frontmatter.published === false) {
			console.log(`  Skipped (published: false)`);
			continue;
		}

		// HTMLに変換。
		const html = md.render(body);

		// タグを抽出。
		const tags = Array.isArray(frontmatter.tags)
			? frontmatter.tags
			: frontmatter.tags
				? [frontmatter.tags]
				: [];

		// HTMLパスを生成。
		const publishDirPrefix = PUBLISH_DIR.replace(/\/$/, '') + '/';
		let relativePath = file.relativePath;
		if (relativePath.startsWith(publishDirPrefix)) {
			relativePath = relativePath.slice(publishDirPrefix.length);
		}
		const htmlPath = relativePath.replace(/\.md$/, '.html').replace(/\\/g, '/');

		// 完全なHTMLを生成。
		const title = frontmatter.title || htmlPath.replace(/\.html$/, '');
		const fullHTML = generateFullHTML(title, html, SITE_TITLE, CUSTOM_CSS);

		// ファイルを出力。
		const outputPath = path.join(DIST_DIR, htmlPath);
		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}
		fs.writeFileSync(outputPath, fullHTML, 'utf-8');

		console.log(`  Generated: ${htmlPath}`);

		convertedNotes.push({
			htmlPath,
			frontmatter,
			tags,
		});
	}

	console.log(`\nConverted ${convertedNotes.length} files`);

	// index.htmlを生成。
	console.log('\nGenerating index.html...');
	const indexHTML = generateIndexHTML(convertedNotes);
	fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHTML, 'utf-8');
	console.log('index.html generated');

	console.log('\n=== Conversion completed ===');
	console.log(`Output directory: ${DIST_DIR}`);
}

// 実行。
main().catch(error => {
	console.error('Error:', error);
	process.exit(1);
});
