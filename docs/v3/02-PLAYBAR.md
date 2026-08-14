# 02 — PLAYBAR: the read/play-through transport bar

> **Status:** specified, not started
> **Owner lane:** `B` (see `08-ORCHESTRATION.md`)
> **Depends on:** `04-STYLE-READABILITY.md` foundations (Store, cue zone, tokens)
> **Pattern source:** `~/Code/frauthy/brand/packages/solid/src/ReadingToolbar.tsx`
> (scroll-spy band, persisted reading scale, self-healing section list) and
> `~/Code/frauthy/site/packages/ui/src/education.tsx` `ImplementationCycler`
> (the complete autoplay stop-condition set)

---

## 0. Objective

A fixed transport bar that turns the page into an instrument you can *run*:
press play and the scope walks itself through every figure in order, dwelling
long enough to read, restarting each figure's animation as it arrives, opening
docks it wants you to see. Prev/next step through cues manually. The same bar
carries reading progress and an A−/A/A+ reading-scale stepper.

## 1. Anatomy

```
        ┌──────────────────────────────────────────────────────────┐
        │ A− A A+ │ ⏮ │ ⏵/⏸ │ ⏭ │ ▁▂▃ CH-02 · FIG 2.1  06/24 │ ≡ │
        └──────────────────────────────────────────────────────────┘
          scale     prev play  next   segmented progress + cue     list
```

- Fixed bottom-center, ≥700px: full pill. <700px: compact — play/pause,
  prev/next, progress line only; scale stepper moves into the cue-list sheet.
- Styling: slot-bar family (panel ground, 1px line border, backdrop blur w/
  `@supports` fallback, mono microtype). The progress strip is **segmented by
  channel color** — cues within CH-01 render cyan ticks, CH-03 red, etc., so
  the bar reads like a multichannel timeline of the page.
- The `≡` toggle opens the **cue list** (Overlay sheet): every cue with its
  channel tag, title, and dwell estimate; click to jump (frauthy's expandable
  section panel, adapted).
- Idle state (never played): the bar renders slim (progress line + play only)
  until first interaction, so it doesn't compete with the boot sequence.
  It mounts after boot completes or on first scroll, whichever first.

## 2. Cue system

Cues are declared in `#chainData` (`"cues": [...]`, ordered), not scraped from
the DOM, but each cue names a DOM anchor:

```json
{"id": "fig-2-1", "anchor": "#pipeSvg", "ch": "ch2",
 "title": "FIG 2.1 · signal path", "dwellMs": 9000,
 "action": "restart-figure"}
```

- Cue actions (enum): `none` (scroll only), `restart-figure` (re-fires that
  figure's animation from the `started` registry), `open-dock:<chain>` (opens
  that section's dock on a named chain, closes it on cue exit),
  `cascade` (CH-05 grid), `flash-legend`.
- Anchor resolution is **self-healing** (frauthy rule): cues whose anchor is
  missing are silently dropped from the run — the bar must never point at
  nothing. The mobile/desktop figure variants resolve via the same
  `isVis()` helper the animations use.
- Initial cue plan (~24 cues): hero trace → hero stats → each CH: intro
  paragraph → each figure → its dock (open on the most instructive chain:
  topology→eth, txflow→btc, mev→eth, latency→bnb) → CH-05 grid → one grid
  popover (sandwich × sol) → bench (filtered to PROTECT) → delta → footer.
- Dwell: `dwellMs` from JSON, else computed `max(4s, words × 240ms)` from the
  anchor's text content. A cue with an open dock adds the dock's word count.

## 3. Playback state machine

`idle → playing ⇄ paused → done`, plus `manual` (prev/next while paused).

- **Play:** smooth-scroll to current cue (center band), run its action, start
  dwell timer, tick the progress segment; on dwell end, advance.
- **Stop conditions** (the full `ImplementationCycler` set, verbatim policy):
  pause on user `wheel` / `touchmove` / keyboard scroll (grab-the-wheel
  rule), on `document.hidden`, on focus entering any interactive control
  outside the bar; **permanent stop** of auto-advance after the user manually
  selects a cue from the list (they've taken the wheel); refuse to autoplay
  at all under `prefers-reduced-motion` — play button instead steps cue-by-cue
  with instant jumps.
- **Scroll-spy** keeps the bar honest while idle/paused: IntersectionObserver
  with `rootMargin: '-45% 0px -50% 0px'` (frauthy's centered band) marks the
  nearest cue as current, so prev/next are always relative to where the reader
  actually is.
- Resume: current cue index persists via `Store` (`scope.v3.playbar.cue`);
  reload offers "RESUME @ CH-03" as a ghost chip on the bar for one session
  (sessionStorage), never auto-scrolls on load.

## 4. Reading scale (A− / A / A+)

Frauthy's mechanism, ported: the stepper writes an index (0–4 →
0.85/1/1.1/1.25/1.4) to `Store` (`scope.v3.reading.scale`) and sets
`--reading-scale` on `documentElement`. **04-STYLE-READABILITY converts the
page's body-copy type sizes to `calc(size × var(--reading-scale, 1))`** —
display type (h1, watermark, panel labels) and SVG text are exempt (figures
must not reflow). A 3-line inline `<head>` script applies the persisted value
before first paint (no FOUC; port frauthy's `readingPreferencesInitScript`
shape — dependency-free, escapes `<`).

## 5. Keyboard

Bar-focused: `Space` play/pause, `←/→` prev/next cue, `Home/End` first/last,
`Esc` collapses cue list. Global shortcuts **off by default** (frauthy note:
"global shortcuts must be explicit and discoverable") — a `⌨` toggle in the
cue list arms `j/k` + `Space` globally, guarded against
INPUT/TEXTAREA/SELECT/contentEditable and any modifier key; state persists.

## 6. Degradation

- Reduced motion: no smooth scroll, no autoplay; prev/next/list all work with
  instant jumps. Dwell timers never run.
- CDN-fail: identical to reduced motion (cue actions that restart figures
  no-op silently — the figures are static).
- JS-off: the bar does not exist (it is injected by JS; zero static footprint
  beyond its CSS). No content depends on it.

## 7. Acceptance criteria

- Play from idle at the hero walks all cues in order; every figure's animation
  visibly restarts as its cue arrives; docks open and close on schedule; the
  run ends at the footer with the bar showing `done` and offering `⟲ replay`.
- Wheeling mid-play pauses within one frame; play resumes from the *nearest*
  cue to the current scroll position, not the interrupted one.
- Manual cue selection permanently disables auto-advance for the session.
- `prefers-reduced-motion`: pressing play never scrolls smoothly and never
  auto-advances; stepping works.
- A+ twice: body copy scales to 1.25 with no figure overflow at any QA width;
  reload shows the scaled size with no flash of unscaled text.
- Bar and cue list fully operable by keyboard; global shortcuts only after
  explicit opt-in.
- Progress segments color-match their channels; current cue readout always
  matches the scroll-spy section while idle.
- Page weight: PLAYBAR CSS+JS ≤ 12 KB raw.
