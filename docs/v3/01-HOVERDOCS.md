# 01 — HOVERDOCS: the hover-based documentation system

> **Status:** implemented 2026-08-14 — acceptance passed
> **Owner lane:** `A` (see `08-ORCHESTRATION.md`)
> **Depends on:** `04-STYLE-READABILITY.md` foundations (Overlay, termify zones, tokens)
> **Pattern source:** `~/Code/frauthy/brand` — the three-tier tooltip ladder
> (`packages/css/src/components/term.css`, `packages/solid/src/Tooltip.tsx`),
> the auto-linking glossary (`portal/src/components/KeywordGlossary.tsx`,
> `portal/src/data/glossary.ts`), and the headless positioning engine
> (`packages/behaviors/src/overlay-position.ts`)

---

## 0. Objective

Every technical term on the page — Turbine, PoH, Sealevel, Gulf Stream, SWQoS,
Jito, RANDAO, PBS, EIP-1559, RBF, Equihash, blob sidecars, MEV-Boost, FIBRE,
Stratum v2, Alpenglow, preconfirmations, CoW, intents, … — becomes a live
reference: hover shows an aesthetic scope-styled tooltip with a definition and
a house framing line; click pins it open with external links and an "OPEN
CHANNEL ▸" jump into the term's entity page (`05-ENTITY-PAGES.md`).

## 1. Data model (in `#chainData`, new top-level key)

```json
"terms": {
  "poh": {
    "term": "Proof of History",
    "aliases": ["PoH", "Proof of History", "PoH clock", "PoH stream"],
    "def": "A continuous SHA-256 hash chain that acts as a verifiable clock: events are ordered by where they land in the stream, before consensus.",
    "purpose": "It is why Solana can skip a mempool — time itself is part of the data structure.",
    "links": [
      {"label": "Solana docs — PoH", "url": "https://docs.solana.com/...", "kind": "official"},
      {"label": "Anza blog", "url": "https://...", "kind": "research"}
    ],
    "entity": "poh"
  }
}
```

- `def` vs `purpose` split copied from frauthy's `glossary.ts`: `def` is the
  neutral definition, `purpose` is the *house framing* — why it matters on this
  page. Tooltip renders both; `purpose` is set in the section's channel color.
- `aliases` feed the auto-linker; longest alias wins (frauthy rule).
- `entity` is optional — terms without a deep page render no OPEN CHANNEL row.
- Initial corpus: ≥ 40 terms. Author them during lane A; entity cross-links may
  point at ids that ship later in lane E (dangling ids render as plain text
  link-less until the entity exists — never a broken route).

## 2. Auto-linker (`termify()` — shared primitive from 04, configured here)

Replicate `KeywordGlossary.tsx` mechanics in vanilla JS:

1. Build one regex from all aliases, **sorted longest-first**, word-boundary
   anchored, case-sensitive for all-caps aliases (PoH ≠ poh) and
   case-insensitive otherwise.
2. Walk text nodes with `TreeWalker(SHOW_TEXT)` under `.wrap`, **rejecting**
   nodes inside `a, button, code, pre, script, style, svg, h1, .term,
   [data-no-term]`, the slot bar, and `.dock-fallback`.
3. Wrap matches in `<button class="term" data-term="<key>">` (a button — it is
   interactive; frauthy's span+tabindex is the fallback shape, ours is richer).
4. **First occurrence per term per section is bindable; later occurrences in
   the same section render the dotted underline at 40% strength and are not
   tabbable** (adapted from frauthy's first-occurrence-only tabbability — we
   scope per section, not per page, because sections are long).
5. Run once over static DOM at init, and once over each JS-rendered fragment
   (dock columns, grid popovers, bench cards, entity pages) at render time.
   Never re-run over already-termified content (guard attribute).
6. Explicit `data-term="key"` markup in static HTML always wins over scanning.

## 3. Tooltip component ("REF card")

One shared singleton element (frauthy: one delegated listener set on
`document`, one tooltip node — replicate exactly). Two interaction tiers:

- **Hover/focus (preview):** 120ms intent delay (frauthy default) → card shows
  kicker + term + `def` + `purpose`. Dismiss 100ms after pointer leaves both
  trigger and card, so the card itself is hoverable. `Esc` dismisses.
  **Touch-emulation guard:** suppress emulated mouse events for 800ms after
  `touchstart` (port `createHover`'s `emulatedMouseThreshold`) — tap must not
  phantom-hover.
- **Click/tap/Enter (pinned):** card pins open (adds links + OPEN CHANNEL row),
  becomes the active Overlay layer (focus moves in, Esc/outside-click closes,
  focus returns to trigger). On <700px, pinning uses the Overlay bottom-sheet
  variant (same sheet as grid popovers).

### 3.1 Visual spec

Scope aesthetic, not generic tooltip:

- Panel-2 ground, 1px border in `color-mix(in srgb, var(--ch) 45%, var(--line))`
  — the tooltip inherits the **section's** channel color, so a term hovered in
  CH-03 glows red-edged, in CH-01 cyan-edged.
- Corner ticks (reuse `.corner`), and a mono **kicker line**:
  `REF · <TERM-KEY>` at 9px, letter-spaced .14em, `--faint` (kicker pattern
  lifted from frauthy's `.ttl`).
- Body: `def` in `--ink` at .84rem; `purpose` on its own line prefixed `▸ ` in
  the channel color; links as mono rows with `↗`, `kind` tag right-aligned
  (`OFFICIAL / DOCS / EXPLORER / RESEARCH`).
- Pointer: 1px beam line from card edge to trigger midpoint (not a triangle —
  a scope callout line), drawn with a rotated 1px div; skip when flipped
  position makes it cross text.
- Trigger resting state: dotted underline via `text-decoration: dotted` +
  `text-decoration-color: color-mix(in srgb, var(--ch) 66%, transparent)`,
  `text-underline-offset: .22em`, `cursor: help` (frauthy portal recipe —
  lighter than border-bottom). Hover/focus: decoration solid, full channel
  color. No layout shift on hover.

### 3.2 Positioning

Port frauthy's `computeOverlayPosition` geometry (flip / shift / arrow offset /
padding) as a ~120-line pure function in the 04 foundation; HOVERDOCS consumes
it with `placement: 'top'`, `offset: 10`, viewport boundary, flip-to-bottom
when `rect.top` is inside the top 250px (frauthy heuristic), clamp with 12px
gutters. Re-position on scroll/resize while open (capture-phase listener).

## 4. Accessibility

- Preview card: `role="tooltip"`, trigger `aria-describedby` while visible.
- Pinned card: Overlay dialog semantics (`role="dialog"`, `aria-label` =
  term name, focus trap, Esc, focus return).
- Triggers are real `<button>`s: Enter/Space pins; the term is announced with
  its text content only (no "button term" noise — `aria-label` = term).
- The dotted underline is never the only affordance: `cursor:help` +
  focus-visible ring.

## 5. Degradation

- Reduced motion / CDN-fail: card opens/closes instantly (no anime); all else
  identical (positioning is not animation).
- JS-off: terms render as plain text (spans, no buttons — the `<button>`
  wrapper is injected by JS, so static HTML keeps clean prose). The glossary
  content is reachable via the CH-05 noscript appendix, which gains a
  **GLOSSARY table** (term / definition / primary link) generated from the same
  JSON at authoring time (mirror rule, `00-V3-PROGRAM.md` §2 invariant 3).

## 6. Acceptance criteria

- Hovering "Turbine" in CH-01 prose shows the REF card within 200ms of intent
  delay, cyan-edged; the same word inside `FIG 1.1` SVG text is untouched.
- Tap on iPhone-width: no phantom hover; first tap pins the bottom sheet with
  links; Esc/scrim closes and focus returns.
- Keyboard-only: Tab reaches the first "Sealevel" in CH-02, tooltip shows on
  focus, Enter pins, Tab cycles links, Esc returns focus.
- No tooltip is ever clipped by the viewport at 360/390/430/768/1200.
- `termify()` runs over a freshly opened BTC dock and binds terms inside
  metric values (e.g. "RBF") exactly once.
- With anime CDN blocked: cards open instantly and are fully functional.
- Zero duplicate bindings after opening/closing docks 10× (idempotence guard).
- Term corpus ≥ 40 entries, every entry with ≥ 1 primary-source link.
