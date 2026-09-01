# 06 — QA, security, performance, and release

> **Release posture:** fail closed on provenance, completeness, auth, and the
> protected Solana boundary

## 1. Required automated commands

```sh
node scripts/validate-robinhood-source.mjs
node scripts/audit-robinhood-source.mjs
node scripts/audit-robinhood-scope.mjs
node scripts/audit-multichain-gang.mjs
node scripts/audit-global-chrome.mjs
node scripts/audit-degradation.mjs
./run check
```

If `./run check` is not yet a supported command, the root integrator adds it as
an aggregator without breaking existing `./run` local serving. The new source
audit may share helpers but has its own failure labels.

## 2. Data/provenance validator

`validate-robinhood-source.mjs` must fail for:

- mutable default-branch URLs where an immutable permalink is required;
- a commit other than the currently documented Nitro image pin;
- `truncated: true`, mismatched tree census, duplicate/missing path, unreachable
  directory, unresolved gitlink, wrong mode/type, or shard digest drift;
- excerpt lines/digest not matching the recorded immutable blob;
- comparison path missing at its pinned commit;
- missing evidence state, deployment equivalence, checked date, license signal,
  measurement list, caveat, or source URL;
- first-party labeling on a non-first-party owner;
- deployed labeling without independent deployment evidence;
- unknown schema version, duplicate ID, unsafe path, or unapproved repo;
- HTML/script content in data fields, disallowed protocols, or a URL credential;
- generated payload exceeding a hard budget.

Offline CI validates committed digests and schemas. A separately authorized
refresh job performs remote existence/blob checks and commits updated evidence.
Do not make routine page builds depend on GitHub rate limits.

## 3. Static source audit

`audit-robinhood-source.mjs` checks:

- exactly one `h1`, semantic landmarks, skip link, canonical route, and
  `data-auth-scope="ROBINHOOD / SOURCE"`;
- correct relative auth/site/select assets;
- Robinhood `Scope · Chains · Tools · Source` navigation on all four Robinhood
  pages, with no Source requirement on Solana pages;
- all eight featured and five secondary hotspot IDs;
- exactly six systems and five comparison axes;
- visible public/private boundary, Nitro commit, cutoff, evidence legend,
  license links, and five unavailable-source rows;
- local registration shards and no runtime `fetch(`, remote script, wallet,
  RPC, signing, credential, brokerage, or transaction-submit surface;
- source renderer uses escaped text/`textContent`, not data-fed `innerHTML`;
- no `eval`, `new Function`, dynamically constructed script host, or unsafe
  `javascript:`/`data:` navigation;
- all interactive controls have names and popup relations.

## 4. Protected Solana gate

Record the integration base SHA before implementation. Release requires:

```sh
git diff --name-only <base-sha>..HEAD -- multichain/solana
node scripts/audit-robinhood-scope.mjs
```

The diff output is empty, and the existing
`multichain/robinhood/.solana-baseline.sha256` remains unchanged. Do not
regenerate its value to hide a violation. Reading Solana data for comparison is
allowed; writing any Solana file blocks release.

## 5. Browser matrix

Run Chromium through Playwright at widths `320, 360, 390, 430, 768, 1200,
1440` and heights representative of mobile and desktop. At minimum cover:

1. auth denied, wrong code, correct code, session reload, logout, local bypass;
2. page load and default Nitro root;
3. expand/collapse, deep nested path, gitlink, hidden-category reveal;
4. search exact/fuzzy/no-result, filter, result-to-tree focus;
5. every featured hotspot and ordinary metadata-only blob;
6. each hash route, reload, Back, Forward, unknown ID/path;
7. all five comparison axes and five alternate systems;
8. keyboard-only tree navigation and type-ahead;
9. dropdown/drawer/dialog outside-click, Escape, focus trap, and focus restore;
10. `file:` mode with external network blocked;
11. JS-off fail-closed auth state;
12. reduced motion, forced colors, 200% text zoom, and high contrast;
13. shard missing/corrupt and source-changed authored errors;
14. external Link Veil behavior and immutable destination display.

At every viewport, assert no document-level horizontal overflow, clipped focus,
overlapping sticky chrome, inaccessible close action, or off-screen popup.

## 6. Accessibility checks

- Run axe (or equivalent) after default load and each major overlay state.
- Verify heading order, landmarks, table headers/captions, form labels, status
  live regions, dialog naming, and `aria-current`.
- Exercise the full tree with arrows, Home/End, Enter/Space, and type-ahead.
- Confirm focus never enters collapsed/unloaded descendants.
- Confirm selected, focused, unavailable, hidden, and emphasized-code states
  remain distinguishable without color.
- Confirm code lines retain sensible screen-reader order without announcing
  decorative token spans or duplicate line numbers.
- Test macOS VoiceOver or another manual screen reader for one complete flow:
  authenticate → find H01 → read code explanation → open compare → return.

## 7. Performance budgets

| Metric | Target | Hard gate |
|---|---:|---:|
| Initial authored payload, uncompressed | ≤180 KiB | ≤250 KiB |
| Catalog, uncompressed | ≤80 KiB | ≤100 KiB |
| Typical directory shard | ≤64 KiB | ≤128 KiB unless approved |
| Maximum rendered tree rows | ≤1,200 | ≤2,000 |
| Cached directory expansion p95 | ≤50 ms | ≤100 ms |
| Search response p95 after index load | ≤50 ms | ≤100 ms |
| Route/selection update p95 | ≤50 ms | ≤100 ms |
| Long tasks during normal exploration | none >50 ms | none >100 ms |
| Layout shift after authenticated reveal | ≤0.05 | ≤0.10 |

Test on a throttled mid-tier mobile profile and reference desktop. Record raw
measurements in the release note. Directory shards must not parse/render every
descendant on root load. Syntax tokenize once per highlight and cache the
escaped fragment.

## 8. Security/privacy review

- Authentication is a presentation/session gate on a static site, not a claim
  of server-enforced confidentiality. State that limitation in docs.
- Load source data only after the gate grants the session in normal web use.
- No telemetry, analytics, cookies beyond existing auth behavior, query-log
  upload, wallet provider, clipboard read, service worker, or live RPC/GitHub
  request.
- Use `textContent`/DOM node creation for source, paths, search, evidence, and
  errors. If token markup is used, it comes only from an allowlisted local
  tokenizer over escaped source with fixed class names.
- Allow external navigation only to `https:` reviewed destinations. Add
  `rel="noopener noreferrer"` where appropriate.
- Validate percent-decoded hash paths before lookup; never use them as file,
  selector, HTML, or script paths.
- Do not persist search, repository selections containing arbitrary user text,
  or clipboard contents.

## 9. Content/legal review

- Verify repository license at the exact revision, not only GitHub metadata.
- Review every excerpt for minimality and required notice attribution.
- Confirm Uniswap deployed-code commits separately from current monorepo pins.
- Label Chainlink and ERC material reference implementations when no bytecode
  match is established.
- Confirm no source prose becomes trading advice, priority promise, bypass
  instruction, or claim of private topology.
- Apply a second-person editorial pass specifically to all `DO NOT INFER`
  caveats and unavailable-source rows.

## 10. Release sequence and evidence bundle

1. Freeze base SHA, research cutoff, ledger, and generator version.
2. Generate/check tree data in a clean worktree.
3. Run schema, source, existing site, and Solana-protection audits.
4. Serve with `./run`; execute the browser matrix with network blocked once.
5. Review performance report, axe output, screenshots at 390/768/1440, and
   excerpt/license manifest.
6. Verify `git status --short`, changed-file ownership, and no generated drift.
7. Commit only after all gates pass; push/deploy only with the authority already
   established for the release workflow.
8. After production deploy, smoke-test auth, Source navigation, H01, H06,
   cross-chain route, outside click, Escape, `file:` artifact, and 404 behavior.

Release evidence lives in an ignored temporary directory or attached CI
artifact, not as screenshots/binaries in the site unless intentionally
approved. The handoff reports exact commands, pass/fail counts, release digest,
repo/path totals, hotspot total, comparison total, and protected Solana diff.

## 11. Failure and rollback policy

- Any provenance, completeness, unsafe rendering, auth, or Solana failure is a
  release blocker.
- An unavailable remote source during refresh retains the last known-good
  snapshot with an explicit stale status; never publish a partial regenerated
  tree as exhaustive.
- If production fails, restore the prior deployment/commit through the existing
  non-destructive release mechanism. Do not rewrite history or use a destructive
  reset.
- Record changed upstream commit, missing path, or digest mismatch before
  updating an excerpt; do not silently move line numbers.
