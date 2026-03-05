# Markdown Preview Outline

VS Code の標準マークダウンプレビューにアウトライン（目次）サイドバーを追加する拡張機能です。

## 機能

- **アウトラインサイドバー** — プレビュー内に見出しの階層ツリーを表示
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

### パッケージ化

```bash
npx @vscode/vsce package
```
