/**
 * outline-events.js — イベント処理・スクロール同期・初期化
 *
 * 最後に読み込まれるモジュール。以下を担当する:
 * - サイドバーのドラッグリサイズ（100px〜600px）
 * - MutationObserver によるコンテンツ変更検知と自動再構築
 * - エディタ↔プレビューの双方向スクロール同期
 *   - エディタ→プレビュー: setScrollPosition メッセージ受信 → 見出しベースのピクセル同期
 *   - プレビュー→エディタ: スクロールイベント → revealLine メッセージ送信
 *   - ループ防止: programmaticScroll / userScrolling フラグ
 * - VS Code からの updateConfig メッセージ処理
 * - 全モジュールの初期化呼び出し（init）
 */
(function () {
  'use strict';

  const mpo = window._mpo;

  if (!mpo || mpo._eventsInitialized) return;
  mpo._eventsInitialized = true;

  const MIN_WIDTH = 100;
  const MAX_WIDTH = 600;

  // --- リサイズ ---

  /**
   * リサイズハンドルのドラッグ操作を初期化する。
   * mousedown でドラッグ開始、mousemove で幅を MIN_WIDTH〜MAX_WIDTH に制限しながら更新、
   * mouseup でドラッグ終了と幅の永続化を行う。
   */
  function initResize() {
    const { resizeHandle, sidebar } = mpo;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const onMouseMove = (e) => {
        const delta = mpo.config.position === 'right'
          ? startX - e.clientX
          : e.clientX - startX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        mpo.setSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        mpo.saveWidth(sidebar.offsetWidth);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // --- コンテンツ更新の監視 ---

  /**
   * MutationObserver で document.body の DOM 変更を監視し、コンテンツ更新を検知する。
   * アウトライン・パンくず自身の変更は無視する。
   * 変更検知から 100ms デバウンス後に config.css 再読み込みとアウトライン再構築を実行する。
   */
  function observeContentChanges() {
    const { sidebar, breadcrumb } = mpo;
    let debounceTimer = null;

    const observer = new MutationObserver((mutations) => {
      const isOwnChange = mutations.every(
        (m) => sidebar.contains(m.target) || m.target === sidebar
             || breadcrumb.contains(m.target) || m.target === breadcrumb
      );
      if (isOwnChange) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        mpo.reloadConfigCss(() => {
          mpo.applyConfig(mpo.readConfigFromCss());
          mpo.buildOutline();
        });
      }, 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- スクロール同期（双方向） ---

  let userScrolling = false;
  let userScrollTimer = null;
  let programmaticScroll = false;
  let programScrollTimer = null;

  /**
   * data-line 属性を持つ見出し要素を DOM 順で返す。
   * サイドバー内の見出しは除外する。スクロール同期の基準点計算に使用する。
   * @returns {HTMLElement[]}
   */
  function getSyncHeadings() {
    return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter(h => h.hasAttribute('data-line') && !mpo.sidebar.contains(h));
  }

  // ---- エディタ → プレビュー ----

  /**
   * ユーザーの手動スクロールを検知するガードを初期化する。
   * スクロール中は userScrolling フラグを true にし、600ms 後に解除する。
   * programmaticScroll 中はフラグを立てない（エコー防止）。
   */
  function initScrollSyncGuard() {
    window.addEventListener('scroll', () => {
      if (programmaticScroll) return;
      userScrolling = true;
      clearTimeout(userScrollTimer);
      userScrollTimer = setTimeout(() => { userScrolling = false; }, 600);
    }, { passive: true });
  }

  /**
   * エディタのスクロール位置（行番号）に対応するプレビュー位置へスクロールする。
   * scrollSyncOffset を加味した最近傍の見出しを基準に、
   * 「エディタ上端から見出しまでのピクセル距離」をプレビュー上で再現する。
   * userScrolling または programmaticScroll 中は実行をスキップしてループを防ぐ。
   * @param {number} targetLine - エディタ上端の行番号（0 始まり）
   */
  function scrollPreviewToLine(targetLine) {
    if (userScrolling) return;
    // プログラム的スクロール中は setScrollPosition のエコーを無視してループを防ぐ
    if (programmaticScroll) return;

    const offset = mpo.config.scrollSyncOffset;
    const adjustedLine = targetLine + offset;
    const headings = getSyncHeadings();
    if (headings.length === 0) return;

    // adjustedLine 以下で最後の見出しを選ぶ
    let bestH = null;
    for (const h of headings) {
      const line = parseInt(h.getAttribute('data-line'), 10);
      if (isNaN(line)) continue;
      if (line <= adjustedLine) bestH = h;
      else break;
    }
    if (!bestH) return;

    const hLine = parseInt(bestH.getAttribute('data-line'), 10);
    const hAbsoluteY = bestH.getBoundingClientRect().top + window.scrollY;

    // 見出しのエディタ上端からのピクセル距離を推定（行高さを proxy として使用）
    // relativeLines が負 = 見出しがエディタ上端より上 → プレビュー上端に合わせる
    const lineHeight = parseFloat(getComputedStyle(document.body).lineHeight) || 22;
    const relativeLines = hLine - targetLine;
    const viewportOffset = Math.max(0, relativeLines * lineHeight);
    const targetScrollY = hAbsoluteY - viewportOffset;

    programmaticScroll = true;
    clearTimeout(programScrollTimer);
    window.scrollTo({ top: Math.max(0, Math.round(targetScrollY)), behavior: 'instant' });
    // VS Code がプレビュースクロールを検知して setScrollPosition を返送するまでの
    // ラウンドトリップをカバーするため十分な時間ブロックする
    programScrollTimer = setTimeout(() => { programmaticScroll = false; }, 500);
  }

  // ---- プレビュー → エディタ ----

  let editorSyncTimer = null;

  /**
   * プレビューのスクロール位置からエディタへ同期する。
   * viewport 上端を通過した最後の見出しの行番号から scrollSyncOffset を引き、
   * revealLine メッセージで拡張ホストに通知する。80ms デバウンスで実行する。
   * programmaticScroll 中はスキップしてループを防ぐ。
   */
  function syncEditorFromPreview() {
    if (programmaticScroll) return;

    clearTimeout(editorSyncTimer);
    editorSyncTimer = setTimeout(() => {
      // mpo.vscode が取得できている場合のみ直接送信
      // null の場合は VS Code 組み込みの scrollEditorWithPreview に委ねる
      if (!mpo.vscode) return;

      const headings = getSyncHeadings();

      // viewport 上端を超えた見出しのうち最後のもの（現在のセクション）
      let topH = null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= 10) {
          topH = h;
        } else {
          break;
        }
      }
      if (!topH) return;

      const line = parseInt(topH.getAttribute('data-line'), 10);
      if (isNaN(line)) return;

      const editorLine = Math.max(0, line - mpo.config.scrollSyncOffset);
      mpo.vscode.postMessage({ type: 'revealLine', line: editorLine });
    }, 80);
  }

  /**
   * プレビュー→エディタのスクロール同期を開始する。
   * window の scroll イベントに syncEditorFromPreview を登録する。
   */
  function initPreviewToEditorSync() {
    window.addEventListener('scroll', syncEditorFromPreview, { passive: true });
  }

  // --- メッセージ受信 ---

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || !message.type) return;

    if (message.type === 'updateConfig') {
      if (message.config) {
        if (message.config.position) {
          mpo.sidebar.classList.remove(`position-${mpo.config.position}`);
          mpo.config.position = message.config.position;
          mpo.sidebar.classList.add(`position-${mpo.config.position}`);
        }
        if (typeof message.config.maxLevel === 'number') {
          mpo.config.maxLevel = message.config.maxLevel;
          mpo.buildOutline();
        }
      }
    }

    if (message.type === 'setScrollPosition') {
      const line = message.body != null ? message.body.line : message.line;
      if (typeof line === 'number') {
        scrollPreviewToLine(line);
      }
    }
  });

  // --- 初期化 ---

  /**
   * 全モジュールの初期化を行うエントリポイント。
   * DOM マウント → スタイル同期 → リサイズ → スクロール同期 →
   * アウトライン構築 → 遅延再構築（200ms）→ コンテンツ変更監視 → パンくず更新の順に実行する。
   * 依存モジュール（outline-dom.js 等）が未ロードの場合は 10ms 後にリトライする。
   */
  function init() {
    if (
      typeof mpo.mountSidebar !== 'function' ||
      typeof mpo.buildOutline !== 'function' ||
      typeof mpo.updateBreadcrumb !== 'function'
    ) {
      setTimeout(init, 10);
      return;
    }
    mpo.mountSidebar();
    mpo.mountBreadcrumb();
    mpo.syncBodyStyles();
    initResize();
    initScrollSyncGuard();
    initPreviewToEditorSync();
    mpo.buildOutline();
    setTimeout(() => {
      mpo.buildOutline();
      mpo.updateBreadcrumb();
    }, 200);
    observeContentChanges();
    mpo.initBreadcrumbUpdater();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
