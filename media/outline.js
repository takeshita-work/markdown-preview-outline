(function () {
  'use strict';

  // acquireVsCodeApi は一度だけ呼べる
  const vscode = acquireVsCodeApi();

  // 設定は data 属性またはデフォルト値から読み込む
  // package.json の contributes.configuration で定義された値は
  // プレビューHTML の <meta> タグ経由では取得できないため、
  // outline.js 側ではデフォルト値を使い、extension.ts から
  // postMessage で設定を受け取る方式にする
  let config = {
    position: 'right',
    maxLevel: 6,
  };

  // --- DOM 構築 ---

  const sidebar = document.createElement('div');
  sidebar.id = 'markdown-outline-sidebar';
  sidebar.className = `markdown-outline-sidebar position-${config.position}`;

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

  sidebar.appendChild(toggleBtn);
  sidebar.appendChild(nav);

  // body に追加するのは DOMContentLoaded 後
  function mountSidebar() {
    if (!document.getElementById('markdown-outline-sidebar')) {
      document.body.appendChild(sidebar);
    }
  }

  // --- アウトライン描画 ---

  function buildOutline() {
    nav.innerHTML = '';

    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).filter((el) => {
      const level = parseInt(el.tagName[1], 10);
      return level <= config.maxLevel;
    });

    if (headings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'markdown-outline-empty';
      empty.textContent = 'No headings';
      nav.appendChild(empty);
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'markdown-outline-list';

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1], 10);
      const li = document.createElement('li');
      li.className = `markdown-outline-item level-${level}`;
      li.style.paddingLeft = `${(level - 1) * 12}px`;

      const a = document.createElement('a');
      a.href = '#';
      a.className = 'markdown-outline-link';
      a.textContent = heading.textContent || '';
      a.setAttribute('data-heading-id', heading.id || '');

      // クリック: プレビューをスクロール & 拡張ホストに通知
      a.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToHeading(heading);
        notifyRevealLine(heading);
      });

      li.appendChild(a);
      ul.appendChild(li);
    });

    nav.appendChild(ul);
  }

  function scrollToHeading(heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function notifyRevealLine(heading) {
    // VS Code のマークダウンプレビューは各要素に data-line 属性を付与する
    const lineAttr = heading.getAttribute('data-line');
    if (lineAttr !== null) {
      const line = parseInt(lineAttr, 10);
      if (!isNaN(line)) {
        vscode.postMessage({ type: 'revealLine', line });
      }
    }
  }

  // --- 開閉トグル ---

  let collapsed = false;

  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar.classList.toggle('collapsed', collapsed);
    toggleBtn.setAttribute('aria-pressed', String(collapsed));
  });

  // --- コンテンツ更新の監視 ---

  // VS Code のマークダウンプレビューは内容更新時にカスタムイベントを発火する
  // (vscode.markdown.updateContent は内部名。実際には MutationObserver を使う)
  function observeContentChanges() {
    const previewBody = document.querySelector('.markdown-body') || document.body;

    const observer = new MutationObserver(() => {
      buildOutline();
    });

    observer.observe(previewBody, {
      childList: true,
      subtree: true,
    });
  }

  // --- 設定の受信 ---

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || !message.type) return;

    if (message.type === 'updateConfig') {
      if (message.config) {
        if (message.config.position) {
          sidebar.classList.remove(`position-${config.position}`);
          config.position = message.config.position;
          sidebar.classList.add(`position-${config.position}`);
        }
        if (typeof message.config.maxLevel === 'number') {
          config.maxLevel = message.config.maxLevel;
          buildOutline();
        }
      }
    }
  });

  // --- 初期化 ---

  function init() {
    mountSidebar();
    buildOutline();
    observeContentChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
