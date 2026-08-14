# 03 — NOTES: click-in-place field notes

> **Temporary UI status (2026-08-14):** hidden pending interaction repair.
> Existing local note records are preserved; no migration or deletion runs.

> **Status:** implemented 2026-08-14 — acceptance passed; 12,286 B CSS+JS
> **Owner lane:** `C` (see `08-ORCHESTRATION.md`)
> **Depends on:** `04-STYLE-READABILITY.md` foundations (Overlay, Store, anchor ids)
> **Pattern source:** none — frauthy has **no** user-annotation feature (its
> `Note.tsx` is a static author-time callout; verified 2026-08-13). This spec
> is a fresh design; persistence conventions follow frauthy's
> `localStorage` discipline (namespaced, versioned, schema-guarded).

---

## 0. Objective

Take notes *on the instrument itself* while reading: arm note mode, click any
panel/paragraph/card/figure, and a measurement-callout note pins to that spot.
Notes persist locally, survive reloads and content updates where possible,
collect in a drawer, and export as markdown.

## 1. Anchoring model (the hard part, decided up front)

Free-coordinate pins break on reflow. Notes anchor to **stable elements**:

- The 04 foundation stamps `data-note-anchor="<stable-id>"` on every
  anchorable element: sections, `.ch-sub`, panels, figures (each SVG), cards,
  notes-list items, dock mounts, `.dm-row`s (id = section+metric key), grid
  rows (technique id), bench cards (tool id), field-note `li`s. Ids are
  **content-derived, not positional** (`ch3.fig-3-1`, `dock.mev.row.ordering-
  market`, `tool.jito-be`) so DOM reordering doesn't orphan notes.
- A note = anchor id + optional **offset fraction** within the element
  (clicked y / element height, for tall elements like the vertical pipeline).
- Same-anchor notes stack into one pin with a count badge.
- Orphan policy: a stored note whose anchor id no longer exists renders in the
  drawer under `⚠ UNANCHORED` (never silently dropped), with its captured
  context line and a "re-pin" action (arms note mode; next click re-anchors).

## 2. Interaction

- **Arming:** `◉ NOTES` toggle in the slot bar (desktop: after nav; mobile: in
  the chip row). Armed state tints the cursor (`crosshair`) and shows a thin
  channel-colored scanline following the pointer's y — the scope's measurement
  cursor. `Esc` disarms. Armed mode suppresses term tooltips and dock toggles
  on first click (the click is consumed by note placement).
- **Placing:** click → pin drops (glyph `◉`, section channel color, 22px hit
  target 44px) at the element's right gutter, aligned to click-y; the editor
  card opens (Overlay: anchored card ≥700px, bottom sheet <700px).
- **Editor card:** mono header `NOTE · <anchor-id> · <timestamp>`; plain
  textarea (autofocus, `⌘/Ctrl+Enter` saves, `Esc` cancels); captured
  **context line** (first 80 chars of the anchor's text) rendered dim above
  the textarea; SAVE / DELETE. Markdown allowed in the body, rendered on
  display with the same `em()`-grade mini renderer (bold/italic/code/links).
- **Reading state:** pins render always (not just in armed mode) at 55%
  opacity, full opacity on hover/focus; click opens the note read-view with
  EDIT. Pins are `<button>`s, Tab-reachable, `aria-label="Note on <anchor>"`.
- **Drawer:** `◉ n` count in the slot bar opens the notes drawer (Overlay
  panel, right side ≥700px / sheet <700px): all notes grouped by channel,
  each with context line + first note line; click scrolls to the pin and
  flashes it (reuse the 600ms bench flash). Drawer footer: EXPORT ▾
  (markdown / JSON), IMPORT (JSON), CLEAR ALL (typed confirmation).

## 3. Persistence

- `Store` namespace `scope.v3.notes`, schema:
  `{v: 1, pageRev: "<data-rev>", notes: [{id, anchor, frac, body, createdAt,
  updatedAt, context}]}`.
- `pageRev` comes from a `data-rev` stamp on `<body>` (04 foundation bumps it
  when `#chainData` meaningfully changes). On rev mismatch, notes load
  normally but the drawer shows `PAGE REVISED SINCE NOTES — CHECK ANCHORS`
  once; orphan handling (§1) does the rest.
- localStorage unavailable (private mode): in-memory store + persistent badge
  `NOTES · SESSION ONLY` in the drawer header. Never throw.
- Size guard: 200 KB soft cap; at cap, block new notes with an export prompt.

### 3.1 Export format (markdown)

```markdown
# SOLANA//SCOPE — field notes · exported 2026-08-13T21:04Z
## CH-03 · MEV
- **[fig-3-1 · sandwich rows]** (2026-08-13 14:02)
  The menace pulse reads better at 60% — try on grid too?
```

JSON export is the raw store object (re-importable, merge by note id,
newer `updatedAt` wins).

## 4. Visual spec

Notes are **scope measurement callouts**, not sticky notes: pin `◉` with a
1px dashed leader line to the anchor's edge; editor/read card in panel-2 with
corner ticks, amber left rule (notes are always amber — a sixth "operator"
channel, independent of section tint, so your own marks are instantly
distinguishable from page content); mono microtype header; body in Plex Sans.
Reduced motion: no scanline cursor follower; pins/cards appear instantly.

## 5. Degradation

- Notes require JS by nature. JS-off: feature absent, zero static residue.
- CDN-fail: fully functional (no anime dependency — transitions are CSS).
- Reduced motion: as above.

## 6. Acceptance criteria

- Arm → click the BANKING stage of the vertical pipeline on a 390px viewport →
  sheet editor opens; save → pin renders at the right of the figure at the
  clicked height; reload → pin and note persist.
- Notes on a `.dm-row` inside a dock survive the dock closing/reopening and
  chain-switching (pin hides with its hidden anchor, returns when visible —
  bound to element presence, rechecked on dock open).
- Drawer lists notes grouped by channel; jump-to scrolls and flashes; export
  produces the §3.1 markdown; JSON round-trips (export → clear → import →
  identical drawer).
- Orphaned note (simulate by editing an anchor id in devtools + reload)
  appears under UNANCHORED with re-pin working.
- Private-mode fallback: notes work in-session, badge shows, no exceptions.
- Keyboard-only pass: arm via slot-bar toggle, place via Enter on a focused
  anchorable element (armed mode makes anchorables focusable), edit, save,
  reopen from drawer.
- Term tooltips and dock chips never fire on the placing click while armed.
- NOTES CSS+JS ≤ 12 KB raw.
