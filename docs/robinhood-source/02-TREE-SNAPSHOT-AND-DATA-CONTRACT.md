# 02 — Tree snapshot and data contract

> **Depends on:** `00`, `01`  
> **Runtime rule:** static, deterministic, network-independent after page load

## 1. Deliverable layout

```text
multichain/robinhood/source/
├── index.html
├── styles/source.css
├── scripts/{runtime,tree,inspector,compare}.js
└── data/
    ├── {catalog,highlights,comparisons,artifacts}.js
    ├── search/<repo-id>.js
    └── trees/<repo-id>/
        ├── manifest.js
        └── directories/<path-key>.js

scripts/{refresh,validate}-robinhood-source.mjs
```

The browser must not call GitHub, Robinhood, an RPC node, or a CDN to render
the core explorer. Generated files register data synchronously and therefore
work on GitHub Pages and direct `file:` URLs:

```js
window.RH_SOURCE = window.RH_SOURCE || { pending: [] };
window.RH_SOURCE.pending.push({ type: "directory", payload: DIRECTORY });
```

The runtime drains `pending`, validates `schemaVersion`, and rejects duplicate
IDs. Do not use `fetch()` for local JSON. No `eval`, `new Function`, JSONP
callback names, or remote script injection is permitted.

## 2. Snapshot algorithm

Input is the reviewed ledger, never keyword search output. For each record:

1. Verify the reviewed immutable commit and resolve its root tree SHA.
2. Request the recursive Git tree.
3. If GitHub returns `truncated: true`, walk trees breadth-first by SHA until
   every descendant is collected. A partial result is a hard failure.
4. Cross-check with `git ls-tree -r -t --full-tree <commit>` from a blobless
   partial clone if the API path set disagrees.
5. Preserve every entry: path, mode, type, object SHA, optional size, and
   gitlink target. Dotfiles, generated code, vendor, fixtures, snapshots,
   documentation, assets, and tests may be hidden but never omitted.
6. Normalize only for sorting/search. Reject absolute paths, `..`, NUL, invalid
   UTF-8, and duplicate normalized keys; never rewrite the stored path.
7. Sort directories before files and then compare UTF-8 bytes.
8. Compute SHA-256 per shard and a release digest over ordered
   `relative-path + digest` pairs.
9. Fail unless the generated path set exactly equals the fetched source set.

Gitlinks are nodes, not directories. Nitro gitlinks resolve to repository
records at their exact SHAs; two paths pinning one repository at different
SHAs remain distinct instances.

## 3. Repository schema

```ts
type EvidenceState =
  | "confirmed" | "version-pinned" | "upstream-reference"
  | "integration-reference" | "documented-absence" | "not-public"
  | "conflicted" | "volatile" | "comparison-only";

interface RepositoryRecord {
  id: string;
  owner: string;
  name: string;
  canonicalUrl: string;
  declaredUrl?: string;
  revision: { commit: string; tag?: string; branchAtResearch?: string };
  rootTreeSha: string;
  evidenceTier: "A" | "B" | "C" | "D";
  evidenceState: EvidenceState;
  inclusionBasis: string;
  deploymentEquivalence:
    | "robinhood-contribution" | "public-node-build-pin"
    | "integration-source" | "reference-only" | "comparison-only";
  license: { spdx: string | null; path?: string; excerptAllowed: boolean };
  status: { fork: boolean; archived: boolean; private: false };
  counts: { entries: number; trees: number; blobs: number; gitlinks: number };
  sourceCheckedAt: string;
  treeDigest: string;
  defaultHiddenGroups: string[];
}
```

`deploymentEquivalence` is mandatory. Never infer deployment from an owner,
topic, filename, address, or chain ID.

## 4. Tree and shard schemas

```ts
interface TreeEntry {
  repoId: string;
  path: string;
  name: string;
  parentKey: string;
  key: string; // truncated SHA-256(repoId + NUL + path)
  kind: "tree" | "blob" | "gitlink";
  mode: string;
  objectSha: string;
  size: number | null;
  language: string | null;
  category: "source" | "test" | "docs" | "generated" | "vendor" | "asset";
  hiddenByDefault: boolean;
  childCount?: number;
  targetRepoId?: string;
}

interface DirectoryShard {
  schemaVersion: 1;
  repoId: string;
  directoryPath: string;
  directoryKey: string;
  entries: TreeEntry[];
  digest: string;
}
```

The manifest maps directory keys to local shards. Target 64 KiB uncompressed
per shard; split oversized directories into deterministic pages without
changing the logical child list. Never materialize more than 2,000 tree rows.

## 5. Search index

Index paths and reviewed symbols, not arbitrary blob contents. Tokenize on
path/punctuation and camel-case boundaries. Exact path-prefix and symbol
matches rank before fuzzy matches; repository/evidence filters apply first.
Hidden results remain available with a visible category tag.

- Query length: 2–120 characters.
- Render at most 100 results and show total matches.
- Tie-break by repository order, then bytewise path.
- Do not persist search history.
- Results p95 under 100 ms after the repository index loads.
- Insert all query/results with `textContent`, never HTML.

## 6. Highlight schema

```ts
interface HighlightRecord {
  id: string;
  chapterId: string;
  title: string;
  repoId: string;
  commit: string;
  path: string;
  language: string;
  selection: { startLine: number; endLine: number; sourceSha256: string };
  permalink: string;
  excerptLines: { number: number; text: string; emphasis?: string[] }[];
  evidenceState: EvidenceState;
  evidence: { label: string; url: string; checkedAt: string }[];
  mechanism: string;
  quantInsight: string;
  measurements: string[];
  failureModes: string[];
  caveats: string[];
  license: { spdx: string | null; notice: string };
}
```

Only reviewed highlights ship source text. Each selection is normally 6–18
logical lines and is the smallest complete fragment supporting the claim.
Never splice non-contiguous lines into apparent contiguous control flow. The
offline validator re-extracts each range from its immutable blob and verifies
the digest.

Use a local tokenizer or reviewed vendored highlighter. Escape source first,
preserve exact text, use fixed CSS token classes, and remain legible without
color. Never execute or dynamically import code based on `language`.

## 7. Non-GitHub artifact schema

```ts
interface ArtifactRecord {
  id: string;
  label: string;
  authority: "robinhood";
  url: string;
  network: "mainnet" | "testnet";
  mime: string;
  bytes: number | null;
  sha256: string;
  checkedAt: string;
  parsedFacts: { key: string; value: string; sourcePointer: string }[];
}
```

These render under `PUBLISHED CONFIGURATION`. Comparison repositories follow
`05` and do not become full explorer trees.

## 8. Loading and payload contract

- HTML, critical CSS, runtime, catalog, and initial chapter data target 180 KiB
  uncompressed; hard gate 250 KiB.
- Catalog target: 80 KiB uncompressed.
- Load trees, search indexes, and secondary highlights on demand through local
  same-origin script elements after authentication.
- Preload only the Nitro root and eight featured highlights.
- A missing shard shows deterministic retry UI; never fall back to live GitHub.
- Add no service worker in release one.

## 9. Commands and build manifest

```sh
node scripts/refresh-robinhood-source.mjs --ledger docs/robinhood-source/01-REPOSITORY-RESEARCH-LEDGER.md
node scripts/validate-robinhood-source.mjs
```

Refresh writes `data/BUILD-MANIFEST.json` with schema/generator version, source
commits, counts, shard digests, release digest, and cutoff. `--check` generates
in a temporary directory and byte-compares committed output. Network access is
refresh-time only; missing/rate-limited responses fail closed.

## 10. Acceptance gates

- No accepted tree response is truncated.
- Nitro root and all 14 gitlinks resolve to ledger SHAs.
- Generated and fetched censuses match for every repository.
- Every path is reachable through directory shards.
- Every hotspot digest/range matches its immutable blob.
- Every repository permalink contains its commit SHA.
- Identical inputs yield an identical release digest.
- Direct `file:` access opens a root, nested path, and featured highlights
  without a network request.
