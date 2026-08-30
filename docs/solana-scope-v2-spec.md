# SOLANA//SCOPE — v2 Specification

**Base:** `solana-on-the-wire.html` (v1, single-file, anime.js 3.2.2)
**Scope:** three workstreams — (1) aesthetic + mobile second pass, (2) per-section chain comparators (SOL vs BTC / ETH / BNB / ZEC), (3) new CH-05 cross-chain trading tools & techniques.
**Constraint:** remains a single self-contained HTML file. All data introduced in v2 lives in one inline `<script type="application/json" id="chainData">` block so content and presentation stay separable.
**Fact policy:** every number in the data model below is an order-of-magnitude teaching figure, dated `2026-08`. Re-verify block times, validator counts, and tool status at build time; anything volatile carries a `~` in the UI.

---

## SPEC 1 — Aesthetic second pass + full mobile responsiveness

### 1.1 Diagnosis (why v1 reads dull)

1. **No light source.** Panels are flat fills on a flat background; the "instrument" metaphor promises phosphor glow and gets none outside 3 tiny dots.
2. **Uniform density.** Every section is panel → cards at the same rhythm; nothing is louder than anything else, so nothing is memorable.
3. **Traces are static.** An oscilloscope page where the only persistent motion is a 6px header bar undersells the concept.
4. **Type is timid.** Chakra Petch is only used at modest sizes; the display face never gets a display moment.
5. **Channel colors are labels, not atmosphere.** Amber/cyan/red/green appear as 9px dots instead of tinting their sections.

### 1.2 Aesthetic upgrades (in priority order)

**A. Phosphor bloom system.** Introduce a two-layer glow treatment used consistently:
- CSS: each `.panel` gains an inset top edge highlight (`box-shadow: inset 0 1px 0 rgba(255,255,255,.04)`) and a per-section ambient radial gradient positioned behind its primary figure (`.panel::after`, `radial-gradient(60% 50% at 50% 30%, <channel-color at 7% alpha>, transparent)`).
- SVG: promote the existing `glow-*` filters to real SVG `<filter feGaussianBlur stdDeviation="3">` + merge, applied to all trace paths, not just dots. Every animated stroke gets a dim "afterglow" duplicate path underneath (same `d`, stroke-width 6, opacity .18, blur).

**B. Section tinting.** Each `section` sets `--ch: var(--cyan|--amber|--red|--green)`. Used by: `h2` underline tick, panel border-top (`border-top:1px solid color-mix(in srgb, var(--ch) 35%, var(--line))`), card hover ring, and the ambient bloom. The page should read as four distinctly-lit rooms.

**C. CRT texture, restrained.** One fixed overlay div: 1px horizontal scanlines at 2.5% opacity + a very slow (90s) vertical drift. Behind a `@media (min-width:700px)` guard and removed under `prefers-reduced-motion`. If it's noticeable at a glance, it's too strong.

**D. Hero boot sequence.** On first paint (once, ~1.6s total, skippable by scroll, skipped entirely under reduced motion):
1. slot bar sweep flickers on (opacity stagger 0→1),
2. hero kicker types on via clip-path,
3. `h1` lines rise with `translateY` + slight `letter-spacing` settle,
4. scope grid lines draw, then trace draws (already exists),
5. stat values count up with `anime` `round:1` on innerHTML targets (400, 1, 13, 1000s handled as string swap at end).

**E. Persistent ambient motion (cheap, GPU-only):**
- Hero dot loop (exists) + a second faint cyan trace on the hero scope, phase-shifted, so the scope reads dual-channel like the palette promises.
- `.sweep` gains a 1-frame "retrace flash" via a brief box-shadow keyframe at loop end.
- Card hover: `translateY(-2px)`, border tint to `--ch`, and a 200ms underline trace on the `h4` (pseudo-element `scaleX`). Focus-visible mirrors hover.

**F. Typographic loudness.** `h1` up to `clamp(2.6rem, 7.5vw, 5.4rem)`. Section `h2` gains a mono superscript index (`01`–`05`) at 40% size in `--ch`. `.hstat b` up to `1.6rem`. Introduce one oversized display moment: in CH-04, "400 ms" set at ~`8rem` outlined (stroke text via `-webkit-text-stroke`, fill transparent) behind the ladder panel header as a watermark.

**G. Ruler chrome.** Left edge of `.wrap` on ≥1100px viewports: a fixed vertical ruler (CSS repeating-linear-gradient ticks every 8px, major tick 40px) in `--faint`, with the active channel's tag rotated 90° riding the current scroll section (IntersectionObserver already exists — reuse it to set `data-active-ch` on body). This is the v2 signature addition; keep everything else quiet around it.

### 1.3 Mobile responsiveness (target: Claude mobile in-app browser, iOS Safari, Android Chrome; design width 390px, test down to 360px)

**Breakpoints:** 1100 / 900 / 700 / 480. Only 700 and 480 introduce structural change.

**Global rules**
- Replace any `vh` with `dvh`; pad `.slotbar` with `env(safe-area-inset-top)` and footer with `env(safe-area-inset-bottom)`.
- No hover-only information anywhere; every hover affordance has a visible resting state.
- All tap targets ≥ 44×44px (chain chips, nav, compare tabs).
- `backdrop-filter` on the slot bar: keep, but add solid-color fallback via `@supports not`.
- Body grid overlay: reduce to 40px cells and 20% opacity under 700px (visual noise shrinks with screen).
- Kill parallax/drift layers under 700px; pause **all** looping anime timelines when their SVG leaves the viewport (second IntersectionObserver with `threshold: 0`, calling `.pause()` / `.play()`), which is also the battery fix for mobile.

**Slot bar under 700px:** two-line compact — line 1: brand + slot number; line 2: full-width sweep. Nav becomes a horizontal scroll chip row *below* the hero (not hidden as in v1) — `overflow-x:auto`, `scroll-snap-type:x proximity`, gradient fade masks on both edges to signal scrollability.

**Per-diagram strategy (the real work):**

| Figure | ≥700px | <700px |
|---|---|---|
| Hero scope | as-is | shorter viewBox (`0 0 1140 260` → crop to 2 slots `0 0 570 220`) via a second `<svg>` shown/hidden with CSS, so strokes don't shrink below 1.5px rendered |
| FIG 1.1 Turbine | as-is | scales acceptably; bump node radii +20% and font sizes to 13/12px inside a `<style>` media query targeting SVG text classes |
| FIG 2.1 Pipeline | horizontal | **rebuild vertical variant**: same stages stacked top-to-bottom (`viewBox 0 0 390 980`), packet path runs downward, TPU bracket becomes a left-edge rule. Both variants in DOM; CSS toggles; JS starts only the visible one (check `offsetParent`). Do **not** keep the horizontal scroller as the mobile answer — a 940px pan on a 390px phone loses the narrative |
| FIG 3.1 Sandwich | side-by-side block + curve | block stack full-width first, price curve below it (the SVG already splits at x=360; cut into two stacked `<svg>`s sharing ids only in the visible instance — suffix mobile ids with `-m`) |
| FIG 3.2 Jito | as-is | fits at 440 width; increase label sizes only |
| FIG 4.1 Ladder | 3-col grid row | already re-grids in v1; verify value column doesn't wrap at 360px, shorten labels (`CROSS-OCEAN` → `X-OCEAN`) |

**Claude-mobile-specific checks (acceptance):**
- No horizontal page scroll at 360–430px (only intentional inner scrollers, each with edge-fade affordance).
- First contentful paint of hero without layout shift from font swap: `font-display:swap` + `size-adjust` fallback metrics for Chakra Petch.
- Anime.js CDN failure degrades gracefully (v1 already gates on `typeof anime === 'undefined'` → `no-motion`; keep, and ensure `no-motion` also reveals all `.reveal` and fills `.lfill`).
- Tap on any figure never triggers text selection (`user-select:none` on SVG containers).
- 60fps scroll on a mid-range phone: max 2 concurrent looping timelines (viewport pause rule enforces this).

---

## SPEC 2 — Chain comparators: SOL vs BTC · ETH · BNB · ZEC

### 2.1 Concept

Each channel section (CH-01…CH-04) gains a **Compare Dock**: a chip row `[ vs BTC ] [ vs ETH ] [ vs BNB ] [ vs ZEC ]` under the section's primary figure. Tapping a chip expands a side-by-side comparator: **left column = SOL (constant reference)**, right column = selected chain. Tapping the active chip again collapses the dock. One dock open per section; opening one in a section closes nothing elsewhere (sections are independent).

The dock is data-driven: a single JSON model renders every dock, so adding a chain later is a data edit, not a layout edit.

### 2.2 Interaction & component spec

```
┌─ COMPARE DOCK (per section) ─────────────────────────────┐
│  COMPARE ▸   [BTC] [ETH] [BNB] [ZEC]        (chip row)   │
├──────────────────────────┬───────────────────────────────┤
│  ◤ SOL — reference       │  ◤ ETH — selected             │
│  mini-diagram (SVG)      │  mini-diagram (SVG)           │
│  metric rows             │  metric rows                  │
├──────────────────────────┴───────────────────────────────┤
│  DELTA STRIP: one-line takeaway sentence                 │
└──────────────────────────────────────────────────────────┘
```

- **Chips:** mono type, 44px min height, chain-colored left tick (BTC `#F7931A`, ETH `#8A9EF5`, BNB `#F0B90B`, ZEC `#F4B728` — ZEC and BNB collide in hue; shift ZEC to `#E8D28A` desaturated gold and pair it with a shield glyph so color is never the only differentiator). Active chip: filled tick + underline. ARIA: `role="tablist"` / `role="tab"` / `aria-selected`; panels `role="tabpanel"`; arrow-key navigation between chips.
- **Open/close animation:** dock height auto-animates via measured `scrollHeight` (anime `height` + `opacity`, 380ms `easeOutCubic`); on chain switch, right column only: slide-fade out (-12px) → data swap → slide-fade in. Reduced motion: instant swap.
- **Metric rows:** label (mono, dim) / SOL value / chain value. Cells where the chains *meaningfully diverge* get a channel-tinted left border on the "advantaged" side — but framing is factual, not scoreboard: the delta strip carries the interpretation in one neutral sentence (e.g. "ETH trades block speed for a larger, more geographically dispersed validator set."). Never render ✓/✗.
- **Mini-diagrams:** each chain gets one ~`viewBox 0 0 320 200` SVG per section, drawn in the house style (panel-2 fills, channel strokes, mono labels), with **one** looping motion each (single anime timeline, paused when dock closed or offscreen). Specified per-section below.
- **Mobile (<700px):** columns stack — SOL card first, selected chain second, with a sticky mini-header inside the dock ("SOL ▲ / ETH ▼") so the reader keeps orientation; chips row horizontal-scrolls with edge fades.

### 2.3 Data model (inline JSON, authoritative content)

Schema:

```json
{
  "chains": { "<id>": { "name": "", "color": "", "glyph": "", "sections": {
    "topology":  { "diagram": "<template-id>", "metrics": [ {"k":"","v":""} ], "delta": "" },
    "txflow":    { "…": "…" },
    "mev":       { "…": "…" },
    "latency":   { "…": "…" }
  } } }
}
```

Content matrix to ship (SOL column shown once; teaching figures, `~` where volatile):

**topology**

| metric | SOL (ref) | BTC | ETH | BNB | ZEC |
|---|---|---|---|---|---|
| consensus | PoS + PoH clock, Tower BFT | PoW, Nakamoto (longest chain) | PoS, Gasper (LMD-GHOST + Casper FFG) | PoSA, ~45 rotating validators (21 produce per epoch) | PoW (Equihash), Nakamoto |
| block/slot cadence | 400 ms | ~10 min | 12 s | ~0.75 s (post-Maxwell '25) | 75 s |
| who proposes | scheduled leader, stake-weighted, published | any miner, hash-race | RANDAO-selected proposer per slot | elected validator rotation | any miner |
| validating set | ~1,000+ validators | ~tens of thousands of nodes, mining in ~few large pools | ~1M validators (32 ETH each), ~10k nodes | dozens (permissioned-ish, stake+authority) | thousands of nodes, pooled mining |
| block propagation | Turbine shred tree | gossip flood + compact blocks / FIBRE | gossip + blob sidecars | gossip (geth-derived) | gossip flood (BTC-style) |
| hardware floor | high — 12+ cores, 256GB+ RAM, NVMe | low — laptop-class full node | mid — consumer-plus | mid-high | low-mid |
| delta strip | — | "BTC maximizes who *can* validate; SOL maximizes what a validator can do per second." | "ETH spreads trust across ~a million small stakes; SOL concentrates work in fewer, heavier machines." | "BNB buys sub-second blocks with a small permissioned set — closer to SOL's speed, further from its openness." | "ZEC keeps BTC's shape and spends its innovation budget on privacy, not throughput." |

**txflow**

| metric | SOL | BTC | ETH | BNB | ZEC |
|---|---|---|---|---|---|
| pre-block staging | none — Gulf Stream streams to leaders | public mempool, fee-rate sorted | public mempool + private order flow (builders) | public mempool (fast blocks drain it) | public mempool; shielded txs reveal nothing but fee |
| fee model | base per sig + priority per CU, per-account markets | sat/vB auction | EIP-1559 base burn + tip | low fixed-ish gas, tip auction | sat-style, near-zero |
| execution | parallel (Sealevel, declared accounts) | UTXO script (no general contracts) | sequential EVM | sequential EVM | UTXO + shielded circuits (no general contracts) |
| inclusion latency (typ.) | < 1 s | minutes–hours (fee dependent) | ~12–24 s | ~1–2 s | ~1–3 min |
| finality | ~13 s (32 rooted slots) | probabilistic, ~60 min at 6 conf | ~13–15 min (2 epochs) | seconds (fast finality post-'25 upgrades) | probabilistic, ~hours conservative |
| expiry / replay | blockhash expires ~1 min | RBF replaceable | nonce-replaceable | nonce-replaceable | standard UTXO |
| delta strip | — | "BTC's mempool is a waiting room; Solana deleted the room." | "Same 'confirmed vs finalized' ladder — ETH just climbs it 60× slower and in sequence." | "On paper BNB now rivals SOL's cadence; the EVM still executes one transaction at a time." | "ZEC's flow is BTC's flow — except validators can't even see what they're ordering." |

**mev**

| metric | SOL | BTC | ETH | BNB | ZEC |
|---|---|---|---|---|---|
| visibility of pending txs | none public; leaks via infra | fully public mempool | public mempool + private channels | public mempool, tiny window | shielded txs opaque by design |
| ordering market | Jito bundles, out-of-protocol auction | fee-rate + out-of-band accelerators | PBS: builders → relays → proposers (MEV-Boost) | validator-adjacent (bloXroute, 48Club private txs) | effectively none |
| dominant plays | atomic arb, sandwich via private flow, spam racing | fee sniping, time-bandit (theoretical), ordinals-era fee wars | sandwich, backrun, liquidations, CEX-DEX arb | sandwich (historically heavy), arb | ~none (no DEX layer, hidden amounts) |
| user protection | tight slippage, MEV-protect RPCs, tips | RBF awareness; little to protect | Flashbots Protect, CoW/intents, private RPCs | private-tx RPCs, slippage | privacy *is* the protection |
| delta strip | — | "No smart contracts, no sandwiches — BTC's MEV is mostly a fee story." | "ETH industrialized MEV into a supply chain; Solana runs the same auction inside 400 ms." | "Fast blocks + concentrated validators made BNB a sandwich hotspot until private-tx rails matured." | "ZEC is the control group: hide the order flow and extraction has nothing to grip." |

**latency**

| metric | SOL | BTC | ETH | BNB | ZEC |
|---|---|---|---|---|---|
| decision window | ~400 ms | ~10 min | 12 s | ~0.75 s | 75 s |
| does colocation matter | decisive — leader-adjacent placement | barely (relay networks like FIBRE for miners) | yes — relay/builder proximity | yes — validator proximity | no |
| fast-data rails | ShredStream, SWQoS staked lanes, DoubleZero fiber | FIBRE / compact-block relays | bloXroute BDN, relay colocation, mempool streams | bloXroute BDN | none needed |
| frontier | act on shreds mid-slot | mining latency (stratum, pool hops) | ePBS, preconfirmations | sub-second finality tuning | n/a |
| delta strip | — | "BTC's race is measured in exahashes, not microseconds." | "ETH's 12 s slot forgives a slow network; Solana's 400 ms does not." | "The closest analog to Solana's arms race — one order of magnitude behind." | "A 75 s private chain has no latency game at all — that's the point." |

### 2.4 Mini-diagram specs (one per chain per section — 16 small SVGs, templated)

Keep each to ≤ 8 shapes + 1 loop. Section templates:

- **topology:** SOL = mini Turbine tree (reuse, scaled). BTC = 4 miner nodes hash-racing (pulse opacity race, random winner flash). ETH = proposer slot wheel (12 segments, one highlights per 12s-scaled-to-2s loop). BNB = small ring of 9 validator dots with rotating "producer" marker. ZEC = same BTC template recolored + shield outline around mempool box.
- **txflow:** SOL = wallet→leader direct arrow (dot loop). BTC/ZEC = mempool box filling with dots, miner scoops top-fee dots each loop (ZEC dots rendered as outlines = hidden contents). ETH = mempool → builder box → proposer. BNB = mempool with fast drain (dots barely pool).
- **mev:** SOL = bundle→auction (reuse FIG 3.2 condensed). BTC = fee ladder with dots reordering by fee. ETH = builder-relay-proposer 3-hop with red searcher dots entering builder. BNB = sandwich rows compressed (reuse FIG 3.1 rows at 60% scale). ZEC = three opaque shielded notes crossing; a red searcher dot bounces off (one bounce loop).
- **latency:** all chains share one template — a horizontal "decision window" bar drawn to relative log length with a sweeping cursor; only data differs.

### 2.5 Acceptance

- Chain switch < 100ms perceived (data swap is DOM text, not re-render of dock shell).
- Full keyboard path: Tab to chip row → arrows to switch → Enter toggles → Esc closes dock.
- With JS disabled or anime absent: docks render open-collapsed as plain stacked tables (content in DOM, `hidden` attr removed by JS — so no-JS shows everything).
- No layout shift of surrounding section when a dock opens (dock lives in normal flow; page grows downward only).

---

## SPEC 3 — CH-05: Cross-chain bench (tools & techniques)

### 3.1 Placement & framing

New section after CH-04, before footer. Tag: `CH-05 · CROSS-CHAIN BENCH`, channel color `--violet`. Heading: **"Same game, different tables."** Sub: one paragraph noting that every chain with an ordering market grows the same organs — an auction, a protection rail, a fast-data feed — and this bench lays them side by side.

### 3.2 Component A — Technique × Chain heat grid (`FIG 5.1`)

The section's centerpiece: a matrix of trading techniques (rows) × chains (columns: SOL, ETH, BNB, BTC, ZEC — ordered by MEV activity, not alphabet).

- **Cell states:** `hot` (primary venue for the technique), `active`, `limited`, `none` — rendered as filled square / half square / outline / dash, in the chain's color at row hover, `--violet` at rest. Shape + fill encode state so color-blind safe.
- **Rows (with one-line definitions shown on the left, and a tap/click detail):**
  1. Atomic arbitrage — same-block multi-pool price closing → SOL hot, ETH hot, BNB active, BTC none, ZEC none
  2. Sandwiching — bracketing a victim swap → SOL active (private-flow dependent), ETH hot, BNB hot→active, BTC none, ZEC none
  3. Liquidations — racing to repay undercollateralized loans → SOL hot, ETH hot, BNB active, BTC limited (L2/sidechain only), ZEC none
  4. Backrunning — riding immediately after a known tx → SOL active, ETH hot (MEV-Share made it a market), BNB active, BTC none, ZEC none
  5. JIT liquidity — flashing LP depth around a big swap → SOL active, ETH hot (Uniswap v3 native), BNB limited, BTC none, ZEC none
  6. CEX–DEX arb — off-chain vs on-chain price gaps → SOL hot, ETH hot, BNB active, BTC limited (venue-to-venue only), ZEC limited
  7. Spam / probabilistic racing — duplicate-flooding for placement → SOL hot (declining with SWQoS pricing), ETH limited, BNB active, BTC none, ZEC none
  8. Mint / launch sniping — first-block buys on new listings → SOL hot (memecoin launchpads), ETH active, BNB active, BTC limited (ordinals-era), ZEC none
- **Detail interaction:** tapping a cell opens a document-layer, fixed popover directly above or below that cell with 2–3 sentences: how the technique manifests on that chain + which tool from Component B enables/defends it (cross-link by tool id, scrolls-to + flashes the tool card). Placement flips toward the roomier side, clamps horizontally to the viewport, and caps its own scrollable height so a figure's `overflow:hidden` boundary can never clip it. This target relationship remains intact on mobile.
- **Animation:** on section reveal, cells cascade in diagonally (anime stagger `grid` mode, 24ms). Row hover: that row's cells tick up 1.06 scale. One-time, then static.
- **Mobile:** grid stays a grid (it's the whole point) — 8×5 fits at 390px with 36px cells and rotated column glyphs (chain glyph, not name). Left definitions collapse to icon-only; tapping the row label opens the definition as the first popover line.

### 3.3 Component B — Tool bench (`FIG 5.2` + card grid)

A filterable card grid of the comparable tooling, grouped by **function** (the comparison axis), each card carrying chain badges:

| function | SOL | ETH | BNB | BTC | ZEC |
|---|---|---|---|---|---|
| Ordering auction | Jito Block Engine (bundles + tips) | Flashbots MEV-Boost / BuilderNet | bloXroute / 48Club validator rails | out-of-band accelerators (miner-direct) | — |
| Protection RPC | Jito MEV-protect endpoints | Flashbots Protect, MEV Blocker | 48Club Privacy RPC, bloXroute protect | n/a (RBF hygiene) | protocol-level (shielded pool) |
| Order-flow auction / intents | Jupiter (routing + limit/DCA) | CoW Swap, UniswapX, 1inch Fusion | 1inch, KyberSwap | — | — |
| Fast data feed | Jito ShredStream, Geyser plugins | bloXroute BDN, relay streams, mempool ws | bloXroute BDN | FIBRE / compact relays, mempool.space APIs | standard p2p |
| Priority market | priority fees per CU + Jito tips | EIP-1559 tips + builder bids | gas tips + private bids | sat/vB fee market | minimal fee market |
| Node/client edge | Firedancer, SWQoS stake, DoubleZero | ePBS research, preconfirmations, Reth/erigon perf | fast-finality client tuning | Stratum v2 | — |

- **Card anatomy:** function tag (mono), tool name (Chakra Petch), one-sentence role, chain badge row (colored ticks + glyphs), and an `EXTRACT / PROTECT / NEUTRAL` stance chip (red / green / dim) — because the bench must keep v1's dual framing that every tool sits somewhere on the extraction↔protection axis.
- **Filters:** chip row — by chain (reuses comparator chip component from Spec 2) and by stance. Filtering animates via FLIP-lite: fade+scale out removed cards (180ms), reflow, fade in (anime; reduced-motion = instant). "All" resets.
- **Delta strip** at bench bottom (one sentence, violet): "The tools converge because the problem converges: wherever ordering is worth money, someone builds the auction, someone sells the shield, and someone lays the fiber."

### 3.4 Data model

Extend the same inline JSON: `"techniques": [ {id, name, def, cells:{sol:"hot",eth:"hot",bnb:"active",btc:"none",zec:"none"}, notes:{sol:"…", …}} ]` and `"tools": [ {id, fn, name, chains:["sol"], stance:"extract|protect|neutral", blurb, links_technique:[ids]} ]`. Popovers and cards render exclusively from this block.

### 3.5 Acceptance

- Grid readable at 360px with no horizontal page scroll.
- Every cell popover reachable by keyboard (`button` cells, `aria-expanded`, popover as `role="dialog"` with focus trap + Esc).
- Cross-links (cell → tool card) scroll with `scroll-margin-top` respecting the slot bar and flash the card border once (600ms).
- Section adds ≤ 40KB to the file and ≤ 1 new persistent animation loop (the cascade is one-shot).

---

## Build order & QA

1. Spec 1 global systems (tokens, bloom, tinting, viewport-pause) — everything later inherits them.
2. Spec 1 mobile diagram variants (pipeline vertical is the long pole).
3. Spec 2 dock shell + JSON + topology content, then remaining three sections.
4. Spec 3 grid, then bench, then cross-links.
5. QA matrix: 360 / 390 / 430 / 768 / 1200 widths × {motion on, reduced motion, anime-CDN blocked, JS off} — the last two must still show all content statically.
