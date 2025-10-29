# TODO

## Phase 1: 基本機能 (進行中)

### 完了
- [x] プロジェクト構造の作成
- [x] package.json作成
- [x] tsconfig.json作成
- [x] manifest.json作成
- [x] ドキュメント作成 (README.md, TODO.md, SPEC.md)

### 進行中
- [ ] プラグイン基本骨格作成
  - [ ] main.ts (メインプラグインクラス)
  - [ ] settings.ts (設定管理)
  - [ ] types.ts (型定義)

### 未着手
- [ ] ビルド環境構築
  - [ ] esbuild.config.mjs作成
  - [ ] version-bump.mjs作成
  - [ ] .gitignore作成

- [ ] 設定画面実装
  - [ ] SettingTab作成
  - [ ] GitHub Token入力フォーム
  - [ ] リポジトリ設定フォーム
  - [ ] 公開ディレクトリ選択

- [ ] GitHub API連携
  - [ ] OctokitWrapper作成
  - [ ] リポジトリ作成機能
  - [ ] GitHub Pages有効化
  - [ ] ファイルpush機能

- [ ] Markdown→HTML変換
  - [ ] markdown-it セットアップ
  - [ ] Wikiリンク変換
  - [ ] 画像パス変換
  - [ ] フロントマター処理

## Phase 2: Git連動

- [ ] Git操作機能
  - [ ] simple-git セットアップ
  - [ ] post-commitフック作成
  - [ ] 変更ファイル検出
  - [ ] 差分ビルド機能

## Phase 3: Obsidian風機能

- [ ] データ生成機能
  - [ ] グラフデータ生成 (graph.json)
  - [ ] バックリンクデータ生成
  - [ ] 検索インデックス生成
  - [ ] ファイルツリー生成

- [ ] 公開サイトテンプレート作成
  - [ ] HTML/CSS/JSベーステンプレート
  - [ ] グラフビュー (D3.js or Force-Graph)
  - [ ] 検索機能 (Lunr.js)
  - [ ] ナビゲーション
  - [ ] バックリンク表示

## Phase 4: UI/UX改善

- [ ] Obsidianテーマ適用
- [ ] ダークモード対応
- [ ] レスポンシブデザイン
- [ ] プログレス表示
- [ ] エラーハンドリング強化

## Phase 5: 高度な機能

- [ ] タグフィルタリング
- [ ] カスタムテーマサポート
- [ ] パフォーマンス最適化
- [ ] キャッシュ機能
- [ ] 複数公開ディレクトリ対応

## その他

- [ ] テスト作成
- [ ] ドキュメント充実
- [ ] コミュニティプラグイン申請準備
