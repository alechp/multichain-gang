(() => {
  'use strict';
  const SCOPE = window.SCOPE;
  const data = SCOPE?.data;
  if (!data) return;
  const shell = document.getElementById('commandShell');
  const input = document.getElementById('commandInput');
  const list = document.getElementById('commandResults');
  let active = 0;
  let results = [];

  const records = [
    ...data.sectionOrder.map(id => ({ kind: 'CHANNEL', title: `${data.sectionOf[id].toUpperCase()} · ${id}`, subtitle: data.sectionMetrics[id].join(' · '), target: `#${data.sectionOf[id]}` })),
    ...data.cues.map((cue, index) => ({ kind: 'CUE', title: `${String(index + 1).padStart(2,'0')} · ${cue.note}`, subtitle: cue.anchor, cue: index })),
    ...Object.entries(data.entities).map(([id, entity]) => ({ kind: 'ENTITY', title: entity.name, subtitle: entity.tagline, target: `#/e/${id}` })),
    ...data.tools.map(tool => ({ kind: 'TOOL', title: tool.name, subtitle: `${tool.function} · ${tool.evidence}`, target: `#/e/${tool.entity}` })),
    ...Object.entries(data.terms).map(([id, term]) => ({ kind: 'TERM', title: term.term, subtitle: term.definition, target: `#/e/${term.entity}`, aliases: term.aliases.join(' ') })),
    ...Object.entries(data.articles).map(([, article]) => ({ kind: 'ARTICLE', title: article.title, subtitle: article.summary, target: `#/e/${article.entity}` })),
    ...Object.entries(data.sources).map(([id, source]) => ({ kind: 'SOURCE', title: source.title, subtitle: `${source.publisher} · checked ${source.checked}`, target: '#/sources', aliases: id })),
    { kind: 'METHODOLOGY', title: 'Evidence, clocks, uncertainty, and independence', subtitle: 'Confirmed · inferred · not documented · conflicted · volatile', target: '#/methodology' },
    { kind: 'CHAIN', title: 'Robinhood Chain article index', subtitle: 'Five Robinhood-first reading paths', target: '#/c/robinhood-chain' },
    { kind: 'CHAIN', title: 'Six-system chain atlas', subtitle: 'Robinhood Chain · Solana · Bitcoin · Ethereum · BNB Chain · Zcash', target: '#/chains' }
  ];
  records.forEach((record, index) => { record._index = index; record.search = `${record.title} ${record.subtitle} ${record.aliases || ''}`.toLowerCase(); });

  let fuse = null;
  if (window.Fuse) {
    try { fuse = new window.Fuse(records, { keys: ['title','subtitle','aliases'], threshold: .35, ignoreLocation: true }); } catch { fuse = null; }
  }
  const search = query => {
    const normalized = query.trim().toLowerCase();
    let found = !normalized ? records.slice(0, 18) : fuse ? fuse.search(query, { limit: 30 }).map(item => item.item) : records.filter(record => record.search.includes(normalized)).slice(0, 30);
    found.sort((a, b) => {
      const ar = a.title.toLowerCase().startsWith('robinhood chain') ? -1 : 0;
      const br = b.title.toLowerCase().startsWith('robinhood chain') ? -1 : 0;
      return ar - br || a._index - b._index;
    });
    return found;
  };
  const render = query => {
    results = search(query); active = 0;
    list.innerHTML = results.length ? results.map((record, index) => `<li><button type="button" role="option" aria-selected="${index === 0}" data-result="${index}"><small>${SCOPE.escapeHTML(record.kind)}</small><span><b>${SCOPE.escapeHTML(record.title)}</b><br>${SCOPE.escapeHTML(record.subtitle)}</span></button></li>`).join('') : '<li><p>No local record matched. Try “FCFS”, “BoLD”, “Stock Tokens”, or “finality”.</p></li>';
  };
  const setActive = next => {
    if (!results.length) return;
    active = (next + results.length) % results.length;
    list.querySelectorAll('[role="option"]').forEach((button, index) => button.setAttribute('aria-selected', String(index === active)));
    list.querySelector(`[data-result="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  const open = trigger => {
    render(''); input.value = '';
    SCOPE.Overlay.open(shell, trigger, { modal: true });
  };
  const close = () => SCOPE.Overlay.close(shell);
  const activate = index => {
    const record = results[index];
    if (!record) return;
    close();
    if (Number.isInteger(record.cue)) { SCOPE.Playbar?.pause(); SCOPE.Playbar?.go(record.cue); return; }
    if (record.target.startsWith('#/')) SCOPE.Router.open(record.target);
    else { location.hash = record.target; document.querySelector(record.target)?.focus?.({ preventScroll: true }); }
  };
  document.querySelectorAll('[data-open-command]').forEach(button => button.addEventListener('click', () => open(button)));
  document.querySelector('[data-close-command]').addEventListener('click', close);
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); activate(active); }
  });
  list.addEventListener('mousemove', event => { const button = event.target.closest('[data-result]'); if (button) setActive(Number(button.dataset.result)); });
  list.addEventListener('click', event => { const button = event.target.closest('[data-result]'); if (button) activate(Number(button.dataset.result)); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); SCOPE.Overlay.isOpen(shell) ? close() : open(document.activeElement); }
  });
  SCOPE.Command = { open, close, records };
})();
