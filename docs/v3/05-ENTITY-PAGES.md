# 05 — ENTITY PAGES: dedicated sub-pages for every technique, vendor, chain, and term

> **Status:** implemented 2026-08-14 — 53 unique routes; three term/tool overlaps are intentional
> **Owner lanes:** `E-runtime` + `E-content-1..3` (see `08-ORCHESTRATION.md`)
> **Depends on:** `04-STYLE-READABILITY.md` (Overlay, Router, zones); `01-HOVERDOCS.md` links into it
> **Pattern source:** `~/Code/frauthy/brand/portal` — the structured-record →
> generated-page pipeline (`src/data/core/catalog.ts` →
> `pages/core/[family]/[component].astro`) and the glossary ledger page
> (`pages/glossary.astro`), adapted to hash-routed overlays in one file

---

## 0. Objective

Whenever the page mentions a technique, vendor/tool, chain, or core term, that
name is a door. Behind it: a dedicated **deep channel** — a full-screen
sub-page with what it is, how it works (with its own annotated animation),
key numbers, primary-source links, and related doors. Deep-linkable
(`…/#/e/jito-be`), shareable, back-button friendly, still one HTML file.

## 1. Routing & shell

- Route: `#/e/<entity-id>` (Router from 04). Opening pushes history; Back or
  Esc closes and restores scroll + focus. Direct load with the hash opens the
  entity over the page top. Title updates to
  `<Entity> — SOLANA//SCOPE` and restores on close.
- Shell: full-screen Overlay layer styled as a **sixth channel**: slot-bar
  stub with `CH-REF · <KIND> · <entity-id>`, close `✕`, and prev/next
  entity arrows (alphabetical within kind). Content column max 72ch, the
  page's graph-paper ground at 40% — visibly the same instrument, different
  channel.
- Body scrolls independently; the underlying page keeps its scroll position.

## 2. Data model (in `#chainData`, new top-level key `entities`)

```json
"entities": {
  "jito-be": {
    "kind": "tool",                      // technique | tool | chain | term
    "name": "Jito Block Engine",
    "tagline": "The sealed-bid auction that decides Solana's block order.",
    "chains": ["sol"],
    "body": [
      "para 1 — what it is …",
      "para 2 — role in the ordering market …",
      "para 3 — economics: tips, bundles, revenue split …"
    ],
    "how": {"diagram": "sol-bundle", "params": {},
            "steps": ["Searchers submit ≤5-tx bundles with tips",
                      "Sealed-bid auction ranks by tip",
                      "Winner lands top-of-block; losers pay nothing",
                      "Tips split validator / stakers"]},
    "signals": [{"k": "bundle size", "v": "≤ 5 txs, atomic"},
                {"k": "auction cadence", "v": "per slot · 400 ms"}],
    "links": [{"label": "jito.wtf docs", "url": "…", "kind": "official"},
              {"label": "Block Engine API", "url": "…", "kind": "docs"},
              {"label": "tips dashboard", "url": "…", "kind": "explorer"}],
    "related": ["atomic-arb", "backrun", "jito-protect", "shredstream"],
    "term": "jito"                        // optional hoverdocs term backref
  }
}
```

- `body` paragraphs use the markdown-lite renderer (em/strong/code/links —
  extend v2's `em()`); `termify()` runs over rendered paragraphs so entity
  pages cross-tooltip each other.
- **Every mention is a door — enforced by data:** techniques (8), tools (23),
  chains (5, incl. SOL), plus core terms with `entity` ids in HOVERDOCS
  (~20: PoH, Turbine, Gulf Stream, Sealevel, Tower BFT, SWQoS, ShredStream,
  Firedancer, DoubleZero, Alpenglow, preconfirmations, PBS, MEV-Boost,
  EIP-1559, RANDAO, RBF, Lightning, Equihash, shielded pool, Stratum v2).
  Total ≈ **56 entities**.

## 3. Page anatomy (rendered sections, in order)

1. **Masthead** — kind tag, name (Chakra Petch, display size), tagline,
   chain badges (v2 `.tb` style).
2. **WHAT IT IS** — the `body` paragraphs.
3. **HOW IT WORKS** — the animation example: the named diagram template
   (reusing Spec-2 minis and Spec-3 figures, rendered at 2× viewBox scale)
   with a **step list**; each step highlights as its loop phase plays
   (loop phase indices exposed by the mini registry; static list under
   reduced motion). This is the "animation examples" requirement: every
   entity gets a working diagram, either its own template or its family's
   (`window` for latency-ish tools, `mempool` variants for chains, etc.).
   New templates needed: ~6 (poh-clock, tower-lockout, swqos-lanes,
   lightning-channel, stratum-jobs, intent-batch) — specified inline in the
   entity data as `diagram` ids, drawn in the mini house style, ≤ 8 shapes,
   one loop.
4. **SIGNALS** — the `signals` k/v table (mono, `~`-marked volatiles).
5. **LINKS** — primary sources with `kind` tags, `↗`, noopener; ordering:
   official → docs → explorer → research.
6. **RELATED** — chip row of related entity doors; plus an automatic
   **"APPEARS ON"** row: which page sections/docks/grid cells mention this
   entity (computed at render from chainData, not hand-authored).

## 4. Integration (all mechanical, no new judgment)

- HOVERDOCS pinned cards: `OPEN CHANNEL ▸` → `#/e/<id>`.
- Bench cards: name becomes a door; grid popovers: technique title + tool
  link both doors. Dock column heads: chain name is a door. CH-05 rows: the
  `tlabel` button's popover gains `OPEN CHANNEL ▸`.
- Chain entities embed their four Spec-2 minis in HOW IT WORKS as a 2×2.

## 5. Degradation & budget

- Reduced motion / CDN-fail: pages render fully; diagrams static; step lists
  plain. JS-off: entities unreachable (hash routing is JS) — the noscript
  appendix gains an **ENTITY INDEX** table (name / kind / one-liner / primary
  link) so no information is JS-locked. Mirror rule applies.
- Deep links work on GitHub Pages by construction (hash routing, no server).
- Budget: entity content ≤ 200 KB raw JSON total (≈ 3.5 KB × 56); enforce
  with a size check in the fit-audit script. Diagram loops start only while
  their entity page is open (Overlay-gated registerLoop).

## 6. Content authoring rules (for the E-content lanes)

- Verbatim-transcribe nothing from marketing; body paragraphs are teaching
  prose in the page's voice (see CH-03 sub for register), 60–120 words each,
  3 paragraphs max.
- Every factual number: `~` if volatile, dated if load-bearing (v2 policy).
- Links must be primary or canonical-secondary (official docs, explorer,
  protocol research posts; no SEO blogspam). 3–6 per entity. Real URLs
  verified at authoring time (WebFetch HEAD 200 check recorded in the lane
  digest).
- Each content lane owns a disjoint id range (see `08-ORCHESTRATION.md` §7
  lane E-c1: techniques+chains; E-c2: tools; E-c3: terms) — JSON-only edits
  inside the `entities` object, no layout files.

## 7. Acceptance criteria

- `#/e/sandwich` direct-load: page opens over CH-hero, sandwich rows diagram
  plays with steps highlighting, APPEARS ON lists CH-03 + grid row; Back
  closes to a clean page; Esc same; focus returns to the invoking door when
  opened in-page.
- All 56 entities open without console errors; prev/next walks each kind.
- Every bench card, grid popover, dock chain head, and ≥ 40 hoverdoc terms
  resolve to a door; zero dangling `#/e/` targets (audited by script:
  every rendered door's id ∈ entities).
- Link check: 100% of entity links return 2xx/3xx at authoring time; `kind`
  tags accurate.
- Reduced-motion + CDN-blocked render complete static pages; JS-off shows
  the ENTITY INDEX appendix.
- QA matrix re-passes; total page ≤ 420 KB program budget honored.
