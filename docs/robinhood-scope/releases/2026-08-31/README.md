# SCOPE//ROBINHOOD CHAIN — 2026-08-31 release ledger

```text
release: 1.0.0-rc1
artifact: /robinhood/
commit: release commit containing this ledger
published_at: NOT PUBLISHED — external brand/legal owner sign-off required
research_checked_at: 2026-08-31 America/Los_Angeles
rollback_commit: current published main before the release commit
```

## Outcome

The standalone Robinhood Chain instrument is implemented under `robinhood/`.
The root `SOLANA//SCOPE` document remains byte-identical to the frozen baseline:

```text
2106804a339da9697b5b40255c2dd0460504bea394eba5a8b9a6ff539627336d  index.html
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
| External legal/brand owner | **Required before publication; not supplied in this implementation session.** |
| Production smoke | Pending publication approval. |

## Recorded skips and boundaries

- No external legal opinion or owner brand approval was available. This is a
  publication gate, not recorded as a pass.
- No physical-device paint profile or assistive-technology lab session was
  performed; browser automation covered equivalent layout, keyboard, motion,
  and semantic states.
- No live RPC, wallet, brokerage, liquidity, volume, or MEV observation was
  used. Figures remain dated architectural models rather than telemetry.
- Production deep-link/CDN/JavaScript-off smoke testing remains pending because
  the page has not been pushed to public hosting.

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

After external brand/legal owner approval:

1. merge/push the release commit to the GitHub Pages source branch;
2. verify `/solana/` still serves the original Solana checksum;
3. verify `/solana/robinhood/`, all five anchors, one entity route,
   methodology, sources, JavaScript-off, and blocked-external-assets behavior;
4. replace `published_at` above with the deployment time in a follow-up ledger;
   and
5. if any critical smoke check fails, redeploy the previous published commit.
