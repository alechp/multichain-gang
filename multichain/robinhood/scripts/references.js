(() => {
  'use strict';
  const SCOPE = window.SCOPE;
  const data = SCOPE?.data;
  if (!data) return;
  const escape = SCOPE.escapeHTML;
  const hovercard = document.getElementById('hovercard');
  const hoverContent = hovercard.querySelector('.hover-content');
  let hoverTimer = 0;

  const sourceAnchor = sourceId => {
    const source = data.sources[sourceId];
    const url = SCOPE.safeUrl(source?.url);
    return url ? `<a href="${escape(url)}" target="_blank" rel="noopener">SOURCE ↗</a>` : '<span>SOURCE UNAVAILABLE</span>';
  };

  const positionCard = trigger => {
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(390, innerWidth - 22);
    const left = Math.max(11, Math.min(innerWidth - width - 11, rect.left));
    hovercard.style.left = `${left}px`;
    hovercard.style.top = `${Math.min(innerHeight - Math.min(460, hovercard.offsetHeight || 330) - 11, rect.bottom + 8)}px`;
  };

  const openTerm = (id, trigger) => {
    const term = data.terms[id];
    if (!term) return false;
    const source = data.sources[term.sourceId];
    hoverContent.innerHTML = `<p class="ref-meta">REFERENCE · CONFIRMED · CHECKED ${escape(source?.checked || '2026-08-31')}</p><h3>${escape(term.term)}</h3><p>${escape(term.definition)}</p><p><b>WHY IT MATTERS</b><br>${escape(term.why)}</p><div class="ref-actions"><a href="#/e/${escape(term.entity)}">OPEN CHANNEL</a>${sourceAnchor(term.sourceId)}</div>`;
    SCOPE.Overlay.open(hovercard, trigger, { modal: false });
    positionCard(trigger);
    return true;
  };

  const termify = root => {
    const aliases = Object.entries(data.terms).flatMap(([id, term]) => term.aliases.map(alias => ({ id, alias }))).sort((a, b) => b.alias.length - a.alias.length);
    const used = new Set([...root.querySelectorAll('[data-term]')].map(node => node.dataset.term));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('a, button, code, pre, svg, h1, h2, h3, h4, [data-no-termify], .panel-head')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const match = aliases.find(item => !used.has(item.id) && node.nodeValue.toLowerCase().includes(item.alias.toLowerCase()));
      if (!match) continue;
      const index = node.nodeValue.toLowerCase().indexOf(match.alias.toLowerCase());
      const before = node.nodeValue.slice(0, index), value = node.nodeValue.slice(index, index + match.alias.length), after = node.nodeValue.slice(index + match.alias.length);
      const fragment = document.createDocumentFragment();
      fragment.append(before);
      const span = document.createElement('dfn');
      span.dataset.term = match.id;
      span.tabIndex = 0;
      span.setAttribute('role', 'button');
      span.setAttribute('aria-label', `${value}, open definition`);
      span.textContent = value;
      fragment.append(span, after);
      node.replaceWith(fragment);
      used.add(match.id);
    }
  };
  termify(document.getElementById('main'));
  document.querySelectorAll('[data-term]').forEach(node => {
    node.tabIndex = node.tabIndex < 0 ? 0 : node.tabIndex;
    node.setAttribute('role', 'button');
    node.addEventListener('pointerenter', () => { hoverTimer = window.setTimeout(() => openTerm(node.dataset.term, node), 180); });
    node.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
    node.addEventListener('focus', () => { hoverTimer = window.setTimeout(() => openTerm(node.dataset.term, node), 180); });
    node.addEventListener('click', event => { event.preventDefault(); clearTimeout(hoverTimer); openTerm(node.dataset.term, node); });
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTerm(node.dataset.term, node); } });
  });
  hovercard.querySelector('.hover-close').addEventListener('click', () => SCOPE.Overlay.close(hovercard));
  document.addEventListener('pointerdown', event => {
    if (SCOPE.Overlay.isOpen(hovercard) && !event.target.closest('#hovercard') && !event.target.closest('[data-term]')) SCOPE.Overlay.close(hovercard, { restore: false });
  });

  const shell = document.getElementById('routeShell');
  const title = document.getElementById('routeTitle');
  const kind = document.getElementById('routeKind');
  const body = document.getElementById('routeBody');
  let previousTitle = document.title;
  let previousHash = '#top';
  let previousScroll = 0;
  let routeTrigger = null;

  const sourceList = ids => `<div class="source-list">${ids.map(id => {
    const source = data.sources[id];
    if (!source) return '';
    const url = SCOPE.safeUrl(source.url);
    return url ? `<a href="${escape(url)}" target="_blank" rel="noopener"><b>${escape(source.title)} ↗</b><span>${escape(source.publisher)} · ${escape(source.kind)} · checked ${escape(source.checked)}</span></a>` : `<p>${escape(source.title)} · unsafe URL suppressed</p>`;
  }).join('')}</div>`;

  const renderEntity = id => {
    const entity = data.entities[id];
    if (!entity) return false;
    kind.textContent = `${entity.kind.toUpperCase()} · ${id}`;
    title.textContent = entity.name;
    body.innerHTML = `<p class="route-lead">${escape(entity.tagline)}</p>${entity.body.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}<h3>Primary evidence</h3>${sourceList(entity.sourceIds)}<h3>Reading boundary</h3><p>This channel is educational, read-only, and dated 2026-08-31. A documented integration is not proof of liquidity, uptime, safety, or endorsement.</p>`;
    return true;
  };
  const renderMethodology = () => {
    kind.textContent = 'METHODOLOGY · EVIDENCE CONTRACT'; title.textContent = 'What the instrument knows';
    body.innerHTML = `<p class="route-lead">Every load-bearing statement is confirmed, derived, inferred, a documented absence, not documented, conflicted, or volatile.</p><table><thead><tr><th>State</th><th>Rendering rule</th></tr></thead><tbody><tr><td>CONFIRMED</td><td>Current primary documentation supports the claim.</td></tr><tr><td>DERIVED</td><td>Formula and confirmed inputs are visible.</td></tr><tr><td>INFERENCE</td><td>Architectural consequence, explicitly labelled.</td></tr><tr><td>DOCUMENTED ABSENCE</td><td>Official docs explicitly say the feature is absent.</td></tr><tr><td>NOT DOCUMENTED</td><td>Research found no official statement; never collapsed to none.</td></tr><tr><td>CONFLICTED</td><td>Suppressed from headline use until reconciled.</td></tr><tr><td>VOLATILE</td><td>Dated and refreshed before release.</td></tr></tbody></table><h3>Four-clock policy</h3><p>Soft, posted, and final are transaction stages. Canonical withdrawal is a separate challenge-and-claim process. Cross-chain rows name the exact milestone instead of comparing unqualified “finality.”</p><h3>Known unknowns</h3><ul><li>Sequencer geography, queue limits, throttling, and detailed outage behavior.</li><li>Pending-transaction visibility by provider and private route.</li><li>Production MEV prevalence, liquidity, maker concentration, and bridge inventory.</li><li>Dynamic Stock Token jurisdiction, registry, oracle addresses, and venue deployment.</li></ul><h3>Independence</h3><p>${escape(document.querySelector('.independence').textContent)}</p>`;
  };
  const renderSources = () => {
    kind.textContent = 'SOURCE LEDGER · 2026-08-31'; title.textContent = 'Primary evidence';
    body.innerHTML = `<p>${Object.keys(data.sources).length} first-party, protocol-primary, standard, repository, and status records support the instrument. Operational values are rechecked before release.</p>${sourceList(Object.keys(data.sources))}`;
  };
  const renderArticles = () => {
    kind.textContent = 'CHAIN INDEX · ROBINHOOD CHAIN'; title.textContent = 'Read the control planes';
    body.innerHTML = `<p>Five Robinhood-first reading paths deepen the main instrument without changing its baseline.</p><div class="article-list">${Object.entries(data.articles).map(([id, article]) => `<a href="#/e/${escape(article.entity)}"><b>${escape(article.title)}</b><span>${escape(article.summary)}</span></a>`).join('')}</div>`;
  };
  const renderTools = () => {
    kind.textContent = 'TOOLS · VERIFIED TEACHING SUBSET'; title.textContent = 'Robinhood Chain landscape';
    body.innerHTML = `<p>The CH-05 bench is organized by market function. It is not a recommendation, market-share claim, or proof of deployment liquidity.</p><table><thead><tr><th>Function</th><th>Surface</th><th>Evidence</th></tr></thead><tbody>${data.tools.map(tool => `<tr><td>${escape(tool.function)}</td><td><a href="#/e/${escape(tool.entity)}">${escape(tool.name)}</a></td><td>${escape(tool.evidence)} · ${escape(tool.checked)}</td></tr>`).join('')}</tbody></table><p><a href="../solana/#/tools/robinhood-chain">Open the verified 17-category landscape in Solana Scope →</a></p>`;
  };
  const renderChains = () => {
    kind.textContent = 'CHAIN ATLAS · SIX SYSTEMS'; title.textContent = 'Same axes, different guarantees';
    body.innerHTML = `<p>Robinhood Chain stays fixed as the baseline. No composite score or winner is produced.</p><div class="entity-index">${data.benchCols.map(id => `<a href="${escape(data.sources[data.chains[id].sourceId].url)}"><b>${escape(data.chains[id].name)} ↗</b><span>${escape(data.chains[id].topology[0])}</span></a>`).join('')}</div>`;
  };
  const renderNotFound = path => { kind.textContent = 'ROUTE NOT FOUND'; title.textContent = 'Nothing at this coordinate'; body.innerHTML = `<p>No local research channel matches <code>${escape(path)}</code>.</p><p><a href="#top">Return to the main instrument</a> or <button type="button" data-open-command>search local records</button>.</p>`; };

  const openRoute = (path, trigger = routeTrigger) => {
    const parts = path.replace(/^#\//, '').split('/');
    let rendered = false;
    if (parts[0] === 'e' && parts[1]) rendered = renderEntity(parts.slice(1).join('/'));
    else if (parts[0] === 'methodology') { renderMethodology(); rendered = true; }
    else if (parts[0] === 'sources') { renderSources(); rendered = true; }
    else if (parts[0] === 'c' && parts[1] === 'robinhood-chain') { renderArticles(); rendered = true; }
    else if (parts[0] === 'tools' && parts[1] === 'robinhood-chain') { renderTools(); rendered = true; }
    else if (parts[0] === 'chains') { renderChains(); rendered = true; }
    if (!rendered) renderNotFound(path);
    previousTitle = SCOPE.Overlay.isOpen(shell) ? previousTitle : document.title;
    document.title = `${title.textContent} — Robinhood Scope · Multichain Gang`;
    SCOPE.Overlay.open(shell, trigger, { modal: true });
    shell.scrollTop = 0;
    SCOPE.announce(`${title.textContent} route opened`);
    return rendered;
  };

  const closeRoute = () => {
    document.title = previousTitle;
    SCOPE.Overlay.close(shell);
    requestAnimationFrame(() => scrollTo(0, previousScroll));
  };
  const handleHash = () => {
    if (location.hash.startsWith('#/')) openRoute(location.hash);
    else if (SCOPE.Overlay.isOpen(shell)) closeRoute();
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#/"]');
    if (!link) return;
    event.preventDefault();
    routeTrigger = link;
    previousHash = location.hash && !location.hash.startsWith('#/') ? location.hash : '#top';
    previousScroll = scrollY;
    history.pushState({ scopeRoute: true }, '', link.getAttribute('href'));
    handleHash();
  });
  document.querySelectorAll('[data-close-route]').forEach(button => button.addEventListener('click', () => {
    if (history.state?.scopeRoute) history.back();
    else location.hash = previousHash;
  }));
  addEventListener('popstate', handleHash);
  if (location.hash.startsWith('#/')) { previousScroll = 0; openRoute(location.hash, null); }

  SCOPE.Router = { open: path => { previousHash = location.hash || '#top'; previousScroll = scrollY; history.pushState({ scopeRoute: true }, '', path.startsWith('#/') ? path : `#/${path}`); handleHash(); }, close: closeRoute };
  SCOPE.termify = termify;
})();
