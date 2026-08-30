# 00 — PERSISTENT GLOBAL CHROME AND UNIVERSAL LINK VEIL

> **Status:** implemented
> **Version:** 1.1
> **Dated:** 2026-08-30
> **Applies to:** root readout, chain directory, chain hubs, Chain Tools directory, chain-specific tool landscapes, and entity/article readers
> **Primary surfaces:** `index.html`, `scripts/chain-index.js`, `scripts/chain-tools.js`, the entity router in `index.html`, shared Overlay/Router primitives, and the site audit suite

> **Implementation:** `scripts/global-chrome.js`, `styles/global-chrome.css`, and
> `scripts/audit-global-chrome.mjs`; shipped as page revision
> `v5-2026-08-30.3`.

## 1. Executive summary

SOLANA//SCOPE currently replaces the main site header when a routed chain,
tooling, or reference surface opens. The replacement rails provide useful local
controls—previous, next, Link Veil, and close—but they remove the stable
navigation context shown on the root readout. This makes a routed surface feel
like a separate application and forces a user to close it before reaching the
chapter navigation, Chains menu, or Find command.

This specification changes the chrome model from **replacement** to
**composition**:

1. The existing SOLANA//SCOPE global header remains mounted, visible, and usable
   on every routed surface.
2. Chain, tool, and entity routes retain a second, page-local control rail below
   the global header.
3. The Link Veil / reveal-hotkey preference becomes one shared site-wide capability and
   is represented on every page.
4. Only one Link Veil control is visible and focusable at a time. It appears in
   the global action area on the root readout and in the page-local rail on
   routed surfaces.
5. The global header is never cloned inside an overlay. A single canonical DOM
   instance remains above route shells, preventing duplicate IDs, listeners,
   state, and focus targets.

The local `←`, `→`, Link Veil, and `×` controls shown in the routed screenshots
remain valid. They become contextual controls underneath—not substitutes for—
the global navigation.

## 2. Problem statement

### 2.1 Current behavior

The root page exposes two tiers of global chrome:

- identity and utilities: `SOLANA//SCOPE`, cadence, sweep, `CHAINS`, and `FIND`;
- chapter sub-navigation: `CH-01` through `CH-05`.

The current full-screen route shells use `position: fixed; inset: 0` at a higher
stacking level than `.slotbar`. Opening `#/chains`, `#/tools`, `#/c/<slug>`,
`#/tools/<slug>`, or `#/e/<id>` therefore covers the global header. Each shell
then renders only its local rail.

The inconsistency is most visible on entity/article pages:

- `entity-slotbar` provides previous, next, and close;
- it has no Link Veil control;
- the Chains sub-navigation, Find command, brand/home route, and chapters are no
  longer reachable without leaving the page.

### 2.2 User impact

- Users lose location and product identity when entering a routed surface.
- Cross-surface navigation takes an unnecessary close-then-open sequence.
- `FIND` is absent exactly where users are reading the densest pages.
- Chapter links cannot be reached from a chain article or tool landscape.
- Link Veil appears on some route families but not others.
- A persisted Link Veil preference has no visible control on entity pages.
- Route rails look like application headers even though they only describe the
  current local context.

### 2.3 Desired behavior

The root and every sub-page must feel like one continuous documentation system.
The global header remains stable while the local rail changes with the route.

## 3. Goals

### PC-01 — Persistent global navigation

Keep the canonical global header visible and interactive on every JavaScript
route, including direct-loaded hash routes.

### PC-02 — Contextual route rail

Keep the existing route-local reference label, previous/next controls, Link
Veil control, and close control where they are useful.

### PC-03 — Universal Link Veil

Expose the shared Link Veil state on every page and make its behavior consistent
for every definition preview and supported secondary route affordance.

### PC-04 — One navigation system

Global controls must use the same Router, Overlay, Store, command index, and
focus lifecycle as the rest of the site. No second router or overlay manager is
allowed.

### PC-05 — Responsive continuity

The two chrome levels must remain understandable without horizontal document
overflow at 360, 390, 430, 768, and 1200 pixels, at 200% text zoom, and with
safe-area insets.

### PC-06 — Accessible escape and return

Users must be able to move into a route, use global navigation, close the route,
and return through browser history without losing scroll position or a logical
focus target.

## 4. Non-goals

- Do not redesign page content, tables, chain cards, or article prose.
- Do not remove the local previous/next/close controls.
- Do not turn chapter links into route tabs.
- Do not make the configured reveal modifier a navigation shortcut.
- Do not hide primary navigation, official sources, safety warnings,
  breadcrumbs, or primary calls to action behind Link Veil.
- Do not create different Link Veil preferences for chain pages, tools pages,
  and entity pages.
- Do not duplicate the global header markup inside each route shell.
- Do not introduce a framework, Shadow DOM, or a second state library.
- Do not change the existing access gate or deployment posture.

## 5. Terminology and ownership

| Term | Definition | Owner |
|---|---|---|
| Global header | Canonical SOLANA//SCOPE identity, cadence, Chains menu, Find, and chapter sub-navigation | Shared chrome controller |
| Global utility row | First row of the global header | Shared chrome controller |
| Chapter sub-navigation | `CH-01` through `CH-05`, always owned by the global header | Shared chrome controller |
| Route shell | Full routed content surface such as `chainChannel`, `toolsChannel`, or `entityChannel` | Existing route renderer |
| Context rail | Local sticky rail with route reference and contextual controls | Route shell |
| Link Veil | Site-wide, opt-in visual guard for hover previews and supported secondary route affordances | Shared Link Veil controller |
| Root surface | The main Solana readout with no route shell open | Base document |
| Routed surface | Any open chain, tool, or entity/article route shell | Router + Overlay |

The global header owns global movement. A context rail owns movement among local
siblings and closing the current route. These responsibilities must not be
mixed.

## 6. Required chrome hierarchy

### 6.1 Desktop structure

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ SOLANA//SCOPE   CADENCE 400 ms   [sweep]     [CHAINS⌄]   [FIND ⌘K]     │
├──────────────────────────────────────────────────────────────────────────┤
│               CH-01  CH-02  CH-03  CH-04  CH-05                         │
└──────────────────────────── global header ───────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ CH-REF · CHAIN · sol                     [←] [→] [VEIL ◉][CTRL TUNE] [×] │
└──────────────────────────── context rail ────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                         routed page content                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

On the root surface, the context rail is absent. The Link Veil control occupies
the root/global action slot:

```text
[CHAINS⌄] [VEIL ◉][CTRL TUNE] [FIND ⌘K]
```

On a routed surface, the root/global Link Veil instance is not visible or
focusable; the context-rail instance represents the same underlying state.

### 6.2 Single canonical header

The implementation must retain exactly one `.slotbar` in the DOM. It must:

- remain outside every route shell;
- remain mounted during all route changes;
- remain visible above `chainChannel`, `toolsChannel`, and `entityChannel`;
- retain the same `CHAINS` sub-navigation and `FIND` command entry points;
- retain one global chapter sub-navigation;
- never be re-created by a route renderer.

### 6.3 Route shell placement

Route shells must begin below the measured global header rather than cover it.

Required CSS contract:

```css
:root {
  --scope-global-h: 96px;
  --scope-context-h: 58px;
}

.chain-channel,
.tools-channel,
.entity-channel {
  position: fixed;
  inset: var(--scope-global-h) 0 0;
}

.chain-slotbar,
.tools-slotbar,
.entity-slotbar {
  position: sticky;
  inset-block-start: 0;
}
```

`--scope-global-h` must be measured with one shared `ResizeObserver` because the
global header changes height at responsive breakpoints, with text zoom, and
with safe-area padding. A fixed desktop number may be the CSS fallback only.

The observer must not run separately inside each route renderer.

## 7. Global header requirements

### 7.1 Identity and home behavior

- `SOLANA//SCOPE` becomes a real link or button with the accessible name
  `Return to the Solana readout`.
- Activating it closes any routed surface through Router/Overlay lifecycle and
  returns to the root top.
- If already on the root, it scrolls to the root hero without adding duplicate
  history entries.
- It must not hard-reload the document.

### 7.2 Cadence and sweep

- Cadence remains read-only instrumentation.
- It must not consume focus.
- It must remain static when the existing static/reduced-motion mode is active.
- Routed surfaces do not create a second cadence timer.

### 7.3 Chains sub-navigation

The single `CHAINS` button remains available on all routes and opens exactly two
destinations:

1. `CHAIN INDEX` → `#/chains`
2. `TOOL LANDSCAPES` → `#/tools`

Requirements:

- `aria-haspopup="true"`, `aria-expanded`, and `aria-controls` are required.
- Menu items use anchors because they are navigation destinations.
- `Escape`, outside pointer activation, and route change close the menu.
- Focus moves to the first destination when opened by keyboard.
- Closing with `Escape` restores focus to `CHAINS`.
- The menu may overlay the context rail, but must not be clipped by a route
  shell or scroll container.
- Its left edge aligns with the `CHAINS` trigger whenever viewport space allows;
  near a viewport edge it clamps to the 12 px safe boundary.
- The current destination receives `aria-current="page"` when applicable.

### 7.4 Find command

- `FIND` / `⌘K` or `CTRL K` remains available on all routed surfaces.
- Opening Find may layer above the current route shell.
- Closing Find restores focus to its global launcher without closing the
  underlying route.
- Selecting a result uses existing Router behavior.
- The command palette must not create or reveal a second global header.

### 7.5 Chapter sub-navigation

`CH-01` through `CH-05` remain a global second tier on every route.

Activating a chapter link from a routed surface must:

1. close the active route shell through its supported route lifecycle;
2. update the hash to the requested root chapter;
3. restore the root document scroll state or scroll to the chapter target;
4. focus the chapter heading after scrolling settles;
5. create one coherent browser-history transition.

Chapter links must never attempt to scroll a covered root element while leaving
the route shell open.

## 8. Context rail requirements

### 8.1 Shared shape

All routed surfaces use the same four-zone grid:

```text
[ route reference, flexible ] [ previous/next ] [ Link Veil ] [ close ]
```

Required zones:

- **Reference:** route type, chain/tool/entity context, and a concise slug.
- **Sibling navigation:** previous and next when a meaningful ordered set
  exists.
- **Link Veil:** the visible instance of the universal preference.
- **Close:** closes only the current route surface.

The rail is sticky within the route shell, directly below the persistent global
header. It does not repeat the brand, Chains menu, Find command, cadence, or
chapter links.

### 8.2 Chain directory and chain hubs

| Route | Reference | Previous/next | Link Veil | Close |
|---|---|---:|---:|---:|
| `#/chains` | `CH-INDEX · ALL CHAINS` | hidden | visible | visible |
| `#/c/<slug>` | `CH-INDEX · <short> · <slug>` | visible | visible | visible |

The directory must no longer hide the Link Veil control. Even if it has no
secondary card routes to conceal, it still controls definition Hoverdocs and
represents the site-wide state.

### 8.3 Chain Tools directory and landscapes

| Route | Reference | Previous/next | Link Veil | Close |
|---|---|---:|---:|---:|
| `#/tools` | `CH-TOOLS · 6 LANDSCAPES · 260 CANONICAL TOOLS` | hidden | visible | visible |
| `#/tools/<slug>` | `CH-TOOLS · <chain>` | visible | visible | visible |

### 8.4 Entity and article readers

| Route | Reference | Previous/next | Link Veil | Close |
|---|---|---:|---:|---:|
| `#/e/<id>` | `CH-REF · <kind> · <id>` | visible when ordered siblings exist | visible | visible |

The entity rail must add the missing Link Veil control. Its toggle state and
behavior are identical to chain and tool pages.

### 8.5 Previous and next

- Previous/next operate only within the route's declared ordered set.
- Disabled controls remain visible when their presence clarifies position, but
  use `disabled` and a clear accessible label.
- Cycling behavior must remain consistent with the existing route family; this
  specification does not require changing wrap/no-wrap semantics.
- Arrow activation must update document title, route reference, content, and
  focus exactly once.

### 8.6 Close

- Close exits the active route shell, not the global site.
- If the route was opened from another route, close returns to the prior route
  when valid; otherwise it returns to the root readout.
- Scroll and focus restoration use current Router/Overlay context.
- A close operation must not remount the global header.

## 9. Universal Link Veil

### 9.1 One state, one controller

The implementation must replace route-owned Link Veil behavior with one shared
controller.

Recommended API:

```js
SCOPE.LinkVeil = Object.freeze({
  toggle(),
  set(enabled),
  setHotkey('Control' | 'Alt' | 'Shift' | 'Meta'),
  openSettings(trigger),
  subscribe(listener),
  canPointerPreview(target),
  get enabled(),
  get hotkey(),
  get hotkeyLabel(),
  get controlHeld(),
  get effective()
});
```

`effective` is `enabled && finePointer && hoverCapable`.

Consumers subscribe to state and ask whether a pointer preview is allowed.
They do not register independent global modifier-key listeners.

### 9.2 Storage and migration

Use one local preference:

```json
{
  "v": 1,
  "enabled": false,
  "hotkey": "Control"
}
```

Canonical key: `scope.linkVeil`.

Migration requirements:

1. If `scope.linkVeil` is absent, read the existing `chain.linkVeil` value.
2. If valid, copy its enabled value into `scope.linkVeil` and default its
   missing hotkey to `Control`.
3. Do not delete the legacy key during the first implementation release.
4. If storage is denied, use a session-only value and default to links visible.
5. State is local UI preference and is never transmitted.

### 9.3 Visible control

Exactly one Link Veil control may be visible and focusable at a time.

| Context | Mount slot |
|---|---|
| Root readout | Global utility actions, between Chains and Find or immediately before Find |
| Chain directory/hub | Chain context rail |
| Chain Tools directory/landscape | Tools context rail |
| Entity/article reader | Entity context rail |

Separate DOM buttons may mirror the singleton state, but hidden mirrors must be
both `hidden` and removed from the tab order. A preferred implementation uses a
shared renderer/controller rather than copying route-specific logic.

The visible slot is one compact cluster rather than a wide text button:

- a `VEIL` switch button using `aria-pressed`;
- an adjacent current-hotkey keycap / `TUNE` button;
- the keycap button opens one shared modal with enable state plus `Control`,
  `Option / Alt`, `Shift`, and `Command / Meta` radio choices;
- the compact cluster stays below 160 CSS px at all supported widths.

Semantics:

- native `<button type="button">`;
- `aria-pressed="true|false"`;
- accessible name describes definitions and supported routes, not only links;
- a polite live region announces state changes once.

### 9.4 Fine-pointer behavior

When Link Veil is off:

- ordinary hover may show definition Hoverdocs;
- existing secondary route affordances remain visible;
- click and keyboard behavior remain unchanged.

When Link Veil is on:

- ordinary hover does not open a definition Hoverdoc;
- supported secondary route affordances remain visually veiled;
- holding the configured bare modifier while hovering reveals the definition preview and the
  hovered component's supported secondary route;
- releasing that modifier immediately closes an unpinned Hoverdoc and conceals the
  route again;
- moving to another eligible target while holding it transfers the peek;
- window blur, visibility loss, route change, toggle change, or pointer exit
  clears held/peek state;
- a chord containing any unconfigured modifier is ignored;
- pressing or releasing the modifier never activates a route.

### 9.5 Keyboard behavior

Keyboard access never requires holding the configured modifier.

- Focusing a term exposes its definition preview.
- Focusing a veiled route exposes that route.
- Enter/Space activate according to native element semantics.
- Pinned definition dialogs preserve existing dialog behavior.
- Focus leaving an unpinned preview closes it after the existing safe delay.
- Pressing the configured modifier inside an input, textarea, select, combobox,
  `[contenteditable]`, or code editor does not change peek state.

### 9.6 Touch and coarse-pointer behavior

Touch has no hover chord. Therefore:

- effective Link Veil is always bypassed on coarse/no-hover devices;
- links and definition triggers remain directly usable;
- the Link Veil control remains present on every page, satisfying the global
  chrome contract, but is disabled with the accessible description
  `Link Veil requires a keyboard and hover-capable pointer; links are visible`;
- a persisted enabled preference is not erased; it becomes effective again on
  a compatible device;
- first tap retains the current pinned Hoverdoc/details behavior.

### 9.7 Surfaces affected

Link Veil must govern definition previews on:

- root chapter prose;
- chain directory and chain hub prose;
- Chain Tools names and definitions;
- entity/article body terms;
- related reference surfaces rendered through the shared Hoverdocs controller.

It may additionally veil the existing supported secondary actions on:

- chain article register cards;
- Chain Tools row details affordances.

### 9.8 Surfaces never veiled

- global header navigation;
- context rail controls;
- breadcrumbs;
- primary calls to action;
- official source and evidence links;
- safety, risk, custody, eligibility, and scope warnings;
- focus-visible controls;
- JavaScript-off links;
- touch/coarse-pointer links.

## 10. Route and chrome matrix

| Route | Global header | Chapter sub-nav | Context rail | Visible veil slot | Close result |
|---|---:|---:|---:|---|---|
| root / no route | yes | yes | no | global action | n/a |
| `#/chains` | yes | yes | chain directory | chain rail | previous/root |
| `#/c/solana` | yes | yes | chain hub | chain rail | prior route/root |
| `#/tools` | yes | yes | tools directory | tools rail | prior route/root |
| `#/tools/solana` | yes | yes | tools landscape | tools rail | prior route/root |
| `#/e/sol` | yes | yes | entity reader | entity rail | prior route/root |
| direct-loaded routed URL | yes after unlock | yes after unlock | matching route | matching rail | root |

There must be no supported route where the visible Link Veil control count is
zero or greater than one.

## 11. Router and Overlay lifecycle

### 11.1 Required sequence

For every route transition:

1. Router parses the destination.
2. Shared chrome remains mounted.
3. Chrome controller determines whether the root or route Link Veil slot is
   active.
4. The relevant renderer updates or opens its route shell.
5. The shell is positioned below `--scope-global-h`.
6. Its context rail updates reference, sibling controls, and close behavior.
7. Link Veil state is synchronized before content becomes interactive.
8. Focus moves to the route heading or documented control.
9. Browser Back/Forward repeats this lifecycle without duplicate overlays.

### 11.2 Overlay stack

Recommended logical layers:

| Layer | Purpose |
|---:|---|
| 0–49 | document content and ambient decoration |
| 60–89 | route shells and their local rails |
| 90–119 | Hoverdocs, compare sheets, local dialogs |
| 200 | persistent global header |
| 210 | Chains sub-navigation |
| 220+ | command palette, access gate, emergency modal surfaces |

Exact numbers may vary, but these ordering relationships are mandatory:

- global header above route shells;
- global Chains menu above route context rail/content;
- command palette above both;
- pinned/modal content must not cover the access gate;
- unpinned Hoverdocs must not obscure global navigation when collision logic can
  place them elsewhere.

### 11.3 Scroll locking

- Route shells keep their own scroll container.
- Global header does not scroll with route content.
- `body.scope-scroll-lock` must not introduce a header width jump.
- Scrollbar compensation applies to the shared page width once.
- Each route's `scrollTop` remains restorable through browser history.

## 12. Responsive specification

### 12.1 Wide desktop: 1200 px and above

- Global utility row uses the full site grid.
- Chapter sub-navigation remains a second row aligned to the right edge.
- Context reference may use the remaining flexible width.
- Compact Veil switch and hotkey keycap are visible.

### 12.2 Tablet and narrow desktop: 768–1199 px

- Global identity, Chains, Link Veil/Find actions, and cadence remain legible.
- The chapter tier may horizontally scroll if it cannot fit; it must not wrap
  chapter labels into multiple lines.
- Context references truncate with ellipsis.
- Previous, next, Link Veil, and close preserve 44 px targets.

### 12.3 Mobile: below 768 px

- First row prioritizes brand, Chains, and Find.
- Cadence/sweep may compact according to existing behavior.
- Chapter navigation is a horizontally scrollable second row within the global
  header, not inside root-only content.
- The context rail uses two rows when necessary:
  - row one: reference + close;
  - row two: previous, next, and Link Veil.
- Link Veil remains visible, but disabled/bypassed on coarse pointer as defined
  in §9.6.
- Context content begins below both bars.
- No fixed-width control may widen the document.

### 12.4 200% text zoom

- Utility and context rows may grow vertically.
- `ResizeObserver` must update `--scope-global-h` after reflow.
- No text may be clipped by fixed heights.
- The Chains menu remains within the visual viewport.
- The route heading remains reachable and unobscured after focus.

### 12.5 Safe areas

- Global header owns `env(safe-area-inset-top)`.
- Context rails do not apply the top safe-area a second time.
- Full-screen mobile sheets retain bottom safe-area padding.

## 13. Accessibility requirements

### 13.1 Landmarks and labels

- Global header: `<header>` with a stable site-level label.
- Chapter tier: `<nav aria-label="Chapter sub-navigation">`.
- Chains menu: `<nav aria-label="Chains destinations">`.
- Context rail sibling controls: route-specific `<nav>` label.
- Route content: one `<main>` or the existing article/main landmark per active
  surface.
- Hidden route shells and hidden controls must not remain in the accessibility
  tree.

### 13.2 Focus order

Expected high-level order on a routed page:

1. skip link;
2. brand/home;
3. Chains;
4. visible Link Veil global slot only when on root;
5. Find;
6. chapter links;
7. context reference controls;
8. visible Link Veil route slot;
9. close;
10. route content.

Visual and DOM order should agree. Positive `tabindex` is prohibited.

### 13.3 Skip link

One persistent skip link must target the active content main:

- root → root main/hero;
- routed surface → active route main.

The target is updated by the chrome controller and receives temporary focus if
needed.

### 13.4 Announcements

- Link Veil toggles announce the new state once.
- Route changes update `document.title` and focus a meaningful heading.
- Reparenting or mirroring the Link Veil control must not generate duplicate
  live-region messages.
- Previous/next labels name the destination when known.

### 13.5 Contrast and focus

- All header and rail text meets WCAG AA at its computed size.
- The global header and context rail retain visible boundaries over every route
  background.
- Focus outlines remain visible against cyan, violet, lime, amber, and neutral
  route accents.

## 14. Motion and visual behavior

- The persistent header does not replay a page-entry animation on route change.
- Context rail content may cross-fade for at most 160 ms.
- Link Veil peek uses the existing short reveal timing, capped at 120 ms.
- Global header height changes must not animate; route content must not slide
  beneath it.
- Chains menu open/close may use opacity/translate of no more than 140 ms.
- All transitions are removed under `prefers-reduced-motion: reduce`.
- The cadence/sweep follows existing static/motion policy and must not restart
  for each route.

## 15. JavaScript-off and failure behavior

### 15.1 JavaScript off

- Root static navigation and all no-JavaScript evidence mirrors remain usable.
- Link Veil is ineffective and all links/definitions remain visible.
- A disabled static `LINKS VISIBLE` indicator may appear, but it must not be a
  fake interactive button.
- No content depends on measured header height without a CSS fallback.

### 15.2 Storage denied

- Preference becomes session-only.
- Default is links visible.
- Toggle remains usable for the session.

### 15.3 ResizeObserver unavailable

- Use CSS fallback height variables and a resize listener limited to one shared
  controller.
- Route content must remain readable even if the offset is conservative.

### 15.4 Command or optional script failure

- Missing command-palette code does not remove brand, Chains, chapters, route
  rail, Link Veil, or close.
- Missing animation code affects motion only.
- A route renderer failure leaves the global header intact.

## 16. Recommended component/API architecture

### 16.1 New shared controller

Create one small shared module, preferably `scripts/global-chrome.js`, loaded
after shared primitives and before route consumers.

Recommended public surface:

```js
SCOPE.GlobalChrome = Object.freeze({
  setRouteContext(context),
  clearRouteContext(),
  setActiveMain(element),
  get height(),
  get routeContext()
});
```

The controller owns:

- global header measurement;
- `--scope-global-h`;
- root vs route Link Veil control visibility;
- `aria-current` synchronization;
- skip-link target;
- global home/chapter behavior;
- route-independent menu cleanup.

### 16.2 Link Veil controller

Prefer `scripts/link-veil.js` or a clearly separated section in the global
chrome module. It owns:

- persistence/migration;
- compatible-input detection;
- configured modifier keydown/keyup and persisted hotkey selection;
- editor exclusion;
- blur/visibility cleanup;
- subscribers;
- state announcements.

Existing chain, tools, and Hoverdocs code consumes the controller and removes
its duplicate global modifier listeners.

### 16.3 Route context shape

```js
{
  family: 'chain' | 'tools' | 'entity',
  refCode: 'CH-INDEX',
  refText: 'SOL · solana',
  previous: { label: 'Previous chain: Robinhood Chain', route: '/c/robinhood-chain' } | null,
  next: { label: 'Next chain: Ethereum', route: '/c/ethereum' } | null,
  closeLabel: 'Close Solana chain index',
  onClose: () => {},
  main: HTMLElement
}
```

Route renderers remain responsible for their content and ordered siblings. The
shared chrome controller renders/synchronizes the rail controls.

## 17. File-level implementation map

| File | Required change |
|---|---|
| `index.html` | Keep one global header outside route shells; add root Link Veil slot; add entity Link Veil slot or shared context rail mount; add shared CSS variables/fallback |
| `scripts/global-chrome.js` | New canonical global chrome measurement, route context, menu, active-main, and Link Veil slot synchronization |
| `scripts/link-veil.js` or shared chrome section | New singleton state, migration, configured-modifier tracking, effective-mode logic, subscriptions |
| `scripts/chain-index.js` | Supply chain route context; stop owning persistence/global modifier events; keep route rendering and article filtering |
| `scripts/chain-tools.js` | Supply tools route context; consume shared veil state; stop owning persistence/global modifier events |
| entity renderer in `index.html` | Supply entity route context and visible Link Veil slot; consume shared veil state for term previews |
| `styles/chain-index.css` | Remove assumptions that chain shells start at viewport top; reuse shared context rail tokens |
| `styles/chain-tools.css` | Remove assumptions that tools shells start at viewport top; reuse shared context rail tokens |
| shared/base CSS | Define global/context heights, layers, two-bar responsive layout, active-main offset |
| `scripts/audit-global-chrome.mjs` | New route-wide chrome, Link Veil, history, focus, and responsive regression matrix |
| existing audits | Update selectors/counts to assert shared rather than route-owned controls |

The implementation may choose different filenames, but ownership boundaries and
acceptance behavior are mandatory.

## 18. Implementation sequence

### Phase 1 — Establish global geometry

1. Introduce `--scope-global-h` with a safe CSS fallback.
2. Measure the single global header.
3. Offset all three route shell families below it.
4. Verify no document or shell overflow at required widths.

### Phase 2 — Normalize context rails

1. Add the Link Veil slot to entity pages.
2. Make Link Veil visible on chain/tools directory routes.
3. Normalize grid sizing, target sizes, truncation, and mobile wrapping.
4. Keep route-specific labels and previous/next behavior.

### Phase 3 — Centralize Link Veil

1. Add canonical shared storage with legacy migration.
2. Centralize configured-modifier tracking and cleanup.
3. Convert Hoverdocs, chain routes, and tools routes to subscribers.
4. Remove route-owned duplicate listeners only after parity tests pass.

### Phase 4 — Global navigation lifecycle

1. Make brand/home route-aware.
2. Route chapter links correctly from open shells.
3. Verify Chains and Find layer above open shells.
4. Add `aria-current`, active-main, and focus restoration.

### Phase 5 — Regression hardening

1. Add the new audit file.
2. Update existing chain/tools/entity/command/degradation audits.
3. Verify direct-loaded routes, Back/Forward, no-JS, reduced motion, and 200%
   zoom.
4. Run the complete repository gate before deployment.

## 19. Automated QA specification

### 19.1 Required widths and modes

Run sequential browser cases at:

- 360 px;
- 390 px;
- 430 px;
- 768 px;
- 1200 px.

Additional cases:

- fine pointer;
- touch/coarse pointer;
- reduced motion;
- JavaScript off;
- CDN/optional-script blocked;
- 200% text/device zoom;
- direct-file or local static-server load as supported by existing audits.

### 19.2 Route traversal matrix

For each interactive width, visit in sequence:

1. root;
2. `#/chains`;
3. `#/c/solana`;
4. `#/tools`;
5. `#/tools/solana`;
6. `#/e/sol`;
7. Back twice;
8. Forward twice;
9. close to root.

At every step assert:

- one visible global header;
- one Chains button;
- one Find launcher;
- five chapter links in the global header DOM;
- the correct context rail state;
- exactly one visible Link Veil toggle;
- zero page-level horizontal overflow;
- route main begins below both visible bars;
- document title and focused element match the route.

### 19.3 Global navigation cases

1. Open `#/e/sol`; open Chains; both destinations are visible and actionable.
2. Open `#/tools/solana`; invoke Find; command palette appears above the route;
   closing it leaves the tools route open.
3. Open `#/c/ethereum`; activate `CH-03`; the chain shell closes and root CH-03
   is visible/focused.
4. Activate brand/home from an entity route; root returns without reload.
5. Resize while a route is open; route content remains below the measured
   global header.

### 19.4 Link Veil cases

Run on root, chain hub, tools landscape, and entity reader:

1. Toggle off: ordinary term hover shows one definition preview.
2. Toggle on: ordinary term hover shows none.
3. Hold the configured bare modifier while hovering: one preview appears.
4. Release it: unpinned preview closes.
5. Move target while holding it: preview follows the new target.
6. Focus term with keyboard while on: preview appears without the modifier.
7. Click/tap term: pinned definition remains usable.
8. Focus supported secondary route while on: route becomes visible.
9. Blur/visibility change: no held or peek classes remain.
10. Editor focus + configured modifier: no page peek state changes.
11. Open `TUNE`, select a different modifier, apply, and verify the old chord
    no longer reveals while the new chord does.
11. Route transition while held: no stuck peek state on destination.
12. Refresh/direct-load: state persists and visible toggle label agrees.
13. Touch mode: toggle is present but disabled/effectively bypassed; all links
    and definitions remain usable.

### 19.5 Accessibility cases

- Tab order follows §13.2.
- `Escape` closes Chains menu before closing a route.
- `Escape` closes Find without closing a route.
- Context close restores a logical prior focus target.
- One polite Link Veil announcement occurs per toggle.
- Hidden mirrored toggle is not focusable or exposed.
- All targets are at least 44 × 44 CSS px where space permits.
- At 200% zoom, focused controls and headings are not obscured by sticky bars.

### 19.6 Static/safety checks

- exactly one `.slotbar` source instance;
- no route renderer contains copied global header markup;
- one canonical storage key and one migration path;
- no more than one global modifier keydown/keyup owner;
- no duplicate `id` values among chrome controls;
- no wallet signing, transaction submission, or unsafe external URL behavior is
  introduced;
- all external links retain safe-protocol filtering and `noopener` behavior.

## 20. Acceptance criteria

Implementation is complete only when all conditions below are true.

1. The full SOLANA//SCOPE global header is visible on root, chain, tools, and
   entity/article routes.
2. The global header remains the same DOM instance across route transitions.
3. `CHAINS`, `FIND`, and `CH-01` through `CH-05` are usable from every routed
   surface.
4. Chain, tools, and entity routes retain their local reference,
   previous/next, and close controls.
5. Exactly one Link Veil toggle is visible and focusable on every route and on
   the root surface.
6. Entity/article pages include the Link Veil control.
7. Directory routes include the Link Veil control.
8. Link Veil state persists across all route families through one shared
   preference.
9. Link Veil on suppresses ordinary pointer Hoverdocs on root, chain, tools,
   and entity pages.
10. The configured bare modifier reveals only the hovered eligible
    preview/action; key release
    conceals it.
11. Keyboard focus, click, touch, and JavaScript-off behavior remain usable
    without a modifier.
12. Global navigation, primary actions, official sources, warnings, and
    breadcrumbs are never veiled.
13. Chains and Find layer correctly above an open route and close without
    unintentionally closing it.
14. Chapter navigation from a route closes the route and lands on the requested
    root chapter with correct focus.
15. Browser Back/Forward restores route content, scroll, document title, and
    chrome state.
16. No supported viewport has more than 1 px document overflow.
17. 200% zoom and safe-area cases preserve both bars without clipping content.
18. Reduced-motion mode leaves no required chrome transition active.
19. JavaScript-off mode exposes all documentation links and no false hidden
    controls.
20. The full existing audit suite plus the new global-chrome matrix passes.

## 21. Definition of done

The work is not done when the global header merely appears visually above one
overlay. It is done when global navigation is a single persistent system,
context rails remain route-specific, Link Veil has one universal state and one
consistent interaction model, every route is reachable and escapable by
keyboard/touch/history, and the complete responsive/degradation audit matrix is
green.
