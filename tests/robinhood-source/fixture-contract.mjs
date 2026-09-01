export const expected = Object.freeze({
  featured: Object.freeze(['H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07', 'H08']),
  secondary: Object.freeze(['H09', 'H10', 'H11', 'H12', 'H13']),
  systems: Object.freeze(['robinhood', 'solana', 'bitcoin', 'ethereum', 'bnb', 'zcash']),
  axes: Object.freeze(['ingress-ordering', 'fast-propagation', 'execution-contention', 'fee-data-cost', 'assurance-reorg'])
});

export const validPageSource = `<!doctype html>
<html lang="en"><head>
<title>Robinhood Source · Multichain Gang</title>
<link rel="stylesheet" href="../../auth.css">
<link rel="stylesheet" href="../../site.css">
<link rel="stylesheet" href="../styles/select-ui.css">
<link rel="stylesheet" href="styles/source.css">
<script src="../../auth.js"></script>
</head><body data-auth-scope="ROBINHOOD / SOURCE" data-chain="robinhood">
<a href="#sourceMain">Skip to main content</a>
<header><nav aria-label="Robinhood modes"><a href="../">Scope</a><a href="../chains/">Chains</a><a href="../tools/">Tools</a><a href="./" aria-current="page">Source</a></nav></header>
<main id="sourceMain"><section><h1>Public code. Private boundary.</h1>
<p>COMPLETE FOR THE PINNED REPOSITORY SET · NOT A CLAIM OF PRIVATE DEPLOYED CODE</p>
<p>3599acae1ad2fab4059fc46453c9cd3294126641 · VERIFIED 2026-09-01</p>
<p>Robinhood sequencer customization / production configuration · Stock Token deployed contract source repository · Stock Token API backend · Data Streams oracle publisher and Robinhood verifier implementation · Compliance and transaction-screening rules</p>
<div data-source-workbench><div role="tree" aria-label="Repository source tree"></div><aside aria-label="Quant notebook"></aside></div>
</section><section><table><caption>Cross-chain source comparison</caption><thead><tr><th scope="col">System</th></tr></thead><tbody><tr><th scope="row">Robinhood</th></tr></tbody></table></section></main>
<footer><a href="https://github.com/OffchainLabs/nitro/tree/3599acae1ad2fab4059fc46453c9cd3294126641" rel="noopener noreferrer">Pinned Nitro source</a></footer>
<noscript>JavaScript is required to verify the access code.</noscript>
<script src="scripts/runtime.js"></script>
</body></html>`;

export const validRuntimeSource = `(() => {
  'use strict';
  const write = (node, value) => { node.textContent = String(value ?? ''); };
  const safeUrl = value => { const url = new URL(value, document.baseURI); return url.protocol === 'https:' ? url.href : null; };
  window.RH_SOURCE_RENDER = Object.freeze({ write, safeUrl });
})();`;

const highlight = id => ({
  id,
  chapterId: id === 'H01' ? 'src-01' : 'src-02',
  title: `Fixture ${id}`,
  repoId: 'nitro',
  commit: '3599acae1ad2fab4059fc46453c9cd3294126641',
  path: 'execution/gethexec/sequencer.go',
  language: 'go',
  selection: { startLine: 1, endLine: 6, sourceSha256: 'a'.repeat(64) },
  permalink: 'https://github.com/OffchainLabs/nitro/blob/3599acae1ad2fab4059fc46453c9cd3294126641/execution/gethexec/sequencer.go#L1-L6',
  excerptLines: [{ number: 1, text: 'package fixture' }],
  evidenceState: 'version-pinned',
  evidence: [{ label: 'Pinned source', url: 'https://github.com/OffchainLabs/nitro', checkedAt: '2026-09-01' }],
  mechanism: 'Fixture mechanism',
  quantInsight: 'Fixture measurement question',
  measurements: ['receive-to-validate milliseconds'],
  failureModes: ['gap'],
  caveats: ['Not a production configuration.'],
  license: { spdx: 'BUSL-1.1', notice: 'Fixture only' }
});

export const validPayloads = Object.freeze({
  highlights: expected.featured.concat(expected.secondary).map(highlight),
  comparisons: {
    systems: expected.systems.map(id => ({ id, label: id })),
    axes: expected.axes.map(id => ({ id, label: id })),
    cells: expected.axes.flatMap(axisId => expected.systems.map(systemId => ({
      systemId,
      axisId,
      analogy: 'direct',
      mechanism: 'Fixture mechanism',
      repositoryId: systemId === 'robinhood' ? 'nitro' : `${systemId}-client`,
      commit: 'b'.repeat(40),
      paths: [{ path: 'src/example.go', permalink: `https://github.com/example/${systemId}/blob/${'b'.repeat(40)}/src/example.go` }],
      measure: ['milliseconds'],
      caveat: 'In this client at this revision.',
      checkedAt: '2026-09-01'
    })))
  }
});

export const unsafeRuntimeMutations = Object.freeze([
  ['innerHTML sink', 'node.innerHTML = payload'],
  ['adjacent HTML sink', 'node.insertAdjacentHTML("beforeend", payload)'],
  ['network fetch', 'fetch("https://github.com/example")'],
  ['XHR network', 'new XMLHttpRequest()'],
  ['WebSocket network', 'new WebSocket("wss://example.test")'],
  ['dynamic evaluation', 'eval(payload)'],
  ['Function constructor', 'new Function(payload)'],
  ['wallet provider', 'window.ethereum.request({ method: "eth_sendRawTransaction" })']
]);
