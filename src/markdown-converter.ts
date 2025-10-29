import MarkdownIt from 'markdown-it';
import type { ConvertedNote, Frontmatter } from './types';

/**
 * Markdown→HTML変換クラス。
 */
export class MarkdownConverter {
	private md: MarkdownIt;

	/**
	 * コンストラクタ。
	 */
	constructor() {
		this.md = new MarkdownIt({
			html: true,        // HTMLタグを有効化。
			linkify: true,     // URLを自動リンク化。
			typographer: true, // タイポグラフィの改善。
		});

		// プラグインを追加。
		this.setupPlugins();
	}

	/**
	 * markdown-itプラグインをセットアップ。
	 */
	private setupPlugins(): void {
		// Wikiリンク変換プラグイン。
		this.md.use(this.wikiLinkPlugin.bind(this));

		// 画像パス変換プラグイン。
		this.md.use(this.imagePathPlugin.bind(this));

		// 埋め込み変換プラグイン。
		this.md.use(this.embedPlugin.bind(this));
	}

	/**
	 * Wikiリンク([[link]])を標準リンクに変換。
	 */
	private wikiLinkPlugin(md: MarkdownIt): void {
		md.inline.ruler.before('link', 'wikilink', (state: any, silent: boolean) => {
			// [[で始まっているかチェック。
			if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */ ||
				state.src.charCodeAt(state.pos + 1) !== 0x5B /* [ */) {
				return false;
			}

			// ]]の位置を探す。
			const start = state.pos + 2;
			const max = state.posMax;
			let pos = start;
			let found = false;

			while (pos < max - 1) {
				if (state.src.charCodeAt(pos) === 0x5D /* ] */ &&
					state.src.charCodeAt(pos + 1) === 0x5D /* ] */) {
					found = true;
					break;
				}
				pos++;
			}

			if (!found) {
				return false;
			}

			if (!silent) {
				const content = state.src.slice(start, pos);
				const parts = content.split('|');
				const link = parts[0].trim();
				const text = parts.length > 1 ? parts[1].trim() : link;

				// リンクパスを変換 (拡張子を.htmlに変更)。
				const href = this.convertWikiLinkToPath(link);

				// トークンを追加。
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
	}

	/**
	 * Wikiリンクをパスに変換。
	 */
	private convertWikiLinkToPath(link: string): string {
		// パスの正規化。
		let path = link.replace(/\\/g, '/');

		// .mdを削除し、.htmlを追加。
		if (path.endsWith('.md')) {
			path = path.slice(0, -3);
		}

		// 絶対パスに変換。
		if (!path.startsWith('/')) {
			path = '/' + path;
		}

		return path + '.html';
	}

	/**
	 * 画像パス(![[image]])を変換。
	 */
	private imagePathPlugin(md: MarkdownIt): void {
		md.inline.ruler.before('emphasis', 'obsidian_image', (state: any, silent: boolean) => {
			// ![[で始まっているかチェック。
			if (state.src.charCodeAt(state.pos) !== 0x21 /* ! */ ||
				state.src.charCodeAt(state.pos + 1) !== 0x5B /* [ */ ||
				state.src.charCodeAt(state.pos + 2) !== 0x5B /* [ */) {
				return false;
			}

			// ]]の位置を探す。
			const start = state.pos + 3;
			const max = state.posMax;
			let pos = start;
			let found = false;

			while (pos < max - 1) {
				if (state.src.charCodeAt(pos) === 0x5D /* ] */ &&
					state.src.charCodeAt(pos + 1) === 0x5D /* ] */) {
					found = true;
					break;
				}
				pos++;
			}

			if (!found) {
				return false;
			}

			if (!silent) {
				const content = state.src.slice(start, pos);
				const parts = content.split('|');
				const imagePath = parts[0].trim();
				const alt = parts.length > 1 ? parts[1].trim() : '';

				// 画像パスを変換。
				const src = this.convertImagePath(imagePath);

				// トークンを追加。
				const token = state.push('image', 'img', 0);
				token.attrSet('src', src);
				token.attrSet('alt', alt);
			}

			state.pos = pos + 2;
			return true;
		});
	}

	/**
	 * 画像パスを変換。
	 */
	private convertImagePath(path: string): string {
		// パスの正規化。
		path = path.replace(/\\/g, '/');

		// /assets/images/配下に配置。
		if (!path.startsWith('/')) {
			path = '/assets/images/' + path;
		}

		return path;
	}

	/**
	 * 埋め込み(![[note]])を変換。
	 */
	private embedPlugin(md: MarkdownIt): void {
		// TODO: 埋め込み機能を実装。
		// 現在は画像以外の![[]]は無視。
	}

	/**
	 * フロントマターを抽出。
	 */
	extractFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return {
				frontmatter: {},
				body: content,
			};
		}

		const frontmatterText = match[1];
		const body = match[2];

		// 簡易的なYAMLパース (完全なYAMLパーサーではない)。
		const frontmatter: Frontmatter = {};
		const lines = frontmatterText.split('\n');

		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex === -1) continue;

			const key = line.slice(0, colonIndex).trim();
			let value: unknown = line.slice(colonIndex + 1).trim();

			// 配列の処理。
			const valueStr = String(value);
			if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
				value = valueStr
					.slice(1, -1)
					.split(',')
					.map((s: string) => s.trim());
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
	 * Markdownをリンク抽出付きでHTMLに変換。
	 */
	convert(
		filePath: string,
		content: string
	): ConvertedNote {
		// フロントマターを抽出。
		const { frontmatter, body } = this.extractFrontmatter(content);

		// HTMLに変換。
		const html = this.md.render(body);

		// リンクを抽出。
		const links = this.extractLinks(body);

		// タグを抽出。
		const tags = Array.isArray(frontmatter.tags)
			? frontmatter.tags as string[]
			: frontmatter.tags
				? [frontmatter.tags as string]
				: [];

		// HTMLパスを生成。
		const htmlPath = filePath
			.replace(/\.md$/, '.html')
			.replace(/\\/g, '/');

		return {
			filePath,
			htmlPath,
			html,
			frontmatter,
			links,
			tags,
		};
	}

	/**
	 * Markdownからリンクを抽出。
	 */
	private extractLinks(content: string): string[] {
		const links: string[] = [];
		const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
		let match;

		while ((match = wikiLinkRegex.exec(content)) !== null) {
			links.push(match[1].trim());
		}

		return links;
	}

	/**
	 * HTML全体を生成 (テンプレート適用)。
	 */
	generateFullHTML(
		note: ConvertedNote,
		siteTitle: string,
		additionalCSS?: string
	): string {
		const title = note.frontmatter.title || 'Untitled';
		const css = additionalCSS || '';

		return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} - ${siteTitle}</title>
	<link rel="stylesheet" href="/assets/css/theme.css">
	${css ? `<style>${css}</style>` : ''}
</head>
<body>
	<div class="container">
		<nav class="sidebar">
			<!-- サイドバーナビゲーション -->
		</nav>
		<main class="content">
			<article>
				<h1>${title}</h1>
				${note.html}
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
}
