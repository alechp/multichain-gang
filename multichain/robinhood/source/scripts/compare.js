(() => {
  'use strict';

  const app = window.RobinhoodSource;
  if (!app) return;
  const { store, utils } = app;
  const { q, el, fragment, shortSha } = utils;
  const state = { axisId: 'ingress-ordering', systemId: 'solana' };
  const FROZEN_AXES = new Set(['ingress-ordering', 'fast-propagation', 'execution-contention', 'fee-data-cost', 'assurance-reorg']);
  const FROZEN_SYSTEMS = new Set(['robinhood', 'solana', 'bitcoin', 'ethereum', 'bnb', 'zcash']);

  const idOf = record => typeof record === 'string' ? record : (record?.id || record?.axisId || record?.systemId);
  const labelOf = record => typeof record === 'string' ? record : (record?.label || record?.name || record?.title || idOf(record));
  const axis = id => store.comparisons?.axes.find(record => idOf(record) === id);
  const system = id => store.comparisons?.systems.find(record => idOf(record) === id);
  const cell = (systemId, axisId) => store.comparisons?.cells.find(record => record.systemId === systemId && record.axisId === axisId);
  const pretty = value => String(value || '').replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase());
  const safeHttps = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch (error) {
      return null;
    }
  };

  const pathsNode = paths => {
    const list = el('ul', { className: 'compare-paths' });
    (Array.isArray(paths) ? paths : []).forEach(path => {
      const url = safeHttps(path.permalink);
      const text = `${path.path || 'path unavailable'}${path.lineRange ? ` ${path.lineRange}` : ''}`;
      const node = url
        ? el('a', { href: url, text, attrs: { rel: 'noopener noreferrer' }, dataset: { sourceExternal: 'comparison' } })
        : el('span', { text });
      list.append(el('li', {}, [node]));
    });
    if (!list.childNodes.length) list.append(el('li', { text: 'NOT ANALOGOUS · no source path forced into this cell' }));
    return list;
  };

  const field = (term, content) => el('div', {}, [el('dt', { text: term }), el('dd', {}, [typeof content === 'string' ? document.createTextNode(content) : content])]);

  const renderSide = (record, systemRecord, { baseline = false } = {}) => {
    const systemId = idOf(systemRecord) || record?.systemId || 'unknown';
    const analogy = record?.analogy || 'not-documented';
    const article = el('article', {
      className: `compare-side${baseline ? ' baseline' : ''}`,
      dataset: { systemId, axisId: state.axisId }
    });
    article.append(
      el('span', { text: `${baseline ? 'FIXED BASELINE' : pretty(analogy)} · ${labelOf(systemRecord) || pretty(systemId)}` }),
      el('h3', { text: labelOf(systemRecord) || pretty(systemId) }),
      el('p', { text: record?.mechanism || 'NOT DOCUMENTED · No reviewed source mechanism is registered for this cell.' }),
      el('dl', {}, [
        field('Source', pathsNode(record?.paths)),
        field('Commit', shortSha(record?.commit)),
        field('Measure', Array.isArray(record?.measure) && record.measure.length ? record.measure.join(' · ') : 'No measurement consequence registered.'),
        field('Caveat', record?.caveat || 'No production configuration can be inferred from this client path.')
      ])
    );
    return article;
  };

  const render = () => {
    const baselineCell = cell('robinhood', state.axisId);
    const counterpartCell = cell(state.systemId, state.axisId);
    const baseline = renderSide(baselineCell, system('robinhood') || { id: 'robinhood', name: 'Robinhood' }, { baseline: true });
    baseline.id = 'compareBaseline';
    const counterpart = renderSide(counterpartCell, system(state.systemId) || { id: state.systemId, name: pretty(state.systemId) });
    counterpart.id = 'compareCounterpart';
    const connector = el('div', { className: 'compare-link', attrs: { 'aria-hidden': 'true' } }, [el('span', { text: 'COMPARE' })]);
    q('#compareStage').replaceChildren(baseline, connector, counterpart);
    q('#compareStage').dataset.axisId = state.axisId;
    q('#compareStage').dataset.systemId = state.systemId;
    q('#axisSelect').value = state.axisId;
    q('#systemSelect').value = state.systemId;
    app.status(`${labelOf(axis(state.axisId)) || pretty(state.axisId)}: Robinhood compared with ${labelOf(system(state.systemId)) || pretty(state.systemId)}. No rank is implied.`);
  };

  const populateControls = () => {
    const axisSelect = q('#axisSelect');
    const systemSelect = q('#systemSelect');
    if (store.comparisons?.axes?.length) {
      axisSelect.replaceChildren(...store.comparisons.axes.map(record => el('option', { value: idOf(record), text: labelOf(record) })));
    }
    const counterparts = store.comparisons?.systems?.filter(record => idOf(record) !== 'robinhood') || [];
    if (counterparts.length) {
      systemSelect.replaceChildren(...counterparts.map(record => el('option', { value: idOf(record), text: labelOf(record) })));
    }
    if (![...axisSelect.options].some(option => option.value === state.axisId)) state.axisId = axisSelect.options[0]?.value || 'ingress-ordering';
    if (![...systemSelect.options].some(option => option.value === state.systemId)) state.systemId = systemSelect.options[0]?.value || 'solana';
    axisSelect.value = state.axisId;
    systemSelect.value = state.systemId;
  };

  const handleRoute = route => {
    const known = store.comparisons?.axes.some(record => idOf(record) === route.axisId) ?? FROZEN_AXES.has(route.axisId);
    if (!known) return false;
    state.axisId = route.axisId;
    render();
    q('#cross-chain-source').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return true;
  };

  q('#axisSelect').addEventListener('change', event => {
    if (!FROZEN_AXES.has(event.target.value) && !store.comparisons?.axes.some(record => idOf(record) === event.target.value)) return;
    state.axisId = event.target.value;
    app.navigate(`#/compare/${state.axisId}`);
  });
  q('#systemSelect').addEventListener('change', event => {
    if (!FROZEN_SYSTEMS.has(event.target.value) && !store.comparisons?.systems.some(record => idOf(record) === event.target.value)) return;
    state.systemId = event.target.value;
    render();
    requestAnimationFrame(() => q('#systemSelect').focus({ preventScroll: true }));
  });

  app.listen('core-ready', event => {
    if (!event.detail.available || !store.comparisons) return;
    populateControls();
    render();
  });
  app.listen('registration', event => {
    if (event.detail.type === 'comparisons') { populateControls(); render(); }
  });

  if (store.comparisons) { populateControls(); render(); }

  window.RobinhoodSourceCompare = Object.freeze({ handleRoute, render, get state() { return state; } });
})();
