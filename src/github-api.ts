import { Octokit } from '@octokit/rest';
import { Notice } from 'obsidian';

/**
 * GitHub API連携クラス。
 */
export class GitHubAPI {
	private octokit: Octokit;
	private username: string;

	/**
	 * コンストラクタ。
	 */
	constructor(token: string, username: string) {
		this.octokit = new Octokit({ auth: token });
		this.username = username;
	}

	/**
	 * リポジトリが存在するか確認。
	 */
	async repositoryExists(repoName: string): Promise<boolean> {
		try {
			await this.octokit.repos.get({
				owner: this.username,
				repo: repoName,
			});
			return true;
		} catch (error) {
			if (error.status === 404) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * リポジトリを作成。
	 */
	async createRepository(
		repoName: string,
		isPrivate: boolean,
		description?: string
	): Promise<void> {
		try {
			await this.octokit.repos.createForAuthenticatedUser({
				name: repoName,
				description: description || 'Published notes from Obsidian',
				private: isPrivate,
				auto_init: true, // README.mdを自動作成。
			});
			new Notice(`リポジトリ ${repoName} を作成しました`);
		} catch (error) {
			console.error('リポジトリ作成エラー:', error);
			throw new Error(`リポジトリの作成に失敗しました: ${error.message}`);
		}
	}

	/**
	 * GitHub Pagesを有効化。
	 */
	async enableGitHubPages(
		repoName: string,
		branch: string = 'main'
	): Promise<void> {
		try {
			await this.octokit.repos.createPagesSite({
				owner: this.username,
				repo: repoName,
				source: {
					branch: branch,
					path: '/',
				},
			});
			new Notice('GitHub Pagesを有効化しました');
		} catch (error) {
			// 既に有効化されている場合はエラーにしない。
			if (error.status === 409) {
				console.log('GitHub Pagesは既に有効化されています');
				return;
			}
			console.error('GitHub Pages有効化エラー:', error);
			throw new Error(`GitHub Pagesの有効化に失敗しました: ${error.message}`);
		}
	}

	/**
	 * GitHub PagesのURLを取得。
	 */
	async getGitHubPagesUrl(repoName: string): Promise<string | null> {
		try {
			const response = await this.octokit.repos.getPages({
				owner: this.username,
				repo: repoName,
			});
			return response.data.html_url || null;
		} catch (error) {
			if (error.status === 404) {
				return null; // GitHub Pagesが有効化されていない。
			}
			throw error;
		}
	}

	/**
	 * ファイルをアップロード(作成または更新)。
	 */
	async uploadFile(
		repoName: string,
		filePath: string,
		content: string,
		message: string,
		branch: string = 'main'
	): Promise<void> {
		try {
			// 既存ファイルのSHAを取得。
			let sha: string | undefined;
			try {
				const { data } = await this.octokit.repos.getContent({
					owner: this.username,
					repo: repoName,
					path: filePath,
					ref: branch,
				});
				if ('sha' in data) {
					sha = data.sha;
				}
			} catch (error) {
				// ファイルが存在しない場合は新規作成。
				if (error.status !== 404) {
					throw error;
				}
			}

			// ファイルを作成または更新。
			await this.octokit.repos.createOrUpdateFileContents({
				owner: this.username,
				repo: repoName,
				path: filePath,
				message: message,
				content: Buffer.from(content).toString('base64'),
				branch: branch,
				sha: sha, // 既存ファイルの場合はSHAが必要。
			});
		} catch (error) {
			console.error(`ファイルアップロードエラー (${filePath}):`, error);
			throw new Error(`ファイルのアップロードに失敗しました: ${error.message}`);
		}
	}

	/**
	 * 複数ファイルを一括アップロード(バッチ処理)。
	 */
	async uploadFiles(
		repoName: string,
		files: Array<{ path: string; content: string }>,
		message: string,
		branch: string = 'main'
	): Promise<void> {
		// TODO: Git Tree APIを使った効率的な一括アップロードを実装。
		// 現在は1ファイルずつアップロード。
		for (const file of files) {
			await this.uploadFile(repoName, file.path, file.content, message, branch);
		}
	}

	/**
	 * ブランチが存在するか確認。
	 */
	async branchExists(repoName: string, branch: string): Promise<boolean> {
		try {
			await this.octokit.repos.getBranch({
				owner: this.username,
				repo: repoName,
				branch: branch,
			});
			return true;
		} catch (error) {
			if (error.status === 404) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * ブランチを作成。
	 */
	async createBranch(
		repoName: string,
		newBranch: string,
		fromBranch: string = 'main'
	): Promise<void> {
		try {
			// 元のブランチのSHAを取得。
			const { data: refData } = await this.octokit.git.getRef({
				owner: this.username,
				repo: repoName,
				ref: `heads/${fromBranch}`,
			});

			// 新しいブランチを作成。
			await this.octokit.git.createRef({
				owner: this.username,
				repo: repoName,
				ref: `refs/heads/${newBranch}`,
				sha: refData.object.sha,
			});
			new Notice(`ブランチ ${newBranch} を作成しました`);
		} catch (error) {
			console.error('ブランチ作成エラー:', error);
			throw new Error(`ブランチの作成に失敗しました: ${error.message}`);
		}
	}

	/**
	 * 認証をテスト。
	 */
	async testAuthentication(): Promise<boolean> {
		try {
			const { data } = await this.octokit.users.getAuthenticated();
			console.log(`認証成功: ${data.login}`);
			return true;
		} catch (error) {
			console.error('認証エラー:', error);
			return false;
		}
	}
}
