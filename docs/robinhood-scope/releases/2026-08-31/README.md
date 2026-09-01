# SCOPE//ROBINHOOD CHAIN — 2026-08-31 release ledger

```text
release: 1.0.0
artifact: /multichain/robinhood/
portal: /
solana_artifact: /multichain/solana/
release_commit: d04e5d7
ledger_commit: follow-up commit containing this record
published_at: 2026-08-31 17:58:02 PDT (-0700)
production: https://alechp.github.io/multichain-gang/
research_checked_at: 2026-08-31 America/Los_Angeles
rollback_commit: 041688b
```

## Outcome

The Robinhood Chain instrument is published under `multichain/robinhood/` as
part of the Multichain Gang portal. The Solana instrument was migrated to
`multichain/solana/`; its substantive Scope content remains protected while its
global branding, relative asset paths, and Scope/Chains/Tools navigation were
updated for the new multichain information architecture:

```text
e3fa94d494c24a13efb90bdf60e808d2b3751eb41319c3304b990635aadb8408  multichain/solana/index.html
```

The implementation contains five chapters, eight primary surfaces, four
comparison docks, six systems, eight techniques, seven tool functions, 24
Hoverdocs terms, 22 Robinhood-first entity routes, 26 authored cues, 20 fact
records, and 34 primary/official source records.

## Automated evidence

All commands completed successfully on 2026-08-31:

```text
PASS  node scripts/audit-robinhood-scope.mjs
      protected Solana checksum; schema, sources, facts, routes, mirrors,
      naming, prohibited APIs, dynamic interactions, and search

PASS  node scripts/audit-robinhood-scope-fit.mjs
      320/360/390/430/768/1200/1440 px; document/figure/dock/route/detail fit,
      ≥44 px primary controls, tablet chrome, and 400%-reflow equivalent

PASS  node scripts/audit-robinhood-scope-degrade.mjs
      25 cases: reduced motion, external assets blocked, storage denied,
      corrupt storage, and JavaScript off

PASS  SCOPE_URL=.../robinhood/index.html node scripts/audit-contrast.mjs
      all computed text at or below 12 px clears WCAG AA at 360/700/1200 px
```

The full existing Solana regression boundary also passed:

```text
PASS  audit-foundation.mjs
PASS  audit-svg-fit.mjs
PASS  audit-contrast.mjs
PASS  audit-readability.mjs
PASS  audit-degradation.mjs
PASS  audit-command-channel.mjs
PASS  audit-robinhood-chain.mjs
PASS  audit-chain-index.mjs
PASS  audit-chain-tools.mjs
PASS  audit-global-chrome.mjs
PASS  audit-multichain-gang.mjs
      seven access-code-gated production routes; both Scope instruments and
      all four Chains/Tools directories; 360/768/1200 px route fit
```

Static integrity checks passed: JavaScript syntax, `#chainData` JSON, local
links, unique IDs/headings, balanced Markdown fences, `git diff --check`, and
the prohibited wallet/signing/submission API scan.

## Performance evidence

| Loaded asset | Raw size | Budget | Result |
|---|---:|---:|---|
| `index.html` including inline data | ~84 KB | 520 KB | pass |
| `styles/scope.min.css` | <34 KiB | 34 KiB | pass |
| Page-specific JavaScript | ~41 KiB | 48 KiB | pass |
| Raster images loaded by page | 0 | 0 required | pass |

The six release screenshots below are evidence only and are not loaded by the
page.

## Visual viewport evidence

| Viewport | Evidence |
|---:|---|
| 360 × 844 | [home-360.png](home-360.png) |
| 390 × 844 | [home-390.png](home-390.png) |
| 430 × 844 | [home-430.png](home-430.png) |
| 768 × 1024 | [home-768.png](home-768.png) |
| 1200 × 1000 | [home-1200.png](home-1200.png) |
| 1440 × 1000 | [home-1440.png](home-1440.png) |

Visual inspection covered the hero, mobile trace replacement, topology stack,
transaction pipeline, FCFS race, visibility map, latency ladder, technique
grid, tool bench, evidence routes, fixed reader, and tablet header. It produced
four corrections before this ledger: tablet command-button placement, route
Back-control sizing, delayed-inbox containing-block placement, and the final
tool-grid row background. A computed contrast failure on the conceptual trace
label was also corrected from 4.00:1 to 5.34:1.

## Review disposition

| Review | Disposition |
|---|---|
| Protocol correctness | Pass — Robinhood facts map to the dated first-party ledger; inherited facts map to primary protocol sources. |
| Cross-chain methodology | Pass — exact fields, Robinhood-first deltas, explicit mismatch/unknown vocabulary, no composite winner. |
| Editorial | Pass — complete 26-cue read-through and visible caveats. |
| Accessibility | Automated pass — keyboard overlays/search/docks, target sizes, contrast, reduced motion, JavaScript-off semantics, 320 px reflow equivalent. |
| Visual QA | Pass — seven automated widths and six stored screenshots. |
| Security/privacy | Pass — no wallet, signing, submission, keys, telemetry, or external form. |
| Brand implementation | Pass — full name, Scope-first identity, text-only masthead, no official/synthetic mark, conspicuous independence notice. |
| Publication authorization | Pass — the repository owner explicitly instructed publication in this session; this records product-owner authorization, not an external legal opinion. |
| Production smoke | Pass — GitHub Pages build/deploy succeeded; all seven canonical routes returned HTTP 200 with the expected title/brand, and Chrome confirmed every route fails closed behind the shared operator-code gate. |

## Recorded skips and boundaries

- No external legal opinion was commissioned or represented. Publication was
  authorized directly by the repository owner.
- No physical-device paint profile or assistive-technology lab session was
  performed; browser automation covered equivalent layout, keyboard, motion,
  and semantic states.
- No live RPC, wallet, brokerage, liquidity, volume, or MEV observation was
  used. Figures remain dated architectural models rather than telemetry.
- Production deep links and the authenticated/locked state were smoke-tested
  after the successful GitHub Pages deployment. JavaScript-off behavior remains
  covered by the automated fail-closed degradation suite.

## Known unknowns retained in the product

- sequencer geography, queue limits, throttling, and detailed outage behavior;
- provider-specific pending visibility and private submission topology;
- production MEV prevalence, pair liquidity, maker concentration, and bridge
  inventory;
- dynamic Stock Token jurisdiction, registry, oracle addresses, and venue
  deployment; and
- future validator permissioning, upgrade actions, Nitro/ArbOS pins, and
  ecosystem support.

These remain labelled, omitted from headlines, or routed through the evidence
methodology. They were not filled with Arbitrum One defaults or partner claims.

## Publication and rollback

Publication completed from `main` through GitHub Pages. The canonical routes
verified after deployment were:

1. `/` — authenticated Multichain Gang portal;
2. `/multichain/solana/`, `/multichain/solana/chains/`, and
   `/multichain/solana/tools/`; and
3. `/multichain/robinhood/`, `/multichain/robinhood/chains/`, and
   `/multichain/robinhood/tools/`.

All returned HTTP 200 and displayed the access-code gate in a real Chrome
session. If a critical production regression is discovered, redeploy
`041688b` as the recorded rollback point, accounting for the repository rename
from `alechp/solana` to `alechp/multichain-gang`.
