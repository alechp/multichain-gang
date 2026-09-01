# Multichain Gang — project context

Solana Scope, Robinhood Scope, and six cross-chain article/tool indexes are
published from `main` at https://alechp.github.io/multichain-gang/. The root is
an access-code-gated Multichain Gang portal. The full instruments live at
`multichain/solana/` and `multichain/robinhood/`; `journal/` is a separate
local-only Bun/SQLite application and must never be deployed with the page.

Robinhood Scope is additive. Do not replace or substantively rewrite the Solana
instrument while changing it. The protected Solana baseline is recorded in
`multichain/robinhood/.solana-baseline.sha256`.

## Files

- `index.html` — access-code-gated Multichain Gang portal.
- `multichain/solana/index.html` — self-contained Solana instrument, CH-01…CH-05.
- `multichain/{solana,robinhood}/{chains,tools}/` — stable chain-specific indexes.
- `scripts/command-palette.js` + `styles/command-palette.css` — local command
  channel, section routing, global transport keys, and responsive presentation.
- `scripts/chain-index.js` + `styles/chain-index.css` — the `#/chains` atlas,
  six `#/c/<slug>` article hubs, filters, history restoration, source rails,
  and opt-in hover + hold `CTRL` Link Veil.
- `scripts/reader-dock.js` + `styles/reader-dock.css` — persisted top/bottom
  reader placement and the temporary field-note UI suppression layer.
- `vendor/fuse.basic.min.js` — pinned Fuse.js 7.5.0 basic browser build;
  `vendor/fuse.LICENSE` preserves its Apache-2.0 license.
- `docs/v3/` — implemented v3 specs; `08-ORCHESTRATION.md` ends with the release ledger.
- `docs/robinhood-chain-integration-spec.md` — implemented Robinhood Chain
  comparator, read-only journal, coin-launch, latency, and liquidity contract.
- `multichain/robinhood/` — standalone Robinhood Chain page, readable source CSS, served
  minified CSS, local controllers, inline data, and exact no-JavaScript mirrors.
- `docs/robinhood-scope/` — implemented `SCOPE//ROBINHOOD CHAIN` product,
  research, content, comparison, data, interaction, release specs, and evidence.
- `scripts/audit-*.mjs` — executable page regression gates.
- `journal/` — read-only collectors, SQLite store, CLI, paper simulators, and localhost workbench.
- `docs/solana-scope-v2-spec.md` — implemented v2 baseline for untouched behavior.

## Page conventions

- Keep the Solana instrument core in `multichain/solana/index.html`: inline core CSS/JS/JSON, Google
  Fonts, and anime.js via cdnjs; no framework. Local command/search and reader
  docking assets are deliberate exceptions so they remain testable offline.
- The access console stores only a SHA-256 digest and unlocks per browser tab.
  Never commit its plaintext code. Its audit bypass is restricted to `file:`,
  `localhost`, and `127.0.0.1`; do not expose a production query bypass.
- The client-side gate deters casual access but cannot make static GitHub Pages
  confidential. Do not describe it as authentication or a security boundary.
- Consumer code stays inside the byte-unique V3A/B/C/E CSS/JS/HTML/JSON zones.
  V3D owns shared foundations. Do not redefine `window.SCOPE` primitives:
  `Overlay`, `Router`, `Store`, `positionOverlay`, `termify`, and `Runtime`.
- Command-channel transport calls `window.SCOPE.Playbar`; do not reach back into
  the playbar's lexical state. Left/Right step globally and Space toggles
  autoplay only outside editors, interactive controls, and open overlays.
  Desktop Escape exits an engaged reader through `SCOPE.Playbar.exit()`.
- Reader docking persists through `SCOPE.Store` as `top` or `bottom`. At the
  top, the Author Note opens below the transport and below the fixed navbar.
- Field-note controls, pins, cards, and the command entry are intentionally
  hidden for now. Do not delete or migrate stored `notes` data.
- All structured page content lives in `#chainData`. Update the matching
  `<noscript>` mirror whenever JSON changes; the ENTITY INDEX must exactly match
  each entity's name, kind, tagline, and first link.
- Robinhood Chain uses `robinhood_chain` only as an internal key. Render its
  full name, preserve the soft/L1-posted/L1-final clocks, and never invent a
  compact glyph or treat `windowMs` as a block-time measurement.
- Preserve channel/chain tokens, reading-scale hooks, stable
  `data-note-anchor` values, and hash routes shaped as `#/chains`,
  `#/e/<id>`, and `#/c/<chain-slug>`.
- Keep termified prose inside a containing element when its parent is flex/grid;
  injected `.term` buttons must not split anonymous text into layout items.
- Every animation degrades. Reduced motion renders a manual reader; anime-CDN
  failure keeps timed reader progression over static figures. Because the site
  is gated, JS-off fails closed with an access warning. The top navbar is always
  static: no live counter, sweep, entrance animation, or transition.
- Register legacy loops through `registerLoop(el, inst)` so offscreen animation
  is paused. Figures remain illustrative, dated 2026-08, with `~` on volatile values.

## Journal conventions

- Read-only and paper-only is non-negotiable: no keys, signing, transaction
  construction, or submission. The HTTP server binds only to `127.0.0.1`.
- Prefer RPC, then documented APIs. Scraping stays opt-in, robots-aware,
  rate-limited, cached, and circuit-broken.
- Migrations are append-only. Collector cursor updates stay atomic with their
  observation batch. Every simulator output carries `PAPER · HYPOTHETICAL`, at
  least three assumptions, and at least two caveats.
- Keep EVM block/hash/wei/log/finality records parallel to Solana slot/signature/
  lamport records; never erase chain-specific meaning to force a shared table.
- Keep `journal/web/tokens.css` synchronized with page tokens via
  `bun run check:tokens`. Runtime databases under `journal/data/` are ignored.

## QA gate for any change

Run `node scripts/audit-multichain-gang.mjs`, the five existing page audits, plus
`node scripts/audit-robinhood-chain.mjs` and
`node scripts/audit-chain-index.mjs` and
`node scripts/audit-chain-tools.mjs` and
`node scripts/audit-global-chrome.mjs`, then
exercise 360/390/430/768/1200 across motion,
reduced motion, CDN blocked, and JS off. No document-level horizontal overflow;
the intentional inner pipeline scroller is the only exception. For journal
changes, run `bun test`, `bun build src/cli.ts --target=bun`, token sync, and the
Robinhood Chain audit from the repository root; it includes the prohibited
wallet/submission-API scan. A skipped external/profile check is recorded as
skipped, never passed.

For any `multichain/robinhood/` change, also run
`node scripts/audit-robinhood-scope.mjs`,
`node scripts/audit-robinhood-scope-fit.mjs`, and
`node scripts/audit-robinhood-scope-degrade.mjs`. The first gate fails if the
protected Solana checksum changes. Regenerate `styles/scope.min.css` mechanically
from readable `styles/scope.css` whenever the source stylesheet changes.
