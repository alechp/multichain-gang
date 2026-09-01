(() => {
  'use strict';

  const app = window.RobinhoodSource;
  if (!app) return;
  const { store, utils } = app;
  const { q, qa, el, fragment, shortSha, formatCount, registrationKey } = utils;
  const state = {
    repoId: null,
    selectedPath: null,
    focusedPath: null,
    expanded: new Set(),
    temporaryVisible: new Set(),
    showAll: false,
    category: '',
    evidence: '',
    query: '',
    renderedRows: 0,
    typeahead: '',
    typeaheadTimer: 0
  };

  const persistViewState = () => {
    const query = state.query.length < 120 ? state.query : '';
    history.replaceState({
      ...(history.state || {}),
      sourceTree: { query, category: state.category, evidence: state.evidence, showAll: state.showAll }
    }, '', location.href);
  };

  const restoreViewState = historyState => {
    const view = historyState?.sourceTree;
    if (!view) return;
    state.query = typeof view.query === 'string' && view.query.length < 120 ? view.query : '';
    state.category = typeof view.category === 'string' ? view.category : '';
    state.evidence = typeof view.evidence === 'string' ? view.evidence : '';
    state.showAll = Boolean(view.showAll);
    q('#sourceSearch').value = state.query;
    q('#categorySelect').value = state.category;
    q('#evidenceSelect').value = state.evidence;
    q('#showAllCategories').setAttribute('aria-pressed', String(state.showAll));
    renderRepositories();
    renderTree();
    if (state.query.length >= 2) runSearch();
  };

  const repository = id => store.repositories.get(id || state.repoId);
  const currentManifest = () => store.manifests.get(state.repoId);
  const directory = path => store.directories.get(registrationKey(state.repoId, path || ''));
  const repoLabel = record => record ? `${record.owner}/${record.name}` : 'Unknown repository';
  const evidenceLabel = value => String(value || 'unreviewed').replaceAll('-', ' ');
  const groupLabel = group => typeof group === 'string' ? group : (group?.label || group?.name || group?.id || 'OTHER REVIEWED SOURCE');
  const repoGroupId = record => record.groupId || record.group || record.evidenceTier || 'other';

  const updateCount = () => {
    q('#visibleCount').textContent = formatCount(state.renderedRows);
    q('#totalCount').textContent = formatCount(repository()?.counts?.entries || 0);
  };

  const populateRepoSelect = () => {
    const select = q('#repoSelect');
    const previous = select.value;
    const first = select.options[0];
    select.replaceChildren(first);
    store.repositories.forEach(record => {
      select.append(el('option', { value: record.id, text: `${record.owner}/${record.name}` }));
    });
    select.value = store.repositories.has(previous) ? previous : (state.repoId || '');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const orderedGroups = () => {
    const definitions = Array.isArray(store.catalog?.repositoryGroups) ? store.catalog.repositoryGroups : [];
    const groupMap = new Map();
    definitions.forEach((definition, index) => {
      const id = typeof definition === 'string' ? definition : definition?.id;
      if (id) groupMap.set(id, { definition, order: Number(definition?.order ?? index) });
    });
    store.repositories.forEach(record => {
      const id = repoGroupId(record);
      if (!groupMap.has(id)) groupMap.set(id, { definition: { id, label: id }, order: groupMap.size + 100 });
    });
    return [...groupMap.entries()].sort((a, b) => a[1].order - b[1].order);
  };

  const renderRepositories = () => {
    const target = q('#repoGroups');
    const groups = [];
    orderedGroups().forEach(([groupId, descriptor]) => {
      const records = [...store.repositories.values()].filter(record => repoGroupId(record) === groupId && (!state.evidence || record.evidenceState === state.evidence));
      if (!records.length) return;
      const section = el('section', { className: 'repo-group', dataset: { repoGroup: groupId } });
      section.append(el('h4', { text: groupLabel(descriptor.definition) }));
      records.forEach(record => {
        const button = el('button', {
          className: 'repo-row',
          type: 'button',
          dataset: { repoId: record.id },
          attrs: { 'aria-pressed': String(record.id === state.repoId) }
        }, [
          el('span', { className: 'repo-name', text: `${record.owner}/${record.name}` }),
          el('span', { className: 'repo-count', text: formatCount(record.counts?.entries) }),
          el('span', { className: 'repo-meta' }, [
            el('span', { text: shortSha(record.revision?.commit) }),
            el('span', { text: evidenceLabel(record.evidenceState) }),
            el('span', { text: record.license?.spdx || 'license unconfirmed' })
          ])
        ]);
        button.addEventListener('click', () => selectRepository(record.id, { navigate: true, focusTree: true }));
        section.append(button);
      });
      groups.push(section);
    });
    target.replaceChildren(groups.length ? fragment(groups) : el('p', { className: 'authored-state', text: 'No repositories match the current evidence filter.' }));
  };

  const resolveShardSources = (manifest, path) => {
    const mapping = manifest.directoryToShard || {};
    const directoryRecord = directory(path);
    const key = directoryRecord?.directoryKey || findLoadedEntry(path)?.key || (path === '' ? manifest.rootKey : null);
    const mapped = mapping[path] ?? (key ? mapping[key] : null);
    const references = Array.isArray(mapped) ? mapped : [mapped];
    const sources = references.filter(Boolean).map(reference => {
      if (typeof reference === 'string' && reference.startsWith('data/')) return reference;
      return manifest.shards.find(candidate => candidate.id === reference || candidate.src === reference)?.src || null;
    }).filter(Boolean);
    if (sources.length) return [...new Set(sources)];
    return manifest.shards.filter(candidate => candidate.directoryKeys?.includes(key)).map(candidate => candidate.src).filter(Boolean);
  };

  const loadManifest = async repoId => {
    if (store.manifests.has(repoId)) return store.manifests.get(repoId);
    app.status(`Loading pinned manifest for ${repoLabel(repository(repoId))}…`);
    await app.loadScript(`data/trees/${repoId}/manifest.js`);
    const manifest = store.manifests.get(repoId);
    if (!manifest) throw new Error(`manifest registration missing for ${repoId}`);
    return manifest;
  };

  const loadDirectory = async path => {
    const existing = directory(path);
    if (existing && Number(existing.loadedPageCount ?? 1) >= Number(existing.pageCount ?? 1)) return existing;
    const manifest = currentManifest();
    if (!manifest) throw new Error(`manifest not loaded for ${state.repoId}`);
    const sources = resolveShardSources(manifest, path);
    if (!sources.length) throw new Error(`no shard maps directory ${path || '<root>'}`);
    q('#sourceTree').setAttribute('aria-busy', 'true');
    app.status(`Loading ${path || 'repository root'} from the local snapshot…`);
    try {
      await Promise.all(sources.map(source => app.loadScript(source)));
      const loaded = directory(path);
      if (!loaded) throw new Error(`shard did not register directory ${path || '<root>'}`);
      if (Number(loaded.loadedPageCount ?? 1) !== Number(loaded.pageCount ?? 1)) throw new Error(`directory ${path || '<root>'} registered ${loaded.loadedPageCount || 1} of ${loaded.pageCount || 1} pages`);
      return loaded;
    } finally {
      q('#sourceTree').setAttribute('aria-busy', 'false');
    }
  };

  const isHidden = entry => {
    if (state.showAll || state.temporaryVisible.has(entry.path)) return false;
    if (state.category === 'all') return false;
    if (state.category) return entry.category !== state.category;
    return Boolean(entry.hiddenByDefault);
  };

  const entriesFor = path => {
    const shard = directory(path);
    if (!shard) return [];
    return shard.entries.filter(entry => !isHidden(entry));
  };

  const findLoadedEntry = path => {
    for (const shard of store.directories.values()) {
      if (shard.repoId !== state.repoId) continue;
      const match = shard.entries.find(entry => entry.path === path);
      if (match) return match;
    }
    return null;
  };

  const nodeFor = (entry, level, position, setSize) => {
    const selected = state.selectedPath === entry.path;
    const focused = state.focusedPath === entry.path || (!state.focusedPath && position === 1 && level === 1);
    const isTree = entry.kind === 'tree';
    const button = el('button', {
      className: 'tree-node',
      type: 'button',
      dataset: {
        treePath: entry.path,
        kind: entry.kind,
        hotspot: String([...store.highlights.values()].some(record => record.repoId === state.repoId && record.path === entry.path))
      },
      attrs: {
        role: 'treeitem',
        tabindex: focused ? '0' : '-1',
        'aria-level': String(level),
        'aria-posinset': String(position),
        'aria-setsize': String(setSize),
        'aria-selected': String(selected),
        ...(isTree ? { 'aria-expanded': String(state.expanded.has(entry.path)) } : {})
      },
      style: `--depth:${level - 1}`
    }, [
      el('span', { className: 'tree-twist', attrs: { 'aria-hidden': 'true' } }),
      el('span', { className: 'tree-label', text: entry.name || entry.path.split('/').pop() }),
      el('span', { className: 'tree-category', text: entry.kind === 'gitlink' ? 'gitlink' : entry.category })
    ]);
    button.addEventListener('click', () => activateEntry(entry));
    button.addEventListener('focus', () => { state.focusedPath = entry.path; });
    const wrapper = el('div', { attrs: { role: 'none' } }, [button]);
    state.renderedRows += 1;
    if (isTree && state.expanded.has(entry.path) && state.renderedRows < 1200) {
      const children = entriesFor(entry.path);
      if (children.length) {
        const group = el('div', { attrs: { role: 'group' } });
        children.forEach((child, index) => {
          if (state.renderedRows < 1200) group.append(nodeFor(child, level + 1, index + 1, children.length));
        });
        wrapper.append(group);
      } else if (!directory(entry.path)) {
        wrapper.append(el('div', { className: 'tree-state', text: 'Directory shard not loaded.', attrs: { role: 'status' } }));
      }
    }
    return wrapper;
  };

  const renderTree = ({ focusPath = null } = {}) => {
    const target = q('#sourceTree');
    state.renderedRows = 0;
    if (!state.repoId) {
      target.replaceChildren(el('div', { className: 'tree-state', text: 'Choose a repository to load its pinned root.', attrs: { role: 'treeitem', tabindex: '0' } }));
      updateCount();
      return;
    }
    const root = directory('');
    if (!root) {
      target.replaceChildren(el('div', { className: 'tree-state', text: 'SHARD UNAVAILABLE · The repository root has not registered.', attrs: { role: 'treeitem', tabindex: '0' }, dataset: { sourceError: 'missing-root' } }));
      updateCount();
      return;
    }
    const entries = entriesFor('');
    if (!entries.length) {
      target.replaceChildren(el('div', { className: 'tree-state', text: 'No visible paths. Show all categories or clear the category filter.', attrs: { role: 'treeitem', tabindex: '0' } }));
      updateCount();
      return;
    }
    if (!state.focusedPath || !findLoadedEntry(state.focusedPath) || isHidden(findLoadedEntry(state.focusedPath))) state.focusedPath = entries[0].path;
    const rootGroup = el('div', { attrs: { role: 'group' } });
    entries.forEach((entry, index) => {
      if (state.renderedRows < 1200) rootGroup.append(nodeFor(entry, 1, index + 1, entries.length));
    });
    target.replaceChildren(rootGroup);
    updateCount();
    if (state.renderedRows >= 1200) app.status('Tree row limit reached. Collapse a directory or narrow the category before expanding more.');
    if (focusPath) q(`[data-tree-path="${CSS.escape(focusPath)}"]`, target)?.focus({ preventScroll: true });
  };

  const expandDirectory = async (path, { focusChild = false } = {}) => {
    try {
      await loadDirectory(path);
      state.expanded.add(path);
      renderTree();
      if (focusChild) {
        const parent = q(`[data-tree-path="${CSS.escape(path)}"]`);
        const next = parent?.parentElement?.querySelector('[role="group"] .tree-node');
        if (next) { state.focusedPath = next.dataset.treePath; renderTree({ focusPath: state.focusedPath }); }
      }
      app.status(`Expanded ${path}.`);
      return true;
    } catch (error) {
      app.showError('SHARD UNAVAILABLE', `${error.message}. Static chapters remain available; no live GitHub fallback was attempted.`);
      return false;
    }
  };

  const collapseDirectory = path => {
    const focusedWasDescendant = state.focusedPath?.startsWith(`${path}/`);
    state.expanded.delete(path);
    if (focusedWasDescendant) state.focusedPath = path;
    renderTree({ focusPath: focusedWasDescendant ? path : null });
  };

  const selectEntry = (entry, { navigate = true } = {}) => {
    state.selectedPath = entry.path;
    state.focusedPath = entry.path;
    renderTree({ focusPath: entry.path });
    if (entry.kind === 'gitlink' && entry.targetRepoId && store.repositories.has(entry.targetRepoId)) {
      selectRepository(entry.targetRepoId, { navigate: true, focusTree: true });
      return;
    }
    const highlight = [...store.highlights.values()].find(record => record.repoId === state.repoId && record.path === entry.path);
    if (highlight && window.RobinhoodSourceInspector) window.RobinhoodSourceInspector.showHighlight(highlight);
    else window.RobinhoodSourceInspector?.showBlob(entry, repository());
    if (navigate) app.navigate(`#/repo/${state.repoId}/path/${encodeURIComponent(entry.path)}`);
  };

  const activateEntry = async entry => {
    if (entry.kind === 'tree') {
      if (state.expanded.has(entry.path)) collapseDirectory(entry.path);
      else await expandDirectory(entry.path);
    } else selectEntry(entry);
  };

  const selectRepository = async (repoId, { navigate = false, focusTree = false } = {}) => {
    if (!store.repositories.has(repoId)) return false;
    state.repoId = repoId;
    state.selectedPath = null;
    state.focusedPath = null;
    state.expanded.clear();
    state.temporaryVisible.clear();
    q('#repoSelect').value = repoId;
    q('#repoSelect').dispatchEvent(new Event('change', { bubbles: true }));
    renderRepositories();
    try {
      await loadManifest(repoId);
      await loadDirectory('');
      renderTree({ focusPath: focusTree ? entriesFor('')[0]?.path : null });
      loadSearch(repoId).catch(() => {});
      app.status(`Pinned tree ready for ${repoLabel(repository())}.`);
      if (navigate) app.navigate(`#/repo/${repoId}`);
      return true;
    } catch (error) {
      renderTree();
      app.showError('SHARD UNAVAILABLE', `${error.message}. Retry by selecting the repository again.`);
      return false;
    }
  };

  const expandAncestorsAndSelect = async (path, { navigate = true } = {}) => {
    const parts = path.split('/');
    let current = '';
    for (let index = 0; index < parts.length - 1; index += 1) {
      current = current ? `${current}/${parts[index]}` : parts[index];
      state.temporaryVisible.add(current);
      const ok = await expandDirectory(current);
      if (!ok) return false;
    }
    const entry = findLoadedEntry(path);
    if (!entry) return false;
    state.temporaryVisible.add(path);
    selectEntry(entry, { navigate });
    return true;
  };

  const visibleTreeButtons = () => qa('.tree-node', q('#sourceTree'));
  const focusButton = button => {
    if (!button) return;
    state.focusedPath = button.dataset.treePath;
    visibleTreeButtons().forEach(node => node.tabIndex = node === button ? 0 : -1);
    button.focus({ preventScroll: true });
  };

  const onTreeKeydown = async event => {
    const button = event.target.closest('.tree-node');
    if (!button) return;
    const buttons = visibleTreeButtons();
    const index = buttons.indexOf(button);
    const entry = findLoadedEntry(button.dataset.treePath);
    if (!entry) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusButton(buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusButton(event.key === 'Home' ? buttons[0] : buttons[buttons.length - 1]);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (entry.kind === 'tree' && !state.expanded.has(entry.path)) await expandDirectory(entry.path, { focusChild: false });
      else if (entry.kind === 'tree') focusButton(button.parentElement.querySelector('[role="group"] .tree-node'));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (entry.kind === 'tree' && state.expanded.has(entry.path)) collapseDirectory(entry.path);
      else {
        const parentPath = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : null;
        if (parentPath) focusButton(q(`[data-tree-path="${CSS.escape(parentPath)}"]`, q('#sourceTree')));
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      await activateEntry(entry);
    } else if (event.key === '*') {
      event.preventDefault();
      const parent = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '';
      const siblings = entriesFor(parent).filter(candidate => candidate.kind === 'tree');
      for (const sibling of siblings) await expandDirectory(sibling.path);
      renderTree({ focusPath: entry.path });
    } else if (event.key.length === 1 && /[\p{L}\p{N}_.-]/u.test(event.key)) {
      clearTimeout(state.typeaheadTimer);
      state.typeahead += event.key.toLocaleLowerCase();
      state.typeaheadTimer = setTimeout(() => { state.typeahead = ''; }, 650);
      const ordered = buttons.slice(index + 1).concat(buttons.slice(0, index + 1));
      const match = ordered.find(candidate => candidate.querySelector('.tree-label')?.textContent.toLocaleLowerCase().startsWith(state.typeahead));
      if (match) focusButton(match);
    }
  };

  const loadSearch = async repoId => {
    if (store.searches.has(repoId)) return store.searches.get(repoId);
    await app.loadScript(`data/search/${repoId}.js`, { optional: true });
    return store.searches.get(repoId) || null;
  };

  const fuzzyScore = (record, query) => {
    const path = String(record.path || '').toLocaleLowerCase();
    const symbols = Array.isArray(record.symbols) ? record.symbols.map(value => String(value).toLocaleLowerCase()) : [];
    if (path.startsWith(query)) return 0;
    if (symbols.some(symbol => symbol === query || symbol.startsWith(query))) return 1;
    if (path.includes(query)) return 2;
    if (symbols.some(symbol => symbol.includes(query))) return 3;
    let cursor = 0;
    for (const character of path) if (character === query[cursor]) cursor += 1;
    return cursor === query.length ? 4 : Infinity;
  };

  const appendMarkedPath = (container, path, query) => {
    const lower = path.toLocaleLowerCase();
    const index = lower.indexOf(query);
    if (index < 0) { container.textContent = path; return; }
    container.append(document.createTextNode(path.slice(0, index)), el('mark', { text: path.slice(index, index + query.length) }), document.createTextNode(path.slice(index + query.length)));
  };

  const runSearch = async () => {
    const query = state.query.trim().toLocaleLowerCase();
    const panel = q('#searchResults');
    const list = q('#searchResultList');
    if (query.length < 2) { panel.hidden = true; list.replaceChildren(); return; }
    const repoIds = state.repoId ? [state.repoId] : [...store.repositories.keys()];
    const indexes = (await Promise.all(repoIds.map(id => loadSearch(id).catch(() => null)))).filter(Boolean);
    const matches = [];
    indexes.forEach(index => index.records.forEach(record => {
      if (state.category && state.category !== 'all' && record.category !== state.category) return;
      const score = fuzzyScore(record, query);
      if (Number.isFinite(score)) matches.push({ ...record, repoId: index.repoId, score });
    }));
    matches.sort((a, b) => a.score - b.score || repoIds.indexOf(a.repoId) - repoIds.indexOf(b.repoId) || String(a.path).localeCompare(String(b.path), 'en'));
    const total = matches.length;
    const nodes = matches.slice(0, 100).map(match => {
      const path = el('span', { className: 'search-result-path' });
      appendMarkedPath(path, match.path, query);
      const button = el('button', { className: 'search-result', type: 'button', dataset: { repoId: match.repoId, treePath: match.path } }, [
        path,
        el('span', { className: 'search-result-meta', text: `${match.category || match.kind} · ${match.repoId}` })
      ]);
      button.addEventListener('click', async () => {
        await selectRepository(match.repoId);
        state.temporaryVisible.add(match.path);
        const ok = await expandAncestorsAndSelect(match.path);
        if (!ok) app.showError('UNKNOWN ROUTE', `The indexed path ${match.path} was not found in registered directory shards.`);
        panel.hidden = true;
      });
      return el('li', {}, [button]);
    });
    list.replaceChildren(nodes.length ? fragment(nodes) : el('li', {}, [el('p', { className: 'authored-state', text: 'NO SEARCH RESULTS · Try a path segment, symbol, or different category.' })]));
    panel.hidden = false;
    panel.querySelector('strong').textContent = nodes.length ? `SEARCH RESULTS · ${nodes.length} OF ${total}` : 'NO SEARCH RESULTS';
    app.status(nodes.length ? `${total} local path and symbol matches.` : 'No local search results.');
  };

  let searchTimer = 0;
  const initControls = () => {
    q('#sourceTree').addEventListener('keydown', onTreeKeydown);
    q('#repoSelect').addEventListener('change', event => {
      const id = event.target.value;
      if (id && id !== state.repoId) selectRepository(id, { navigate: true });
    });
    q('#evidenceSelect').addEventListener('change', event => { state.evidence = event.target.value; renderRepositories(); persistViewState(); });
    q('#categorySelect').addEventListener('change', event => {
      state.category = event.target.value;
      state.showAll = state.category === 'all';
      q('#showAllCategories').setAttribute('aria-pressed', String(state.showAll));
      renderTree();
      if (state.query.length >= 2) runSearch();
      persistViewState();
    });
    q('#showAllCategories').addEventListener('click', event => {
      state.showAll = event.currentTarget.getAttribute('aria-pressed') !== 'true';
      event.currentTarget.setAttribute('aria-pressed', String(state.showAll));
      if (state.showAll) q('#categorySelect').value = 'all';
      else { state.category = ''; q('#categorySelect').value = ''; }
      q('#categorySelect').dispatchEvent(new Event('change', { bubbles: true }));
      renderTree();
    });
    q('#sourceSearch').addEventListener('input', event => {
      state.query = event.target.value.slice(0, 120);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 90);
      persistViewState();
    });
    q('[data-clear-search]').addEventListener('click', () => {
      state.query = '';
      q('#sourceSearch').value = '';
      q('#searchResults').hidden = true;
      q('#searchResultList').replaceChildren();
      q('#sourceSearch').focus();
      persistViewState();
    });
  };

  const onCoreReady = async event => {
    if (!event.detail.available) return;
    populateRepoSelect();
    renderRepositories();
    const pinned = [...store.repositories.values()].find(record => record.deploymentEquivalence === 'public-node-build-pin') || [...store.repositories.values()].find(record => record.owner === 'OffchainLabs' && record.name === 'nitro') || [...store.repositories.values()][0];
    const parsed = location.hash.startsWith('#/') ? location.hash : '';
    if (!parsed && pinned) await selectRepository(pinned.id);
  };

  const handleRoute = route => {
    if (!store.repositories.has(route.repoId)) return false;
    (async () => {
      await selectRepository(route.repoId);
      if (route.kind === 'path') {
        const ok = await expandAncestorsAndSelect(route.path, { navigate: false });
        if (!ok) app.showError('UNKNOWN ROUTE', `Path ${route.path} is not present in the pinned tree.`);
      }
      q('#source-workbench').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    })();
    return true;
  };

  initControls();
  addEventListener('popstate', event => restoreViewState(event.state));
  app.listen('core-ready', onCoreReady);
  app.listen('registration', event => {
    if (event.detail.type === 'catalog') { populateRepoSelect(); renderRepositories(); }
    if (event.detail.type === 'directory' && event.detail.payload?.repoId === state.repoId) renderTree();
  });

  if (store.catalog) onCoreReady({ detail: { available: true } });

  window.RobinhoodSourceTree = Object.freeze({ handleRoute, selectRepository, expandAncestorsAndSelect, renderTree, get state() { return state; } });
})();
