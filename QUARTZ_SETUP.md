# Quartzのセットアップについて

## 自動セットアップ

このプラグインはQuartzを**自動的にセットアップ**します。手動でのセットアップは不要です。

GitHub Actionsワークフローの初回実行時に、以下が自動的に行われます：

1. GitHubからQuartzリポジトリをclone
2. 必要なファイル（quartz/, package.json等）を公開用リポジトリにコピー
3. `npm install`で依存関係をインストール
4. Quartzのデフォルト設定でセットアップ完了

## Quartzのカスタマイズ（任意）

プラグインはQuartzのデフォルト設定を使用します。カスタマイズが必要な場合は、**公開用リポジトリの`quartz.config.ts`を直接編集**してください。

### カスタマイズ手順

1. 公開用リポジトリをローカルにclone
   ```bash
   git clone https://github.com/<username>/<repository-name>.git
   cd <repository-name>
   ```

2. `quartz.config.ts`を編集
   ```typescript
   const config: QuartzConfig = {
     configuration: {
       pageTitle: "📚 My Published Notes",  // サイトタイトル
       enableSPA: true,
       enablePopovers: true,
       locale: "ja-JP",  // 日本語設定
       baseUrl: "<username>.github.io/<repository-name>",
       ignorePatterns: ["private", "templates"],
       theme: {
         typography: {
           header: "Schibsted Grotesk",
           body: "Source Sans Pro",
           code: "IBM Plex Mono",
         },
         colors: {
           // カラーテーマをカスタマイズ
         },
       },
     },
     // ...
   }
   ```

3. 変更をcommit & push
   ```bash
   git add quartz.config.ts
   git commit -m "chore: customize Quartz config"
   git push
   ```

次回のビルドからカスタマイズが反映されます。

## デフォルトで有効な機能

- **グラフビュー**: ノート間のリンクを可視化
- **全文検索**: サイト全体を検索
- **タグページ**: タグごとにノートを整理
- **バックリンク**: 被リンクを表示
- **構文ハイライト**: コードブロックのシンタックスハイライト
- **数式表示**: KaTeXによる数式レンダリング
- **Obsidian形式のWikiリンク**: `[[note]]`形式のリンクをサポート

## GitHub Pages設定

公開用リポジトリで以下の設定が必要です：

1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Save

## 参考リンク

- [Quartz 公式ドキュメント](https://quartz.jzhao.xyz/)
- [Quartz GitHub リポジトリ](https://github.com/jackyzha0/quartz)
- [Quartz 設定ガイド](https://quartz.jzhao.xyz/configuration)
