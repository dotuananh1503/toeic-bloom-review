CREATE TABLE devices (id TEXT PRIMARY KEY, created_at TEXT NOT NULL) STRICT;
CREATE TABLE study_events (
  event_id TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES devices(id),
  local_seq INTEGER NOT NULL CHECK(local_seq > 0), type TEXT NOT NULL,
  entity_id TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)),
  happened_at TEXT NOT NULL, UNIQUE(device_id, local_seq)
) STRICT;
CREATE INDEX study_events_entity ON study_events(type, entity_id, happened_at, device_id, local_seq);
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL CHECK(json_valid(value))) STRICT;
