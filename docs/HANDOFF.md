# Handoff: chat session → Claude Code

State at handoff (2026-08-13):
- v1 shipped and committed (`index.html`).
- v2 fully specced (`docs/solana-scope-v2-spec.md`), not yet implemented.
- Remote `origin` preconfigured; repo NOT yet created on GitHub (the chat sandbox had no gh auth).

## Step 1 — publish (run first)
    gh repo create alechp/solana --public --source=. --remote=origin --push
If the repo already exists: `git push -u origin main`.

## Step 2 — build v2 (order matters)
1. Spec 1 global systems: tokens, phosphor bloom, section tinting, viewport-pause for loops.
2. Spec 1 mobile diagram variants (vertical pipeline is the long pole).
3. Spec 2 compare-dock shell + `#chainData` JSON + topology content, then txflow/mev/latency.
4. Spec 3 technique×chain grid, tool bench, cross-links.
Commit per numbered step with messages like `v2(spec1): bloom + section tinting`.

## Definition of done per step
Meets the acceptance criteria listed at the end of each spec section, and passes
the QA gate in CLAUDE.md.
