# Markdown Preview Outline - 仕様書

## 概要
VS Code の標準マークダウンプレビュー内にアウトライン（目次）サイドバーを表示する拡張機能。

## 技術方針
- `markdown.previewScripts` / `markdown.previewStyles` contribution points を使い、標準プレビューに JS/CSS を注入する
- 開発言語: TypeScript
- プレビュー内の DOM から見出し要素（h1〜h6）を取得し、アウトラインを動的に生成する

## 機能要件

### F-01: アウトライン表示
- プレビュー内の見出し（h1〜h6）を階層的なツリーとして表示する
- 見出しレベルに応じたインデントで階層構造を視覚化する
- マークダウンの内容変更時にアウトラインを自動更新する
  - `vscode.markdown.updateContent` イベントを監視

### F-02: 表示位置の設定
- プレビュー内の右側または左側にサイドバーとして表示する
- 設定項目: `markdownPreviewOutline.position`
  - 値: `"right"` (デフォルト) | `"left"`

### F-03: 見出しクリック時のスクロール
- アウトラインの見出しをクリックすると、プレビューを該当箇所までスクロールする
- 同時にエディタ（ソース）も該当行までスクロールする
  - プレビュースクリプトから `postMessage` で拡張ホストに通知
  - 拡張ホストが `vscode.commands.executeCommand('revealLine', ...)` でエディタをスクロール

### F-04: 表示する見出しレベルの設定
- 設定項目: `markdownPreviewOutline.maxLevel`
  - 値: `1`〜`6` (デフォルト: `6`)
  - 指定レベル以下の見出しのみ表示する

### F-05: アウトラインの開閉
- アウトラインサイドバーを折りたたみ/展開するトグルボタンを用意する
- 折りたたみ状態は小さなアイコンのみ表示し、プレビュー領域を広く使える

## 非機能要件

### NF-01: パフォーマンス
- 見出しの変更検知はイベント駆動で行い、ポーリングは使用しない
- 大きなドキュメント（1000行超）でもスムーズに動作すること

### NF-02: テーマ対応
- VS Code のライト/ダークテーマに自動で追従する
- CSS 変数 (`var(--vscode-*)`) を活用する

### NF-03: 互換性
- VS Code 1.75.0 以上をサポート

## 設定項目まとめ

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `markdownPreviewOutline.position` | `string` | `"right"` | アウトラインの表示位置（`"right"` / `"left"`） |
| `markdownPreviewOutline.maxLevel` | `number` | `6` | 表示する見出しの最大レベル（1〜6） |

## 技術構成

### ファイル構成（予定）
```
├── package.json          # 拡張機能マニフェスト
├── tsconfig.json         # TypeScript 設定
├── src/
│   └── extension.ts      # 拡張ホスト側エントリポイント
├── media/
│   ├── outline.js        # プレビュー注入スクリプト
│   └── outline.css       # プレビュー注入スタイル
└── SPEC.md               # 本ドキュメント
```

### package.json の主要設定
- `contributes.markdown.previewScripts`: `["./media/outline.js"]`
- `contributes.markdown.previewStyles`: `["./media/outline.css"]`
- `contributes.configuration`: 設定項目の定義

### メッセージフロー
1. プレビュースクリプト（outline.js）が DOM から見出しを抽出しアウトラインを描画
2. ユーザーがアウトラインの見出しをクリック
3. プレビューが該当見出しまでスクロール
4. `postMessage` で拡張ホストにクリックイベントを通知
5. 拡張ホスト（extension.ts）がエディタを該当行にスクロール
