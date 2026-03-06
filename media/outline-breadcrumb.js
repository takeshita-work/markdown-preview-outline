/**
 * outline-breadcrumb.js — パンくずナビゲーション
 *
 * プレビュー上端に現在のセクション階層をパンくず形式で表示する。
 * viewport 上端を通過した見出しから各レベルの最新を取得し、
 * 階層順に「›」区切りで描画する。スクロールイベントと
 * IntersectionObserver で自動更新する。
 *
 * 公開 API (window._mpo):
 *   updateBreadcrumb      — パンくずを現在のスクロール位置に合わせて再描画
 *   initBreadcrumbUpdater — スクロール/交差監視を開始
 */
(function () {
  'use strict';

  const mpo = window._mpo;

  if (!mpo || mpo._breadcrumbInitialized) return;

  /**
   * 現在のスクロール位置に基づきパンくずとアウトラインのアクティブ項目を更新する。
   * viewport 上端（10px の余裕）を通過した見出しから各レベルの最新を取得する。
   * アウトラインのハイライトは showBreadcrumb 設定に関わらず常に更新する。
   * パンくずは showBreadcrumb が true の場合のみ描画する。
   */
  function updateBreadcrumb() {
    const { breadcrumb, sidebar, config } = mpo;

    const allHeadings = Array.from(
      document.querySelectorAll('h1,h2,h3,h4,h5,h6')
    ).filter(
      (h) => parseInt(h.tagName[1], 10) <= config.maxLevel && !sidebar.contains(h)
    );

    // viewport の上端 (10px の余裕) より上にある見出しを現在地とする
    const activeAtLevel = new Map();
    for (const h of allHeadings) {
      const top = h.getBoundingClientRect().top;
      if (top <= 10) {
        const level = parseInt(h.tagName[1], 10);
        activeAtLevel.set(level, h);
        for (let i = level + 1; i <= 6; i++) activeAtLevel.delete(i);
      }
    }

    // アウトラインサイドバーのアクティブ項目を更新（パンくず表示設定に関わらず実行）
    // パンくずに表示される全レベルの見出しを渡し、対応するリンクすべてに下線を付与する
    if (typeof mpo.updateOutlineActive === 'function') {
      mpo.updateOutlineActive([...activeAtLevel.values()]);
    }

    if (!config.showBreadcrumb) {
      breadcrumb.hidden = true;
      return;
    }

    breadcrumb.innerHTML = '';
    if (activeAtLevel.size === 0) {
      breadcrumb.hidden = true;
      return;
    }
    breadcrumb.hidden = false;

    const sortedLevels = Array.from(activeAtLevel.keys()).sort((a, b) => a - b);
    sortedLevels.forEach((level, index) => {
      const h = activeAtLevel.get(level);
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'markdown-outline-breadcrumb-sep';
        sep.textContent = ' › ';
        breadcrumb.appendChild(sep);
      }
      const item = document.createElement('span');
      item.className = 'markdown-outline-breadcrumb-item';
      item.textContent = h.textContent || '';
      item.title = h.textContent || '';
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        mpo.scrollToHeading(h);
      });
      breadcrumb.appendChild(item);
    });
  }

  /**
   * スクロールイベントと IntersectionObserver を登録してパンくずの自動更新を開始する。
   * window と document の両方の scroll イベントを監視する。
   * IntersectionObserver は見出しの可視状態変化時にも更新をトリガーする。
   */
  function initBreadcrumbUpdater() {
    const onScroll = () => updateBreadcrumb();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });

    const observer = new IntersectionObserver(
      () => updateBreadcrumb(),
      { threshold: 0 }
    );
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => observer.observe(h));
  }

  mpo.updateBreadcrumb = updateBreadcrumb;
  mpo.initBreadcrumbUpdater = initBreadcrumbUpdater;
  mpo._breadcrumbInitialized = true;
})();
