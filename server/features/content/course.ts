import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, type Store, type Sqlite } from '../../core/db';
import { englishWordnet } from '../../../content-source/vocabulary';
import { originalSource } from '../../../content-source/grammar-builder';
import { presentSimple } from '../../../content-source/present-simple';
import { conditionals } from '../../../content-source/conditionals';
import { installBundledMedia } from '../media/media';
import { practiceGroups, practiceQuestions } from '../../../content-source/practice';
import { wordForms } from '../../../content-source/word-forms';
import { incorporateV33, v33GrammarSource } from '../../../content-source/v33-grammar';
import { tenseLessons } from '../../../content-source/grammar/tenses';
import { addTensePractice } from '../../../content-source/grammar/tenses/practice';
import { coreGrammarLessons } from '../../../content-source/grammar/topics';
import { installStudyVocabulary } from './study-vocabulary';
import { count, getLesson, putLessons, putQuestions, putSenses, putSource } from './knowledge';
import { lesson as lessonSchema, question as questionSchema, type Question } from '../../../packages/shared/content';

const curriculum = incorporateV33([presentSimple, conditionals, wordForms]);
const tenses = addTensePractice(tenseLessons);
export function seedContent(store:Store, includeMedia=true, includeStudyVocabulary=true) {
  const db = store.content;
  db.transaction(() => {
    putSource(db,englishWordnet);
    putSource(db,originalSource);
    putSource(db,v33GrammarSource);
    putSenses(db,JSON.parse(readFileSync(join(root,'content-source','oewn-core.json'),'utf8')),englishWordnet.id);
    if (includeStudyVocabulary) installStudyVocabulary(db);
    putLessons(db,[...curriculum.map(item=>item.lesson),...tenses.lessons,...coreGrammarLessons]);
    putQuestions(db,practiceGroups,[...curriculum.flatMap(item=>item.questions),...tenses.questions,...practiceQuestions]);
    validateLessons(db);
    if (includeMedia) installBundledMedia(store);
  }).immediate();
}

export function validateLessons(db:Sqlite) {
  const ids = db.prepare('SELECT id FROM grammar_lessons').pluck().all() as string[];
  const sourceExists = db.prepare('SELECT 1 FROM sources WHERE id=?');
  const exerciseLink = db.prepare('SELECT 1 FROM question_links WHERE question_id=? AND case_id=?');
  for (const id of ids) {
    const lesson = lessonSchema.parse(getLesson(db,id));
    const reviewed = lesson.status === 'reviewed' || lesson.status === 'published_reviewed';
    if (reviewed && (!lesson.checkedOn || !lesson.references.length || !lesson.exceptions.length || !lesson.comparisons.length)) {
      throw new Error('Reviewed lesson requires a review date, references, exceptions and comparisons: ' + id);
    }
    if (lesson.supplementalSourceId && !sourceExists.get(lesson.supplementalSourceId)) {
      throw new Error('Missing supplemental source: ' + id);
    }
    for (const use of lesson.cases) {
      if (reviewed && (!use.signals || !use.note || !use.exerciseIds.length)) {
        throw new Error('Reviewed case requires signals, notes and an exercise: ' + use.id);
      }
      for (const exercise of use.exerciseIds) {
        if (!exerciseLink.get(exercise,use.id)) throw new Error('Missing exercise link: ' + use.id);
      }
    }
  }
}
export function validateContent(db:Sqlite) {
  if (db.pragma('integrity_check',{simple:true}) !== 'ok' || (db.pragma('foreign_key_check') as unknown[]).length) throw new Error('SQLite integrity check failed');
  validateLessons(db);
  for (const raw of db.prepare('SELECT data FROM questions').pluck().iterate()) questionSchema.parse(JSON.parse(raw as string));
}

export function coverage(db:Sqlite) {
  return {
    lexemes:count(db,'SELECT count(*) FROM lexemes'), senses:count(db,"SELECT count(*) FROM senses WHERE status!='retired'"),
    glossarySenses:count(db,"SELECT count(*) FROM senses WHERE status!='retired' AND json_extract(data,'$.glossaryOnly')=1"),
    translatedSenses:count(db,"SELECT count(*) FROM senses WHERE Vietnamese IS NOT NULL AND status!='retired'"),
    reviewedSenses:count(db,"SELECT count(*) FROM senses WHERE status IN ('reviewed','published_reviewed')"),
    missingTranslation:count(db,"SELECT count(*) FROM senses WHERE Vietnamese IS NULL AND status!='retired'"),
    needsReview:count(db,'SELECT count(*) FROM content_review_queue'),
    grammarLessons:count(db,"SELECT count(*) FROM grammar_lessons WHERE status!='retired'"),
    reviewedLessons:count(db,"SELECT count(*) FROM grammar_lessons WHERE status IN ('reviewed','published_reviewed')"),
    grammarCases:count(db,'SELECT count(*) FROM grammar_cases'),
    grammarExamples:count(db,'SELECT coalesce(sum(json_array_length(data,\'$.examples\')),0) FROM grammar_cases'),
    questions:db.prepare("SELECT part,count(*) AS total, sum(status IN ('reviewed','published_reviewed')) AS reviewed FROM questions WHERE status!='retired' GROUP BY part").all() as {part:number;total:number;reviewed:number}[],
    assets:count(db,'SELECT count(*) FROM media_assets'),
  };
}

export function publicQuestion({answer,explanation,rationales,...question}: Question) {
  void answer; void explanation; void rationales;
  return question;
}
