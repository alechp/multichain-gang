# 04 — Page, interaction, and visual specification

> **Aesthetic:** industrial code cartography  
> **Navigation:** Robinhood `Scope · Chains · Tools · Source`

## 1. Page anatomy

```text
AUTH GATE
└── PAGE SHELL
    ├── site header + Robinhood mode navigation
    ├── provenance hero / public-source boundary
    ├── chapter rail
    ├── source workbench
    │   ├── repository rail + tree
    │   ├── code inspector
    │   └── quant notebook
    ├── cross-chain source lens
    ├── methodology / license ledger
    └── site footer + Link Veil
```

Use `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, and `<footer>` with
one `h1` and ordered headings. Static headings, claims, measurement lists, and
the comparison table remain in HTML when JavaScript is unavailable; protected
content remains behind the existing fail-closed auth treatment.

## 2. Header and route integration

Create `/multichain/robinhood/source/index.html`. From this directory:

```text
home             ../../../
Scope            ../
Chains           ../chains/
Tools            ../tools/
Source           ./
auth CSS/JS       ../../auth.css · ../../auth.js
site CSS          ../../site.css
select UI         ../styles/select-ui.css · ../scripts/select-ui.js
```

Body attributes:

```html
data-auth-scope="ROBINHOOD / SOURCE" data-chain="robinhood"
```

Add `Source` only to the three existing Robinhood page mode navigations. Never
edit Solana pages or add a Solana Source item.

## 3. Hero: establish the evidence boundary

The first viewport is not a marketing card grid. It is a technical dossier:

- eyebrow: `SOURCE//ROBINHOOD CHAIN`;
- `h1`: `Public code. Private boundary.`;
- one paragraph explaining pinned Nitro versus unpublished Robinhood-specific
  production source;
- readouts: pinned runtime, qualifying repositories, complete path count,
  featured hotspots, last verified date;
- two actions: `EXPLORE PINNED RUNTIME` and `READ SOURCE BOUNDARY`;
- always-visible stamp:
  `COMPLETE FOR THE PINNED REPOSITORY SET · NOT A CLAIM OF PRIVATE DEPLOYED CODE`.

Use the existing Multichain Gang type/color system. Add one Robinhood-local
warm amber for uncertainty and a cool cyan for selected code lines, both WCAG
AA. Use rules, coordinates, path strings, small uppercase labels, and restrained
scan-line/grid texture. Avoid rounded floating card stacks, gradients without
meaning, and decorative terminal chrome.

## 4. Source workbench

At `min-width: 1200px`, use a bounded three-pane workbench:

| Pane | Width | Responsibility |
|---|---:|---|
| Repository/tree rail | 30% | group/repo selection, filters, complete path tree, census |
| Code inspector | 45% | breadcrumb, excerpt, line numbers, syntax, immutable source link |
| Quant notebook | 25% | mechanism, metrics, failure modes, evidence, caveat |

The workbench is one connected instrument with shared borders, not three
unrelated cards. It may fill the viewport below the sticky site header, but the
page itself retains normal document flow and a usable static reading order.

At 768–1199 px, tree and inspector occupy a two-column grid; the notebook is a
full-width section below. Below 768 px, tree and notebook open as labeled
drawers while the inspector stays in flow. The active file path and evidence
state remain visible outside drawers. At 320 px there is no horizontal page
scroll; code alone may scroll inside its labeled region.

## 5. Repository rail and filters

Group repositories as:

```text
PUBLISHED CONFIGURATION
ROBINHOOD-PUBLISHED CONTRIBUTIONS
PINNED NITRO RUNTIME
PINNED DIRECT DEPENDENCIES
OFFICIAL INTEGRATIONS
UNAVAILABLE SOURCE BOUNDARIES
```

Each repo row shows owner/name, short commit, evidence badge, entry count, and
license signal. A pinned count strip shows `VISIBLE / TOTAL`; hiding test,
vendor, generated, docs, or assets never changes `TOTAL`.

Filters use the site's custom select UI, not an unstyled native select. The
real form control remains accessible. Popovers support Escape, outside click,
focus return, and only one open popup. Controls are at least 44×44 CSS pixels.

## 6. Accessible tree interaction

Use the ARIA tree pattern only if full keyboard semantics are implemented;
otherwise use nested disclosure lists. Required tree behavior:

- `role=tree`, `role=treeitem`, `role=group`, `aria-expanded`, and one roving
  `tabindex=0` item;
- Up/Down: previous/next visible node;
- Right: expand or move to first child;
- Left: collapse or move to parent;
- Home/End: first/last visible node;
- Enter/Space: select file or toggle directory;
- `*`: expand sibling directories when practical;
- type-ahead by visible node name;
- selection and focus are visually distinct;
- loading a shard retains focus and announces status through a polite live
  region;
- hidden-category ancestors are temporarily revealed for a search result.

Directory expansion is incremental. Collapse removes descendant DOM after
focus safely moves. A `SHOW ALL CATEGORIES` control exposes the exhaustive set.

## 7. Search, routing, and history

Search is local and scoped by repository/evidence/category. It displays the
matched path with escaped emphasis, category, repository, and hotspot badge.
Selecting a result expands all ancestors and places focus on the tree item.

Hash routes:

```text
#/repo/<repo-id>
#/repo/<repo-id>/path/<percent-encoded-path>
#/hotspot/<hotspot-id>
#/compare/<axis-id>
```

Validate decoded paths against the loaded catalog. Unknown routes show an
inline not-found panel. Browser Back/Forward restores repository, selection,
expanded ancestors, active chapter, and inspector position where feasible.
`COPY LINK` copies the canonical page URL plus hash, never raw source text by
default.

## 8. Code inspector

Render `<pre><code>` with line-number and code columns. Code is selectable,
wrap is user-toggleable, and horizontal scroll is keyboard accessible. Token
color is supplemental: punctuation, case, indentation, line numbers, and the
written explanation convey meaning without color.

The header contains repository/commit, path, line range, language, evidence
badge, license, `OPEN IMMUTABLE SOURCE`, and `COPY LINK`. The highlighted
selection uses an inset border and subtle background, not animation. A source
digest and `VERIFIED <date>` appear in the evidence footer.

Do not add a generic full-file viewer. Selecting a non-highlighted blob shows
metadata, path, size/SHA, classification, and its immutable GitHub link.

## 9. Quant notebook

Notebook sections follow `03`: `WHAT THE CODE DOES`, `WHY IT MATTERS`,
`MEASURE THIS`, `FAILURE MODES`, and `DO NOT INFER`. Measurements use explicit
boundaries and units. Caveats use amber and remain expanded by default.

The notebook contains no editable strategy code, price target, position input,
connect-wallet button, API-key form, or order control.

## 10. Cross-chain lens

The default view is the static five-axis matrix in `05`. Selecting an axis
opens a source-path compare view with Robinhood fixed on the left and one other
system on the right. Each side shows mechanism, analogous/not-analogous state,
path family, immutable commit, measurement implication, and caveat. The compare
view never emits a speed/security rank.

## 11. Overlay contract

All page-local drawers, dialogs, dropdowns, and mobile panels use one overlay
controller. Reuse the standalone site select UI where possible; do not import
the existing Robinhood Scope runtime because it assumes Scope-only elements.

For every open overlay:

- Escape closes the topmost dismissible overlay;
- pointer click on the backdrop closes it;
- pointer interaction inside does not;
- close control has an accessible name;
- opening records focus; closing restores it if the trigger still exists;
- dialogs trap focus; non-modal popovers do not;
- opening a new peer closes the old one;
- body scroll locks only for modal mobile drawers;
- reduced motion removes transition travel.

## 12. Accessibility and motion

- WCAG 2.2 AA contrast for text, controls, focus, and syntax states.
- Visible `:focus-visible` outline with at least 2 px contrast.
- 44×44 target size for primary controls.
- No information depends only on color, hover, motion, or pointer precision.
- `prefers-reduced-motion: reduce` disables smooth scrolling, drawer travel,
  and ornamental animation.
- Forced-colors mode preserves selection, focus, borders, and badges.
- Status updates are polite; auth/error failures requiring action are assertive.
- `lang=en`, descriptive page title, and a working skip-to-main link.

## 13. Error states

Define authored states for `AUTH REQUIRED`, `SHARD UNAVAILABLE`, `UNKNOWN
ROUTE`, `SOURCE CHANGED`, `NO SEARCH RESULTS`, and `OFFLINE EXTERNAL LINK`.
Never display an empty pane or generic stack trace. A failed optional tree does
not erase static chapters/highlights already present.

## 14. Acceptance criteria

- The page visually belongs to Multichain Gang but is recognizably a source
  instrument rather than a duplicate Scope card page.
- Complete tree access, search, focus order, deep links, and excerpt reading
  work at 320, 768, 1200, and 1440 px.
- Every popup closes by Escape and outside click and returns focus.
- Tree and compare operations are fully keyboard reachable.
- No runtime API request is required for core content.
- Robinhood navigation gains Source; Solana files remain untouched.
