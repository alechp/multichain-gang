# 05 — Interaction, visual system, responsive behavior, and accessibility

## 0. Design intent

The page should feel like a second instrument on the same bench as
`SOLANA//SCOPE`, not a Robinhood app imitation and not a green dashboard
template.

The visual metaphor changes from a slot oscilloscope to a settlement analyzer:

- Robin Neon marks the sequencer/soft-state plane;
- cyan marks data publication and transport;
- violet marks Ethereum settlement;
- amber marks governance, bridge, and delayed processes;
- red marks dispute, screening, risk, or conflict; and
- neutral gray marks inference, provider-specific behavior, and unavailable
  evidence.

The most important visual relationship is the growing distance from soft
receipt to hard settlement. Atmosphere may support that story but never replace
labels, evidence, or static semantics.

## 1. Tokens

Reuse existing Scope tokens and add only namespaced Robinhood-page aliases:

```css
:root {
  --rhc-bg: #07090b;
  --rhc-panel: #0d1115;
  --rhc-panel-raised: #121820;
  --rhc-text: #eef3f6;
  --rhc-muted: #a8b2b9;
  --rhc-rule: #2a343c;
  --rhc-soft: #ccff00;
  --rhc-posted: #46d8f4;
  --rhc-final: #a8a7ff;
  --rhc-delayed: #f0c36c;
  --rhc-risk: #ff8b82;
  --rhc-focus: #ffffff;
}
```

`#CCFF00` is a signal color, not a logo treatment. It appears on no more than
one dominant element per panel. Large neon fills use black text; neon body text
on black is limited to short labels that pass contrast. Status is never color
alone.

Chapter colors remain stable to preserve Scope muscle memory:

| Chapter | Channel color | Robinhood semantic overlay |
|---|---|---|
| CH-01 topology | cyan | Robin Neon sequencer nodes inside cyan system map |
| CH-02 transaction flow | amber | Robin Neon soft branch, cyan/violet later stages |
| CH-03 MEV | red | Robin Neon queue order; red visibility/risk paths |
| CH-04 latency | green/violet | four independently labeled clock markers |
| CH-05 bench | violet | chain colors only as secondary accents |

## 2. Typography and prose

Reuse the existing display, readable sans, and mono families.

- Hero: `clamp(2.6rem, 7.5vw, 5.4rem)`, 0.9–1.0 line height.
- Chapter headings: `clamp(2rem, 4.8vw, 4rem)`.
- Body: 17–18 px desktop, 16–17 px mobile, 1.6 line height.
- Long prose measure: 66ch maximum.
- Mono labels: 12 px minimum desktop, 13 px mobile.
- SVG text: 12 rendered px minimum mobile; labels that cannot fit move outside
  the SVG into semantic legends.
- Reading-scale controls affect body copy, cards, tables, and entity prose but
  not SVG geometry or display type.

Do not set long paragraphs in uppercase or mono. Technical values and states
use mono; explanations use the readable sans.

## 3. Panel and trace language

Retain the restrained Scope instrument treatment:

- dark panel ground with one inset top highlight;
- 1 px rules and corner registration marks;
- faint graph paper/scanline texture only above 700 px and removed under
  reduced motion;
- a single channel-colored ambient radial bloom near the teaching focus;
- trace underglow below a crisp foreground line; and
- no glass-card stacks, crypto coin art, candlestick wallpaper, gradients that
  imitate Robinhood product UI, or partner-logo collage.

All generated figures are text/shape diagrams. Do not use an AI-generated or
synthetic Robinhood Chain mark. Do not stylize a feather-like icon as an
unofficial chain symbol.

## 4. Hero behavior

### 4.1 Boot sequence

One-time, skippable, maximum 1.8 seconds:

1. fixed clock bar and sweep appear;
2. kicker clips in;
3. heading lines rise and settle;
4. trace grid draws;
5. `SUBMIT`, `SOFT`, `POSTED`, and `FINAL` nodes appear in that order; and
6. four stat values appear without a count-up animation that would imply live
   measurement.

Scrolling, pointer interaction, keypress, reduced-motion preference, or missing
animation library skips directly to the static end state.

### 4.2 Clock selector

The fixed bar's clock control is a disclosure/listbox-like menu built with
button + menu semantics or a modal settings panel on mobile. It does not
autocycle because changing a latency label while a reader is using it is
distracting and can be mistaken for telemetry.

Selecting a clock:

- updates the bar label;
- focuses/highlights the corresponding hero trace node;
- changes the bar accent;
- announces `<label>, <timing>, <guarantee>` in a polite live region; and
- does not change any factual content or comparison state.

`WITHDRAWAL` always announces `separate from transaction finality`.

## 5. Compare docks

Reuse the current compare dock component with a Robinhood-first baseline.

- Dock toggle is always visible and at least 44×44 px.
- Chain selector is a real tablist with full accessible names.
- Baseline and selected diagrams share a phase registry so a replay animates
  equivalent causal stages, not simultaneous decorative loops.
- Selected chain and open/collapsed state may persist per session; factual
  content never depends on storage.
- Dock opening grows normal document flow downward; no overlay covers chapter
  prose.
- Source dates and evidence labels are visible in every open dock, not hidden
  in a tooltip.
- Missing values use explicit vocabulary, not blank cells.

On mobile, the baseline card comes first, selected chain second, exact-field
rows third. A sticky `ROBINHOOD CHAIN BASELINE` subhead may be used; never a
shorthand.

## 6. CH-03 visibility map

The four route lanes use the same anatomy so readers compare exact fields:

```text
ROUTE NAME
PRE-TRADE VISIBILITY
ORDERING / FILL MECHANISM
ONCHAIN SETTLEMENT
DEPENDENCIES / FAILURE MODES
```

Hovering a role highlights every lane that role may observe. Focus and tap do
the same. “May observe” is explicit; the UI must not turn an inference into an
access-control fact.

The map is not a Sankey with widths—there is no source-backed market-share
quantity. Every lane has equal visual weight.

## 7. CH-04 ladder

Use a conceptual logarithmic axis whose ticks are labeled:

```text
1 ms · 10 ms · 100 ms · 1 s · 10 s · 1 min · 10 min · 1 h · 1 d · 7 d
```

Protocol stages snap to documented categories. Provider/operator examples use
outlined markers and may not be positioned without an exact measurement. If a
numeric marker is illustrative, place it in an `ILLUSTRATIVE` band rather than
on the authoritative protocol rail.

The ladder supports a details toggle:

- `USER VIEW`: soft, posted, final, withdrawal;
- `ENGINEERING VIEW`: input, decision, RPC, receipt, feed, node, indexer, post,
  final, hedge.

The default is `USER VIEW`. The chosen view persists locally but is encoded in
URL state when shared.

## 8. CH-05 grid and bench

### 8.1 Technique grid

Desktop:

- sticky technique labels;
- sticky baseline column;
- 44 px minimum cells;
- state word or accessible abbreviation plus shape, not color alone;
- row hover/focus highlights exact comparison without dimming text below AA;
- selecting a cell opens an anchored detail card with definition, note,
  evidence state, linked tool, and entity route.

Mobile:

- technique name is a full-width row header;
- six chain cells form an explicitly labeled inner horizontal scroller if they
  cannot fit at 360 px;
- scroll area has visible edge fade, `SCROLL CHAINS →` hint, and keyboard
  access;
- the document itself never scrolls horizontally; and
- detail card becomes a bottom sheet through the shared Overlay primitive.

### 8.2 Tool bench

Filter order:

```text
CHAIN · FUNCTION · STANCE · EVIDENCE · RESET
```

Default chain filter is Robinhood Chain; `ALL CHAINS` is an explicit choice.
Cards show:

- tool/mechanism name;
- function;
- scope (`native L2`, `cross-chain`, `service`, `protocol-level absence`);
- state and checked date;
- one-sentence teaching role;
- evidence/unknown label;
- risk/dependency tokens;
- `DETAILS` route; and
- official source.

The `NO OFFICIAL PROTECTION RPC DOCUMENTED` card is outlined and labeled
`EVIDENCE BOUNDARY`; it cannot be selected as a tool for comparison.

The comprehensive 17-category tool inventory remains on its existing route and
may be linked as `OPEN VERIFIED LANDSCAPE`.

## 9. Hoverdocs and source cards

Hover/focus delay: 180 ms. Touch first tap pins; explicit actions open entity
or source. Each card contains:

- exact term;
- 1–2 sentence definition;
- why it matters here;
- status (`CONFIRMED`, `INFERENCE`, `NOT DOCUMENTED`, etc.);
- checked date for volatile facts;
- `OPEN CHANNEL` and `SOURCE` actions.

Hoverdocs never contain the only copy of a caveat. Full definitions live in
entity/detail content, and source status remains visible in tables.

The page reuses the global Link Veil preference if loaded within the existing
site shell. Link Veil may quiet optional detail-door decoration, but it never
hides official source links, evidence labels, warnings, navigation, focus
state, or accessible link text. Touch and JavaScript-off keep links visible.

## 10. Playbar/read-through

Reuse the existing playbar state machine and docking behavior.

- Idle → playing ⇄ paused → done; manual stepping remains available.
- Reading scale has five values and persists with safe storage fallback.
- Prev/next follows the ordered 26-cue data, not DOM scraping.
- Cue actions may restart a figure, highlight a stage, open a comparator, or
  filter CH-05.
- A cue-opened dock closes when advancing unless the reader interacted with
  it.
- Wheel, touch move, scroll keys, page hidden, or focus entering an outside
  interactive control pauses.
- Reduced motion turns Play into manual, instant cue stepping—no timers or
  smooth scroll.
- Desktop Escape first closes an overlay, then exits the engaged reader.
- Global j/k/Space shortcuts remain opt-in and never capture editors, grids,
  tablists, sliders, or open overlays.

The progress strip uses channel colors, not Robin Neon for every cue.

## 11. Entity, methodology, and source routes

Full-screen routes reuse one Overlay/Router implementation.

- Route header includes the project's `SCOPE` identity, kind, entity ID, close,
  and previous/next entity controls.
- Robinhood Chain is written in full in breadcrumbs.
- Content width is 72ch; signals may use a wider inner table.
- Background remains Scope graph paper; no official Robinhood layout mimicry.
- Opening/closing restores title, scroll, and focus.
- Internal related links replace the route without stacking multiple modal
  layers.
- Source route tables remain semantic and usable at 200% zoom.

## 12. Command palette

`Cmd/Ctrl+K` opens local search. It must:

- identify every result as channel, comparator, technique, tool, term, entity,
  article, source, or methodology;
- put exact Robinhood Chain results before generic Robinhood matches;
- exclude brokerage/trading API content not relevant to chain docs;
- preserve page state when opened/closed;
- support arrows, Enter, Escape, and typeahead without capturing browser
  shortcuts; and
- operate with deterministic substring search if Fuse is unavailable.

## 13. Notes and write behavior

The new page is read-only. Existing Scope field-note controls are currently
hidden while their interaction model is repaired; preserve that convention.
Do not expose notes controls merely because their runtime exists. Stored notes
from the Solana page are namespaced separately and never migrate implicitly.

If field notes are later enabled, the namespace is
`scope.robinhood.notes.v1`, anchors are page-specific, and no note is sent off
device.

## 14. Responsive specification

Breakpoints: `1100`, `900`, `700`, `480` px. Structural changes happen at 700
and 480.

| Surface | ≥700 px | <700 px |
|---|---|---|
| Fixed clock bar | brand, selected clock, sweep, chapter links | brand + clock first row; sweep second; chapter chips below hero |
| Hero trace | full four-stage lifecycle + detached exit lane | one complete lifecycle with larger text; exit list below if necessary |
| FIG 1.1 rollup stack | layered vertical/horizontal hybrid | dedicated tall vertical diagram; governance bracket at end |
| FIG 2.1 transaction path | horizontal pipeline with branches | dedicated vertical pipeline; receipt branch right, settlement continues down |
| FIG 3.1 FCFS race | three horizontal transport paths + queue | routes stacked, then queue; timings remain illustrative |
| FIG 3.2 visibility map | four equal columns | four accordions/stacked lanes, all labels visible without opening |
| FIG 4.1 ladder | two side-by-side rails | single tall log axis with rail toggle or aligned markers |
| Technique grid | sticky label + six chain columns | inner scroller or chain-by-chain cards; no document overflow |
| Tool bench | three-column cards | one column, filters disclosure below search/count |
| Compare dock | baseline/selected side by side | baseline then selected, exact fields stacked |
| Playbar | full pill | compact transport; scale/list in sheet |

Global mobile rules:

- use `dvh`, safe-area padding, and solid backdrop fallbacks;
- all targets at least 44×44 px;
- no information only on hover;
- no 10–12 px body copy;
- no full diagram uniformly shrunk below legible stroke/text sizes;
- loops pause offscreen and no parallax/CRT drift below 700 px;
- tables become labeled record cards or bounded scrollers while preserving
  semantic table DOM; and
- test landscape orientation as well as portrait.

## 15. Motion contract

Motion explains a transition and ends.

| Interaction | Duration | Rule |
|---|---:|---|
| Hero boot | ≤1800 ms total | one time, interruptible |
| Figure phase | 240–420 ms | one causal step; maximum 5 phases |
| Compare chain change | 180 ms | text crossfade only after atomic content swap |
| Dock expansion | 180 ms | clip/height; no text blur |
| Hoverdoc | 140 ms | opacity + 4 px rise |
| Route sheet | 200 ms | immediate scrim, bounded translation |
| Filter rows | 120 out / 180 in | preserve focus; stagger max 6 |
| Cue scroll | native/smooth | disabled under reduced motion |

No always-on blinking node, continuously orbiting validator, fake live block
counter, market ticker, background pan, autoplay carousel, or seven-day sweep.
The fixed top navigation remains motion-free after boot.

`prefers-reduced-motion: reduce` sets all nonessential durations to zero,
disables autoplay, renders diagrams at their complete static state, and keeps
every control operable.

## 16. Accessibility

### 16.1 Structure

- One `h1`; chapter `h2`; panel/entity subsections use ordered `h3`/`h4`.
- Landmarks: banner, chapter navigation, main, optional complementary source
  rail, footer.
- Skip link targets the active main document and is visible on focus.
- Tables use captions, column/row scopes, and descriptions of abbreviations.
- Definitions use `<dfn>` where appropriate but remain buttons/links only when
  interactive behavior is available.
- Figure captions and structured descriptions exist outside SVG text.
- `aria-live` announces clock selection, compare selection, filter count, and
  route title—never every animation phase.

### 16.2 Focus and overlays

- One shared Overlay owns focus trap, Escape stack, scrim, body lock, and focus
  restoration.
- Hoverdocs are non-modal; pinned source/detail cards receive focus and close
  on Escape/outside click.
- Route overlays are modal/full-screen and have a visible close control first
  and last in keyboard order.
- Focus is never moved merely because an IntersectionObserver or animation
  phase changes.
- Filtering out a focused record returns focus to the initiating control and
  announces the new count.

### 16.3 Contrast, zoom, and reflow

- WCAG AA minimum for all body/label text; aim AAA for long prose.
- Chain color is never the only status cue.
- Focus indicator is at least 2 px and survives high-contrast mode.
- 200% browser zoom preserves all controls/content without two-dimensional
  page scrolling.
- 400% zoom produces a single-column reflow; only explicitly labeled data
  matrices may scroll internally.
- `forced-colors` restores system borders and text; phosphor glows disappear.

### 16.4 Language

Abbreviations are expanded on first chapter use and in accessible names:

```text
first come, first served (FCFS)
Layer 1 (L1) / Layer 2 (L2)
Ethereum Virtual Machine (EVM)
real-world asset (RWA)
request for quote (RFQ)
```

BoLD, ArbOS, and protocol/EIP/ERC identifiers link to definitions.

## 17. Failure and degradation

| Failure | Required behavior |
|---|---|
| anime/CDN missing | all content/figures show complete static states; manual controls work |
| Fuse missing | deterministic local substring search |
| storage denied | defaults load; no crash; preferences last only for session |
| JavaScript off | complete semantic mirrors, glossary, entity/source indexes, ordinary links |
| malformed data | development audit fails; production keeps static HTML and disables affected interactive mount |
| unsafe URL | source label renders as text and audit fails |
| source stale/conflicted | fact excluded from headline slot; source route shows state |
| decorative asset missing | no broken-image icon or missing meaning |
| access gate enabled | same session-only casual gate; static hosting is still public and the UI must not call it authentication |
| route not found | readable in-page not-found surface with Home/Search |

## 18. Performance budget

Target budgets for the standalone page:

| Asset | Raw/gzip target |
|---|---:|
| `robinhood.html` core + inline data | ≤520 KB raw |
| page-specific CSS | ≤34 KB raw |
| page-specific JS | ≤48 KB raw, excluding reused shared files |
| any raster image | none required; ≤220 KB if approved later |
| first contentful static render | no dependency on JS/CDN |

No framework/build runtime is required. Fonts and anime remain optional
enhancements. Figures use inline SVG/CSS rather than image generation so the
brand-mark restriction and semantic fallback remain controllable.

## 19. UX acceptance

- A reader can distinguish soft, posted, final, and withdrawal in hero, CH-02,
  CH-04, every Robinhood compare cell, and no-JavaScript output.
- Every interactive surface has keyboard, touch, and static paths.
- No official mark is modified or synthetically recreated.
- The page never resembles an official Robinhood product or implies
  affiliation.
- All essential copy remains readable with reduced motion, CDN blocked,
  storage denied, and JavaScript off.
- 360/390/430/768/1200 px pass without document-level horizontal overflow.
- Screen-reader navigation exposes chapters, figures, tables, entities,
  sources, and disclaimers in logical order.
- Color, glow, and animation never carry an unspoken factual distinction.

