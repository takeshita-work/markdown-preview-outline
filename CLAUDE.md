# Markdown Preview Outline

VS Code の標準マークダウンプレビューにアウトライン（目次）サイドバーを表示する拡張機能。

## プロジェクト概要

- 仕様書: `SPEC.md`
- 開発言語: TypeScript
- `markdown.previewScripts` / `markdown.previewStyles` を使い、標準プレビューに JS/CSS を注入する方式

## ファイル構成

- `src/extension.ts` - 拡張ホスト側エントリポイント
- `media/outline-config.js` - 設定の読み込み・共有名前空間の初期化
- `media/outline-dom.js` - DOM 要素の生成・レイアウト管理・開閉トグル
- `media/outline-tree.js` - アウトラインのツリー構築・描画
- `media/outline-breadcrumb.js` - パンくずナビゲーション
- `media/outline-events.js` - イベント処理・スクロール同期・初期化
- `media/config.css` - 設定値ブリッジ用 CSS（extension.ts が動的生成）
- `media/outline.css` - プレビュー注入スタイル
- `package.json` - 拡張機能マニフェスト

## 開発コマンド

```bash
npm install        # 依存パッケージのインストール
npm run compile    # TypeScript コンパイル
npm run watch      # ファイル変更の監視・自動コンパイル
npm run lint       # ESLint 実行
```

## 技術的なポイント

- プレビュー内スクリプトと拡張ホスト間の通信は `postMessage` / `onDidReceiveMessage` を使用
- VS Code テーマへの追従は CSS 変数 (`var(--vscode-*)`) で実現
- 見出し変更の検知はイベント駆動（ポーリング不可）
- 対応 VS Code バージョン: 1.75.0 以上

## 作業ルール

### 作業前の説明
- コードの変更・コマンドの実行・ファイルの作成・削除など、何らかの作業を行う前に、**これから何をするかを日本語で説明してから実行**すること
- 複数のステップにわたる作業の場合は、全体の手順を先に示してから着手すること

### git 操作
- コミットメッセージは**日本語**で記述すること
- `git push` を実行する前に、以下をすべて確認・実施すること:
  1. 今回のコード変更に対応する `SPEC.md` の更新が済んでいるか
  2. 今回のコード変更に対応する `README.md` の更新が済んでいるか
  3. `npm run lint` がエラーなく通るか
  4. `npm run compile` がエラーなく通るか
- 上記のいずれかが未完了の場合は push せず、先にドキュメント更新またはエラー修正を行うこと

## コーディング規約

- 言語: 日本語コメント可、コード・変数名は英語
- フォーマッタ/リンター設定に従うこと

### ドキュメントコメント
- すべての関数・メソッドに JSDoc（JS）または TSDoc（TS）形式のドキュメントコメントを付ける
- モジュール先頭にはファイル全体の責務・公開 API を説明するブロックコメントを付ける
- `@param` / `@returns` は型と説明を明記する

### ファイル分割
- 1 ファイルの責務は単一にする（DOM 生成・イベント・ツリー構築などは別ファイルに分ける）
- 関数が増えて 1 ファイルが 200 行を超える目安で分割を検討する
- JS モジュールは `window._mpo` 共有名前空間を介してやり取りし、グローバル変数の直接参照を避ける

### ドキュメント更新
- 機能追加・変更・削除を行った場合は、必ず `SPEC.md` と `README.md` を同時に更新する
  - `SPEC.md`: 機能要件・設定項目・技術構成の変更を反映する
  - `README.md`: ユーザー向けの機能一覧・設定テーブルを更新する

### ドキュメント更新タイミング
- `git push` の前に `SPEC.md` と `README.md` の更新を完了させること（push 後では遅い）
