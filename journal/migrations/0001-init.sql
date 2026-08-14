CREATE TABLE addresses (
  address TEXT PRIMARY KEY CHECK (length(address) BETWEEN 32 AND 44),
  label TEXT,
  tags TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(tags) AND json_type(tags) = 'array'),
  added_at INTEGER NOT NULL CHECK (added_at >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE snapshots (
  ts INTEGER NOT NULL CHECK (ts >= 0),
  address TEXT NOT NULL REFERENCES addresses(address) ON DELETE CASCADE,
  sol_lamports INTEGER NOT NULL CHECK (sol_lamports >= 0),
  token_balances TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(token_balances) AND json_type(token_balances) = 'object'),
  source TEXT NOT NULL CHECK (length(source) > 0),
  PRIMARY KEY (address, ts)
);

CREATE INDEX snapshots_ts ON snapshots(ts);

CREATE TABLE txs (
  sig TEXT PRIMARY KEY CHECK (length(sig) > 0),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  slot INTEGER NOT NULL CHECK (slot >= 0),
  address TEXT NOT NULL REFERENCES addresses(address) ON DELETE CASCADE,
  fee_lamports INTEGER CHECK (fee_lamports IS NULL OR fee_lamports >= 0),
  priority_fee_lamports INTEGER
    CHECK (priority_fee_lamports IS NULL OR priority_fee_lamports >= 0),
  jito_tip_lamports INTEGER
    CHECK (jito_tip_lamports IS NULL OR jito_tip_lamports >= 0),
  program_ids TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(program_ids) AND json_type(program_ids) = 'array'),
  kind TEXT CHECK (
    kind IS NULL OR kind IN (
      'swap', 'transfer', 'vote', 'arb-suspect', 'liquidation', 'unknown'
    )
  ),
  err INTEGER NOT NULL DEFAULT 0 CHECK (err IN (0, 1)),
  raw_path TEXT
);

CREATE INDEX txs_address_ts ON txs(address, ts);
CREATE INDEX txs_ts ON txs(ts);

CREATE TABLE metrics (
  ts INTEGER NOT NULL CHECK (ts >= 0),
  series TEXT NOT NULL CHECK (length(series) > 0),
  key TEXT NOT NULL CHECK (length(key) > 0),
  value REAL NOT NULL,
  PRIMARY KEY (series, key, ts)
);

CREATE INDEX metrics_key_ts ON metrics(key, ts);
CREATE INDEX metrics_series_ts ON metrics(series, ts);

CREATE TABLE cursor (
  source TEXT NOT NULL CHECK (length(source) > 0),
  key TEXT NOT NULL CHECK (length(key) > 0),
  position TEXT,
  updated_at INTEGER CHECK (updated_at IS NULL OR updated_at >= 0),
  PRIMARY KEY (source, key)
);

CREATE TABLE collect_log (
  ts INTEGER NOT NULL CHECK (ts >= 0),
  source TEXT NOT NULL CHECK (length(source) > 0),
  key TEXT NOT NULL CHECK (length(key) > 0),
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  items INTEGER NOT NULL DEFAULT 0 CHECK (items >= 0),
  ms INTEGER NOT NULL DEFAULT 0 CHECK (ms >= 0),
  note TEXT
);

CREATE INDEX collect_log_source_key_ts ON collect_log(source, key, ts);

CREATE VIEW v_daily_fees AS
SELECT
  (ts / 86400) * 86400 AS day_ts,
  address,
  COUNT(*) AS tx_count,
  COALESCE(SUM(fee_lamports), 0) AS fee_lamports,
  COALESCE(SUM(priority_fee_lamports), 0) AS priority_fee_lamports,
  COALESCE(SUM(jito_tip_lamports), 0) AS jito_tip_lamports
FROM txs
GROUP BY day_ts, address;

CREATE VIEW v_daily_tx_counts AS
SELECT
  (ts / 86400) * 86400 AS day_ts,
  address,
  COUNT(*) AS tx_count,
  SUM(CASE WHEN err = 1 THEN 1 ELSE 0 END) AS error_count
FROM txs
WHERE kind IS NULL OR kind <> 'vote'
GROUP BY day_ts, address;

CREATE VIEW v_balance_series AS
WITH ranked AS (
  SELECT
    (ts / 3600) * 3600 AS bucket_ts,
    ts,
    address,
    sol_lamports,
    token_balances,
    source,
    ROW_NUMBER() OVER (
      PARTITION BY address, (ts / 3600) * 3600
      ORDER BY ts DESC
    ) AS recency
  FROM snapshots
)
SELECT bucket_ts, ts, address, sol_lamports, token_balances, source
FROM ranked
WHERE recency = 1;
