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

			// git pullを実行（リトライ付き）。
			await this.retryGitOperation(async () => {
				await execAsync('git pull', {
					cwd: this.publishRepoDir,
					timeout: 30000  // 30秒タイムアウト。
				});
			}, 'git pull');
		} else {
			new Notice('公開用リポジトリをcloneしています...');
			const repoUrl = `https://github.com/${this.settings.githubUsername}/${this.settings.publishRepo}.git`;

			// git cloneを実行（リトライ付き）。
			await this.retryGitOperation(async () => {
				await execAsync(`git clone ${repoUrl} ${this.settings.publishRepo}`, {
					cwd: this.tmpDir,
					timeout: 60000  // 60秒タイムアウト。
				});
			}, 'git clone');
		}
	}

	/**
	 * git操作をリトライ付きで実行。
	 */
	private async retryGitOperation(
		operation: () => Promise<any>,
		operationName: string,
		maxRetries: number = 3
	): Promise<void> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await operation();
				return; // 成功。
			} catch (error) {
				lastError = error;
				console.error(`${operationName} 失敗 (試行 ${attempt}/${maxRetries}):`, error.message);

				// Windows環境でのforkエラーをチェック。
				if (error.message.includes('cannot fork()') || error.message.includes('Resource temporarily unavailable')) {
					if (attempt < maxRetries) {
						new Notice(`${operationName} を再試行しています... (${attempt}/${maxRetries})`);
						// 指数バックオフ: 2秒、4秒、8秒。
						await this.sleep(2000 * Math.pow(2, attempt - 1));
					}
				} else {
					// 他のエラーは即座に失敗。
					throw error;
				}
			}
		}

		// すべての試行が失敗した場合。
		const errorMessage = this.formatGitError(lastError!, operationName);
		throw new Error(errorMessage);
	}

	/**
	 * gitエラーメッセージをフォーマット。
	 */
	private formatGitError(error: Error, operationName: string): string {
		const message = error.message;

		if (message.includes('cannot fork()') || message.includes('Resource temporarily unavailable')) {
			return `${operationName} に失敗しました（Windows環境のプロセス制限）。

対処法:
1. Obsidianを再起動してから再試行してください
2. 他のgit操作を実行中の場合は完了を待ってください
3. システムリソースを確認してください

または、GitHub Actionsによる自動公開を使用してください（推奨）。
詳細: ${error.message}`;
		}

		return `${operationName} に失敗しました: ${message}`;
	}

	/**
	 * 指定時間待機。
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
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

		// git add。
		await this.retryGitOperation(async () => {
			await execAsync('git add -A', {
				cwd: this.publishRepoDir,
				timeout: 15000  // 15秒タイムアウト。
			});
		}, 'git add');

		// git commit。
		const commitMessage = `docs: Update published content (${new Date().toISOString()})`;
		try {
			await this.retryGitOperation(async () => {
				await execAsync(`git commit -m "${commitMessage}"`, {
					cwd: this.publishRepoDir,
					timeout: 15000  // 15秒タイムアウト。
				});
			}, 'git commit');
		} catch (error) {
			// コミットするものがない場合はエラーにならない。
			if (!error.message.includes('nothing to commit')) {
				throw error;
			}
			new Notice('変更がありませんでした');
			return;
		}

		// git push。
		new Notice('リモートにpushしています...');
		await this.retryGitOperation(async () => {
			await execAsync('git push', {
				cwd: this.publishRepoDir,
				timeout: 60000  // 60秒タイムアウト。
			});
		}, 'git push');
	}
}
