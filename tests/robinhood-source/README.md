# Robinhood Source audit fixtures

`fixture-contract.mjs` is a deliberately small, synthetic version of the
public Source page contract. It contains no copied upstream source code and no
production data.

`node scripts/audit-robinhood-source.mjs --self-test` uses it to prove that the
audit accepts the frozen hotspot/system/axis contract and rejects representative
unsafe sinks, runtime networking, missing IDs, unsafe paths, malformed evidence,
and weakened authentication markup. The self-test does not need Playwright or a
generated source tree, so Worker C remains testable before integration.

The fixtures are test inputs only. Product code must consume the generated
registration data from `multichain/robinhood/source/data/**`.
