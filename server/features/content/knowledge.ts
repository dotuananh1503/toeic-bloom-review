import { createHash } from 'node:crypto';
import type { Sqlite } from '../../core/db';
import { group, lesson, lexemeData, media, provenance, question, senseData, senseInput, type Group, type Lesson, type Media, type Provenance, type Question, type Sense, type Word } from '../../../packages/shared/content';
import type { StudyList } from '../../../packages/shared/study-lists';

export const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').trim();
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const wordId = (lemma: string) => 'word:' + hash(lemma.normalize('NFC').toLowerCase().trim()).slice(0, 24);
export type JsonRow = { data: string };
const decode = <T>(row: JsonRow) => JSON.parse(row.data) as T;
export const rows = <T>(db: Sqlite, sql: string, ...args: unknown[]) => (db.prepare(sql).all(...args) as JsonRow[]).map(decode<T>);
export const one = <T>(db: Sqlite, sql: string, ...args: unknown[]) => rows<T>(db, sql, ...args)[0];
export const count = (db: Sqlite, sql: string, ...args: unknown[]) => (db.prepare(sql).pluck().get(...args) as number);

export function putSource(db: Sqlite, source: Provenance) {
  const s = provenance.parse(source);
  db.prepare(`INSERT INTO sources(id,name,url,version,license,attribution,sha256) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,version=excluded.version,
    license=excluded.license,attribution=excluded.attribution,sha256=excluded.sha256,
    revision=sources.revision+1,updated_at=CURRENT_TIMESTAMP
    WHERE (sources.name,sources.url,sources.version,sources.license,sources.attribution,sources.sha256)
      IS NOT (excluded.name,excluded.url,excluded.version,excluded.license,excluded.attribution,excluded.sha256)`)
    .run(s.id,s.name,s.url,s.version,s.license,s.attribution,s.sha256 ?? null);
}

type WordRow = JsonRow & { id: string; lemma: string; source_id: string };
type SenseRow = JsonRow & { id: string; pos: string; English: string; Vietnamese: string | null; domain: string; priority: number; status: Sense['status']; source_id: string };

function toSense(row: SenseRow): Sense {
  return { ...decode<Sense>(row), id: row.id, pos: row.pos, en: row.English, vi: row.Vietnamese,
    domain: row.domain, priority: Boolean(row.priority), status: row.status, sourceId: row.source_id };
}
export function getWord(db: Sqlite, id: string): Word | undefined {
  const row = db.prepare('SELECT * FROM lexemes WHERE id=?').get(id) as WordRow | undefined;
  if (!row) return;
  const senses = db.prepare("SELECT * FROM senses WHERE lexeme_id=? AND status != 'retired' ORDER BY priority DESC,(Vietnamese IS NOT NULL) DESC,pos,id").all(id) as SenseRow[];
  return { ...decode<Word>(row), id: row.id, lemma: row.lemma, sourceId: row.source_id, senses: senses.map(toSense) };
}
export function refreshWordSearch(db: Sqlite, id: string) {
  const word = getWord(db, id);
  if (!word) return;
  const rowid = db.prepare('SELECT rowid FROM lexemes WHERE id=?').pluck().get(id);
  db.prepare('DELETE FROM vocab_fts WHERE rowid=?').run(rowid);
  const text = [word.lemma, ...word.forms, ...word.family, ...word.senses.flatMap(s => [s.pos,s.en,s.vi,s.domain,...s.collocations])].filter(Boolean).join(' ');
  db.prepare('INSERT INTO vocab_fts(rowid,id,text) VALUES (?,?,?)').run(rowid,id,normalize(text));
}

export function putSenses(db: Sqlite, input: unknown[], sourceId: string) {
  const lex = db.prepare(`INSERT INTO lexemes(id,lemma,normalized,source_id,revision,data) VALUES (?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data, revision=max(lexemes.revision+1,excluded.revision), updated_at=CURRENT_TIMESTAMP
    WHERE excluded.data != lexemes.data AND excluded.revision >= lexemes.revision`);
  const sense = db.prepare(`INSERT INTO senses(id,lexeme_id,pos,English,Vietnamese,domain,priority,status,source_id,revision,data) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET pos=excluded.pos,English=excluded.English,Vietnamese=excluded.Vietnamese,domain=excluded.domain,
    priority=excluded.priority,status=excluded.status,revision=excluded.revision,data=excluded.data,updated_at=CURRENT_TIMESTAMP
    WHERE excluded.revision > senses.revision AND excluded.lexeme_id=senses.lexeme_id AND excluded.source_id=senses.source_id`);
  const getLexeme = db.prepare('SELECT data FROM lexemes WHERE id=?');
  return db.transaction(() => {
    const touched = new Set<string>();
    let changes = 0;
    for (const item of input) {
      const s = senseInput.parse(item);
      const id = wordId(s.lemma);
      const existing = s.word ? undefined : getLexeme.get(id) as JsonRow | undefined;
      const data = s.word ?? (existing ? decode(existing) : lexemeData.parse({}));
      const wordChanges = lex.run(id,s.lemma,s.lemma.normalize('NFC').toLowerCase().trim(),sourceId,s.revision,JSON.stringify(data)).changes;
      const senseChanges = sense.run(s.id,id,s.pos,s.en,s.vi ?? null,s.domain,Number(s.priority),s.status,sourceId,s.revision,JSON.stringify(senseData.parse(s))).changes;
      changes += senseChanges;
      if (wordChanges || senseChanges) touched.add(id);
    }
    for (const id of touched) refreshWordSearch(db,id);
    return changes;
  }).immediate();
}

export type VocabFilters = { q?: string; domain?: string; pos?: string; status?: string; priority?: boolean; collection?: StudyList; page: number; limit: number; sort?: 'asc' | 'desc' | 'topic' | 'frequency'; studyFilter?: {kind:'new'|'due'|'reviewed'; IDs:string[]} };
export function listWords(db: Sqlite, filter: VocabFilters) {
  const conditions = ["s.status != 'retired'"];
  const args: string[] = [];
  const tokens = normalize(filter.q ?? '').match(/[\p{L}\p{N}]+/gu)?.slice(0,12);
  if (tokens?.length) {
    conditions.push('l.id IN (SELECT id FROM vocab_fts WHERE vocab_fts MATCH ?)');
    args.push(tokens.map(word => '"' + word + '"*').join(' AND '));
  }
  for (const [column, value] of [['domain',filter.domain],['pos',filter.pos],['status',filter.status]]) {
    if (value) { conditions.push('s.' + column + '=?'); args.push(value); }
  }
  if (filter.priority) conditions.push('s.priority=1');
  if (filter.collection) {
    conditions.push("json_extract(l.data,?) IS NOT NULL");
    args.push('$.studyLists.'+filter.collection);
  }
  if (filter.studyFilter) {
    const operator=filter.studyFilter.kind==='new' ? 'NOT IN' : 'IN';
    conditions.push('s.id '+operator+' (SELECT value FROM json_each(?))');
    args.push(JSON.stringify(filter.studyFilter.IDs));
  }
  const from = ' FROM lexemes l JOIN senses s ON s.lexeme_id=l.id WHERE ' + conditions.join(' AND ');
  let order = filter.sort === 'topic' ? 'min(s.domain),l.normalized' : 'l.normalized ' + (filter.sort === 'desc' ? 'DESC' : 'ASC');
  const orderArgs: string[] = [];
  if (filter.sort === 'frequency') {
    order = 'coalesce(json_extract(l.data,?),2147483647),l.normalized';
    orderArgs.push('$.studyLists.'+(filter.collection ?? 'tsl'));
  }
  if (tokens?.length) {
    order = '(l.normalized=?) DESC,(l.id IN (SELECT id FROM vocab_fts WHERE vocab_fts MATCH ?)) DESC,max(s.priority) DESC,' + order;
    orderArgs.unshift(tokens.join(' '),'"'+tokens.join(' ')+'"');
  }
  const ids = db.prepare('SELECT l.id' + from + ' GROUP BY l.id ORDER BY ' + order + ' LIMIT ? OFFSET ?').pluck().all(...args,...orderArgs,filter.limit,(filter.page - 1) * filter.limit) as string[];
  return { items: ids.map(id => getWord(db,id)!), total: count(db,'SELECT count(DISTINCT l.id)' + from,...args) };
}

export function putLessons(db: Sqlite, input: unknown[]) {
  db.transaction(() => {
    for (const item of input) {
      const l = lesson.parse(item);
      const { cases, ...base } = l;
      if (!db.prepare(`INSERT INTO grammar_lessons(id,title,topic,level,source_id,status,revision,data) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,topic=excluded.topic,level=excluded.level,source_id=excluded.source_id,
        status=excluded.status,revision=excluded.revision,data=excluded.data,updated_at=CURRENT_TIMESTAMP WHERE excluded.revision > grammar_lessons.revision`)
        .run(l.id,l.title,l.topic,l.level,l.sourceId,l.status,l.revision,JSON.stringify(base)).changes) continue;
      cases.forEach((row, index) => {
        db.prepare(`INSERT INTO grammar_cases(id,lesson_id,position,data,revision) VALUES (?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET position=excluded.position,data=excluded.data,revision=excluded.revision,updated_at=CURRENT_TIMESTAMP
          WHERE grammar_cases.lesson_id=excluded.lesson_id`).run(row.id,l.id,index,JSON.stringify(row),l.revision);
      });
    }
  }).immediate();
}
export function getLesson(db: Sqlite, id: string) {
  const l = one<Omit<Lesson,'cases'>>(db,'SELECT data FROM grammar_lessons WHERE id=?',id);
  return l && { ...l, cases: rows<Lesson['cases'][number]>(db,'SELECT data FROM grammar_cases WHERE lesson_id=? ORDER BY position',id) };
}

export function putQuestions(db: Sqlite, groups: unknown[], questions: unknown[]) {
  db.transaction(() => {
    for (const item of groups) {
      const g = group.parse(item);
      db.prepare(`INSERT INTO question_groups(id,part,audio_id,image_id,source_id,revision,data) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET part=excluded.part,audio_id=excluded.audio_id,image_id=excluded.image_id,source_id=excluded.source_id,
        revision=excluded.revision,data=excluded.data,updated_at=CURRENT_TIMESTAMP WHERE excluded.revision > question_groups.revision`)
        .run(g.id,g.part,g.audioId ?? null,g.imageId ?? null,g.sourceId,g.revision,JSON.stringify(g));
    }
    for (const item of questions) {
      const q = question.parse(item);
      if (q.groupId && count(db,'SELECT part FROM question_groups WHERE id=?',q.groupId) !== q.part) throw new Error('Group and question Part differ: ' + q.id);
      if (!db.prepare(`INSERT INTO questions(id,part,group_id,position,difficulty,source_id,status,revision,data) VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET part=excluded.part,group_id=excluded.group_id,position=excluded.position,
        difficulty=excluded.difficulty,source_id=excluded.source_id,status=excluded.status,revision=excluded.revision,
        data=excluded.data,updated_at=CURRENT_TIMESTAMP WHERE excluded.revision > questions.revision`)
        .run(q.id,q.part,q.groupId ?? null,q.position,q.difficulty,q.sourceId,q.status,q.revision,JSON.stringify(q)).changes) continue;
      db.prepare('DELETE FROM question_links WHERE question_id=?').run(q.id);
      const link = db.prepare('INSERT INTO question_links VALUES (?,?,?)');
      for (const id of new Set(q.caseIds)) link.run(q.id,id,null);
      for (const id of new Set(q.senseIds)) link.run(q.id,null,id);
    }
  }).immediate();
}
export const getQuestion = (db: Sqlite, id: string) => one<Question>(db,'SELECT data FROM questions WHERE id=?',id);
export const getGroup = (db: Sqlite, id: string) => one<Group>(db,'SELECT data FROM question_groups WHERE id=?',id);
export const getMedia = (db: Sqlite, id: string) => one<Media>(db,'SELECT data FROM media_assets WHERE id=?',id);
export function putMedia(db: Sqlite, input: unknown) {
  const m = media.parse(input);
  db.prepare(`INSERT INTO media_assets(id,relative_path,mime,byte_length,sha256,source_id,revision,data) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET relative_path=excluded.relative_path,mime=excluded.mime,byte_length=excluded.byte_length,sha256=excluded.sha256,
    source_id=excluded.source_id,revision=excluded.revision,data=excluded.data,updated_at=CURRENT_TIMESTAMP WHERE excluded.revision > media_assets.revision`)
    .run(m.id,m.path,m.mime,m.bytes,m.sha256,m.sourceId,m.revision,JSON.stringify(m));
}
