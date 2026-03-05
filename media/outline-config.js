/**
 * outline-config.js — 設定の読み込み・反映
 *
 * 最初に読み込まれるモジュール。以下を担当する:
 * - 共有名前空間 window._mpo の初期化
 * - acquireVsCodeApi() の呼び出し（1 回限り）
 * - config.css に書き出された CSS 変数からユーザー設定を読み取る
 * - 設定変更時の差分適用（applyConfig）
 * - config.css の動的再読み込み（reloadConfigCss）
 *
 * 公開 API (window._mpo):
 *   vscode            — VS Code メッセージング API
 *   config             — 現在の設定オブジェクト { position, maxLevel, showBreadcrumb, scrollSyncOffset }
 *   readConfigFromCss  — CSS 変数から設定を再読み込みする関数
 *   reloadConfigCss    — config.css を動的 <link> で再取得する関数
 *   applyConfig        — 新しい設定を差分適用する関数
 */
(function () {
  'use strict';

  const mpo = window._mpo = {};

  // acquireVsCodeApi は一度だけ呼べる
  try { mpo.vscode = acquireVsCodeApi(); } catch (_) { mpo.vscode = null; }

  /**
   * :root の CSS 変数から現在のユーザー設定を読み取り、設定オブジェクトを返す。
   * config.css が更新されるたびに呼び出して最新値を取得する。
   * @returns {{ position: string, maxLevel: number, showBreadcrumb: boolean, scrollSyncOffset: number }}
   */
  function readConfigFromCss() {
    const style = getComputedStyle(document.documentElement);
    const position = style.getPropertyValue('--outline-config-position').trim();
    const maxLevel = parseInt(style.getPropertyValue('--outline-config-max-level').trim(), 10);
    const showBreadcrumbRaw = style.getPropertyValue('--outline-config-show-breadcrumb').trim();
    const scrollSyncOffset = parseInt(style.getPropertyValue('--outline-config-scroll-sync-offset').trim(), 10);
    return {
      position: position === 'left' ? 'left' : 'right',
      maxLevel: isNaN(maxLevel) ? 6 : Math.max(1, Math.min(6, maxLevel)),
      showBreadcrumb: showBreadcrumbRaw === '' ? true : showBreadcrumbRaw !== '0',
      scrollSyncOffset: isNaN(scrollSyncOffset) ? 5 : Math.max(0, Math.min(20, scrollSyncOffset)),
    };
  }

  /**
   * config.css をタイムスタンプ付き URL で動的 <link> 要素として再読み込みする。
   * ブラウザキャッシュを回避するため既存の <link> を削除してから新規作成する。
   * @param {(() => void) | undefined} callback - ロード完了（またはエラー）後に呼ぶコールバック
   */
  function reloadConfigCss(callback) {
    const ourScript = Array.from(document.querySelectorAll('script[src]'))
      .find((s) => s.src && s.src.includes('outline-config.js'));
    if (!ourScript) { if (callback) callback(); return; }

    const configUrl = ourScript.src.replace(/outline-config\.js([^/]*)$/, 'config.css') + '?t=' + Date.now();

    const existing = document.getElementById('outline-config-css');
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.id = 'outline-config-css';
    link.rel = 'stylesheet';
    link.href = configUrl;
    link.addEventListener('load', () => { if (callback) callback(); });
    link.addEventListener('error', () => { if (callback) callback(); });
    document.head.appendChild(link);
  }

  /**
   * 新しい設定オブジェクトと現在の設定を比較し、変更のあった項目だけ差分適用する。
   * position 変更時はサイドバーのクラスと body マージンを更新し、
   * maxLevel 変更時はアウトラインを再構築、showBreadcrumb 変更時はパンくずを更新する。
   * @param {{ position?: string, maxLevel?: number, showBreadcrumb?: boolean }} newConfig
   */
  function applyConfig(newConfig) {
    const { sidebar, breadcrumb } = mpo;
    if (newConfig.position !== mpo.config.position) {
      sidebar.classList.remove(`position-${mpo.config.position}`);
      mpo.config.position = newConfig.position;
      sidebar.classList.add(`position-${mpo.config.position}`);
      if (!mpo.collapsed) mpo.updateBodyMargin(sidebar.offsetWidth);
    }
    if (newConfig.maxLevel !== mpo.config.maxLevel) {
      mpo.config.maxLevel = newConfig.maxLevel;
      mpo.buildOutline();
    }
    if (newConfig.showBreadcrumb !== mpo.config.showBreadcrumb) {
      mpo.config.showBreadcrumb = newConfig.showBreadcrumb;
      if (!mpo.config.showBreadcrumb) {
        breadcrumb.hidden = true;
      } else {
        mpo.updateBreadcrumb();
      }
    }
  }

  mpo.config = readConfigFromCss();
  mpo.readConfigFromCss = readConfigFromCss;
  mpo.reloadConfigCss = reloadConfigCss;
  mpo.applyConfig = applyConfig;
})();
