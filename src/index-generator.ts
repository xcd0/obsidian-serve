import { App, Notice, TFile } from 'obsidian';
import type { PluginSettings } from './types';
import * as path from 'path';

/**
 * index.md生成クラス。
 * 公開対象ディレクトリのMarkdownファイルを分析し、
 * ホームページ用のindex.mdを生成する。
 */
export class IndexGenerator {
	private app: App;
	private settings: PluginSettings;

	/**
	 * コンストラクタ。
	 */
	constructor(app: App, settings: PluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * index.mdを生成してVaultに保存。
	 */
	async generate(): Promise<void> {
		try {
			// 公開対象ディレクトリのパスを取得。
			const publishDir = this.settings.publishDirectory;
			if (!publishDir) {
				new Notice('公開対象ディレクトリが設定されていません。');
				return;
			}

			// index.mdの内容を生成。
			const content = await this.generateContent();

			// index.mdのパスを構築。
			const indexPath = path.join(publishDir, 'index.md').replace(/\\/g, '/');

			// Vaultにindex.mdを書き込む。
			const file = this.app.vault.getAbstractFileByPath(indexPath);

			if (file instanceof TFile) {
				// 既存ファイルを上書き。
				await this.app.vault.modify(file, content);
				new Notice(`index.mdを更新しました: ${indexPath}`);
			} else {
				// 新規ファイルを作成。
				await this.app.vault.create(indexPath, content);
				new Notice(`index.mdを作成しました: ${indexPath}`);
			}

			console.log('index.md生成完了:', indexPath);
		} catch (error) {
			console.error('index.md生成エラー:', error);
			new Notice(`index.md生成エラー: ${error.message}`);
			throw error;
		}
	}

	/**
	 * index.mdの内容を生成。
	 */
	private async generateContent(): Promise<string> {
		const config = this.settings.indexPage;
		let content = '';

		// フロントマター。
		content += '---\n';
		content += `title: ${config.title}\n`;
		content += '---\n\n';

		// ウェルカムメッセージ。
		content += `# ${config.welcomeHeading}\n\n`;
		content += `${config.description}\n\n`;

		// 最近のノートセクション。
		if (config.includeRecentNotes) {
			content += `## ${config.recentNotesHeading}\n\n`;

			const recentNotes = await this.getRecentNotes(config.recentNotesCount);

			if (recentNotes.length === 0) {
				content += '_まだノートがありません。_\n\n';
			} else {
				for (const note of recentNotes) {
					content += `- [[${note.linkPath}|${note.title}]]\n`;
				}
				content += '\n';
			}
		}

		return content;
	}

	/**
	 * 公開対象ディレクトリ内の最近のMarkdownファイルを取得。
	 */
	private async getRecentNotes(limit: number): Promise<Array<{ linkPath: string; title: string; mtime: number }>> {
		const publishDir = this.settings.publishDirectory;
		const allFiles = this.app.vault.getMarkdownFiles();

		// 公開対象ディレクトリ内のMarkdownファイルをフィルタリング。
		const publishedFiles = allFiles.filter(file => {
			const filePath = file.path;
			// 公開対象ディレクトリ内かチェック。
			if (!filePath.startsWith(publishDir)) {
				return false;
			}
			// index.md自身は除外。
			if (file.name === 'index.md') {
				return false;
			}
			return true;
		});

		// 更新日時でソート（新しい順）。
		const sortedFiles = publishedFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);

		// 上位N件を取得。
		const recentFiles = sortedFiles.slice(0, limit);

		// 結果を構築。
		const results: Array<{ linkPath: string; title: string; mtime: number }> = [];

		for (const file of recentFiles) {
			// 公開対象ディレクトリからの相対パスを計算。
			let linkPath = file.path;

			// 公開対象ディレクトリのプレフィックスを削除。
			if (linkPath.startsWith(publishDir)) {
				linkPath = linkPath.slice(publishDir.length);
			}

			// .md拡張子を削除。
			if (linkPath.endsWith('.md')) {
				linkPath = linkPath.slice(0, -3);
			}

			// ファイルのメタデータを読み取ってタイトルを取得。
			let title = file.basename; // デフォルトはファイル名。

			try {
				const metadata = this.app.metadataCache.getFileCache(file);
				if (metadata?.frontmatter?.title) {
					title = metadata.frontmatter.title;
				}
			} catch (error) {
				console.warn(`メタデータ読み取りエラー (${file.path}):`, error);
			}

			results.push({
				linkPath,
				title,
				mtime: file.stat.mtime,
			});
		}

		return results;
	}
}
