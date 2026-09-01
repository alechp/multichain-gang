(() => {
  'use strict';
  const SCOPE = window.SCOPE;
  const data = SCOPE?.data;
  if (!data) return;
  const escape = SCOPE.escapeHTML;
  const defaults = { topology: 'sol', txflow: 'eth', mev: 'sol', latency: 'bnb' };
  const selected = SCOPE.Store.create('scope.robinhood.compare.v1', defaults).get() || defaults;

  const sourceLink = chain => {
    const source = data.sources[data.chains[chain].sourceId];
    const url = SCOPE.safeUrl(source?.url);
    return url ? `<a href="${escape(url)}">${escape(source.title)} ↗</a>` : escape(source?.title || 'Source unavailable');
  };

  const renderDock = (dock, chainId) => {
    const section = dock.dataset.section;
    const chain = data.chains[chainId];
    const base = data.chains.robinhood_chain;
    if (!chain || !base) return false;
    selected[section] = chainId;
    SCOPE.Store.create('scope.robinhood.compare.v1', defaults).set(selected);
    dock.dataset.active = chainId;
    dock.querySelectorAll('[role="tab"]').forEach(tab => {
      const active = tab.dataset.chain === chainId;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    const rows = data.sectionMetrics[section].map((label, index) => `<tr><th scope="row">${escape(label)}</th><td class="baseline">${escape(base[section][index])}</td><td>${escape(chain[section][index])}</td></tr>`).join('');
    dock.querySelector('.compare-content').innerHTML = `<div class="compare-head"><article class="compare-system"><span>FIXED BASELINE</span><h3>Robinhood Chain</h3></article><article class="compare-system"><span>SELECTED SYSTEM</span><h3>${escape(chain.name)}</h3></article></div><table class="compare-table"><caption class="sr-only">${escape(section)} comparison between Robinhood Chain and ${escape(chain.name)}</caption><tbody>${rows}</tbody></table><p class="delta-strip"><b>ROBINHOOD-FIRST DELTA</b><br>${escape(data.deltas[section][chainId])}<span class="source-stamp">CHECKED 2026-08-31 · ${sourceLink('robinhood_chain')} · ${sourceLink(chainId)}</span></p>`;
    SCOPE.announce(`${section} comparison: Robinhood Chain and ${chain.name}`);
    return true;
  };

  const openDock = (section, chainId = selected[section] || defaults[section]) => {
    const dock = document.querySelector(`.compare-dock[data-section="${section}"]`);
    if (!dock) return false;
    const body = dock.querySelector('.dock-body');
    body.hidden = false;
    dock.querySelector('.dock-toggle').setAttribute('aria-expanded', 'true');
    dock.querySelector('.dock-toggle b').textContent = 'CLOSE ↑';
    return renderDock(dock, chainId);
  };
  const closeDock = section => {
    const dock = document.querySelector(`.compare-dock[data-section="${section}"]`);
    if (!dock) return false;
    dock.querySelector('.dock-body').hidden = true;
    dock.querySelector('.dock-toggle').setAttribute('aria-expanded', 'false');
    dock.querySelector('.dock-toggle b').textContent = 'OPEN ↓';
    return true;
  };

  document.querySelectorAll('.compare-dock').forEach(dock => {
    const section = dock.dataset.section;
    const tabs = dock.querySelector('.chain-tabs');
    tabs.innerHTML = data.chainOrder.map((id, index) => `<button type="button" role="tab" data-chain="${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${escape(data.chains[id].name)}</button>`).join('');
    dock.querySelector('.dock-toggle').addEventListener('click', () => dock.querySelector('.dock-body').hidden ? openDock(section) : closeDock(section));
    tabs.addEventListener('click', event => {
      const tab = event.target.closest('[data-chain]');
      if (tab) renderDock(dock, tab.dataset.chain);
    });
    tabs.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-chain]');
      if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const all = [...tabs.querySelectorAll('[role="tab"]')];
      let index = all.indexOf(tab);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = all.length - 1;
      else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
      all[index].focus(); renderDock(dock, all[index].dataset.chain);
    });
  });

  const grid = document.querySelector('.technique-grid');
  const detail = document.getElementById('detailPop');
  const chainLabel = id => data.chains[id].name;
  if (grid) {
    grid.querySelector('thead').innerHTML = `<tr><th scope="col">TECHNIQUE</th>${data.benchCols.map(id => `<th scope="col">${escape(chainLabel(id))}</th>`).join('')}</tr>`;
    grid.querySelector('tbody').innerHTML = data.techniques.map(technique => `<tr><th scope="row">${escape(technique.name)}</th>${data.benchCols.map(chain => `<td><button type="button" class="state-${technique.cells[chain]}" data-technique="${technique.id}" data-chain="${chain}" aria-label="${escape(technique.name)}, ${escape(chainLabel(chain))}: ${technique.cells[chain]}">${technique.cells[chain]}</button></td>`).join('')}</tr>`).join('');
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-technique]');
      if (!button) return;
      const technique = data.techniques.find(item => item.id === button.dataset.technique);
      const chain = chainLabel(button.dataset.chain);
      detail.querySelector('div').innerHTML = `<p class="ref-meta">${escape(chain)} · ${escape(technique.cells[button.dataset.chain].toUpperCase())}</p><h3>${escape(technique.name)}</h3><p>${escape(technique.note)}</p><div class="ref-actions"><a href="#/e/${escape(technique.entity)}">OPEN CHANNEL</a></div>`;
      detail.dataset.placement = innerWidth >= 700 ? 'anchored' : 'sheet';
      if (innerWidth >= 700) {
        const rect = button.getBoundingClientRect();
        detail.style.left = `${Math.max(10, Math.min(innerWidth - 400, rect.left))}px`;
        detail.style.top = `${Math.min(innerHeight - 330, rect.bottom + 8)}px`;
      }
      SCOPE.Overlay.open(detail, button, { modal: false });
    });
  }
  detail?.querySelector('.detail-close')?.addEventListener('click', () => SCOPE.Overlay.close(detail));

  const gridOpen = (techniqueId, chainId) => {
    const button = grid?.querySelector(`[data-technique="${techniqueId}"][data-chain="${chainId}"]`);
    if (!button) return false;
    button.click();
    return true;
  };

  const functionSelect = document.getElementById('benchFunction');
  const functions = [...new Set(data.tools.map(tool => tool.function))];
  functions.forEach(value => functionSelect?.insertAdjacentHTML('beforeend', `<option value="${escape(value)}">${escape(value)}</option>`));
  const toolGrid = document.getElementById('toolGrid');
  const filters = { chain: document.getElementById('benchChain'), function: functionSelect, evidence: document.getElementById('benchEvidence') };
  const renderTools = () => {
    const visible = data.tools.filter(tool => (filters.chain.value === 'all' || tool.chain === filters.chain.value) && (filters.function.value === 'all' || tool.function === filters.function.value) && (filters.evidence.value === 'all' || tool.evidence === filters.evidence.value));
    toolGrid.innerHTML = visible.map(tool => `<article class="tool-card ${tool.evidence === 'not-documented' ? 'is-absence' : ''}"><span class="tool-function">${escape(tool.function)}</span><h3>${escape(tool.name)}</h3><span class="tool-evidence">${escape(tool.evidence.toUpperCase())} · ${escape(tool.checked)}</span><p>${escape(tool.description)}</p><div class="tokens">${tool.risks.map(risk => `<span>${escape(risk)}</span>`).join('')}</div><a href="#/e/${escape(tool.entity)}">DETAILS →</a></article>`).join('') || '<p class="tool-card">No records match this evidence filter.</p>';
    document.getElementById('benchCount').textContent = `${visible.length} / ${data.tools.length} RECORDS`;
    SCOPE.announce(`${visible.length} tool records shown`);
    return visible.length;
  };
  Object.values(filters).forEach(control => control?.addEventListener('change', renderTools));
  document.getElementById('benchReset')?.addEventListener('click', () => { filters.chain.value = 'robinhood_chain'; filters.function.value = 'all'; filters.evidence.value = 'all'; renderTools(); filters.chain.focus(); });
  renderTools();

  const filterBench = chain => {
    const value = typeof chain === 'string' ? chain : chain?.chain;
    if (!filters.chain || ![...filters.chain.options].some(option => option.value === value)) return false;
    filters.chain.value = value; renderTools(); return true;
  };

  SCOPE.Runtime.openDock = openDock;
  SCOPE.Runtime.closeDock = closeDock;
  SCOPE.Runtime.openGridCell = gridOpen;
  SCOPE.Runtime.filterBench = filterBench;
})();
