CREATE TABLE networks (
  id TEXT PRIMARY KEY CHECK (id IN ('solana', 'robinhood_chain')),
  family TEXT NOT NULL CHECK (family IN ('solana', 'evm')),
  chain_id INTEGER UNIQUE,
  native_symbol TEXT NOT NULL CHECK (length(native_symbol) > 0),
  finality_model TEXT NOT NULL CHECK (length(finality_model) > 0)
);

INSERT INTO networks (id, family, chain_id, native_symbol, finality_model) VALUES
  ('solana', 'solana', NULL, 'SOL', 'confirmed | finalized'),
  ('robinhood_chain', 'evm', 4663, 'ETH', 'soft | l1-posted | l1-final');

CREATE TABLE evm_addresses (
  network TEXT NOT NULL REFERENCES networks(id),
  address TEXT NOT NULL CHECK (
    length(address) = 42 AND substr(address, 1, 2) = '0x'
    AND substr(address, 3) NOT GLOB '*[^0-9a-f]*'
  ),
  checksum_address TEXT NOT NULL CHECK (length(checksum_address) = 42),
  label TEXT,
  tags TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(tags) AND json_type(tags) = 'array'),
  added_at INTEGER NOT NULL CHECK (added_at >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  PRIMARY KEY (network, address)
);

CREATE TABLE evm_blocks (
  network TEXT NOT NULL REFERENCES networks(id),
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL CHECK (length(block_hash) = 66),
  parent_hash TEXT NOT NULL CHECK (length(parent_hash) = 66),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  l1_block_number INTEGER CHECK (l1_block_number IS NULL OR l1_block_number >= 0),
  tx_count INTEGER NOT NULL CHECK (tx_count >= 0),
  gas_used TEXT NOT NULL CHECK (length(gas_used) > 0 AND gas_used NOT GLOB '*[^0-9]*'),
  base_fee_wei TEXT CHECK (
    base_fee_wei IS NULL OR (length(base_fee_wei) > 0 AND base_fee_wei NOT GLOB '*[^0-9]*')
  ),
  observed_at INTEGER NOT NULL CHECK (observed_at >= 0),
  PRIMARY KEY (network, block_number),
  UNIQUE (network, block_hash)
);

CREATE INDEX evm_blocks_ts ON evm_blocks(network, ts);

CREATE TABLE evm_txs (
  network TEXT NOT NULL REFERENCES networks(id),
  tx_hash TEXT NOT NULL CHECK (length(tx_hash) = 66),
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  tx_index INTEGER NOT NULL CHECK (tx_index >= 0),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  from_address TEXT NOT NULL CHECK (length(from_address) = 42),
  to_address TEXT CHECK (to_address IS NULL OR length(to_address) = 42),
  nonce TEXT NOT NULL CHECK (length(nonce) > 0 AND nonce NOT GLOB '*[^0-9]*'),
  value_wei TEXT NOT NULL CHECK (length(value_wei) > 0 AND value_wei NOT GLOB '*[^0-9]*'),
  gas_used TEXT CHECK (
    gas_used IS NULL OR (length(gas_used) > 0 AND gas_used NOT GLOB '*[^0-9]*')
  ),
  effective_gas_price_wei TEXT
    CHECK (
      effective_gas_price_wei IS NULL
      OR (length(effective_gas_price_wei) > 0 AND effective_gas_price_wei NOT GLOB '*[^0-9]*')
    ),
  fee_wei TEXT CHECK (
    fee_wei IS NULL OR (length(fee_wei) > 0 AND fee_wei NOT GLOB '*[^0-9]*')
  ),
  status INTEGER CHECK (status IS NULL OR status IN (0, 1)),
  input_selector TEXT CHECK (input_selector IS NULL OR length(input_selector) = 10),
  kind TEXT CHECK (kind IN ('transfer', 'contract-call', 'contract-create', 'unknown')),
  observed_at INTEGER NOT NULL CHECK (observed_at >= 0),
  PRIMARY KEY (network, tx_hash)
);

CREATE INDEX evm_txs_block ON evm_txs(network, block_number, tx_index);
CREATE INDEX evm_txs_ts ON evm_txs(network, ts);

CREATE TABLE evm_logs (
  network TEXT NOT NULL REFERENCES networks(id),
  tx_hash TEXT NOT NULL CHECK (length(tx_hash) = 66),
  log_index INTEGER NOT NULL CHECK (log_index >= 0),
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL CHECK (length(block_hash) = 66),
  tx_index INTEGER NOT NULL CHECK (tx_index >= 0),
  contract_address TEXT NOT NULL CHECK (length(contract_address) = 42),
  topic0 TEXT CHECK (topic0 IS NULL OR length(topic0) = 66),
  topics TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(topics) AND json_type(topics) = 'array'),
  data TEXT NOT NULL CHECK (substr(data, 1, 2) = '0x'),
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1)),
  observed_at INTEGER NOT NULL CHECK (observed_at >= 0),
  PRIMARY KEY (network, tx_hash, log_index)
);

CREATE INDEX evm_logs_block ON evm_logs(network, block_number, tx_index, log_index);
CREATE INDEX evm_logs_contract ON evm_logs(network, contract_address, block_number);

CREATE TABLE evm_finality (
  network TEXT NOT NULL REFERENCES networks(id),
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  stage TEXT NOT NULL CHECK (stage IN ('soft', 'l1-posted', 'l1-final')),
  stage_ts INTEGER NOT NULL CHECK (stage_ts >= 0),
  l1_tx_hash TEXT CHECK (l1_tx_hash IS NULL OR length(l1_tx_hash) = 66),
  evidence TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(evidence) AND json_type(evidence) = 'object'),
  PRIMARY KEY (network, block_number, stage)
);

CREATE INDEX evm_finality_stage_ts ON evm_finality(network, stage, stage_ts);

CREATE TABLE evm_balances (
  network TEXT NOT NULL REFERENCES networks(id),
  address TEXT NOT NULL CHECK (length(address) = 42),
  asset_id TEXT NOT NULL CHECK (length(asset_id) > 0),
  raw_amount TEXT NOT NULL CHECK (length(raw_amount) > 0 AND raw_amount NOT GLOB '*[^0-9]*'),
  decimals INTEGER NOT NULL CHECK (decimals BETWEEN 0 AND 255),
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  observed_at INTEGER NOT NULL CHECK (observed_at >= 0),
  PRIMARY KEY (network, address, asset_id, block_number)
);

CREATE INDEX evm_balances_ts ON evm_balances(network, address, ts);

CREATE TABLE evm_observations (
  network TEXT NOT NULL REFERENCES networks(id),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  series TEXT NOT NULL CHECK (length(series) > 0),
  key TEXT NOT NULL CHECK (length(key) > 0),
  value REAL,
  text_value TEXT,
  block_number INTEGER CHECK (block_number IS NULL OR block_number >= 0),
  provider TEXT,
  evidence TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(evidence) AND json_type(evidence) = 'object'),
  CHECK (value IS NOT NULL OR text_value IS NOT NULL),
  PRIMARY KEY (network, series, key, ts)
);

CREATE INDEX evm_observations_series_ts
  ON evm_observations(network, series, key, ts);

CREATE VIEW v_activity AS
SELECT
  'solana' AS network,
  sig AS tx_id,
  'slot:' || slot AS chain_position,
  ts,
  CASE WHEN err = 1 THEN 'failed' ELSE 'confirmed' END AS status,
  COALESCE(kind, 'unknown') AS kind
FROM txs
UNION ALL
SELECT
  evm_tx.network,
  evm_tx.tx_hash AS tx_id,
  'block:' || evm_tx.block_number AS chain_position,
  evm_tx.ts,
  CASE
    WHEN evm_tx.status = 0 THEN 'failed'
    WHEN EXISTS (
      SELECT 1 FROM evm_finality finality
      WHERE finality.network = evm_tx.network
        AND finality.block_number = evm_tx.block_number
        AND finality.stage = 'l1-final'
    ) THEN 'l1-final'
    WHEN EXISTS (
      SELECT 1 FROM evm_finality finality
      WHERE finality.network = evm_tx.network
        AND finality.block_number = evm_tx.block_number
        AND finality.stage = 'l1-posted'
    ) THEN 'l1-posted'
    WHEN evm_tx.status = 1 THEN 'soft'
    ELSE 'unknown'
  END AS status,
  COALESCE(evm_tx.kind, 'unknown') AS kind
FROM evm_txs evm_tx;

CREATE VIEW v_fees AS
SELECT
  'solana' AS network,
  sig AS tx_id,
  CAST(COALESCE(fee_lamports, 0) AS TEXT) AS native_fee,
  NULL AS usd_fee_nullable,
  ts
FROM txs
UNION ALL
SELECT network, tx_hash, fee_wei, NULL, ts
FROM evm_txs;

CREATE VIEW v_balances AS
SELECT
  'solana' AS network,
  address,
  'SOL' AS asset_id,
  CAST(sol_lamports AS TEXT) AS raw_amount,
  9 AS decimals,
  ts
FROM snapshots
UNION ALL
SELECT network, address, asset_id, raw_amount, decimals, ts
FROM evm_balances;

CREATE VIEW v_latency AS
SELECT
  'solana' AS network,
  ts AS sample,
  CASE WHEN series = 'rpc.latency_ms' THEN value END AS rpc_ms,
  NULL AS soft_ms,
  CASE WHEN series = 'indexer.lag_ms' THEN value END AS index_ms,
  NULL AS l1_post_ms,
  NULL AS l1_final_ms
FROM metrics
WHERE series IN ('rpc.latency_ms', 'indexer.lag_ms')
UNION ALL
SELECT
  network,
  ts,
  CASE WHEN series = 'rpc.latency_ms' THEN value END,
  CASE WHEN series = 'receipt.soft_ms' THEN value END,
  CASE WHEN series = 'indexer.lag_ms' THEN value END,
  CASE WHEN series = 'finality.l1_post_ms' THEN value END,
  CASE WHEN series = 'finality.l1_final_ms' THEN value END
FROM evm_observations
WHERE series IN (
  'rpc.latency_ms', 'receipt.soft_ms', 'indexer.lag_ms',
  'finality.l1_post_ms', 'finality.l1_final_ms'
);
