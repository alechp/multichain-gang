# SCOPE//ROBINHOOD CHAIN

A standalone, read-only engineering instrument for Robinhood Chain sequencing,
settlement, order flow, latency, Stock Token integration boundaries, and
cross-chain comparison.

Open `index.html` directly or serve the repository root and visit
`/robinhood/`. No build step, wallet, telemetry, transaction submission, or
runtime content API is required.

The readable stylesheet is `styles/scope.css`; `styles/scope.min.css` is the
served mechanical derivative. The page reuses the repository's vendored Fuse
build but includes a deterministic substring-search fallback.

## Protected Solana boundary

The original Solana page remains `../index.html`. Its release checksum is
stored in `.solana-baseline.sha256` and enforced by the standalone content
audit. Do not update that baseline to make an accidental Solana edit pass.

## Verification

```sh
node scripts/audit-robinhood-scope.mjs
node scripts/audit-robinhood-scope-fit.mjs
node scripts/audit-robinhood-scope-degrade.mjs
```

The complete Solana regression suite in the root README must also remain
green. Specifications and release evidence live in `../docs/robinhood-scope/`.
