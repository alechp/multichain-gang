(() => {
  'use strict';

  const SCHEMA_VERSION = 1;
  const CORE_DATA = Object.freeze([
    'data/catalog.js',
    'data/highlights.js',
    'data/comparisons.js',
    'data/artifacts.js',
    'data/build.js'
  ]);
  const EVIDENCE_STATES = new Set([
    'confirmed', 'version-pinned', 'upstream-reference',
    'integration-reference', 'documented-absence', 'not-public',
    'conflicted', 'volatile', 'comparison-only'
  ]);

  const events = new EventTarget();
  const store = {
    catalog: null,
    repositories: new Map(),
    highlights: new Map(),
    comparisons: null,
    artifacts: new Map(),
    build: null,
    manifests: new Map(),
    directories: new Map(),
    directoryPages: new Map(),
    searches: new Map(),
    loadedScripts: new Map(),
    registrationErrors: []
  };

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const emit = (name, detail = {}) => events.dispatchEvent(new CustomEvent(name, { detail }));
  const listen = (name, handler, options) => events.addEventListener(name, handler, options);
  const shortSha = value => typeof value === 'string' && value.length > 10 ? `${value.slice(0, 10)}…` : (value || 'unresolved');
  const formatCount = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US').format(Number(value)) : '—';
  const normalizeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(value) ? value : null;
  const safeText = value => value == null ? '' : String(value);
  const isEvidenceState = value => EVIDENCE_STATES.has(value);
  const fragment = (...nodes) => {
    const output = document.createDocumentFragment();
    nodes.flat(Infinity).filter(Boolean).forEach(node => output.append(node));
    return output;
  };
  const el = (tag, options = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
      if (value == null) return;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = safeText(value);
      else if (key === 'dataset') Object.entries(value).forEach(([name, dataValue]) => { node.dataset[name] = safeText(dataValue); });
      else if (key === 'attrs') Object.entries(value).forEach(([name, attrValue]) => node.setAttribute(name, safeText(attrValue)));
      else node[key] = value;
    });
    children.flat(Infinity).filter(Boolean).forEach(child => node.append(typeof child === 'string' ? document.createTextNode(child) : child));
    return node;
  };

  const status = (message, { error = false, assertive = false } = {}) => {
    const target = error ? q('#sourceAlert') : q('#sourceStatus');
    if (!target) return;
    target.textContent = safeText(message);
    target.hidden = !message;
    if (assertive) target.setAttribute('aria-live', 'assertive');
  };

  const showError = (kind, message) => {
    const label = safeText(kind || 'SOURCE ERROR').toUpperCase();
    const target = q('#sourceAlert');
    if (target) {
      target.replaceChildren(el('strong', { text: label }), document.createTextNode(` · ${safeText(message)}`));
      if (label === 'UNKNOWN ROUTE') {
        target.append(
          document.createTextNode(' '),
          el('a', { href: '#source-workbench', text: 'TREE ROOT' }),
          document.createTextNode(' · '),
          el('a', { href: '../../../docs/robinhood-source/01-REPOSITORY-RESEARCH-LEDGER.md', text: 'RESEARCH LEDGER' })
        );
      }
      target.hidden = false;
      target.setAttribute('aria-live', 'assertive');
    }
    emit('error', { kind: label, message: safeText(message) });
  };

  const clearError = () => status('', { error: true });

  const registrationKey = (repoId, directoryPath) => `${repoId}\u0000${directoryPath || ''}`;

  const rebuildDirectoryAggregate = key => {
    const pages = store.directoryPages.get(key);
    if (!pages?.size) {
      store.directoryPages.delete(key);
      store.directories.delete(key);
      return null;
    }
    const ordered = [...pages.entries()].sort((a, b) => a[0] - b[0]).map(([, page]) => page);
    const expected = Math.max(...ordered.map(page => Number(page.pageCount ?? 1)));
    const aggregate = {
      ...ordered[0],
      pageIndex: 0,
      pageCount: expected,
      loadedPageCount: ordered.length,
      entries: ordered.flatMap(page => page.entries),
      pageDigests: ordered.map(page => page.digest)
    };
    store.directories.set(key, aggregate);
    return aggregate;
  };

  const canonicalDirectoryRecord = record => {
    const { digest, ...base } = record;
    return JSON.stringify(base).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  };

  const sha256Hex = async value => {
    if (!window.crypto?.subtle) throw new Error('Web Crypto unavailable');
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const verifyDirectoryRecord = async (record, key, pageIndex) => {
    let actual = null;
    try {
      actual = await sha256Hex(canonicalDirectoryRecord(record));
    } catch (error) {
      actual = null;
    }
    const expected = typeof record.digest === 'string' && /^[a-f0-9]{64}$/i.test(record.digest) ? record.digest.toLowerCase() : null;
    if (actual && expected && actual === expected) return true;
    const pages = store.directoryPages.get(key);
    if (pages?.get(pageIndex) === record) {
      pages.delete(pageIndex);
      rebuildDirectoryAggregate(key);
    }
    const path = record.directoryPath || '<root>';
    showError('SOURCE CHANGED', `Directory digest mismatch for ${record.repoId}:${path} page ${pageIndex + 1}. The affected page was removed.`);
    emit('directory-invalid', { repoId: record.repoId, directoryPath: record.directoryPath || '', pageIndex });
    return false;
  };

  const acceptCatalog = payload => {
    if (!payload || payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.repositories)) throw new Error('catalog schema mismatch');
    store.catalog = payload;
    store.repositories.clear();
    payload.repositories.forEach(record => {
      const id = normalizeId(record?.id);
      if (!id || store.repositories.has(id)) throw new Error(`duplicate or unsafe repository id: ${safeText(record?.id)}`);
      store.repositories.set(id, record);
    });
  };

  const acceptHighlights = payload => {
    if (!Array.isArray(payload)) throw new Error('highlight payload is not an array');
    payload.forEach(record => {
      const id = normalizeId(record?.id);
      if (!id) throw new Error(`unsafe highlight id: ${safeText(record?.id)}`);
      store.highlights.set(id.toUpperCase(), record);
    });
  };

  const acceptComparisons = payload => {
    if (!payload || payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.systems) || !Array.isArray(payload.axes) || !Array.isArray(payload.cells)) throw new Error('comparison schema mismatch');
    store.comparisons = payload;
  };

  const acceptArtifacts = payload => {
    if (!Array.isArray(payload)) throw new Error('artifact payload is not an array');
    payload.forEach(record => {
      const id = normalizeId(record?.id);
      if (!id) throw new Error(`unsafe artifact id: ${safeText(record?.id)}`);
      store.artifacts.set(id, record);
    });
  };

  const acceptManifest = payload => {
    const id = normalizeId(payload?.repoId);
    if (!id || payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.shards) || !payload.directoryToShard) throw new Error('manifest schema mismatch');
    store.manifests.set(id, payload);
  };

  const acceptDirectories = payload => {
    const records = Array.isArray(payload) ? payload : [payload];
    records.forEach(record => {
      const repoId = normalizeId(record?.repoId);
      if (!repoId || record.schemaVersion !== SCHEMA_VERSION || !Array.isArray(record.entries)) throw new Error('directory schema mismatch');
      const key = registrationKey(repoId, record.directoryPath || '');
      const pageIndex = Number(record.pageIndex ?? 0);
      const pageCount = Number(record.pageCount ?? 1);
      if (!Number.isInteger(pageIndex) || !Number.isInteger(pageCount) || pageIndex < 0 || pageCount < 1 || pageIndex >= pageCount) throw new Error(`invalid directory page for ${record.directoryPath || '<root>'}`);
      const pages = store.directoryPages.get(key) || new Map();
      if (pages.has(pageIndex)) throw new Error(`duplicate directory page ${pageIndex} for ${record.directoryPath || '<root>'}`);
      pages.set(pageIndex, record);
      store.directoryPages.set(key, pages);
      rebuildDirectoryAggregate(key);
      void verifyDirectoryRecord(record, key, pageIndex);
    });
  };

  const acceptSearch = payload => {
    const repoId = normalizeId(payload?.repoId);
    if (!repoId || payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.records)) throw new Error('search schema mismatch');
    store.searches.set(repoId, payload);
  };

  const register = packet => {
    try {
      if (!packet || typeof packet.type !== 'string') throw new Error('registration missing type');
      const type = packet.type.toLowerCase();
      const payload = packet.payload;
      if (type === 'catalog') acceptCatalog(payload);
      else if (type === 'repository' || type === 'repositories') acceptCatalog({ schemaVersion: SCHEMA_VERSION, repositories: Array.isArray(payload) ? payload : [payload] });
      else if (type === 'highlights' || type === 'highlight') acceptHighlights(Array.isArray(payload) ? payload : [payload]);
      else if (type === 'comparisons' || type === 'comparison') acceptComparisons(payload);
      else if (type === 'artifacts' || type === 'artifact') acceptArtifacts(Array.isArray(payload) ? payload : [payload]);
      else if (type === 'manifest') acceptManifest(payload);
      else if (type === 'directory') acceptDirectories(payload);
      else if (type === 'search') acceptSearch(payload);
      else if (type === 'build') store.build = payload;
      else throw new Error(`unknown registration type: ${type}`);
      emit('registration', { type, payload });
      return true;
    } catch (error) {
      store.registrationErrors.push(error.message);
      showError('SOURCE CHANGED', error.message);
      return false;
    }
  };

  const installRegistrationChannel = () => {
    const channel = window.RH_SOURCE = window.RH_SOURCE || { pending: [] };
    const pending = Array.isArray(channel.pending) ? channel.pending : [];
    pending.splice(0).forEach(register);
    pending.push = (...packets) => {
      packets.forEach(register);
      return 0;
    };
    channel.pending = pending;
    channel.register = register;
    return channel;
  };

  const safeLocalScript = source => {
    if (typeof source !== 'string' || !source.startsWith('data/') || source.includes('..') || !source.endsWith('.js')) return null;
    const url = new URL(source, location.href);
    if (url.protocol !== 'file:' && url.origin !== location.origin) return null;
    return url;
  };

  const loadScript = (source, { optional = false } = {}) => {
    const url = safeLocalScript(source);
    if (!url) return Promise.reject(new Error(`unsafe local data path: ${safeText(source)}`));
    if (store.loadedScripts.has(url.href)) return store.loadedScripts.get(url.href);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url.href;
      script.async = false;
      script.dataset.sourceShard = source;
      script.addEventListener('load', () => resolve(source), { once: true });
      script.addEventListener('error', () => {
        store.loadedScripts.delete(url.href);
        const error = new Error(`local snapshot unavailable: ${source}`);
        if (!optional) showError('SHARD UNAVAILABLE', error.message);
        reject(error);
      }, { once: true });
      document.head.append(script);
    });
    store.loadedScripts.set(url.href, promise);
    return promise;
  };

  const isUnlocked = () => document.documentElement.hasAttribute('data-scope-unlocked');
  let coreLoadStarted = false;
  const loadCoreData = async () => {
    if (coreLoadStarted || !isUnlocked()) return;
    coreLoadStarted = true;
    clearError();
    status('Loading authenticated local source catalog…');
    const results = await Promise.allSettled(CORE_DATA.map(source => loadScript(source, { optional: source === 'data/build.js' })));
    const failed = results.filter(result => result.status === 'rejected').length;
    if (!store.catalog) {
      document.body.dataset.dataReady = 'false';
      q('#dataState').textContent = 'STATIC FALLBACK · SNAPSHOT UNAVAILABLE';
      status('Static chapters remain available. The generated source catalog is unavailable in this build.');
      if (failed) showError('SHARD UNAVAILABLE', 'The generated catalog could not be opened; no live network fallback was attempted.');
      emit('core-ready', { available: false });
      return;
    }
    document.body.dataset.dataReady = 'true';
    q('#dataState').textContent = failed ? 'LOCAL SNAPSHOT · PARTIAL OPTIONAL DATA' : 'LOCAL SNAPSHOT · VERIFIED REGISTRATION';
    updateReadouts();
    status(`Loaded ${formatCount(store.repositories.size)} repositories and ${formatCount(store.highlights.size)} reviewed hotspots from local source data.`);
    emit('core-ready', { available: true, failed });
    route();
  };

  const updateReadouts = () => {
    const totals = store.catalog?.totals || {};
    q('#repoReadout').textContent = formatCount(totals.repositories ?? store.repositories.size);
    q('#pathReadout').textContent = formatCount(totals.entries ?? totals.paths ?? store.catalog?.researchSummary?.qualifyingEntries);
    q('#hotspotReadout').textContent = formatCount(store.highlights.size || 13);
  };

  const validDecodedPath = encoded => {
    try {
      const value = decodeURIComponent(encoded || '');
      if (!value || value.length > 4096 || value.startsWith('/') || value.includes('\u0000')) return null;
      const parts = value.split('/');
      if (parts.some(part => part === '..' || part === '')) return null;
      return value;
    } catch (error) {
      return null;
    }
  };

  const parseRoute = () => {
    const hash = location.hash;
    if (!hash || !hash.startsWith('#/')) return { kind: 'document' };
    const parts = hash.slice(2).split('/');
    const kind = parts.shift();
    if (kind === 'repo') {
      const repoId = normalizeId(parts.shift());
      if (!repoId || parts.length === 0) return repoId ? { kind, repoId } : { kind: 'unknown', hash };
      if (parts.shift() !== 'path') return { kind: 'unknown', hash };
      const path = validDecodedPath(parts.join('/'));
      return path ? { kind: 'path', repoId, path } : { kind: 'unknown', hash };
    }
    if (kind === 'hotspot') {
      const hotspotId = normalizeId(parts.join('/'));
      return hotspotId ? { kind, hotspotId: hotspotId.toUpperCase() } : { kind: 'unknown', hash };
    }
    if (kind === 'compare') {
      const axisId = normalizeId(parts.join('/'));
      return axisId ? { kind, axisId } : { kind: 'unknown', hash };
    }
    return { kind: 'unknown', hash };
  };

  const route = () => {
    const parsed = parseRoute();
    if (parsed.kind === 'document') return;
    clearError();
    let handled = false;
    if ((parsed.kind === 'repo' || parsed.kind === 'path') && window.RobinhoodSourceTree) handled = window.RobinhoodSourceTree.handleRoute(parsed);
    else if (parsed.kind === 'hotspot' && window.RobinhoodSourceInspector) handled = window.RobinhoodSourceInspector.handleRoute(parsed);
    else if (parsed.kind === 'compare' && window.RobinhoodSourceCompare) handled = window.RobinhoodSourceCompare.handleRoute(parsed);
    if (!handled) showError('UNKNOWN ROUTE', `No reviewed source record matches ${location.hash || 'this address'}. Return to the tree root or choose H01.`);
  };

  const navigate = (hash, { replace = false } = {}) => {
    if (typeof hash !== 'string' || !hash.startsWith('#/')) return false;
    const url = `${location.pathname}${location.search}${hash}`;
    history[replace ? 'replaceState' : 'pushState']({ ...(history.state || {}), sourceRoute: hash }, '', url);
    route();
    return true;
  };

  const copyLink = async (hash = location.hash) => {
    const canonical = new URL(location.href);
    canonical.hash = hash || '';
    try {
      await navigator.clipboard.writeText(canonical.href);
      status('Canonical source link copied to clipboard.');
      return true;
    } catch (error) {
      status('Clipboard unavailable. Copy the current address from the browser.', { error: false });
      return false;
    }
  };

  const focusable = container => qa('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', container).filter(node => !node.hidden && node.getClientRects().length);
  const overlays = (() => {
    const stack = [];
    const backdrop = () => q('#sourceBackdrop');
    const find = name => q(`[data-source-overlay="${CSS.escape(name)}"]`);
    const current = () => stack[stack.length - 1] || null;
    const close = (name = current()?.name, { restoreFocus = true } = {}) => {
      const index = stack.findIndex(item => item.name === name);
      if (index < 0) return false;
      const item = stack[index];
      stack.splice(index, 1);
      if (item.node instanceof HTMLDialogElement && item.node.open) item.node.close();
      else {
        item.node.dataset.open = 'false';
        item.node.setAttribute('aria-hidden', 'true');
      }
      item.trigger?.setAttribute?.('aria-expanded', 'false');
      const next = current();
      const shade = backdrop();
      if (shade) shade.hidden = !next || next.node instanceof HTMLDialogElement;
      document.body.dataset.overlayOpen = String(Boolean(next));
      if (!next) document.body.removeAttribute('data-overlay-open');
      if (restoreFocus && item.trigger?.isConnected) item.trigger.focus({ preventScroll: true });
      return true;
    };
    const open = (name, trigger = document.activeElement) => {
      const node = find(name);
      if (!node) return false;
      const active = current();
      if (active) close(active.name, { restoreFocus: false });
      const item = { name, node, trigger };
      stack.push(item);
      trigger?.setAttribute?.('aria-expanded', 'true');
      if (node instanceof HTMLDialogElement) {
        if (!node.open) node.showModal();
      } else {
        node.dataset.open = 'true';
        node.setAttribute('aria-hidden', 'false');
        const shade = backdrop();
        if (shade) shade.hidden = false;
      }
      document.body.dataset.overlayOpen = 'true';
      requestAnimationFrame(() => focusable(node)[0]?.focus({ preventScroll: true }));
      emit('overlay-open', { name });
      return true;
    };
    const trap = event => {
      const item = current();
      if (!item || event.key !== 'Tab') return;
      const items = focusable(item.node);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('click', event => {
      const opener = event.target.closest('[data-open-overlay]');
      if (opener) { event.preventDefault(); open(opener.dataset.openOverlay, opener); return; }
      const closer = event.target.closest('[data-close-overlay]');
      if (closer) { event.preventDefault(); close(); }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && current()) { event.preventDefault(); close(); }
      else trap(event);
    });
    q('#sourceBackdrop')?.addEventListener('pointerdown', event => {
      event.preventDefault();
      close();
    });
    q('#linkVeil')?.addEventListener('pointerdown', event => {
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      close('linkVeil');
    });
    return Object.freeze({ open, close, current });
  })();

  const initExternalLinks = () => {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-external], a[data-source-external]');
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.id === 'linkVeilContinue') return;
      let url;
      try { url = new URL(link.href, location.href); } catch (error) { return; }
      if (url.protocol !== 'https:') { event.preventDefault(); showError('OFFLINE EXTERNAL LINK', 'Only reviewed HTTPS destinations may open.'); return; }
      event.preventDefault();
      const veil = q('#linkVeil');
      const continueLink = q('#linkVeilContinue');
      q('#linkVeilDomain').textContent = `${url.hostname}${url.pathname}`;
      continueLink.href = url.href;
      overlays.open('linkVeil', link);
    });
    q('#linkVeilContinue')?.addEventListener('click', () => overlays.close('linkVeil', { restoreFocus: false }));
  };

  const initAuthLifecycle = () => {
    if (isUnlocked()) loadCoreData();
    const observer = new MutationObserver(() => { if (isUnlocked()) loadCoreData(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scope-unlocked'] });
    q('[data-auth-logout]')?.addEventListener('click', () => {
      try { sessionStorage.removeItem('scope.access.v1'); } catch (error) {}
      location.reload();
    });
  };

  const init = () => {
    installRegistrationChannel();
    initExternalLinks();
    initAuthLifecycle();
    addEventListener('hashchange', route);
    addEventListener('popstate', route);
    q('#copySourceLink')?.addEventListener('click', () => copyLink());
    qa('[data-hotspot]').forEach(button => {
      button.dataset.hotspotId = button.dataset.hotspot;
      button.addEventListener('click', () => navigate(`#/hotspot/${button.dataset.hotspot}`));
    });
    route();
    emit('runtime-ready');
  };

  window.RobinhoodSource = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    store,
    events,
    listen,
    emit,
    register,
    loadScript,
    navigate,
    route,
    copyLink,
    showError,
    clearError,
    status,
    overlays,
    utils: Object.freeze({ q, qa, el, fragment, safeText, shortSha, formatCount, normalizeId, isEvidenceState, registrationKey })
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
