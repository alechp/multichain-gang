CREATE TABLE sim_runs (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  sim TEXT NOT NULL CHECK (length(sim) > 0),
  address TEXT NOT NULL REFERENCES addresses(address) ON DELETE CASCADE,
  params TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(params) AND json_type(params) = 'object'),
  result TEXT NOT NULL
    CHECK (json_valid(result) AND json_type(result) = 'object')
);

CREATE INDEX sim_runs_address_ts ON sim_runs(address, ts);
CREATE INDEX sim_runs_sim_ts ON sim_runs(sim, ts);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  address TEXT REFERENCES addresses(address) ON DELETE SET NULL,
  sim_run TEXT REFERENCES sim_runs(id) ON DELETE SET NULL,
  tags TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(tags) AND json_type(tags) = 'array')
);

CREATE INDEX journal_entries_ts ON journal_entries(ts);
CREATE INDEX journal_entries_address_ts ON journal_entries(address, ts);
CREATE INDEX journal_entries_sim_run ON journal_entries(sim_run);
