(() => {
  'use strict';

  const app = window.RobinhoodSource;
  if (!app) return;
  const { store, utils } = app;
  const { q, qa, el, fragment, safeText, shortSha } = utils;
  const KEYWORDS = new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
    'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
    'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
    'var', 'async', 'await', 'class', 'export', 'extends', 'function', 'let',
    'new', 'throw', 'try', 'catch', 'finally', 'yield', 'public', 'private',
    'contract', 'library', 'modifier', 'event', 'emit', 'require', 'returns',
    'memory', 'storage', 'calldata', 'immutable', 'override', 'virtual', 'view',
    'pure', 'external', 'internal', 'constructor', 'mapping', 'enum', 'using'
  ]);
  const TYPES = new Set([
    'bool', 'byte', 'error', 'int', 'rune', 'string', 'uint', 'uint8', 'uint16',
    'uint32', 'uint64', 'uint128', 'uint256', 'int8', 'int16', 'int32', 'int64',
    'address', 'bytes', 'bytes32', 'number', 'bigint', 'Promise', 'Error'
  ]);
  const state = { highlightId: null, blob: null, wrap: false };

  const repository = id => store.repositories.get(id);
  const repoLabel = record => record ? `${record.owner}/${record.name}` : 'Unknown repository';
  const evidenceLabel = value => String(value || 'upstream-reference').replaceAll('-', ' ').toUpperCase();
  const relationLabel = record => {
    if (record.evidenceState === 'version-pinned') return 'PINNED NODE BUILD';
    if (record.evidenceState === 'confirmed') return 'DEPLOYED INTEGRATION';
    if (record.evidenceState === 'integration-reference') return 'AUTHORITATIVE REFERENCE';
    if (record.evidenceState === 'not-public') return 'NOT PUBLIC';
    return evidenceLabel(record.evidenceState);
  };

  const safeHttps = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch (error) {
      return null;
    }
  };

  const tokenClass = token => {
    if (/^\/\//.test(token) || /^\/\*/.test(token)) return 'tok-comment';
    if (/^["'`]/.test(token)) return 'tok-string';
    if (/^(?:0x[\da-f]+|\d+(?:\.\d+)?)$/i.test(token)) return 'tok-number';
    if (KEYWORDS.has(token)) return 'tok-keyword';
    if (TYPES.has(token) || /^[A-Z][A-Za-z0-9_]*$/.test(token)) return 'tok-type';
    return null;
  };

  const tokenize = (text, language) => {
    const output = document.createDocumentFragment();
    const pattern = /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|0x[\da-fA-F]+|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/gm;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (match.index > cursor) output.append(document.createTextNode(text.slice(cursor, match.index)));
      const value = match[0];
      let className = tokenClass(value);
      const rest = text.slice(pattern.lastIndex);
      if (!className && /^\s*\(/.test(rest) && !KEYWORDS.has(value)) className = 'tok-function';
      output.append(className ? el('span', { className, text: value }) : document.createTextNode(value));
      cursor = pattern.lastIndex;
      if (className === 'tok-comment' && /^\/\//.test(value)) break;
    }
    if (cursor < text.length) output.append(document.createTextNode(text.slice(cursor)));
    return output;
  };

  const renderCode = record => {
    const code = q('#sourceCode');
    const lines = Array.isArray(record.excerptLines) ? record.excerptLines : [];
    if (!lines.length) {
      code.replaceChildren(el('span', { className: 'code-placeholder', text: '// SOURCE CHANGED\n// The reviewed excerpt is unavailable or failed registration.' }));
      q('#inspectorError').hidden = false;
      app.showError('SOURCE CHANGED', `${record.id} does not contain a reviewed source excerpt.`);
      return false;
    }
    q('#inspectorError').hidden = true;
    const rendered = lines.map(line => {
      const source = el('span', { className: 'line-source' });
      source.append(tokenize(safeText(line.text), record.language));
      return el('span', {
        className: 'code-line',
        dataset: { emphasis: String(Boolean(line.emphasis?.length)) },
        attrs: { 'aria-label': `Line ${line.number}: ${safeText(line.text)}` }
      }, [
        el('span', { className: 'line-number', text: line.number, attrs: { 'aria-hidden': 'true' } }),
        source
      ]);
    });
    code.replaceChildren(fragment(rendered));
    q('#codeRegion').scrollLeft = 0;
    q('#codeRegion').scrollTop = 0;
    return true;
  };

  const registerItem = (term, value) => el('div', {}, [el('dt', { text: term }), el('dd', { text: value })]);
  const renderRegister = record => {
    const range = record.selection ? `L${record.selection.startLine}–L${record.selection.endLine}` : 'metadata only';
    const repo = repository(record.repoId);
    q('#fileRegister').replaceChildren(
      registerItem('Range', range),
      registerItem('Language', record.language || 'unclassified'),
      registerItem('Evidence', evidenceLabel(record.evidenceState).toLocaleLowerCase()),
      registerItem('License', record.license?.spdx || repo?.license?.spdx || 'unconfirmed')
    );
  };

  const bulletList = values => {
    const items = Array.isArray(values) && values.length ? values : ['No reviewed measurement note is registered.'];
    return el('ul', {}, items.map(value => el('li', { text: value })));
  };

  const notebookSection = (title, content, className = '') => el('section', { className }, [
    el('h4', { text: title }),
    typeof content === 'string' ? el('p', { text: content }) : content
  ]);

  const renderEvidence = record => {
    const list = el('ul');
    (record.evidence || []).forEach(item => {
      const url = safeHttps(item.url);
      const content = url ? el('a', { href: url, text: `${item.label} · ${item.checkedAt || 'checked'}`, attrs: { rel: 'noopener noreferrer' }, dataset: { sourceExternal: 'evidence' } }) : el('span', { text: item.label });
      list.append(el('li', {}, [content]));
    });
    if (!list.childNodes.length) list.append(el('li', { text: 'No additional deployment evidence registered.' }));
    return list;
  };

  const renderNotebook = record => {
    const caveats = Array.isArray(record.caveats) && record.caveats.length ? record.caveats : ['This implementation path does not establish Robinhood production configuration.'];
    q('#notebookContent').replaceChildren(
      notebookSection('What the code does', record.mechanism || 'Mechanism note not registered.'),
      notebookSection('Why it matters', record.quantInsight || 'Measurement implication not registered.'),
      notebookSection('Measure this', bulletList(record.measurements)),
      notebookSection('Failure modes', bulletList(record.failureModes)),
      notebookSection('Do not infer', bulletList(caveats), 'caveat-block'),
      notebookSection('Evidence / license', fragment(renderEvidence(record), el('p', { text: record.license?.notice || 'Read the license at the pinned revision before reproducing source.' })))
    );
  };

  const immutableBlobUrl = (repo, path) => {
    const base = safeHttps(repo?.canonicalUrl);
    const commit = repo?.revision?.commit;
    if (!base || !commit || !path) return null;
    return `${base.replace(/\/$/, '')}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`;
  };

  const setSourceLink = (value, fallbackRepo, path) => {
    const link = q('#openSourceLink');
    const url = safeHttps(value) || immutableBlobUrl(fallbackRepo, path);
    if (url) {
      link.href = url;
      link.hidden = false;
      link.setAttribute('rel', 'noopener noreferrer');
      link.dataset.external = 'immutable-source';
    } else {
      link.removeAttribute('href');
      link.hidden = true;
    }
  };

  const markActiveHotspot = id => {
    qa('[data-hotspot]').forEach(button => {
      if (button.dataset.hotspot === id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  const showHighlight = record => {
    if (!record) return false;
    state.highlightId = record.id.toUpperCase();
    state.blob = null;
    const repo = repository(record.repoId);
    q('#inspectorRelationship').textContent = relationLabel(record);
    q('#inspector-title').textContent = record.title;
    q('#inspector-title').dataset.hotspotId = state.highlightId;
    q('#sourceBreadcrumb').textContent = `${repo ? `${repo.owner} / ${repo.name}` : record.repoId}@${shortSha(record.commit)} / ${record.path}`;
    renderRegister(record);
    renderCode(record);
    renderNotebook(record);
    q('#sourceDigest').textContent = `SHA-256 · ${record.selection?.sourceSha256 || 'digest unavailable'}`;
    const checkedAt = record.evidence?.map(item => item.checkedAt).filter(Boolean).sort().at(-1) || store.catalog?.cutoff || 'research cutoff';
    q('#sourceVerified').textContent = `VERIFIED · ${checkedAt}`;
    setSourceLink(record.permalink, repo, record.path);
    markActiveHotspot(state.highlightId);
    app.status(`${record.id} · ${record.title} opened from ${repo ? `${repo.owner}/${repo.name}` : record.repoId}.`);
    return true;
  };

  const showBlob = (entry, repo) => {
    if (!entry) return false;
    state.highlightId = null;
    state.blob = entry;
    q('#inspectorRelationship').textContent = entry.kind === 'gitlink' ? 'PINNED DIRECT DEPENDENCY' : 'METADATA-ONLY SOURCE PATH';
    q('#inspector-title').textContent = entry.name || entry.path.split('/').pop();
    q('#inspector-title').removeAttribute('data-hotspot-id');
    q('#sourceBreadcrumb').textContent = `${repoLabel(repo)}@${shortSha(repo?.revision?.commit)} / ${entry.path}`;
    q('#fileRegister').replaceChildren(
      registerItem('Object', entry.kind),
      registerItem('Size', entry.size == null ? 'not recorded' : `${entry.size.toLocaleString()} bytes`),
      registerItem('Category', entry.category || 'unclassified'),
      registerItem('Object SHA', shortSha(entry.objectSha))
    );
    q('#sourceCode').replaceChildren(el('span', { className: 'code-placeholder', text: `// METADATA-ONLY PATH\n// ${entry.path}\n// Full-file reproduction is intentionally disabled.\n// Open the immutable source to inspect this blob at its pinned revision.` }));
    q('#inspectorError').hidden = true;
    q('#notebookContent').replaceChildren(
      notebookSection('What this selection proves', `The path and Git object are present in ${repoLabel(repo)} at ${shortSha(repo?.revision?.commit)}.`),
      notebookSection('Why source is not reproduced', 'Only reviewed H01–H13 excerpts ship source text. Ordinary blobs expose metadata and an immutable upstream link.'),
      notebookSection('Classification', `${entry.category || 'unclassified'} · ${entry.language || 'language unclassified'} · mode ${entry.mode || 'not recorded'}`),
      notebookSection('Do not infer', 'A filename or upstream implementation does not establish Robinhood production configuration.', 'caveat-block')
    );
    q('#sourceDigest').textContent = `GIT OBJECT · ${entry.objectSha || 'unavailable'}`;
    q('#sourceVerified').textContent = `TREE DIGEST · ${repo?.treeDigest || 'unavailable'}`;
    setSourceLink(null, repo, entry.path);
    markActiveHotspot(null);
    app.status(`${entry.path} opened as metadata-only source.`);
    return true;
  };

  const handleRoute = route => {
    const record = store.highlights.get(route.hotspotId);
    if (!record) return false;
    showHighlight(record);
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    q('#source-workbench').scrollIntoView({ block: 'start', behavior });
    const tree = window.RobinhoodSourceTree;
    if (tree && store.repositories.has(record.repoId)) {
      tree.selectRepository(record.repoId).then(() => tree.expandAncestorsAndSelect(record.path, { navigate: false })).catch(() => {});
    }
    return true;
  };

  q('#wrapCode').addEventListener('click', event => {
    state.wrap = !state.wrap;
    event.currentTarget.setAttribute('aria-pressed', String(state.wrap));
    q('#codeRegion').dataset.wrap = String(state.wrap);
  });

  app.listen('core-ready', event => {
    if (!event.detail.available) return;
    const initial = store.highlights.get('H01') || [...store.highlights.values()][0];
    if (initial && !location.hash.startsWith('#/')) showHighlight(initial);
  });

  if (store.highlights.size && !location.hash.startsWith('#/')) showHighlight(store.highlights.get('H01') || [...store.highlights.values()][0]);

  window.RobinhoodSourceInspector = Object.freeze({ handleRoute, showHighlight, showBlob, get state() { return state; } });
})();
