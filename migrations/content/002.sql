CREATE TABLE lexemes (
  id TEXT PRIMARY KEY, lemma TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE,
  source_id TEXT NOT NULL REFERENCES sources(id), revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE TABLE senses (
  id TEXT PRIMARY KEY, lexeme_id TEXT NOT NULL REFERENCES lexemes(id),
  pos TEXT NOT NULL, English TEXT NOT NULL, Vietnamese TEXT, domain TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK(priority IN (0,1)),
  status TEXT NOT NULL CHECK(status IN ('needs_translation','needs_review','reviewed','published_reviewed','draft','retired')),
  source_id TEXT NOT NULL REFERENCES sources(id), revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE INDEX senses_word ON senses(lexeme_id,priority DESC,pos);
CREATE INDEX senses_filters ON senses(domain,pos,status,lexeme_id);
CREATE VIRTUAL TABLE vocab_fts USING fts5(id UNINDEXED, text, tokenize='unicode61 remove_diacritics 2', prefix='2 3 4');
CREATE TABLE grammar_lessons (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, topic TEXT NOT NULL, level TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id), status TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE TABLE grammar_cases (
  id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES grammar_lessons(id),
  position INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE INDEX grammar_cases_lesson ON grammar_cases(lesson_id,position);
CREATE TABLE media_assets (
  id TEXT PRIMARY KEY, relative_path TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK(byte_length > 0), sha256 TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id), revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE TABLE question_groups (
  id TEXT PRIMARY KEY, part INTEGER NOT NULL CHECK(part BETWEEN 1 AND 7),
  audio_id TEXT REFERENCES media_assets(id), image_id TEXT REFERENCES media_assets(id),
  source_id TEXT NOT NULL REFERENCES sources(id), revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE TABLE questions (
  id TEXT PRIMARY KEY, part INTEGER NOT NULL CHECK(part BETWEEN 1 AND 7),
  group_id TEXT REFERENCES question_groups(id), position INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
  source_id TEXT NOT NULL REFERENCES sources(id), status TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE INDEX questions_part ON questions(part,group_id,position);
CREATE TABLE question_links (
  question_id TEXT NOT NULL REFERENCES questions(id),
  case_id TEXT REFERENCES grammar_cases(id), sense_id TEXT REFERENCES senses(id),
  CHECK((case_id IS NULL) != (sense_id IS NULL)),
  UNIQUE(question_id,case_id), UNIQUE(question_id,sense_id)
) STRICT;
CREATE INDEX question_links_cases ON question_links(case_id);
CREATE TABLE content_versions (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, details TEXT NOT NULL CHECK(json_valid(details))) STRICT;
CREATE TABLE import_jobs (id TEXT PRIMARY KEY, action TEXT NOT NULL, state TEXT NOT NULL, updated_at TEXT NOT NULL, details TEXT NOT NULL CHECK(json_valid(details))) STRICT;
CREATE VIEW content_review_queue AS
  SELECT 'sense' AS kind,id,status FROM senses WHERE status IN ('needs_translation','needs_review','draft')
  UNION ALL SELECT 'lesson',id,status FROM grammar_lessons WHERE status IN ('needs_review','draft')
  UNION ALL SELECT 'question',id,status FROM questions WHERE status IN ('needs_review','draft');
