const app = {
  state: null,
  evm: null,
  selected: null,
  kind: "all",
  noteTag: "",
  noticeTimer: null,
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;",
}[char]));

function notice(message, error = false) {
  const node = $("#live-status");
  node.textContent = message;
  node.className = `live-status visible${error ? " error" : ""}`;
  clearTimeout(app.noticeTimer);
  app.noticeTimer = setTimeout(() => { node.className = "live-status"; }, 3_500);
}

async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options?.headers ?? {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return payload;
}

function date(ts) {
  return ts == null ? "never" : new Date(ts * 1_000).toISOString().replace(".000Z", "Z");
}

function number(value, digits = 4) {
  return value == null ? "—" : new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function svgPoints(points, width, height, padding = 2) {
  if (!points?.length) return "";
  const values = points.map((point) => point[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return points.map((point, index) => {
    const x = padding + (points.length === 1 ? width / 2 : index * (width - padding * 2) / (points.length - 1));
    const y = padding + (max === min ? height / 2 : (max - point[1]) * (height - padding * 2) / (max - min));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function miniTrace(points) {
  return `<svg class="mini-trace" viewBox="0 0 78 22" role="img" aria-label="Balance sparkline"><path d="M ${svgPoints(points, 78, 22).replaceAll(" ", " L ")}" /></svg>`;
}

const traceColors = ["var(--cyan)", "var(--amber)", "var(--red)", "var(--green)"];
const traceNames = ["balance.sol", "fees.paid", "tips.paid", "tx.rate"];

function traceChart(series) {
  const width = 720;
  const laneHeight = 66;
  const plotLeft = 118;
  const plotWidth = width - plotLeft - 16;
  const rows = traceNames.map((name, index) => {
    const points = series?.[name] ?? [];
    const laneTop = index * laneHeight + 12;
    const tuples = points.map((point) => [point.ts, point.value]);
    const coords = svgPoints(tuples, plotWidth, laneHeight - 24, 2).split(" ").map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${(x + plotLeft).toFixed(1)},${(y + laneTop).toFixed(1)}`;
    }).join(" ");
    const latest = points.at(-1)?.value ?? null;
    return `
      <line class="trace-grid" x1="${plotLeft}" y1="${laneTop + laneHeight - 20}" x2="${width - 16}" y2="${laneTop + laneHeight - 20}" />
      <text class="trace-label" x="12" y="${laneTop + 13}">${escapeHtml(name.toUpperCase())}</text>
      <text class="trace-value" x="12" y="${laneTop + 29}">${escapeHtml(number(latest, name === "balance.sol" ? 4 : 0))}</text>
      ${coords ? `<polyline class="trace-line" style="stroke:${traceColors[index]}" points="${coords}" />` : `<line class="trace-line trace-empty" style="stroke:${traceColors[index]}" x1="${plotLeft}" y1="${laneTop + 22}" x2="${width - 16}" y2="${laneTop + 22}" />`}`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${laneHeight * 4 + 8}" role="img" aria-label="Stacked historical balance, fee, tip and transaction-rate traces">
    <defs><filter id="afterglow"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${rows}
  </svg>`;
}

function renderWatchlist() {
  const rows = app.state.addresses;
  $("#watch-count").textContent = String(rows.length).padStart(2, "0");
  $("#watch-list").innerHTML = rows.length === 0
    ? `<p class="panel-intro">No armed watches.</p>`
    : rows.map((row) => `<button class="watch-card${row.address === app.selected ? " active" : ""}" type="button" data-address="${escapeHtml(row.address)}">
        <strong>${escapeHtml(row.label ?? "unlabeled")}</strong>${miniTrace(row.balance)}
        <small>${escapeHtml(row.address)} · ${escapeHtml(date(row.lastSeen))}</small>
      </button>`).join("");
}

function renderTransactions(detail) {
  const rows = detail.transactions.filter((tx) => app.kind === "all" || tx.kind === app.kind);
  $("#tx-table").innerHTML = rows.length === 0
    ? `<tr><td colspan="5">— NO TRANSACTIONS IN THIS WINDOW —</td></tr>`
    : rows.map((tx) => `<tr>
        <td>${escapeHtml(date(tx.ts))}</td>
        <td><span class="kind">${escapeHtml(tx.kind ?? "unknown")}</span></td>
        <td>${escapeHtml(tx.slot)}</td>
        <td>${escapeHtml(number(tx.feeLamports, 0))}</td>
        <td><a href="https://solscan.io/tx/${encodeURIComponent(tx.signature)}" target="_blank" rel="noopener noreferrer">OPEN ON SOLSCAN ↗</a></td>
      </tr>`).join("");
}

function renderDetail() {
  const detail = app.state.selected;
  $("#empty-state").hidden = !app.state.empty;
  $("#detail-panel").hidden = detail == null;
  if (!detail) return;
  $("#address-identity").innerHTML = `
    <strong>${escapeHtml(detail.label ?? "UNLABELED WATCH")}</strong>
    <code>${escapeHtml(detail.address)}</code>
    ${detail.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    <span class="tag">LAST ${escapeHtml(date(detail.lastSeen))}</span>`;
  const metrics = [
    ["BALANCE", detail.latest["balance.sol"], "SOL", 4],
    ["FEE SIGNAL", detail.latest["fees.paid"], "lamports", 0],
    ["TIP SIGNAL", detail.latest["tips.paid"], "lamports", 0],
    ["TX RATE", detail.latest["tx.rate"], "/ hour", 0],
  ];
  $("#metric-strip").innerHTML = metrics.map(([label, value, unit, digits]) => `<div class="metric"><span>${label}</span><strong>${number(value, digits)} ${unit}</strong></div>`).join("");
  $("#trace-chart").innerHTML = traceChart(detail.series);
  renderTransactions(detail);
}

function renderEvm() {
  const state = app.evm;
  if (!state) return;
  $("#evm-watch-count").textContent = String(state.addresses.length).padStart(2, "0");
  const head = state.head;
  const headStages = head == null ? [] : state.finality
    .filter((row) => row.blockNumber === head.blockNumber)
    .map((row) => row.stage);
  const metrics = head == null
    ? [["HEAD", "—", "collect first"], ["FINALITY", "—", "no evidence"], ["WATCHES", state.addresses.length, "addresses"]]
    : [
        ["HEAD", head.blockNumber, "L2 block"],
        ["FINALITY", headStages.join(" → ") || "soft", "evidence stages"],
        ["BLOCK GAS", head.gasUsed, "wei-scale integer"],
        ["WATCHES", state.addresses.length, "addresses"],
      ];
  $("#evm-head").innerHTML = metrics.map(([label, value, unit]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)} <small>${escapeHtml(unit)}</small></strong></div>`).join("");
  $("#evm-observation-table").innerHTML = state.observations.length === 0
    ? `<tr><td colspan="4">— NO ROBINHOOD CHAIN OBSERVATIONS —</td></tr>`
    : state.observations.slice(0, 16).map((row) => `<tr>
        <td>${escapeHtml(date(row.ts))}</td>
        <td><span class="kind">${escapeHtml(row.series)}</span></td>
        <td>${escapeHtml(row.value ?? row.textValue ?? "—")}</td>
        <td>${escapeHtml(row.blockNumber ?? "—")}</td>
      </tr>`).join("");
  $("#evm-activity-table").innerHTML = state.activity.length === 0
    ? `<tr><td colspan="5">— NO TRANSACTIONS IN COLLECTED BLOCKS —</td></tr>`
    : state.activity.slice(0, 16).map((row) => `<tr>
        <td>${escapeHtml(date(row.ts))}</td>
        <td><span class="kind">${escapeHtml(row.kind)}</span></td>
        <td>${escapeHtml(row.chainPosition)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td><a href="https://robinhoodchain.blockscout.com/tx/${encodeURIComponent(row.txId)}" target="_blank" rel="noopener noreferrer">OPEN ON BLOCKSCOUT ↗</a></td>
      </tr>`).join("");
  $("#evm-watch-list").innerHTML = state.addresses.length === 0
    ? `<p class="panel-intro">No Robinhood Chain addresses armed.</p>`
    : state.addresses.map((row) => `<div class="evm-watch-row">
        <span><strong>${escapeHtml(row.label ?? "unlabeled")}</strong><code>${escapeHtml(row.checksumAddress)}</code></span>
        <button type="button" class="quiet danger" data-evm-remove="${escapeHtml(row.address)}">PAUSE</button>
      </div>`).join("");
}

function renderSimParams() {
  const id = $("#sim-select").value;
  const sim = app.state.simulators.find((item) => item.id === id);
  $("#sim-params").innerHTML = sim?.params.map((param) => `<div class="param">
    <label for="param-${escapeHtml(param.id)}">${escapeHtml(param.label)}${param.unit ? ` · ${escapeHtml(param.unit)}` : ""}</label>
    <input id="param-${escapeHtml(param.id)}" data-param="${escapeHtml(param.id)}" type="${param.type === "number" ? "number" : "text"}" value="${escapeHtml(param.default)}" ${param.min == null ? "" : `min="${param.min}"`} ${param.max == null ? "" : `max="${param.max}"`}>
    <small>${escapeHtml(param.description)}</small>
  </div>`).join("") ?? "";
}

function resultChart(result) {
  const series = result?.series?.slice(0, 3) ?? [];
  if (!series.some((row) => row.points.length)) return "";
  const width = 620;
  const height = 160;
  return `<svg class="sim-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Simulator historical overlay">
    ${Array.from({ length: 5 }, (_, index) => `<line class="trace-grid" x1="8" y1="${12 + index * 34}" x2="612" y2="${12 + index * 34}" />`).join("")}
    ${series.map((row, index) => `<polyline class="trace-line" style="stroke:${traceColors[index]}" points="${svgPoints(row.points, width, height, 10)}" />`).join("")}
  </svg>`;
}

function renderSim() {
  $("#sim-select").innerHTML = app.state.simulators.map((sim) => `<option value="${escapeHtml(sim.id)}">${escapeHtml(sim.label)}</option>`).join("");
  renderSimParams();
  $("#note-sim").innerHTML = `<option value="">none</option>${app.state.simRuns.map((run) => `<option value="${escapeHtml(run.id)}">${escapeHtml(run.sim)} · ${escapeHtml(date(run.ts))}</option>`).join("")}`;
  const run = app.state.simRuns[0];
  if (!run) {
    $("#sim-output").innerHTML = `<p class="panel-intro">No saved paper runs.</p>`;
    return;
  }
  const result = run.result;
  $("#sim-output").innerHTML = `<div class="result-card">
    <span class="paper-stamp">${escapeHtml(result.stamp)}</span>
    <h3>${escapeHtml(run.sim)}</h3><p>${escapeHtml(result.summary)}</p>
    <div class="result-metrics">${result.metrics.map((metric) => `<div><span>${escapeHtml(metric.k)}</span><strong>${escapeHtml(metric.v)}</strong></div>`).join("")}</div>
    ${resultChart(result)}
    <div class="result-columns"><div><h3>ASSUMPTIONS</h3><ol>${result.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div>
    <div><h3>CAVEATS</h3><ol>${result.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div></div>
  </div>`;
}

function renderJournal() {
  const rows = app.state.entries.filter((entry) => !app.noteTag || entry.tags.includes(app.noteTag));
  $("#journal-list").innerHTML = rows.length === 0
    ? `<p class="panel-intro">No matching journal entries.</p>`
    : rows.map((entry) => `<article class="journal-entry">
      <time>${escapeHtml(date(entry.ts))}</time><p>${escapeHtml(entry.body)}</p>
      <div class="entry-links">${entry.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}${entry.address ? `<span>ADDR ${escapeHtml(entry.address.slice(0, 10))}…</span>` : ""}${entry.simRun ? `<span>SIM ${escapeHtml(entry.simRun.slice(0, 8))}…</span>` : ""}</div>
    </article>`).join("");
}

function render() {
  renderWatchlist();
  renderDetail();
  renderEvm();
  renderSim();
  renderJournal();
}

async function load(address = app.selected) {
  const query = address ? `?address=${encodeURIComponent(address)}&window=30d` : "?window=30d";
  [app.state, app.evm] = await Promise.all([
    api(`/api/state${query}`),
    api("/api/evm/state"),
  ]);
  app.selected = app.state.selected?.address ?? app.state.addresses[0]?.address ?? null;
  render();
}

document.addEventListener("click", async (event) => {
  const evmRemove = event.target.closest("[data-evm-remove]");
  if (evmRemove) {
    try {
      await api(`/api/evm/watch/${encodeURIComponent(evmRemove.dataset.evmRemove)}`, { method: "DELETE" });
      await load(app.selected);
      notice("Robinhood Chain watch paused; historical rows retained.");
    } catch (error) { notice(error.message, true); }
    return;
  }
  const watch = event.target.closest("[data-address]");
  if (watch) {
    app.selected = watch.dataset.address;
    await load(app.selected);
  }
});

$("#evm-watch-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await api("/api/evm/watch", {
      method: "POST",
      body: JSON.stringify({ address: data.get("address"), label: data.get("label"), tags: [] }),
    });
    event.currentTarget.reset();
    await load(app.selected);
    notice("Robinhood Chain watch armed. Public reads only.");
  } catch (error) { notice(error.message, true); }
});

$("#watch-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const row = await api("/api/watch", {
      method: "POST",
      body: JSON.stringify({
        address: data.get("address"),
        label: data.get("label"),
        tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    event.currentTarget.reset();
    app.selected = row.address;
    await load(row.address);
    notice("Watch armed. Public observation only.");
  } catch (error) { notice(error.message, true); }
});

$("#remove-watch").addEventListener("click", async () => {
  if (!app.selected) return;
  try {
    await api(`/api/watch/${encodeURIComponent(app.selected)}`, { method: "DELETE" });
    app.selected = null;
    await load();
    notice("Watch paused; historical rows retained.");
  } catch (error) { notice(error.message, true); }
});

$("#kind-filter").addEventListener("change", (event) => {
  app.kind = event.target.value;
  if (app.state.selected) renderTransactions(app.state.selected);
});
$("#sim-select").addEventListener("change", renderSimParams);

$("#sim-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!app.selected) return notice("Collect or select an address first.", true);
  const params = Object.fromEntries([...document.querySelectorAll("[data-param]")].map((input) => [input.dataset.param, input.value]));
  try {
    await api("/api/sim", {
      method: "POST",
      body: JSON.stringify({
        id: $("#sim-select").value,
        address: app.selected,
        window: $("#sim-window").value,
        params,
      }),
    });
    await load(app.selected);
    notice("Paper run saved with assumptions and caveats.");
  } catch (error) { notice(error.message, true); }
});

$("#note-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await api("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        body: data.get("body"),
        address: app.selected,
        simRun: data.get("simRun") || null,
        tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    event.currentTarget.reset();
    await load(app.selected);
    notice("Observation linked and saved.");
  } catch (error) { notice(error.message, true); }
});

$("#note-filter").addEventListener("input", (event) => {
  app.noteTag = event.target.value.trim();
  renderJournal();
});

load().catch((error) => notice(error.message, true));
