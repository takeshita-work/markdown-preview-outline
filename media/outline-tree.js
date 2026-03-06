/**
 * outline-tree.js — アウトラインのツリー構築・描画
 *
 * プレビュー内の見出し要素（h1〜h6）を階層ツリーに変換し、
 * ナビゲーション DOM として描画する。折りたたみトグル・
 * サブツリー一括操作・全体折りたたみの機能を含む。
 *
 * 公開 API (window._mpo):
 *   scrollToHeading — 見出し要素へスムーズスクロール
 *   buildOutline    — アウトラインを再構築して nav に描画
 */
(function () {
  'use strict';

  const mpo = window._mpo;

  if (!mpo || mpo._treeInitialized) return;

  /**
   * 平坦な見出し要素配列を親子関係のあるツリー構造に変換する。
   * スタックを用いた O(n) アルゴリズムで、見出しレベルの増減に対応する。
   * @param {HTMLElement[]} headings - DOM 順の見出し要素配列
   * @returns {{ heading: HTMLElement, level: number, children: object[] }[]} ルートノードの配列
   */
  function buildTree(headings) {
    const root = [];
    const stack = [];
    for (const heading of headings) {
      const level = parseInt(heading.tagName[1], 10);
      const node = { heading, level, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      if (stack.length === 0) {
        root.push(node);
      } else {
        stack[stack.length - 1].children.push(node);
      }
      stack.push(node);
    }
    return root;
  }

  /**
   * 指定した見出し要素までスムーズスクロールする。
   * @param {HTMLElement} heading - スクロール先の見出し要素
   */
  function scrollToHeading(heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * 見出し要素の data-line 属性を読み取り、拡張ホストに revealLine メッセージを送信する。
   * data-line がない場合や VS Code API が取得できない場合は何もしない。
   * @param {HTMLElement} heading - 対象の見出し要素
   */
  function notifyRevealLine(heading) {
    const lineAttr = heading.getAttribute('data-line');
    if (lineAttr !== null) {
      const line = parseInt(lineAttr, 10);
      if (!isNaN(line) && mpo.vscode) {
        mpo.vscode.postMessage({ type: 'revealLine', line });
      }
    }
  }

  /**
   * 見出し要素に対応するアウトラインリンク（<a>）を生成する。
   * クリック時にプレビュースクロールと revealLine 通知を行う。
   * ターゲットの特定には data-line 属性（優先）または要素 ID を使用する。
   * @param {HTMLElement} heading - 対応する見出し要素
   * @returns {HTMLAnchorElement}
   */
  function makeHeadingLink(heading) {
    const a = document.createElement('a');
    a.className = 'markdown-outline-link';
    a.textContent = heading.textContent || '';
    const lineAttr = heading.getAttribute('data-line');
    if (lineAttr !== null) a.setAttribute('data-line', lineAttr);
    a.setAttribute('data-heading-id', heading.id || '');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetLine = a.getAttribute('data-line');
      const targetId = a.getAttribute('data-heading-id');
      let target = null;
      if (targetLine !== null) target = document.querySelector(`[data-line="${targetLine}"]`);
      if (!target && targetId) target = document.getElementById(targetId);
      if (target) {
        scrollToHeading(target);
        notifyRevealLine(target);
      }
    });
    return a;
  }

  /**
   * 指定した <li> とその子孫すべてに折りたたみ状態を適用する。
   * 子を持たないリーフノードはスキップする。
   * @param {HTMLLIElement} rootLi - 操作対象のルート <li> 要素
   * @param {boolean} collapsed - true で折りたたみ、false で展開
   */
  function setSubtreeCollapsed(rootLi, collapsed) {
    [rootLi, ...rootLi.querySelectorAll('.markdown-outline-item')].forEach((item) => {
      if (!item.querySelector(':scope > .markdown-outline-children')) return;
      item.classList.toggle('collapsed', collapsed);
      const icon = item.querySelector(':scope > .markdown-outline-item-row > .markdown-outline-item-toggle');
      if (icon) icon.textContent = collapsed ? '▸' : '▾';
    });
  }

  /**
   * ツリーノードの配列を再帰的に <li> へ変換し、指定の <ul> に追加する。
   * 子ノードを持つ場合は折りたたみトグルとサブツリー操作ボタンも生成する。
   * @param {{ heading: HTMLElement, level: number, children: object[] }[]} nodes
   * @param {HTMLUListElement} ul - ノードを追加する <ul> 要素
   */
  function buildOutlineNodes(nodes, ul) {
    nodes.forEach(({ heading, level, children }) => {
      const li = document.createElement('li');
      li.className = `markdown-outline-item level-${level}`;

      const row = document.createElement('div');
      row.className = 'markdown-outline-item-row';

      const icon = document.createElement('span');
      icon.className = 'markdown-outline-item-toggle';
      if (children.length > 0) {
        icon.textContent = '▾';
        icon.addEventListener('click', (e) => {
          e.stopPropagation();
          const collapsed = li.classList.toggle('collapsed');
          icon.textContent = collapsed ? '▸' : '▾';
        });
      } else {
        icon.classList.add('leaf');
      }

      row.appendChild(icon);
      row.appendChild(makeHeadingLink(heading));

      if (children.length > 0) {
        const actions = document.createElement('span');
        actions.className = 'markdown-outline-item-actions';

        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'markdown-outline-item-action-btn';
        collapseBtn.textContent = '−';
        collapseBtn.title = 'Collapse all';
        collapseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setSubtreeCollapsed(li, true);
        });

        const expandBtn = document.createElement('button');
        expandBtn.className = 'markdown-outline-item-action-btn';
        expandBtn.textContent = '+';
        expandBtn.title = 'Expand all';
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setSubtreeCollapsed(li, false);
        });

        actions.appendChild(collapseBtn);
        actions.appendChild(expandBtn);
        row.appendChild(actions);
      }

      li.appendChild(row);

      if (children.length > 0) {
        const childUl = document.createElement('ul');
        childUl.className = 'markdown-outline-list markdown-outline-children';
        buildOutlineNodes(children, childUl);
        li.appendChild(childUl);
      }

      ul.appendChild(li);
    });
  }

  /**
   * nav 内のすべてのアイテムを一括で折りたたみ／展開する。
   * 子を持たないリーフノードはスキップする。
   * @param {boolean} collapsed - true で全折りたたみ、false で全展開
   */
  function setAllCollapsed(collapsed) {
    mpo.nav.querySelectorAll('.markdown-outline-item').forEach((li) => {
      if (!li.querySelector('.markdown-outline-children')) return;
      li.classList.toggle('collapsed', collapsed);
      const icon = li.querySelector(':scope > .markdown-outline-item-row > .markdown-outline-item-toggle');
      if (icon) icon.textContent = collapsed ? '▸' : '▾';
    });
  }

  /**
   * nav をクリアして現在の見出し要素からアウトラインを再構築する。
   * config.maxLevel を超えるレベルの見出しとサイドバー内の見出しは除外する。
   * 見出しが 0 件の場合は「No headings」メッセージを表示する。
   */
  function buildOutline() {
    const { nav, sidebar, config } = mpo;
    nav.innerHTML = '';

    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).filter((el) => {
      const level = parseInt(el.tagName[1], 10);
      return level <= config.maxLevel && !sidebar.contains(el);
    });

    if (headings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'markdown-outline-empty';
      empty.textContent = 'No headings';
      nav.appendChild(empty);
      return;
    }

    // 一括操作ボタン
    const navHeader = document.createElement('div');
    navHeader.className = 'markdown-outline-nav-header';
    const collapseAllBtn = document.createElement('button');
    collapseAllBtn.className = 'markdown-outline-collapse-all';
    collapseAllBtn.textContent = '−';
    collapseAllBtn.title = 'Collapse all';
    let allCollapsed = false;
    collapseAllBtn.addEventListener('click', () => {
      allCollapsed = !allCollapsed;
      setAllCollapsed(allCollapsed);
      collapseAllBtn.textContent = allCollapsed ? '+' : '−';
      collapseAllBtn.title = allCollapsed ? 'Expand all' : 'Collapse all';
    });
    navHeader.appendChild(collapseAllBtn);
    nav.appendChild(navHeader);

    const tree = buildTree(headings);
    const ul = document.createElement('ul');
    ul.className = 'markdown-outline-list';
    buildOutlineNodes(tree, ul);
    nav.appendChild(ul);
  }

  /**
   * nav をアクティブリンクが見えるようにスクロールする。
   * リンクがすでに表示範囲内にある場合はスクロールしない。
   * 表示範囲外の場合は、リンクの上に MARGIN_TOP px の余白を付けてスクロールする。
   * @param {HTMLAnchorElement} link - スクロール先のリンク要素
   */
  function scrollNavToActiveLink(link) {
    const nav = mpo.nav;
    const marginTop = nav.clientHeight * 0.25;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    nav.scrollTop = nav.scrollTop + linkRect.top - navRect.top - marginTop;
  }

  /**
   * 指定した見出し要素群に対応するアウトラインリンクにアクティブクラスを付与する。
   * パンくずに表示される全レベルの見出しを受け取り、それぞれのリンクに付与する。
   * 以前のアクティブ項目からはクラスを除去する。
   * 最も深いアクティブリンクが表示されるよう nav を自動スクロールする。
   * data-line 属性を優先し、なければ data-heading-id で照合する。
   * @param {HTMLElement[]} headings - アクティブにする見出し要素の配列（空配列で全解除）
   */
  function updateOutlineActive(headings) {
    mpo.nav.querySelectorAll('.markdown-outline-link.active').forEach((el) => {
      el.classList.remove('active');
    });
    if (!headings || headings.length === 0) return;
    let deepestLink = null;
    headings.forEach((heading) => {
      const lineAttr = heading.getAttribute('data-line');
      const headingId = heading.id;
      let link = null;
      if (lineAttr !== null) {
        link = mpo.nav.querySelector(`.markdown-outline-link[data-line="${lineAttr}"]`);
      }
      if (!link && headingId) {
        link = mpo.nav.querySelector(`.markdown-outline-link[data-heading-id="${headingId}"]`);
      }
      if (link) {
        link.classList.add('active');
        deepestLink = link;
      }
    });
    if (deepestLink) scrollNavToActiveLink(deepestLink);
  }

  mpo.scrollToHeading = scrollToHeading;
  mpo.buildOutline = buildOutline;
  mpo.updateOutlineActive = updateOutlineActive;
  mpo._treeInitialized = true;
})();
