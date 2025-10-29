# 公開用リポジトリにQuartzをセットアップする手順

このプラグインはVaultのMarkdownファイルを公開用リポジトリに同期します。公開用リポジトリ側でQuartzを使用してサイトをビルド・デプロイします。

## 前提条件

- Node.js v22以上
- npm v10.9.2以上
- GitHub アカウント
- 公開用リポジトリ（Public）

## セットアップ手順

### 1. 公開用リポジトリをローカルにclone

```bash
git clone https://github.com/<username>/<repository-name>.git
cd <repository-name>
```

### 2. Quartzをインストール

公開用リポジトリのディレクトリで、Quartzを初期化します:

```bash
git clone https://github.com/jackyzha0/quartz.git temp-quartz
cp -r temp-quartz/* .
cp -r temp-quartz/.github .
rm -rf temp-quartz
npm install
```

または、npx quartz createを使用:

```bash
npx quartz create
```

プロンプトが表示されたら:
- **Empty Quartz** を選択（Vaultから同期されるため）
- リンク設定などはデフォルトでOK

### 3. content/ディレクトリを作成

Quartzはcontent/ディレクトリのMarkdownファイルをビルドします:

```bash
mkdir -p content
echo "# Welcome" > content/index.md
```

### 4. GitHub Actionsワークフローを設定

`.github/workflows/deploy.yml` を作成:

```yaml
name: Build and Deploy Quartz

on:
  push:
    branches:
      - main
    paths:
      - 'content/**'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Dependencies
        run: npm ci

      - name: Build Quartz
        run: npx quartz build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    runs-on: ubuntu-22.04
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 5. GitHub Pagesを有効化

GitHub リポジトリの設定ページで:

1. Settings → Pages
2. Source: **GitHub Actions** を選択
3. 保存

### 6. Quartz設定をカスタマイズ（任意）

`quartz.config.ts` を編集してサイト設定をカスタマイズできます:

```typescript
const config: QuartzConfig = {
  configuration: {
    pageTitle: "📚 My Published Notes",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "ja-JP",
    baseUrl: "<username>.github.io/<repository-name>",
    ignorePatterns: ["private", "templates"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}
```

### 7. 変更をcommit & push

```bash
git add .
git commit -m "feat: Setup Quartz for publishing"
git push
```

## 動作確認

1. Vaultのプラグイン設定で「GitHub Actions をセットアップ」を実行
2. Vaultをcommit & push
3. Vault側のGitHub Actionsが実行され、Markdownファイルが公開用リポジトリのcontent/にpush
4. 公開用リポジトリのGitHub Actionsが自動実行され、Quartzでビルド
5. `https://<username>.github.io/<repository-name>/` で公開サイトを確認

## トラブルシューティング

### ビルドエラー

- Node.jsのバージョンを確認: `node --version` (v22以上必要)
- 依存関係を再インストール: `npm ci`
- Quartz のログを確認: GitHub Actions のログを確認

### content/ディレクトリが空

- Vault側のワークフローが正常に実行されたか確認
- Vault側のGitHub Actions のログを確認
- 公開対象ディレクトリにMarkdownファイルが存在するか確認

### GitHub Pages が更新されない

- GitHub リポジトリの Settings → Pages で Source が「GitHub Actions」になっているか確認
- deploy.yml のワークフローが正常に実行されたか確認

## 参考リンク

- [Quartz 公式ドキュメント](https://quartz.jzhao.xyz/)
- [Quartz GitHub リポジトリ](https://github.com/jackyzha0/quartz)
- [GitHub Pages ドキュメント](https://docs.github.com/ja/pages)
