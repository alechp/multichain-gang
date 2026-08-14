# SOLANA//SCOPE — project context

v3.0 is implemented and published from `main` / repository root at
https://alechp.github.io/solana/. The public instrument is a single-file static
site; `journal/` is a separate local-only Bun/SQLite application and must never
be deployed with the page.

## Files

- `index.html` — self-contained public instrument, CH-01…CH-05, no build step.
- `docs/v3/` — implemented v3 specs; `08-ORCHESTRATION.md` ends with the release ledger.
- `scripts/audit-*.mjs` — executable page regression gates.
- `journal/` — read-only collectors, SQLite store, CLI, paper simulators, and localhost workbench.
- `docs/solana-scope-v2-spec.md` — implemented v2 baseline for untouched behavior.

## Page conventions

- Keep the public page in one `index.html`: inline CSS/JS/JSON, Google Fonts,
  and anime.js via cdnjs; no bundler or framework.
- Consumer code stays inside the byte-unique V3A/B/C/E CSS/JS/HTML/JSON zones.
  V3D owns shared foundations. Do not redefine `window.SCOPE` primitives:
  `Overlay`, `Router`, `Store`, `positionOverlay`, `termify`, and `Runtime`.
- All structured page content lives in `#chainData`. Update the matching
  `<noscript>` mirror whenever JSON changes; the ENTITY INDEX must exactly match
  each entity's name, kind, tagline, and first link.
- Preserve channel/chain tokens, reading-scale hooks, stable
  `data-note-anchor` values, and hash routes shaped as `#/e/<id>`.
- Every animation degrades. Reduced motion and anime-CDN failure render complete
  static content; JS-off exposes the fallback tables, glossary, and entity index.
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
- Keep `journal/web/tokens.css` synchronized with page tokens via
  `bun run check:tokens`. Runtime databases under `journal/data/` are ignored.

## QA gate for any change

Run the four page audits, then exercise 360/390/430/768/1200 across motion,
reduced motion, CDN blocked, and JS off. No document-level horizontal overflow;
the intentional inner pipeline scroller is the only exception. For journal
changes, run `bun test`, `bun build src/cli.ts --target=bun`, token sync, and the
prohibited wallet-API grep. A skipped external/profile check is recorded as
skipped, never passed.
