# SOLANA//SCOPE

An engineering readout of Solana, styled as a four-channel oscilloscope: consensus
topology, transaction signal path, MEV, and the low-latency trading stack —
diagrammed in SVG and animated with anime.js. Single self-contained HTML file.

## Run

Open `index.html` in a browser, or serve locally:

    npx serve .

## Layout

    index.html                      v1 page (CH-01 … CH-04)
    docs/solana-scope-v2-spec.md    v2 specification: aesthetic + mobile pass,
                                    per-section chain comparators (BTC/ETH/BNB/ZEC),
                                    and CH-05 cross-chain tools & techniques bench

## Status

v1 shipped · v2 specced (see docs). Figures on the page are illustrative orders
of magnitude, not live telemetry.
