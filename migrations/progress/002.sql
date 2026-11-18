CREATE TABLE import_audit (
  id TEXT PRIMARY KEY, added_at TEXT NOT NULL, kind TEXT NOT NULL,
  details TEXT NOT NULL CHECK(json_valid(details))
) STRICT;
CREATE TABLE srs_state (
  sense_id TEXT PRIMARY KEY, due TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE INDEX srs_due ON srs_state(due);
CREATE VIEW flashcard_reviews AS SELECT * FROM study_events WHERE type='review';
CREATE VIEW question_attempts AS SELECT * FROM study_events WHERE type='attempt';
