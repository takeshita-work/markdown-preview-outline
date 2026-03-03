# Markdown Preview Outline

VS Code の標準マークダウンプレビューにアウトライン（目次）サイドバーを表示する拡張機能。

## プロジェクト概要

- 仕様書: `SPEC.md`
- 開発言語: TypeScript
- `markdown.previewScripts` / `markdown.previewStyles` を使い、標準プレビューに JS/CSS を注入する方式

## ファイル構成

- `src/extension.ts` - 拡張ホスト側エントリポイント
- `media/outline.js` - プレビュー注入スクリプト（DOM から見出しを抽出しアウトライン描画）
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

## コーディング規約

- 言語: 日本語コメント可、コード・変数名は英語
- フォーマッタ/リンター設定に従うこと
