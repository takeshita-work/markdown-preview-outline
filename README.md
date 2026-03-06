# Markdown Preview Outline

VS Code の標準マークダウンプレビューにアウトライン（目次）サイドバーを追加する拡張機能です。

## 機能

- **アウトラインサイドバー** — プレビュー内に見出しの階層ツリーを表示
- **アクティブ項目ハイライト** — 現在表示中のセクションをアウトラインで下線ハイライト、自動スクロールで常に可視
- **パンくずナビゲーション** — プレビュー上端に現在のセクション階層を表示
- **スクロール同期** — エディタとプレビューの双方向スクロール同期
- **折りたたみツリー** — 個別ノード/サブツリー/全体の折りたたみ・展開
- **サイドバーリサイズ** — ドラッグで幅を変更、次回以降も保持
- **見出しクリック** — アウトラインの項目をクリックでプレビュー・エディタ両方をスクロール
- **テーマ追従** — VS Code のライト/ダークテーマに自動対応

## インストール

1. `.vsix` ファイルを取得する
2. VS Code で `Ctrl+Shift+P` → **Extensions: Install from VSIX...** を選択
3. `.vsix` ファイルを指定してインストール

## 設定

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `markdownPreviewOutline.position` | `string` | `"right"` | アウトラインの表示位置（`"right"` / `"left"`） |
| `markdownPreviewOutline.maxLevel` | `number` | `6` | 表示する見出しの最大レベル（1〜6） |
| `markdownPreviewOutline.showBreadcrumb` | `boolean` | `true` | パンくずナビゲーションの表示/非表示 |
| `markdownPreviewOutline.scrollSyncOffset` | `number` | `5` | スクロール同期の基準行オフセット（0〜20） |

## 開発

```bash
npm install          # 依存パッケージのインストール
npm run compile      # TypeScript コンパイル
npm run watch        # ファイル変更の監視・自動コンパイル
npm run lint         # ESLint 実行
```

### 開発中の動作確認

1. VS Code でプロジェクトフォルダを開く
2. `F5` を押す — 自動でコンパイルが走り、Extension Development Host ウィンドウが起動する
3. 新しいウィンドウでマークダウンファイルを開いてプレビューを確認する

コードを変更した場合は、Extension Development Host ウィンドウで `Ctrl+Shift+P` → **Developer: Reload Window** を実行する。

### 確認用パッケージ化

```bash
npx @vscode/vsce package --out markdown-preview-outline-dev.vsix
```

ファイル名を固定することで vsix が増えず、`.gitignore` の `*.vsix` により git 管理対象外になる。

### パッケージ化

```bash
npx @vscode/vsce package
```

## リリース管理

本リポジトリでは `v*.*.*` 形式の git タグを push すると、GitHub Actions が自動で `.vsix` を生成し GitHub Releases に追加します。

### リリース手順

1. `package.json` のバージョンを更新する

```json
{ "version": "0.1.0" }
```

2. main ブランチで変更をコミットする

```bash
git add package.json
git commit -m "バージョン 0.1.0 に更新"
git push origin main
```

3. タグを作成して push する（これが GitHub Actions のトリガー）

```bash
git tag v0.1.0
git push origin v0.1.0
```

4. GitHub Actions が完了すると [Releases](https://github.com/takeshita-work/markdown-preview-outline/releases) に `.vsix` が自動追加される

### バージョニング規則

[Semantic Versioning](https://semver.org/lang/ja/) に従う:

| バージョン | 意味 |
|---|---|
| `v1.0.0` → `v2.0.0` | 破壊的変更（後方互換なし） |
| `v1.0.0` → `v1.1.0` | 新機能追加（後方互換あり） |
| `v1.0.0` → `v1.0.1` | バグ修正 |
