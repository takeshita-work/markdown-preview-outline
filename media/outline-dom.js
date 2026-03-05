/**
 * outline-dom.js — DOM 要素の生成・レイアウト管理・開閉トグル
 *
 * サイドバー・パンくず・リサイズハンドル・トグルボタンなどの
 * DOM 要素を生成し、レイアウト（body マージン）を管理する。
 * サイドバー幅は localStorage に永続化する。
 *
 * 公開 API (window._mpo):
 *   sidebar, resizeHandle, toggleBtn, nav, breadcrumb — DOM 要素
 *   collapsed          — サイドバーの折りたたみ状態
 *   updateBodyMargin   — サイドバー幅に応じて body マージンを更新
 *   setSidebarWidth    — サイドバー幅を設定しレイアウトを更新
 *   mountSidebar       — サイドバーを document.body に追加
 *   mountBreadcrumb    — パンくずを document.body に追加
 *   syncBodyStyles     — body の背景色・文字色を CSS 変数に反映
 *   saveWidth          — 現在のサイドバー幅を localStorage に保存
 */
(function () {
  'use strict';

  const mpo = window._mpo;

  // --- 幅の永続化 ---

  const STORAGE_KEY = 'markdownPreviewOutline.sidebarWidth';
  const DEFAULT_WIDTH = 220;

  /**
   * localStorage からサイドバー幅を読み込む。未保存の場合は DEFAULT_WIDTH を返す。
   * @returns {number} 保存済みの幅（px）またはデフォルト値
   */
  function loadWidth() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  }

  /**
   * サイドバー幅を localStorage に保存する。
   * @param {number} width - 保存する幅（px）
   */
  function saveWidth(width) {
    localStorage.setItem(STORAGE_KEY, String(width));
  }

  // --- DOM 要素の生成 ---

  const sidebar = document.createElement('div');
  sidebar.id = 'markdown-outline-sidebar';
  sidebar.className = `markdown-outline-sidebar position-${mpo.config.position}`;

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'markdown-outline-resize-handle';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'markdown-outline-toggle';
  toggleBtn.className = 'markdown-outline-toggle';
  toggleBtn.setAttribute('aria-label', 'Toggle outline');
  toggleBtn.setAttribute('title', 'Toggle outline');
  toggleBtn.textContent = '☰';

  const nav = document.createElement('nav');
  nav.id = 'markdown-outline-nav';
  nav.className = 'markdown-outline-nav';
  nav.setAttribute('aria-label', 'Document outline');

  sidebar.appendChild(resizeHandle);
  sidebar.appendChild(toggleBtn);
  sidebar.appendChild(nav);

  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'markdown-outline-breadcrumb';

  // --- 名前空間へ登録 ---

  mpo.sidebar = sidebar;
  mpo.resizeHandle = resizeHandle;
  mpo.toggleBtn = toggleBtn;
  mpo.nav = nav;
  mpo.breadcrumb = breadcrumb;
  mpo.collapsed = false;
  mpo.saveWidth = saveWidth;

  // --- レイアウト ---

  /**
   * サイドバー幅に応じて body のマージンとパンくずの左右端位置を更新する。
   * サイドバーが折りたたみ中の場合は何もしない。
   * @param {number} width - サイドバーの現在幅（px）
   */
  function updateBodyMargin(width) {
    if (mpo.collapsed) return;
    if (mpo.config.position === 'right') {
      document.body.style.marginRight = `${width}px`;
      document.body.style.marginLeft = '';
      breadcrumb.style.left = '0';
      breadcrumb.style.right = `${width}px`;
    } else {
      document.body.style.marginLeft = `${width}px`;
      document.body.style.marginRight = '';
      breadcrumb.style.left = `${width}px`;
      breadcrumb.style.right = '0';
    }
  }

  /**
   * サイドバーの CSS width を設定し、body マージンを同期する。
   * @param {number} width - 設定する幅（px）
   */
  function setSidebarWidth(width) {
    sidebar.style.width = `${width}px`;
    updateBodyMargin(width);
  }

  /**
   * サイドバー要素が未追加の場合、保存済み幅で初期化して document.body に追加する。
   * 再マウントは行わない（冪等）。
   */
  function mountSidebar() {
    if (!document.getElementById('markdown-outline-sidebar')) {
      setSidebarWidth(loadWidth());
      document.body.appendChild(sidebar);
    }
  }

  /**
   * パンくず要素が未追加の場合、ID を付与して document.body に追加する。
   * 再マウントは行わない（冪等）。
   */
  function mountBreadcrumb() {
    if (!document.getElementById('markdown-outline-breadcrumb')) {
      breadcrumb.id = 'markdown-outline-breadcrumb';
      document.body.appendChild(breadcrumb);
    }
  }

  /**
   * body の背景色・文字色を取得し、アウトラインとパンくずの CSS 変数に反映する。
   * VS Code テーマへの追従に使用する。背景が透明の場合は設定をスキップする。
   */
  function syncBodyStyles() {
    const style = getComputedStyle(document.body);
    const bg = style.backgroundColor;
    const fg = style.color;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') {
      document.documentElement.style.setProperty('--outline-sidebar-bg', bg);
      document.documentElement.style.setProperty('--outline-breadcrumb-bg', bg);
    }
    if (fg) {
      document.documentElement.style.setProperty('--outline-sidebar-color', fg);
      document.documentElement.style.setProperty('--outline-link-color', fg);
      document.documentElement.style.setProperty('--outline-breadcrumb-item-color', fg);
    }
  }

  mpo.updateBodyMargin = updateBodyMargin;
  mpo.setSidebarWidth = setSidebarWidth;
  mpo.mountSidebar = mountSidebar;
  mpo.mountBreadcrumb = mountBreadcrumb;
  mpo.syncBodyStyles = syncBodyStyles;

  // --- 開閉トグル ---

  toggleBtn.addEventListener('click', () => {
    mpo.collapsed = !mpo.collapsed;
    sidebar.classList.toggle('collapsed', mpo.collapsed);
    toggleBtn.setAttribute('aria-pressed', String(mpo.collapsed));
    if (mpo.collapsed) {
      if (mpo.config.position === 'right') {
        document.body.style.marginRight = '48px';
        document.body.style.marginLeft = '';
        breadcrumb.style.left = '0';
        breadcrumb.style.right = '48px';
      } else {
        document.body.style.marginLeft = '48px';
        document.body.style.marginRight = '';
        breadcrumb.style.left = '48px';
        breadcrumb.style.right = '0';
      }
    } else {
      updateBodyMargin(sidebar.offsetWidth);
    }
  });
})();
