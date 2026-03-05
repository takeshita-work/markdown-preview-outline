/**
 * Markdown Preview Outline — 拡張ホスト側エントリポイント
 *
 * 主な責務:
 * - ユーザー設定を CSS 変数として media/config.css に書き出す（CSS 変数ブリッジ）
 * - プレビュースクリプトからの revealLine メッセージを受けてエディタをスクロールするコマンドを登録
 * - 設定変更時に config.css を再生成しプレビューをリフレッシュする
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 現在のユーザー設定を CSS カスタムプロパティとして media/config.css に書き出す。
 * プレビュー内スクリプト（outline-config.js）が getComputedStyle() で読み取る。
 */
function writeConfigCss(extensionPath: string) {
  const cfg = vscode.workspace.getConfiguration('markdownPreviewOutline');
  const position = cfg.get<string>('position', 'right') || 'right';
  const maxLevel = cfg.get<number>('maxLevel', 6) || 6;
  const showBreadcrumb = cfg.get<boolean>('showBreadcrumb', true) ? 1 : 0;
  const scrollSyncOffset = cfg.get<number>('scrollSyncOffset', 5);
  const css = `:root {\n  --outline-config-position: ${position};\n  --outline-config-max-level: ${maxLevel};\n  --outline-config-show-breadcrumb: ${showBreadcrumb};\n  --outline-config-scroll-sync-offset: ${scrollSyncOffset};\n}\n`;
  fs.writeFileSync(path.join(extensionPath, 'media', 'config.css'), css, 'utf8');
}

/**
 * 拡張機能のアクティベーション処理。
 * config.css の初期生成、revealLine コマンドの登録、設定変更リスナーの登録を行う。
 */
export function activate(context: vscode.ExtensionContext) {
  // 起動時に現在の設定を config.css に書き込む
  writeConfigCss(context.extensionPath);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'markdownPreviewOutline.revealLine',
      async (line: number) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const position = new vscode.Position(line, 0);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.AtTop
        );
      }
    )
  );

  // 設定変更時に config.css を更新してプレビューを再描画する
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdownPreviewOutline')) {
        writeConfigCss(context.extensionPath);
        vscode.commands.executeCommand('markdown.preview.refresh');
      }
    })
  );
}

/** 拡張機能の非アクティベーション処理（クリーンアップ不要）。 */
export function deactivate() {}
