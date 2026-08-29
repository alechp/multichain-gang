# 09 — Data, interaction, and visual system

## 1. Design intent

Chain Tools should feel like a research terminal that has been edited by a careful publication: dense, high-contrast, and exact, but never visually noisy. It extends the existing SOLANA//SCOPE industrial language instead of introducing a dashboard template.

The design has three layers:

1. **Evidence layer** — semantic table, source links, timestamps, status, scope.
2. **Interpretation layer** — category coverage, definitions, comparisons, and native-gap notes.
3. **Atmosphere layer** — one generated topology image per chain and restrained motion.

Atmosphere may never obscure evidence.

## 2. Proposed implementation files

```text
data/chain-tools/
  taxonomy.json
  canonical-tools.json
  solana.json
  ethereum.json
  bnb-chain.json
  bitcoin.json
  zcash.json
  robinhood-chain.json
scripts/chain-tools.js
styles/chain-tools.css
scripts/audit-chain-tools.mjs
assets/chain-tools/
  *-landscape.png              # supplied masters
  *-landscape-960.webp         # generated implementation derivative
  *-landscape-1440.webp        # generated implementation derivative
```

`index.html` owns the static mount, nav/footer anchors, `#chainData` registration pointer, and exact no-JavaScript mirror. It must not contain six hand-maintained copies of the table data.

## 3. Visual tokens

Use existing project tokens where available. New tokens are namespaced under `--tools-*`.

```css
:root {
  --tools-bg: #07090b;
  --tools-panel: #0d1115;
  --tools-panel-raised: #121820;
  --tools-text: #eef3f6;
  --tools-muted: #9aa8b2;
  --tools-rule: #2a343c;
  --tools-focus-outer: #050607;
  --tools-good: #81d4a7;
  --tools-warn: #f0c36c;
  --tools-danger: #ff8b82;
  --tools-gap: #7f8a92;
  --tools-sol: #46d8f4;
  --tools-eth: #a8a7ff;
  --tools-bnb: #f2bd49;
  --tools-btc: #f39a42;
  --tools-zec: #c8aa62;
  --tools-rhc: #b5ff45;
}
```

No body text may use pure black, chain-colored text on a dark image, or opacity below `.72`. Muted body copy must meet WCAG AA. Chain color is an accent, never the sole status signal.

Typography:

- headings and numeric/technical labels: existing condensed display face;
- body, summaries, definitions: existing readable sans face at `16–18px` and `1.55–1.7` line height;
- IDs, state, scope, dates: existing monospace at no smaller than `12px` desktop / `13px` mobile;
- prose measure: `66ch` maximum.

## 4. Hero visual contract

Each source PNG is a 16:9, text-free, logo-free master. Implementation creates responsive WebP derivatives and uses:

```html
<picture class="tools-topology" aria-hidden="true">
  <source media="(max-width: 700px)" srcset="assets/chain-tools/solana-landscape-960.webp">
  <img src="assets/chain-tools/solana-landscape-1440.webp" alt="" width="1792" height="1024" decoding="async">
</picture>
```

The adjacent figure caption provides the meaningful description, so the image itself is decorative. The caption is chain-specific and says `CONCEPTUAL TOPOLOGY`, never `NETWORK MAP`.

Image treatment:

- desktop: `aspect-ratio: 16 / 7`, `object-fit: cover`, chain-specific `object-position`;
- mobile: `aspect-ratio: 4 / 3`, crop toward the structural center; no illegible full-width shrink;
- a solid background sits behind the image so delayed loading does not flash white;
- no parallax, continuous pan, or autoplay zoom;
- a one-time 360ms mask reveal is allowed; reduced motion renders immediately;
- masters remain in the repository for future crops, while page derivatives target <= 220 KB each.

## 5. Tool table anatomy

Desktop uses a real `<table>` with sticky header. Do not simulate rows with a CSS grid of anonymous divs.

Default columns:

| Column | Behavior |
|---|---|
| Tool | name, 160-character definition, multi-category marker |
| Category | primary category; additional placements shown as `+N` with accessible names |
| Scope | native/app/L2/adjacent/service plus named execution layer |
| State | production/beta/testnet/announced/deprecated |
| Surfaces | UI/API/SDK/contracts/RPC/CLI/node tokens |
| Evidence | grade and checked date; opens evidence section |
| Details | explicit button, never an invisible whole-row click target |

Optional columns appear through `Columns`: access, custody, trust model, shielded support, finality clock, risk flags.

Rows are 64px minimum and expand into a full-width detail row. Expanded content includes:

- full definition and `why it is on this chain`;
- all category placements;
- product and version/deployment fields;
- official site and official docs as separate real anchors;
- evidence grade, checked date, and source note;
- chain-specific risk/trust fields;
- `Compare` control;
- `Copy deep link` control.

The row deep link is `#/tools/<chain>?tool=<tool-id>`. Opening it scrolls/focuses the row after the route mounts and updates the document title.

## 6. Filters and URL state

Controls, left to right:

1. search input;
2. category multi-select;
3. scope segmented control;
4. state multi-select;
5. surface multi-select;
6. chain-specific filter (`L2`, `shielded`, `trust model`, or `finality`);
7. sort;
8. reset.

All committed filter state serializes into the query string:

```text
#/tools/bitcoin?category=CT-12&scope=adjacent-layer&status=production&sort=name
```

Search keystrokes may debounce for 120ms and use `history.replaceState`. Discrete filter changes use `pushState` so Back/Forward restores them. Unknown parameters are ignored, not fatal.

Default sort: primary category order, then name. Available sorts: name, category, scope, recently verified. There is no sponsored, token-price, TVL, or “best” sort.

## 7. Definitions and source behavior

A tool name is not merely an underlined link.

Pointer/focus behavior:

- hovering or focusing a tool name opens a Hoverdoc after 180ms;
- the card contains the complete short definition, category labels, state, scope, checked date, and two explicit actions: `DETAILS` and `OFFICIAL ↗`;
- moving into the card keeps it open; `Escape` closes; outside click closes;
- touch first tap opens/pins the card, second action follows the selected anchor;
- Hoverdocs use the existing `SCOPE.positionOverlay` and collision handling;
- official links are safe-URL filtered, visually marked external, and remain real anchors.

The definition itself is always available through the expanded detail row and screen-reader description. Hover is an enhancement, not the only path.

## 8. Link Veil / Control reveal

Extend the existing opt-in Link Veil, do not invent a second preference.

- Default: `LINKS VISIBLE`.
- Optional: `LINK VEIL · HOLD CTRL`.
- In veil mode, row `DETAILS →` route treatment becomes quiet until the row is hovered and bare `Control` is held.
- Keyboard focus always reveals and enables the details action without requiring Control.
- Pointer-coarse/touch, JavaScript-off, and reduced capability modes keep actions visible.
- Official source links, evidence links, global navigation, definitions, warnings, and the table’s semantic link text are never removed from the accessibility tree.
- `Control` alone never opens, follows, or focuses anything.
- Editors, command dialogs, repeated keydown, `Ctrl+K`, and browser-owned chords are ignored.
- `keyup`, window blur, route close, and page visibility loss always clear peek state.

The existing preference key remains `chain.linkVeil`. Chain hubs and Chain Tools therefore stay synchronized.

## 9. Comparison tray

A reader can pin at most three tools from the current chain. The tray compares exact fields:

- categories;
- chain scope/execution layer;
- state;
- access and custody;
- surfaces;
- evidence date/grade;
- chain-specific risk fields.

The tray does not invent normalized performance scores. Missing data displays `NOT DOCUMENTED`, not zero. On mobile it is a full-screen dialog; desktop uses a bottom sheet. Focus is trapped and restored through existing `SCOPE.Overlay` primitives.

## 10. Category coverage rail

The 17 categories form a labeled compact matrix. Each cell includes category short name and coverage word in its accessible name. Selecting a cell applies the category filter. A `native gap` cell remains actionable and scrolls to the editorial explanation instead of returning a blank table with no context.

Do not animate counts. A selected cell gets a 2px border plus chain accent. Unselected cells do not rely on low opacity.

## 11. Responsive table behavior

- `>= 1040px`: full table and sticky first column.
- `760–1039px`: hide optional surfaces/evidence columns behind row details; keep tool/category/scope/state/details.
- `< 760px`: each `<tr>` becomes a labeled record card using `data-label` generated from the real headers; DOM remains table-derived.
- `< 430px`: filter bar becomes a `FILTERS` disclosure; search and result count remain above it.
- No document-level horizontal scroll at 360/390/430/768/1200.
- If a comparison genuinely requires width, only its explicitly labeled inner region may scroll.
- Touch targets are at least 44px; horizontal chips never require precision tapping.

## 12. Motion

Motion communicates state change and then ends:

| Interaction | Duration | Behavior |
|---|---:|---|
| Hero topology reveal | 360ms | one mask sweep, no fade from black text |
| Filtered rows out | 120ms | opacity to 0 plus 4px vertical movement |
| Filtered rows in | 180ms | settle from 6px; stagger cap 6 rows |
| Row expansion | 180ms | height/clip plus border activation; text stays crisp |
| Hoverdoc | 140ms | opacity + 4px rise |
| Link Veil peek | 120ms | route opacity + 4px horizontal reveal |
| Compare tray | 200ms | bottom translation; backdrop appears immediately |

No chain-tools animation loops. `prefers-reduced-motion: reduce` sets durations to zero and disables stagger. Filtering must preserve focus even if the focused row leaves the result set: return focus to the initiating control and announce count.

## 13. No-JavaScript and failure behavior

The `<noscript>` mirror includes all six tool pages as linkable headings within the root document, a compact table per chain, category gaps, and each row’s first official source. It does not pretend hash routes work without JavaScript.

Failure rules:

- missing image: evidence/table remain usable; no broken-image icon because picture is decorative;
- missing Fuse: deterministic substring search works;
- missing anime.js: all state changes complete with CSS/no motion;
- storage denied: Link Veil defaults visible for the next session;
- malformed placement: skip row, show a development-only diagnostic, fail the audit;
- unsafe URL: render source label as text and fail the audit;
- command palette unavailable: wrapper/footer/table anchors remain sufficient.

## 14. Accessibility and semantics

- One `h1`; `h2` for coverage, inventory, gaps, and sources.
- Table has `<caption>`, scoped headers, and an off-screen description of current filters.
- Sort buttons expose `aria-sort` on their header.
- Expanded details use `aria-expanded` and `aria-controls`; detail row is adjacent in DOM.
- Result count and filter changes use one polite live region; hover and Control peeking are not repeatedly announced.
- Hoverdoc trigger gets `aria-describedby` only while the card is present.
- External anchors include a visible `↗` and an accessible `opens official site in a new tab` suffix when `target=_blank` is used.
- Focus ring uses chain accent plus a dark/light contrast-safe outer ring.
- Coverage, status, evidence, and scope never rely on color alone.
- 200% zoom and 320 CSS px remain usable.

## 15. Data and security requirements

- No wallet connection, key access, signing, transaction construction, or submission is added by Chain Tools.
- Do not fetch live balances, prices, or protocol stats on page load.
- Data ships locally; official links are the only expected external navigation.
- URLs allow only `https:`; a small explicit allowlist permits the existing `http` onion-context prose as text, never clickable by default.
- Render all data with `textContent`/DOM creation, not interpolated `innerHTML`.
- Link Veil state is local UI preference and is not transmitted.
- Comparison state may live in the URL; do not persist browsing history beyond existing local UI patterns.

## 16. Asset provenance

Six images were generated specifically for this program in `generate` mode using text-free, logo-free industrial-cartography prompts. Final masters:

| Asset | Prompt summary |
|---|---|
| `solana-landscape.png` | dense parallel execution lanes and routing basins; cyan/violet/magenta |
| `ethereum-landscape.png` | layered settlement planes and composable lattice; periwinkle/silver |
| `bnb-chain-landscape.png` | compact validator/liquidity ring and issuance grid; amber/brass |
| `bitcoin-landscape.png` | deliberate settlement blocks with Lightning mesh and inscription branch; orange/off-white |
| `zcash-landscape.png` | observable inputs, shielded geometric interior, minimal outputs; gold/teal |
| `robinhood-chain-landscape.png` | sequencer spine, finality rails, institutional modules, open sockets; acid green/violet |

Do not add names, tickers, logos, or factual values to the raster files. If a future edit is needed, regenerate/edit the master and re-create all responsive derivatives.

## 17. Automated audit contract

`scripts/audit-chain-tools.mjs` must verify:

- six canonical routes and wrapper route;
- 17 exact category IDs and labels;
- canonical tool IDs unique; placements reference valid tools/categories/chains;
- every placement has status, scope, source, grade, and ISO checked date;
- safe official URLs and no dangling local asset paths;
- current counts exclude announced/testnet/deprecated/unknown as specified;
- no-JS mirror names, states, scopes, and first links match data;
- command palette and footer contain wrapper plus six routes;
- every existing chain hub links to its tooling page;
- filtering, sorting, URL restore, deep tool link, and compare cap;
- Hoverdocs on hover, focus, touch pin, Escape, and external action;
- Control Link Veil on fine pointer, focus bypass, touch bypass, blur cleanup;
- 360/390/430/768/1200, 200% zoom, reduced motion, CDN blocked, and JavaScript off;
- no document-level horizontal overflow;
- no `ethereum.request`, wallet provider, signing, transaction construction, or submission API in Chain Tools sources.
