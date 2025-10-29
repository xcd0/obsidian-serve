import simpleGit, { SimpleGit } from 'simple-git';
import { Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Git操作クラス。
 */
export class GitManager {
	private git: SimpleGit;
	private vaultPath: string;

	/**
	 * コンストラクタ。
	 */
	constructor(vaultPath: string) {
		this.vaultPath = vaultPath;
		this.git = simpleGit(vaultPath);
	}

	/**
	 * Gitリポジトリかどうか確認。
	 */
	async isGitRepository(): Promise<boolean> {
		try {
			await this.git.status();
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * 変更されたファイルを取得。
	 */
	async getChangedFiles(): Promise<string[]> {
		try {
			const status = await this.git.status();
			const files = [
				...status.modified,
				...status.created,
				...status.renamed.map(r => r.to),
			];
			return files;
		} catch (error) {
			console.error('変更ファイル取得エラー:', error);
			return [];
		}
	}

	/**
	 * 最後のコミットから変更されたファイルを取得。
	 */
	async getFilesFromLastCommit(): Promise<string[]> {
		try {
			const diff = await this.git.diff(['--name-only', 'HEAD~1', 'HEAD']);
			const files = diff.split('\n').filter(f => f.trim() !== '');
			return files;
		} catch (error) {
			console.error('コミット差分取得エラー:', error);
			return [];
		}
	}

	/**
	 * 指定パターンにマッチするファイルを除外。
	 */
	filterFiles(files: string[], excludePatterns: string[]): string[] {
		return files.filter(file => {
			// 除外パターンにマッチするか確認。
			for (const pattern of excludePatterns) {
				// 簡易的なグロブマッチング。
				const regex = new RegExp(
					'^' + pattern
						.replace(/\*/g, '.*')
						.replace(/\?/g, '.')
						.replace(/\//g, '\\/')
					+ '$'
				);
				if (regex.test(file)) {
					return false;
				}
			}
			return true;
		});
	}

	/**
	 * 指定ディレクトリ配下のファイルのみをフィルタ。
	 */
	filterByDirectory(files: string[], directory: string): string[] {
		// ディレクトリパスを正規化 (末尾の/を削除)。
		const normalizedDir = directory.replace(/\/$/, '');

		return files.filter(file => {
			return file.startsWith(normalizedDir + '/') || file === normalizedDir;
		});
	}

	/**
	 * post-commitフックをセットアップ。
	 */
	async setupPostCommitHook(command: string): Promise<void> {
		try {
			const hooksDir = path.join(this.vaultPath, '.git', 'hooks');
			const hookPath = path.join(hooksDir, 'post-commit');

			// hooksディレクトリが存在しない場合は作成。
			if (!fs.existsSync(hooksDir)) {
				fs.mkdirSync(hooksDir, { recursive: true });
			}

			// フックスクリプトを作成。
			const hookScript = `#!/bin/sh
# Obsidian GitHub Pages Publish - post-commit hook
${command}
`;

			fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
			new Notice('post-commitフックをセットアップしました');
			console.log('post-commitフックを作成しました:', hookPath);
		} catch (error) {
			console.error('フックセットアップエラー:', error);
			throw new Error(`post-commitフックのセットアップに失敗しました: ${error.message}`);
		}
	}

	/**
	 * post-commitフックを削除。
	 */
	async removePostCommitHook(): Promise<void> {
		try {
			const hookPath = path.join(this.vaultPath, '.git', 'hooks', 'post-commit');

			if (fs.existsSync(hookPath)) {
				fs.unlinkSync(hookPath);
				new Notice('post-commitフックを削除しました');
				console.log('post-commitフックを削除しました');
			}
		} catch (error) {
			console.error('フック削除エラー:', error);
			throw new Error(`post-commitフックの削除に失敗しました: ${error.message}`);
		}
	}

	/**
	 * Gitの設定を取得。
	 */
	async getConfig(key: string): Promise<string | null> {
		try {
			const value = await this.git.getConfig(key);
			return value.value || null;
		} catch (error) {
			return null;
		}
	}

	/**
	 * 現在のブランチ名を取得。
	 */
	async getCurrentBranch(): Promise<string | null> {
		try {
			const status = await this.git.status();
			return status.current || null;
		} catch (error) {
			console.error('ブランチ取得エラー:', error);
			return null;
		}
	}

	/**
	 * リモートリポジトリのURLを取得。
	 */
	async getRemoteUrl(remoteName: string = 'origin'): Promise<string | null> {
		try {
			const remotes = await this.git.getRemotes(true);
			const remote = remotes.find(r => r.name === remoteName);
			return remote?.refs.fetch || null;
		} catch (error) {
			console.error('リモートURL取得エラー:', error);
			return null;
		}
	}
}
