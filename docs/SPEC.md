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
- マークダウンの内容変更時にアウトラインを自動更新する（F-10 参照）

### F-02: 表示位置の設定
- プレビュー内の右側または左側にサイドバーとして表示する
- 設定項目: `markdownPreviewOutline.position`
  - 値: `"right"` (デフォルト) | `"left"`
- 表示位置に応じて `document.body` のマージンを調整し、プレビュー本文と重ならないようにする

### F-03: 見出しクリック時のスクロール
- アウトラインの見出しをクリックすると、プレビューを該当箇所までスムーズスクロールする
- 同時にエディタ（ソース）も該当行までスクロールする
  - プレビュースクリプトから `postMessage({ type: 'revealLine', line })` で拡張ホストに通知
  - 拡張ホストが `editor.revealRange()` でエディタをスクロール
- 見出しの特定には `data-line` 属性（優先）または要素 ID を使用する

### F-04: 表示する見出しレベルの設定
- 設定項目: `markdownPreviewOutline.maxLevel`
  - 値: `1`〜`6` (デフォルト: `6`)
  - 指定レベル以下の見出しのみ表示する

### F-05: アウトラインの開閉
- アウトラインサイドバーを折りたたみ/展開するトグルボタン（☰）を用意する
- 折りたたみ状態ではサイドバー幅を 48px に縮小し、プレビュー領域を広く使える

### F-06: パンくずナビゲーション
- プレビュー上端に現在のセクション階層をパンくず形式で表示する
- viewport 上端を通過した見出しから現在位置を判定し、階層を `›` で区切って表示する
- 各パンくず項目をクリックすると該当見出しまでスクロールする
- スクロールイベントおよび IntersectionObserver で自動更新する
- 設定項目: `markdownPreviewOutline.showBreadcrumb`
  - 値: `true` (デフォルト) | `false`

### F-07: サイドバーリサイズ
- サイドバー端のドラッグハンドルで幅を変更できる
- 幅の範囲: 100px〜600px
- 変更した幅は `localStorage` に保存し、次回表示時に復元する
- デフォルト幅: 220px

### F-08: 折りたたみツリー
- 子ノードを持つ見出しに折りたたみトグル（▾ / ▸）を表示する
- 個別ノードの折りたたみ/展開をクリックで切り替え可能
- 各ノードにサブツリー一括折りたたみ（−）/展開（+）ボタンを表示する
- ナビゲーション上部に全体の折りたたみ/展開トグルボタンを表示する

### F-09: エディタ↔プレビュー双方向スクロール同期
- **エディタ → プレビュー**: VS Code の `setScrollPosition` メッセージを受信し、見出しのピクセル位置を基準にプレビューをスクロールする
- **プレビュー → エディタ**: ユーザーのプレビュースクロールを検知し、viewport 上端の見出しに対応する行を `revealLine` メッセージで拡張ホストに通知する
- ループ防止ガード: プログラム的スクロール中はイベントを無視する（`programmaticScroll` フラグ + タイマー）
- ユーザー手動スクロール中はエディタ→プレビュー同期を抑制する（`userScrolling` フラグ + 600ms タイマー）
- 設定項目: `markdownPreviewOutline.scrollSyncOffset`
  - 値: `0`〜`20` (デフォルト: `5`)
  - エディタ上端から何行目を同期基準点とするか

### F-10: コンテンツ変更の自動検知
- `MutationObserver` で `document.body` の `childList` / `subtree` 変更を監視する
- アウトライン自身やパンくずの変更は無視する
- 100ms のデバウンスで設定の再読み込み・アウトライン再構築を実行する

## 非機能要件

### NF-01: パフォーマンス
- 見出しの変更検知はイベント駆動（MutationObserver）で行い、ポーリングは使用しない
- リサイズ・スクロール同期にはデバウンス/タイマーガードを適用する
- 大きなドキュメント（1000行超）でもスムーズに動作すること

### NF-02: テーマ対応
- VS Code のライト/ダークテーマに自動で追従する
- プレビューの `body` 背景色・文字色を取得し、アウトラインとパンくずの CSS 変数に反映する

### NF-03: 互換性
- VS Code 1.75.0 以上をサポート

## 設定項目まとめ

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `markdownPreviewOutline.position` | `string` | `"right"` | アウトラインの表示位置（`"right"` / `"left"`） |
| `markdownPreviewOutline.maxLevel` | `number` | `6` | 表示する見出しの最大レベル（1〜6） |
| `markdownPreviewOutline.showBreadcrumb` | `boolean` | `true` | パンくずナビゲーションの表示/非表示 |
| `markdownPreviewOutline.scrollSyncOffset` | `number` | `5` | スクロール同期の基準行オフセット（0〜20） |

## 技術構成

### ファイル構成
```
├── package.json                 # 拡張機能マニフェスト
├── tsconfig.json                # TypeScript 設定
├── src/
│   └── extension.ts             # 拡張ホスト側エントリポイント
├── media/
│   ├── outline-config.js        # 設定の読み込み・共有名前空間の初期化
│   ├── outline-dom.js           # DOM 要素の生成・レイアウト管理・開閉トグル
│   ├── outline-tree.js          # アウトラインのツリー構築・描画
│   ├── outline-breadcrumb.js    # パンくずナビゲーション
│   ├── outline-events.js        # イベント処理・スクロール同期・初期化
│   ├── config.css               # 設定値ブリッジ用 CSS（extension.ts が動的生成）
│   └── outline.css              # プレビュー注入スタイル
├── docs/
│   └── SPEC.md                  # 本ドキュメント
└── CLAUDE.md                    # 開発ガイド
```

### 共有名前空間 `window._mpo`
- `outline-config.js` が最初に読み込まれ、`window._mpo = {}` を初期化する
- 各モジュールは `window._mpo` を介して関数・DOM 要素・設定を共有する
- `acquireVsCodeApi()` の呼び出しも `outline-config.js` で一度だけ行い、`mpo.vscode` に格納する

### CSS 変数ブリッジ
拡張ホストの設定値をプレビュー内スクリプトに渡す仕組み:
1. `extension.ts` が設定値を CSS 変数として `media/config.css` に書き出す
2. `config.css` が `markdown.previewStyles` でプレビューに注入される
3. `outline-config.js` が `getComputedStyle()` で CSS 変数を読み取り、JS オブジェクトに変換する
4. 設定変更時は `extension.ts` が `config.css` を更新し `markdown.preview.refresh` を実行する
5. コンテンツ更新時は `outline-events.js` が `config.css` を動的 `<link>` で再読み込みして差分適用する

### package.json の主要設定
- `contributes.markdown.previewScripts`: 5 モジュール（config → dom → tree → breadcrumb → events の順）
- `contributes.markdown.previewStyles`: `["./media/config.css", "./media/outline.css"]`
- `contributes.configuration`: 4 設定項目の定義
- `activationEvents`: `["onStartupFinished"]`

### メッセージフロー

#### プレビュー → 拡張ホスト
1. アウトライン見出しクリック or プレビュースクロール
2. `mpo.vscode.postMessage({ type: 'revealLine', line })` で通知
3. 拡張ホストが `editor.revealRange()` でエディタを該当行にスクロール

#### 拡張ホスト → プレビュー
1. エディタのスクロール位置変更
2. VS Code が `{ type: 'setScrollPosition', body: { line } }` メッセージを送信
3. `outline-events.js` が見出しベースのピクセル位置同期でプレビューをスクロール
