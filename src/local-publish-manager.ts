import { App, Notice, TFile } from 'obsidian';
import type { PluginSettings } from './types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * ローカル公開マネージャー。
 * Vault配下の.obsidian-publish-tmp/に公開用リポジトリをcloneして管理。
 */
export class LocalPublishManager {
	private app: App;
	private settings: PluginSettings;
	private vaultBasePath: string;
	private tmpDir: string;
	private publishRepoDir: string;

	/**
	 * コンストラクタ。
	 */
	constructor(app: App, settings: PluginSettings, vaultBasePath: string) {
		this.app = app;
		this.settings = settings;
		this.vaultBasePath = vaultBasePath;
		this.tmpDir = path.join(vaultBasePath, '.obsidian-publish-tmp');
		this.publishRepoDir = path.join(this.tmpDir, settings.publishRepo);
	}

	/**
	 * 公開処理を実行。
	 */
	async publish(): Promise<void> {
		try {
			new Notice('公開処理を開始します...');

			// tmpディレクトリを作成。
			await this.ensureTmpDir();

			// 公開用リポジトリをclone/pull。
			await this.syncPublishRepo();

			// Markdownファイルを収集。
			const files = await this.collectMarkdownFiles();

			if (files.length === 0) {
				new Notice('公開するファイルがありません');
				return;
			}

			new Notice(`${files.length}個のファイルを変換しています...`);

			// 既存のHTMLファイルを削除。
			await this.cleanupOldFiles();

			// Markdown→HTML変換してコピー。
			await this.convertAndCopy(files);

			// index.htmlを生成。
			await this.generateIndex(files);

			// commit & push。
			await this.commitAndPush();

			new Notice('公開が完了しました!');

		} catch (error) {
			console.error('公開エラー:', error);
			new Notice(`公開エラー: ${error.message}`);
			throw error;
		}
	}

	/**
	 * tmpディレクトリを作成。
	 */
	private async ensureTmpDir(): Promise<void> {
		if (!fs.existsSync(this.tmpDir)) {
			fs.mkdirSync(this.tmpDir, { recursive: true });
			console.log(`tmpディレクトリを作成しました: ${this.tmpDir}`);
		}
	}

	/**
	 * 公開用リポジトリをclone/pull。
	 */
	private async syncPublishRepo(): Promise<void> {
		const { exec } = require('child_process');
		const { promisify } = require('util');
		const execAsync = promisify(exec);

		if (fs.existsSync(this.publishRepoDir)) {
			new Notice('公開用リポジトリを更新しています...');
			await execAsync('git pull', { cwd: this.publishRepoDir });
		} else {
			new Notice('公開用リポジトリをcloneしています...');
			const repoUrl = `https://github.com/${this.settings.githubUsername}/${this.settings.publishRepo}.git`;
			await execAsync(`git clone ${repoUrl} ${this.settings.publishRepo}`, { cwd: this.tmpDir });
		}
	}

	/**
	 * Markdownファイルを収集。
	 */
	private async collectMarkdownFiles(): Promise<TFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const publishDir = this.settings.publishDirectory.replace(/\/$/, '');

		return allFiles.filter(file =>
			file.path.startsWith(publishDir + '/') || file.path === publishDir
		);
	}

	/**
	 * 既存のHTMLファイルを削除。
	 */
	private async cleanupOldFiles(): Promise<void> {
		const walkAndDelete = (dir: string) => {
			if (!fs.existsSync(dir)) return;

			const files = fs.readdirSync(dir);
			for (const file of files) {
				const filePath = path.join(dir, file);
				const stat = fs.statSync(filePath);

				if (stat.isDirectory()) {
					if (file !== '.git') {
						walkAndDelete(filePath);
					}
				} else if (file.endsWith('.html')) {
					fs.unlinkSync(filePath);
				}
			}
		};

		walkAndDelete(this.publishRepoDir);
	}

	/**
	 * Markdown→HTML変換してコピー。
	 */
	private async convertAndCopy(files: TFile[]): Promise<void> {
		const publishDir = this.settings.publishDirectory.replace(/\/$/, '');

		for (const file of files) {
			const content = await this.app.vault.read(file);

			// フロントマター確認。
			if (this.settings.respectFrontmatter) {
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
				if (frontmatterMatch) {
					const frontmatter = frontmatterMatch[1];
					if (frontmatter.includes('published: false')) {
						console.log(`スキップ (published: false): ${file.path}`);
						continue;
					}
				}
			}

			// 簡易的なHTML変換。
			const html = this.convertToHTML(content, file.basename);

			// 出力パスを計算。
			let relativePath = file.path;
			if (relativePath.startsWith(publishDir + '/')) {
				relativePath = relativePath.slice(publishDir.length + 1);
			}
			const htmlPath = relativePath.replace(/\.md$/, '.html');
			const outputPath = path.join(this.publishRepoDir, htmlPath);

			// ディレクトリを作成。
			const outputDir = path.dirname(outputPath);
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// ファイルを書き込み。
			fs.writeFileSync(outputPath, html, 'utf-8');
			console.log(`変換完了: ${htmlPath}`);
		}
	}

	/**
	 * 簡易的なMarkdown→HTML変換。
	 */
	private convertToHTML(markdown: string, title: string): string {
		// フロントマターを削除。
		let content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

		// 簡易的な変換。
		content = content
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\[\[([^\]]+)\]\]/g, '<a href="/$1.html">$1</a>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');

		return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} - ${this.settings.customization.siteTitle || 'Published Notes'}</title>
	<style>
		:root {
			--bg-color: #ffffff;
			--text-color: #2e3440;
			--link-color: #5e81ac;
			--border-color: #e5e9f0;
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--bg-color: #2e3440;
				--text-color: #eceff4;
				--link-color: #88c0d0;
				--border-color: #4c566a;
			}
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			line-height: 1.6;
			color: var(--text-color);
			background-color: var(--bg-color);
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
		}
		a { color: var(--link-color); text-decoration: none; }
		a:hover { text-decoration: underline; }
		h1 { border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; }
		${this.settings.customization.customCSS || ''}
	</style>
</head>
<body>
	<h1>${title}</h1>
	<p>${content}</p>
</body>
</html>`;
	}

	/**
	 * index.htmlを生成。
	 */
	private async generateIndex(files: TFile[]): Promise<void> {
		const publishDir = this.settings.publishDirectory.replace(/\/$/, '');

		let fileList = '<ul>';
		for (const file of files) {
			let relativePath = file.path;
			if (relativePath.startsWith(publishDir + '/')) {
				relativePath = relativePath.slice(publishDir.length + 1);
			}
			const htmlPath = relativePath.replace(/\.md$/, '.html');
			fileList += `<li><a href="/${htmlPath}">${file.basename}</a></li>`;
		}
		fileList += '</ul>';

		const indexHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${this.settings.customization.siteTitle || 'Published Notes'}</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
		}
		ul { list-style: none; padding: 0; }
		li { padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 4px; }
		a { text-decoration: none; color: #5e81ac; }
		a:hover { text-decoration: underline; }
	</style>
</head>
<body>
	<h1>${this.settings.customization.siteTitle || 'Published Notes'}</h1>
	<p>公開されているノート一覧です。</p>
	${fileList}
</body>
</html>`;

		const indexPath = path.join(this.publishRepoDir, 'index.html');
		fs.writeFileSync(indexPath, indexHTML, 'utf-8');
		console.log('index.htmlを生成しました');
	}

	/**
	 * commit & push。
	 */
	private async commitAndPush(): Promise<void> {
		const { exec } = require('child_process');
		const { promisify } = require('util');
		const execAsync = promisify(exec);

		new Notice('変更をコミットしています...');

		await execAsync('git add -A', { cwd: this.publishRepoDir });

		const commitMessage = `docs: Update published content (${new Date().toISOString()})`;
		try {
			await execAsync(`git commit -m "${commitMessage}"`, { cwd: this.publishRepoDir });
		} catch (error) {
			// コミットするものがない場合はエラーにならない。
			if (!error.message.includes('nothing to commit')) {
				throw error;
			}
			new Notice('変更がありませんでした');
			return;
		}

		new Notice('リモートにpushしています...');
		await execAsync('git push', { cwd: this.publishRepoDir });
	}
}
