# 09 — CHAIN INDEX PAGES: curated chain hubs, article registers, and Link Veil

> **Status:** proposed 2026-08-29 — implementation not started
> **Owner lanes:** `F-data`, `F-runtime`, `F-surface`, `F-QA`
> **Depends on:** `01-HOVERDOCS.md`, `04-STYLE-READABILITY.md`,
> `05-ENTITY-PAGES.md`, and the Robinhood Chain integration spec
> **Reference state:** the existing `#/e/robinhood-sequencer` deep channel is
> the article-detail pattern; this spec adds the chain-level index above it

---

## 0. Executive decision

Every supported chain gets a dedicated, deep-linkable **chain index page**.
The chain page is a curated landing surface; it does not duplicate the article
body already owned by an entity record.

Canonical routes:

| Internal chain id | Chain | Chain index route | Existing overview article |
|---|---|---|---|
| `sol` | Solana | `#/c/solana` | `#/e/sol` |
| `eth` | Ethereum | `#/c/ethereum` | `#/e/eth` |
| `bnb` | BNB Chain | `#/c/bnb-chain` | `#/e/bnb` |
| `btc` | Bitcoin | `#/c/bitcoin` | `#/e/btc` |
| `zec` | Zcash | `#/c/zcash` | `#/e/zec` |
| `robinhood_chain` | Robinhood Chain | `#/c/robinhood-chain` | `#/e/robinhood-chain` |

The hash route is intentional. SOLANA//SCOPE remains one deployable
`index.html`, GitHub Pages needs no rewrite rule, and direct links continue to
work from local files. A later move to physical `/chains/<slug>/` files is a
separate publishing-architecture migration and is not part of this feature.

The current entity page remains the **article reader**. For example:

```text
#/c/robinhood-chain
  └── ORDERING & FINALITY
       └── Robinhood Chain FCFS sequencer → #/e/robinhood-sequencer
```

The implementation also adds an opt-in **Link Veil**. In that mode, article
route chrome is visually quiet until a pointer user hovers a card and holds
`L`. Keyboard focus, touch, JavaScript-off, and the default mode always expose
ordinary visible links.

## 1. Goals and non-goals

### 1.1 Goals

1. Give each supported chain a stable home that answers “where do I start?”
2. Group chain-specific deep dives by technical concern rather than presenting
   one long alphabetical entity list.
3. Reuse `entities` as the canonical article corpus; never fork article prose
   into a second data structure.
4. Make the chain name in every comparison surface lead to its chain hub.
5. Preserve direct article URLs, browser Back/Forward, focus restoration, and
   independent reader scroll.
6. Support a quiet, operator-oriented Link Veil without making hover or a
   hotkey the only accessible path.
7. Keep primary sources prominent and distinguish internal article routes from
   external documentation.
8. Degrade with complete information under reduced motion, CDN failure, local
   file use, and JavaScript-off.

### 1.2 Non-goals

- This is not a news feed, blog CMS, wallet, explorer, or live market page.
- It does not create six copies of shared articles such as atomic arbitrage.
- It does not add vendor logos or invent chain brand marks.
- It does not surface journal observations or localhost data on GitHub Pages.
- It does not rank chains or imply that a faster soft receipt is stronger
  finality.
- Link Veil is not the default and cannot conceal global navigation, safety
  warnings, definitions, or source provenance.

## 2. Information architecture

### 2.1 Three content levels

```text
SOLANA//SCOPE instrument
├── CH-01 … CH-05 teaching channels
├── Chain index                           #/c/<chain-slug>
│   ├── overview signals
│   ├── featured articles
│   ├── topic-grouped article register
│   ├── cross-chain technique shelf
│   └── official source rail
└── Article / entity reader               #/e/<entity-id>
    ├── what it is
    ├── how it works
    ├── operator / failure-mode sections
    ├── signals
    ├── primary links
    └── related + appears on
```

### 2.2 Chain index versus chain overview

`#/c/solana` and `#/e/sol` have different jobs:

- The **chain index** is navigational and curated. It lists the reading paths.
- The **chain overview entity** is an article. It explains the chain itself.
- The overview is always the first `FOUNDATION` article and is eligible for
  the featured rail.
- A chain index must never paste the overview article's body into its masthead.
  It uses the shorter chain-page `summary` instead.

### 2.3 Topic taxonomy

Only populated groups render. The fixed order is:

1. `FOUNDATION`
2. `CONSENSUS & FINALITY`
3. `TRANSACTION PATH & FEES`
4. `ORDERING & MEV`
5. `INFRASTRUCTURE & DATA`
6. `ASSETS & LIQUIDITY`
7. `SAFETY & OPERATIONS`

The fixed ids are `foundation`, `consensus`, `transactions`, `ordering`,
`infrastructure`, `liquidity`, and `safety`. An article has one primary group
on a given chain page. Related topics can appear as compact tags but may not
duplicate the card in another group.

## 3. Route and shell behavior

### 3.1 Router extension

Extend the shared Router with a `chain` type:

```js
const chain = /^#\/c\/([a-z0-9][a-z0-9-]*)$/i.exec(hash);
if (chain) return { type: 'chain', slug: decodeURIComponent(chain[1]) };
```

Required public behavior:

- `SCOPE.Router.go('/c/solana')` pushes a recognized route.
- Unknown chain slugs are ignored without hiding or breaking the base page.
- Direct load opens the chain shell after the access gate is satisfied.
- Document title becomes `<Chain> Index — SOLANA//SCOPE`.
- Close/Escape returns to the invoking surface and restores focus.
- Back from an article opened inside a chain index returns to the same chain
  index and restores its internal scroll position.
- Forward reopens the article.
- Section hashes such as `#ch3` remain unchanged.

### 3.2 One full-screen route at a time

Do not stack a chain index below an entity reader. Both are full-screen route
surfaces:

1. Opening an article from a chain page records `{chainSlug, scrollTop}` in
   `history.state` and closes the chain shell without restoring focus.
2. The entity shell renders the requested article.
3. Browser Back closes the entity shell, reopens the chain shell, restores
   `scrollTop`, and focuses the originating article title.
4. A direct article URL has no synthetic chain return state and closes to the
   base instrument as it does today.

### 3.3 Shell identity

The sticky header reads:

```text
CH-INDEX · <CHAIN CODE> · <slug>        [← previous] [next →] [×]
```

Previous/next follows this stable order: Solana, Ethereum, BNB Chain, Bitcoin,
Zcash, Robinhood Chain. It does not use alphabetical order because the chain
bench already teaches that sequence.

## 4. Page anatomy

Render these regions in order.

### 4.1 Masthead

- Kicker: `CHAIN INDEX · <chain id>`.
- One `h1`: chain name, capped at the readable entity-page scale.
- A 20–32 word summary written as a technical orientation, not marketing.
- Chain badge using the existing comparator color.
- Two actions:
  - `READ OVERVIEW ▸` → the chain's overview entity.
  - `PRIMARY DOCS ↗` → the first official source.
- A compact count: `<n> ARTICLES · <n> TOPIC LANES · UPDATED YYYY-MM`.

### 4.2 Signal strip

Four or five dated, sourceable chain-level facts. The keys should remain
comparable across chains where the concepts exist:

- ordering / proposer mechanism;
- typical inclusion or soft receipt;
- finality model;
- fee asset / priority rule;
- execution model.

Do not force false equivalence. For Bitcoin, confidence is probabilistic; for
Robinhood Chain, soft, L1-posted, and L1-final are separate clocks. A missing
concept is omitted rather than rendered as zero.

### 4.3 Featured reading rail

- Exactly three articles per chain at launch.
- First card spans two grid columns on desktop; the next two use one each.
- Featured order is authored, never calculated from recency or popularity.
- Each card shows topic, title, one-sentence dek, level, reading time, updated
  date, chain badges, and the internal route action.
- Featured motion is one 220 ms edge sweep on focus/hover. No autoplay.

### 4.4 Article register

- Heading: `ARTICLE REGISTER` with the total published count.
- A segmented topic filter: `ALL` plus only populated groups.
- Each group has a numbered mono label and a two-column article list.
- Article cards are structured rows, not generic marketing tiles.
- The card title remains the main accessible link.
- `NEW`, `UPDATED`, or `FOUNDATION` tags are authored metadata and may not be
  inferred from wall-clock time in the browser.
- Draft and archived articles never render on a production chain index.

### 4.5 Cross-chain technique shelf

Shared techniques whose `chains` array includes the active chain can render in
a visually secondary shelf labeled `CROSS-CHAIN LENS`. This shelf:

- is collapsed by default after the first four entries;
- labels every card `MULTI-CHAIN`;
- never counts toward the chain-specific article total;
- is data-derived from published entities, not copied into `chainPages`;
- cannot displace the chain-specific register above it.

### 4.6 Official source rail

End every page with two to six external sources ordered `official → docs →
explorer → research`. Each row shows the hostname and kind. External links
always retain `target="_blank" rel="noopener noreferrer"` and a visible `↗`.
Link Veil may not hide this rail: provenance must remain obvious.

## 5. Layout and visual direction

The frontend direction remains **industrial/utilitarian instrument**, using
the current graph substrate, Chakra Petch display face, IBM Plex Sans reader,
IBM Plex Mono labels, corner ticks, and one chain signal color.

### 5.1 Desktop wireframe (≥ 900 px)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ CH-INDEX · SOL · solana                         ←  →  LINKS VISIBLE × │
├──────────────────────────────────────────────────────────────────────┤
│ // CHAIN INDEX · SOL                                                 │
│ SOLANA                                              CHAIN SIGNALS     │
│ A scheduled-leader execution network…              ordering   …      │
│ [READ OVERVIEW ▸] [PRIMARY DOCS ↗]                  finality   …      │
├──────────────────────────────────────────────────────────────────────┤
│ FEATURED READING                                                     │
│ ┌──────────────────────────────┐ ┌─────────────┐ ┌─────────────┐     │
│ │ 01 · large feature           │ │ 02          │ │ 03          │     │
│ └──────────────────────────────┘ └─────────────┘ └─────────────┘     │
├──────────────────────────────────────────────────────────────────────┤
│ ARTICLE REGISTER · 14       [ALL][CONSENSUS][TX][MEV][INFRA]         │
│ // 01 CONSENSUS                                                     │
│ ┌ article row ───────────────┐ ┌ article row ─────────────────┐     │
│ └────────────────────────────┘ └───────────────────────────────┘     │
│ // 02 TRANSACTION PATH …                                             │
├──────────────────────────────────────────────────────────────────────┤
│ CROSS-CHAIN LENS                         OFFICIAL SOURCES             │
└──────────────────────────────────────────────────────────────────────┘
```

Desktop uses a 12-column grid. The masthead is 8/4, featured is 6/3/3, and
article rows are 6/6. Prose never exceeds 68ch. The signal panel is sticky only
within the masthead and never follows the user through the article register.

### 5.2 Mobile wireframe (< 760 px)

```text
CH-INDEX · SOL                                      ×
                                                   ← →
// CHAIN INDEX · SOL
SOLANA
summary
[READ OVERVIEW]
[PRIMARY DOCS]

CHAIN SIGNALS
stacked key/value rows

FEATURED READING
one card per row

ARTICLE REGISTER · 14
horizontal topic switch
one article per row

OFFICIAL SOURCES
```

- Minimum horizontal padding: 18 px.
- Every action target: at least 44 × 44 px.
- No sticky sidebars.
- Topic filters horizontally scroll with an edge fade.
- Link Veil is automatically bypassed because touch has no reliable hover or
  key-hold chord.

### 5.3 Chain color rules

- Use the existing chain color as `--cc` for ticks, active rules, and signal
  dots only.
- Keep body text on `--ink`, readable secondary copy on the strengthened body
  mix, and metadata on `--lbl`.
- Robinhood neon is a signal accent, not a logo treatment or page-wide fill.
- Zcash and BNB golds must retain the existing perceptual separation.
- No chain page may exceed one ambient glow and one card interaction flourish.

## 6. Data model

Add `chainPages` to `#chainData`. Entity prose remains in `entities`.

```json
"chainPages": {
  "sol": {
    "slug": "solana",
    "name": "Solana",
    "short": "SOL",
    "overview": "sol",
    "summary": "A scheduled-leader execution network built around sub-second slots, parallel account-aware execution, and rapid stake-weighted propagation.",
    "updated": "2026-08",
    "signals": [
      {"k":"ordering","v":"scheduled leader · stake weighted"},
      {"k":"slot target","v":"~400 ms"},
      {"k":"finality","v":"~13 s at 32 rooted slots"},
      {"k":"priority","v":"fee per CU + optional Jito tip"}
    ],
    "featured": ["sol", "poh", "jito-be"],
    "groups": [
      {"id":"foundation","items":["sol", "poh", "turbine"]},
      {"id":"consensus","items":["tower-bft", "alpenglow"]},
      {"id":"transactions","items":["gulf-stream", "sealevel", "sol-priority"]},
      {"id":"ordering","items":["jito-be", "jito-protect"]},
      {"id":"infrastructure","items":["shredstream", "firedancer", "swqos", "doublezero"]}
    ],
    "links": [
      {"label":"Solana documentation","url":"https://solana.com/docs","kind":"official"}
    ]
  }
}
```

### 6.1 Entity article metadata

Any entity referenced by `chainPages.*.groups.*.items` must add an `article`
object:

```json
"article": {
  "status": "published",
  "category": "ordering",
  "level": "foundation",
  "minutes": 7,
  "updated": "2026-08",
  "label": "FOUNDATION",
  "sections": [
    {
      "id": "failure-modes",
      "title": "FAILURE MODES",
      "paragraphs": ["Optional structured paragraphs appended after HOW IT WORKS."]
    }
  ]
}
```

Rules:

- `status`: `draft | published | archived`; only `published` renders.
- `category`: one taxonomy id from §2.3.
- `level`: `foundation | applied | advanced`.
- `minutes`: integer 2–30, authored from word count and diagram complexity.
- `updated`: `YYYY-MM`; required for volatile operational content.
- `label`: optional `FOUNDATION | NEW | UPDATED`; no arbitrary badge strings.
- `sections`: optional deeper article sections. Existing `body`, `how`,
  `signals`, `links`, and `related` remain canonical and render first.
- Card dek comes from `entity.tagline`; no second summary field is allowed.
- `entity.chains` must contain the parent chain id. Shared entities may be
  referenced by multiple chain pages only when their chain list supports it.

### 6.2 Validation invariants

1. Six `chainPages` records and six unique slugs.
2. `overview`, `featured`, and every group item resolve to `entities`.
3. Every listed entity has `article.status === "published"`.
4. `featured` is a three-item subset of the page's group items.
5. An entity appears at most once in a page's grouped register.
6. Every group id is from the fixed taxonomy and empty groups are absent.
7. All external URLs are HTTPS and safe-url filtered at render time.
8. Chain ids remain internal ids; route slugs remain public slugs. Neither may
   be inferred from display names.

## 7. Launch article manifest

`Existing` means the entity route already exists. `New` means implementation
must add a full entity record before the index may expose it. Shared records
still receive chain-specific placement and labels on each applicable hub.

### 7.1 Solana — 14 chain-specific articles

| Group | Entity id | Article | State |
|---|---|---|---|
| Foundation | `sol` | Solana overview | Existing |
| Foundation | `poh` | Proof of History | Existing |
| Foundation | `turbine` | Turbine propagation | Existing |
| Consensus | `tower-bft` | Tower BFT lockouts | Existing |
| Consensus | `alpenglow` | Alpenglow next-generation consensus | Existing |
| Transactions | `gulf-stream` | Gulf Stream leader forwarding | Existing |
| Transactions | `sealevel` | Sealevel parallel execution | Existing |
| Transactions | `sol-priority` | Priority fees per CU and Jito tips | Existing |
| Ordering | `jito-be` | Jito Block Engine | Existing |
| Ordering | `jito-protect` | Jito MEV-protect endpoints | Existing |
| Infrastructure | `shredstream` | ShredStream and Geyser feeds | Existing |
| Infrastructure | `firedancer` | Firedancer, SWQoS, and DoubleZero edge | Existing |
| Infrastructure | `swqos` | Stake-weighted QoS | Existing |
| Infrastructure | `doublezero` | DoubleZero transport | Existing |

Featured: `sol`, `poh`, `jito-be`.

### 7.2 Ethereum — 13 chain-specific articles

| Group | Entity id | Article | State |
|---|---|---|---|
| Foundation | `eth` | Ethereum overview | Existing |
| Consensus | `gasper` | Gasper: fork choice plus finality | **New entity from existing term** |
| Consensus | `lmd-ghost` | LMD-GHOST head choice | **New entity from existing term** |
| Consensus | `casper-ffg` | Casper FFG checkpoints | **New entity from existing term** |
| Consensus | `randao` | RANDAO proposer entropy | Existing |
| Transactions | `eip-1559` | EIP-1559 fee mechanics | Existing |
| Ordering | `pbs` | Proposer-builder separation | Existing |
| Ordering | `preconfirmations` | Preconfirmations | Existing |
| Ordering | `mev-boost` | MEV-Boost and BuilderNet | Existing |
| Safety | `flashbots-protect` | Flashbots Protect and MEV Blocker | Existing |
| Ordering | `cow` | CoW Swap, UniswapX, and intent settlement | Existing |
| Infrastructure | `bdn` | BDN and relay streams | Existing shared article |
| Infrastructure | `eth-edge` | ePBS, preconfs, Reth, and Erigon edge | Existing |

Featured: `eth`, `eip-1559`, `mev-boost`.

### 7.3 BNB Chain — 9 chain-specific articles

| Group | Entity id | Article | State |
|---|---|---|---|
| Foundation | `bnb` | BNB Chain overview | Existing |
| Consensus | `posa` | Proof of Staked Authority | **New entity from existing term** |
| Consensus | `maxwell` | Lorentz/Maxwell cadence and finality changes | **New entity from existing term** |
| Infrastructure | `bnb-edge` | Fast-finality client tuning | Existing |
| Transactions | `bnb-priority` | Gas tips and private bids | Existing |
| Ordering | `bnb-rails` | bloXroute and 48Club validator rails | Existing |
| Safety | `club48` | 48Club Privacy RPC and protection routes | Existing |
| Ordering | `kyber` | 1inch and KyberSwap routing | Existing |
| Infrastructure | `bdn` | BDN and relay streams | Existing shared article |

Featured: `bnb`, `maxwell`, `bnb-rails`.

### 7.4 Bitcoin — 10 chain-specific articles

| Group | Entity id | Article | State |
|---|---|---|---|
| Foundation | `btc` | Bitcoin overview | Existing |
| Consensus | `proof-of-work` | Proof of Work and accumulated-chain weight | **New entity from existing term** |
| Consensus | `bitcoin-finality` | Probabilistic confirmation depth | **New entity** |
| Transactions | `bitcoin-mempool` | Mempool relay and miner selection | **New entity** |
| Transactions | `rbf` | Replace-by-fee | Existing |
| Transactions | `btc-priority` | sat/vB fee market | Existing |
| Infrastructure | `fibre` | FIBRE, compact relays, and mempool APIs | Existing |
| Infrastructure | `btc-accel` | Out-of-band accelerators | Existing |
| Infrastructure | `stratum-v2` | Stratum v2 job negotiation | Existing |
| Transactions | `lightning` | Lightning payment channels | Existing |

The published count is ten after the three new records land. Featured:
`btc`, `bitcoin-mempool`, `lightning`.

### 7.5 Zcash — 6 chain-specific articles

| Group | Entity id | Article | State |
|---|---|---|---|
| Foundation | `zec` | Zcash overview | Existing |
| Consensus | `equihash` | Equihash mining | Existing |
| Transactions | `shielded-pool` | Shielded pool semantics | Existing |
| Transactions | `orchard` | Orchard and Halo 2 actions | **New entity from existing term** |
| Safety | `zec-shield` | Protocol-level shielded protection | Existing |
| Infrastructure | `zec-p2p` | Standard peer-to-peer propagation | Existing |

Featured: `zec`, `shielded-pool`, `orchard`.

### 7.6 Robinhood Chain — 17 chain-specific articles

| Group | Entity id | Article | State |
|---|---|---|---|
| Foundation | `robinhood-chain` | Robinhood Chain overview | Existing |
| Foundation | `arbitrum-nitro` | Arbitrum Nitro stack | Existing |
| Ordering | `robinhood-sequencer` | FCFS sequencer | Existing |
| Consensus | `sequencer-soft-confirmation` | Soft confirmation versus hard evidence | Existing |
| Consensus | `bold-fraud-proofs` | BoLD fraud proofs | Existing |
| Transactions | `robinhood-fees` | FCFS gas policy | Existing |
| Transactions | `l1-data-fee` | L1 data fee | Existing |
| Infrastructure | `robinhood-node` | Nitro node, ArbOS, and L1 blob reader | Existing |
| Infrastructure | `robinhood-feed` | Sequencer feed and WebSockets | Existing |
| Infrastructure | `robinhood-streams` | Chainlink Data Streams | Existing |
| Safety | `sequencer-uptime-feed` | Sequencer uptime guards | Existing |
| Ordering | `robinhood-orderflow` | UniswapX, 0x RFQ, 1inch, and LiFi | Existing |
| Liquidity | `uniswap-launcher` | Uniswap Liquidity Launcher | Existing |
| Liquidity | `robinhood-stock-tokens` | Stock Token accounting and integration | **New entity** |
| Liquidity | `robinhood-coin-launch-playbook` | Coin launch, latency, and liquidity playbook | **New entity** |
| Liquidity | `erc-8056` | ERC-8056 UI multiplier | Existing |
| Liquidity | `corporate-action-multiplier` | Corporate-action multiplier | Existing |

Featured: `robinhood-chain`, `robinhood-sequencer`,
`robinhood-coin-launch-playbook`.

The launch-playbook article must adapt the implemented Robinhood integration
spec's launch sequence, liquidity guards, latency clocks, oracle checks,
inventory limits, canary process, and 1-hour/24-hour/7-day/30-day review gates.
It must not add signing, submission, or trading controls.

## 8. Entry points and discovery

### 8.1 Existing surfaces

- Compare-dock chain headings open `#/c/<slug>`, not the overview entity.
- The CH-05 chain selector gains an `OPEN INDEX ▸` action.
- Chain entity articles include `EXPLORE <CHAIN> ARTICLES ▸` back to the hub.
- Entity pages whose `chains` has one entry show `MORE ON <CHAIN> ▸`.
- Multi-chain entity pages show one chain-hub chip per chain.
- Footer channel legend gains a compact `CHAIN INDEXES` control, not six new
  persistent nav links.

### 8.2 Command channel

Add six `kind: "chain-index"` records before ordinary entity records. Search
results use glyph `⌂` and kind label `chain index`. Searching `Solana`, `ETH`,
`Bitcoin`, `Zcash`, `BNB`, or `Robinhood` should rank the chain index before
the chain overview article, while exact article-title searches still rank the
article first.

The empty command view gains a `CHAIN INDEXES` rail containing the six routes.
The command index remains local and deterministic.

### 8.3 Internal article links

Cards use real anchors with `href="#/e/<id>"`. JavaScript enhances history,
focus return, and scroll restoration, but the href remains inspectable and
copyable. Do not build article navigation from click-only `<div>` elements.

## 9. Link Veil: optional hover + hotkey reveal

### 9.1 User contract

Link Veil is an opt-in visual focus mode for the chain index article register.

- Default: `LINKS VISIBLE`; all article actions look and behave like links.
- Optional: `LINK VEIL`; route labels quiet down.
- Pointer reveal: hover an article row and hold `L` to reveal its route action.
- Keyboard reveal: focusing the anchor always reveals it; `L` is not required.
- Touch: veil is bypassed and links remain visible.
- No JavaScript: links remain visible.
- External official-source links, glossary reference terms, global navigation,
  and safety warnings are never veiled.

The shell control label toggles between:

```text
LINKS VISIBLE
LINK VEIL · HOLD L
```

The preference is stored with `SCOPE.Store.create('chain.linkVeil', …)` under
the existing versioned storage namespace. Default value is `false`.

### 9.2 Why `L`

`L` is a hold-to-peek key and does not modify the eventual click. Do not use:

- `Alt`, which can activate menus or alter link behavior;
- `Shift`, which changes browser link opening behavior;
- `Ctrl`/`Meta`, which opens new tabs;
- `Space`, already owned by the play-through transport.

The handler ignores editors, command dialogs, key chords, and repeated keydown
events. `keyup`, window blur, route close, and `visibilitychange` must always
remove the reveal class.

### 9.3 State machine

```text
VISIBLE (default)
  toggle preference
VEILED
  pointer enters article + keydown L
PEEKING
  keyup L / pointer leaves / blur / page hidden
VEILED
  focus enters article link
FOCUS-REVEALED
  focus leaves
VEILED
```

Implementation classes:

```text
body.chain-link-veil       preference enabled
body.chain-link-peek       L currently held in an eligible context
.chain-article:hover       pointer is over a card
.chain-article:focus-within keyboard reveal override
```

The title and summary never disappear. In Link Veil mode the title remains
readable content but loses link-colored styling, while `.chain-article-route`
and its directional rule become transparent. The title anchor stays in the
accessibility tree and tab order. Pointer activation of the visually concealed
anchor is disabled until the card is peeking; the card itself is never a
surprise click target. Keyboard focus restores the complete visible-link style
before activation.

Conceptual CSS:

```css
@media (hover:hover) and (pointer:fine) {
  .chain-link-veil:not(.chain-link-peek)
  .chain-article:not(:focus-within) .chain-article-link {
    color:inherit;
    text-decoration:none;
    pointer-events:none;
    cursor:default;
  }
  .chain-link-veil:not(.chain-link-peek)
  .chain-article:not(:focus-within) .chain-article-route {
    opacity:0;
  }
  .chain-link-veil.chain-link-peek
  .chain-article:hover .chain-article-link,
  .chain-link-veil .chain-article:focus-within .chain-article-link {
    color:var(--cc);
    pointer-events:auto;
    cursor:pointer;
  }
  .chain-link-veil.chain-link-peek
  .chain-article:hover .chain-article-route,
  .chain-link-veil .chain-article:focus-within .chain-article-route {
    opacity:1;
  }
}
```

Use opacity/transform only; do not remove anchors with `display:none` or
`visibility:hidden`. Under `prefers-reduced-motion: reduce`, the transition is
instant.

### 9.4 Discoverability and accessibility

- Enabling the preference produces one status message:
  `LINK VEIL ON · HOVER AN ARTICLE AND HOLD L · TAB ALWAYS REVEALS`.
- The chain shell displays a persistent, low-contrast `HOLD L · REVEAL ROUTE`
  legend while the preference is enabled.
- The toggle has `aria-pressed` and an explicit accessible description.
- Pressing `L` alone never navigates.
- Screen-reader names remain `<Article title>, <level>, <minutes> minutes`.
- High-contrast mode replaces opacity-only reveal with an outline and visible
  `OPEN ARTICLE` text.

## 10. Article-detail extensions

The supplied `robinhood-sequencer` page is the baseline detail layout. Keep
its readable masthead, 68ch measure, signal panel, reference annotations, and
diagram/step relationship. Add only the following:

1. Breadcrumb: `<CHAIN> INDEX / <TOPIC> / <ARTICLE>`; chain segment links home.
2. Article metadata row: level, reading time, updated month.
3. Optional structured `article.sections` after `HOW IT WORKS`.
4. `FAILURE MODES` or `OPERATOR CONSIDERATIONS` for every applied/advanced
   operational article.
5. `MORE ON <CHAIN>` row before generic related entities.
6. Previous/next navigation within the originating chain topic when chain
   context exists; existing alphabetical kind navigation remains the fallback
   for direct article URLs.

No article may use a signal card as a substitute for prose, and no animated
phase may fade its explanatory text.

## 11. Content authoring rules

### 11.1 Chain summaries

- 20–32 words, one sentence.
- Describe execution, ordering, and settlement boundaries.
- No superlatives, investment language, or adoption claims.

### 11.2 Article minimum

Every published chain-specific article has:

- a precise 12–24 word tagline;
- two to four teaching paragraphs totaling 180–450 words;
- one four-step `how` sequence;
- three to six signals;
- one failure-mode or operational-consideration section when applicable;
- two to six primary/canonical sources;
- at least two related entity ids;
- a dated `updated` field for volatile mechanics.

### 11.3 Facts and sources

- Volatile figures use `~` and an `YYYY-MM` observation date.
- Soft receipt, inclusion, posting, economic finality, and bridge withdrawal
  must remain distinct clocks.
- Primary sources come first. Vendor docs may support vendor behavior; protocol
  behavior should prefer protocol specs or official chain documentation.
- All URLs are verified at authoring time and safe-url filtered at runtime.
- Article prose is original teaching copy, never a long paraphrase of one
  source and never marketing transcription.

### 11.4 Draft behavior

New article ids in §7 remain `draft` until their data, sources, static mirror,
and audit fixtures all land. A chain page must not show placeholders, disabled
cards, “coming soon” rows, or counts that include drafts.

## 12. Motion behavior

- Chain masthead: one 420 ms entrance rule and staggered signal rows.
- Featured cards: one 220 ms edge sweep on focus/hover.
- Filtering: outgoing rows fade 120 ms; incoming rows settle 180 ms. No scale
  below `.96`; text never blurs or flashes.
- Link Veil: 120 ms opacity + 4 px horizontal route reveal.
- Article counts do not animate.
- No chain-index animation loops continuously.
- Existing article diagrams continue their viewport-paused loops.
- Reduced motion renders the final state immediately and keeps all meaning.

## 13. Responsive and input behavior

Test widths: 360, 390, 430, 768, and 1200 px.

- ≥900: 12-column masthead and two-column register.
- 760–899: 8/4 masthead, one-column register if either column falls below
  320 px.
- <760: single-column, signal strip before featured reading.
- <480: short chain code in sticky header; full name remains the `h1`.
- 200% zoom: no horizontal document scroll and no clipped sticky controls.
- Pointer-fine: hover states and optional Link Veil chord.
- Pointer-coarse: visible links; no hover instructions.
- Keyboard: logical DOM order follows visual order; filtering returns focus to
  the active filter and announces the result count.

## 14. Accessibility requirements

- One `h1`, then `h2` region headings and `h3` article titles.
- Article register is a set of named `<section>` regions containing lists of
  `<article>` elements.
- Segmented filters use buttons with `aria-pressed`, not tabs unless their
  panels are separately named and controlled.
- Route actions are anchors; preference controls are buttons.
- Focus outlines use the chain color plus a contrast-safe outer line.
- No content is conveyed by chain color alone.
- Signals use semantic `dl/dt/dd` markup.
- Filter and Link Veil status use a polite live region; keydown/keyup peeking
  itself is not repeatedly announced.
- The shell traps focus while open and restores focus on close.
- Term reference cards remain above chain/entity surfaces and retain their
  hover/focus/click source behavior.

## 15. JavaScript-off and failure modes

The current JavaScript-off `ENTITY INDEX` gains a `CHAIN DIRECTORY` before it:

- six `h2`-linked chain groups;
- chain summary and signals;
- the exact published article names grouped by topic;
- each row's primary external source;
- no Link Veil styling or hidden links.

The static directory is a content mirror, not a fake hash router. Internal
entity hash links that require JavaScript are omitted in the no-JS mirror;
primary sources preserve reachability.

CDN failure keeps chain routes, filters, Link Veil, and static diagrams working.
Anime absence changes motion only. Storage denial keeps Link Veil session-only
and defaults it off on reload.

## 16. Performance, security, and privacy

- Add `styles/chain-index.css` and `scripts/chain-index.js`; no framework.
- `chainPages` metadata budget: ≤18 KB raw JSON.
- New entity/article content budget: ≤55 KB raw JSON.
- Added CSS + JS budget: ≤22 KB unminified.
- Total `index.html` target after content: ≤560 KB raw.
- No network call is required to render a chain page.
- No third-party analytics, personalization, wallet state, keys, signing,
  transaction creation, or submission APIs.
- External URLs accept HTTPS only and render escaped labels.
- `history.state` stores route/scroll ids only, never article text or user data.
- Link Veil preference is local UI state and is not transmitted.

## 17. Implementation map

### 17.1 Files

| File | Change |
|---|---|
| `index.html` | Router `chain` type, `chainPages` data, article metadata/new entities, no-JS mirror, shell mount |
| `styles/chain-index.css` | Chain hub layout, cards, filters, Link Veil, responsive and reduced-motion states |
| `scripts/chain-index.js` | Render, route lifecycle, filtering, scroll/focus return, Link Veil preference and key hold |
| `scripts/command-palette.js` | Six chain-index records, empty-state rail, ranking and route execution |
| `scripts/audit-chain-index.mjs` | Data, route, visual, accessibility, Link Veil, and degradation audit |
| `scripts/audit-command-channel.mjs` | Updated exact local-index count and chain-ranking assertions |
| `scripts/audit-degradation.mjs` | Chain routes in reduced/CDN-fail/JS-off matrix |
| `README.md` | Feature and verification command |

### 17.2 Delivery order

1. Add schema fixtures, validator, route parser, and static mirror assertions.
2. Add all new article entities in `draft`; verify links and relations.
3. Implement chain shell and render the Solana fixture.
4. Implement route transitions, Back/Forward, focus, and scroll restoration.
5. Render all six manifests and promote complete articles to `published`.
6. Integrate docks, entity breadcrumbs, command channel, and footer entry.
7. Add Link Veil preference after ordinary visible links pass QA.
8. Run the entire legacy audit suite plus the new matrix.

The Link Veil lane must not begin by styling ordinary links hidden. It lands
only after the default visible-link state and keyboard/touch fallbacks pass.

## 18. QA and acceptance criteria

### 18.1 Static data assertions

- Exactly six chain pages and six canonical slugs from §0.
- Every overview, featured id, and article id resolves.
- Zero draft/archived records in rendered manifests.
- Every article's chain list contains its index chain.
- Exactly three featured articles per page.
- No duplicate article within a chain register.
- Every internal `#/c/` and `#/e/` href resolves.
- Every external URL is HTTPS; every new-tab link has noopener/noreferrer.
- No article/source names are hard-coded in the renderer.

### 18.2 Runtime route matrix

At 390 and 1200 px, direct-open all six `#/c/` routes and assert:

- correct title, `h1`, signals, article count, groups, and primary docs;
- no page overflow;
- no console/page errors;
- close/Escape behavior and focus return;
- previous/next stable order;
- article open → Back restores chain route, scroll, and article focus;
- Forward reopens the same article;
- direct article route still closes to the base page.

### 18.3 Link Veil matrix

1. Default preference: every route action is visible and clickable.
2. Enable veil on pointer-fine desktop: nonfocused route action is visually
   veiled and cannot receive pointer activation.
3. Hover card + hold `L`: only the hovered card route appears; key release
   hides it.
4. Move pointer while holding `L`: reveal follows the hovered card.
5. Tab to a veiled route: it becomes visible without `L` and activates with
   Enter.
6. Focus an editor and type `l`: no page reveal state changes.
7. Blur or hide document during peek: reveal class clears.
8. Touch/coarse pointer: preference is ignored and routes remain visible.
9. Reduced motion: reveal is instant.
10. JavaScript-off: all static directory source links remain visible.

### 18.4 Full regression gate

```text
node scripts/audit-foundation.mjs
node scripts/audit-svg-fit.mjs
node scripts/audit-contrast.mjs
node scripts/audit-readability.mjs
node scripts/audit-degradation.mjs
node scripts/audit-command-channel.mjs
node scripts/audit-robinhood-chain.mjs
node scripts/audit-chain-index.mjs
cd journal && bun test && bun run check:tokens
```

### 18.5 Definition of done

The feature is complete only when:

- all six chain indexes are deep-linkable and populated from the manifest;
- every rendered chain-specific article opens a complete entity reader;
- the supplied sequencer detail pattern is reachable from the Robinhood hub;
- default links are obvious, sourced, and keyboard operable;
- Link Veil is opt-in, hold-to-peek, and bypassed for keyboard/touch/no-JS;
- Back/Forward and scroll/focus restoration pass;
- static mirrors contain the same published article inventory;
- all legacy and new audits pass; and
- Pages deployment serves the exact committed route/data revision.
