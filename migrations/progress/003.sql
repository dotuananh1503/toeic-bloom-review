CREATE INDEX study_events_session ON study_events(json_extract(payload,'$.sessionId'),happened_at,device_id,local_seq) WHERE type='attempt';
CREATE VIEW exam_sessions AS SELECT * FROM study_events WHERE type='exam_start';
CREATE VIEW exam_answers AS SELECT * FROM study_events WHERE type='attempt' AND json_extract(payload,'$.sessionId') IS NOT NULL;
CREATE VIEW mistake_book AS SELECT * FROM study_events WHERE type='attempt' AND json_extract(payload,'$.correct')=0;
