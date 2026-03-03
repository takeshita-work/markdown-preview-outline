import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // プレビュー内スクリプトから postMessage で送られるメッセージを受信する
  const provider = new MarkdownOutlineMessageHandler();
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer('markdown.preview', provider)
  );

  // markdown.preview の webview パネルが開かれたときにメッセージハンドラを登録する
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      // アクティブエディタ変更時はプレビュー側が自動更新するため特に処理不要
    })
  );

  // すでに開かれているプレビューパネルのメッセージを処理するため、
  // vscode.markdown.api を通じて webview へのアクセスを試みる
  setupMessageHandler(context);
}

function setupMessageHandler(context: vscode.ExtensionContext) {
  // VS Code の Markdown プレビューは内部的に WebviewPanel を使用している。
  // 拡張機能が注入したスクリプト（outline.js）は acquireVsCodeApi().postMessage() で
  // メッセージを送信できる。これを受け取るには WebviewPanelSerializer の登録か、
  // onDidReceiveMessage をパネルにアタッチする必要がある。
  //
  // ただし、標準プレビューの WebviewPanel へ直接アクセスする公式 API は存在しない。
  // outline.js 側では window.parent.postMessage を使い、拡張ホストは
  // WebviewPanelSerializer でパネルを取得した後に onDidReceiveMessage を登録する。
  //
  // より実用的な代替手段: outline.js 内で acquireVsCodeApi() を使って
  // postMessage し、extension.ts で WebviewPanelSerializer 経由で受信する。

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
}

class MarkdownOutlineMessageHandler implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(
    webviewPanel: vscode.WebviewPanel,
    _state: unknown
  ): Promise<void> {
    attachMessageHandler(webviewPanel);
  }
}

export function attachMessageHandler(panel: vscode.WebviewPanel) {
  panel.webview.onDidReceiveMessage(async (message: { type: string; line?: number }) => {
    if (message.type === 'revealLine' && typeof message.line === 'number') {
      await vscode.commands.executeCommand(
        'markdownPreviewOutline.revealLine',
        message.line
      );
    }
  });
}

export function deactivate() {}
