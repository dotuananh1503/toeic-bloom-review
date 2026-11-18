import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../server/core/db';
import { coverage, seedContent, validateContent } from '../server/features/content/course';
import { getLesson, getQuestion, putLessons, putQuestions, putSource } from '../server/features/content/knowledge';
import { appendEvent } from '../server/features/progress/progress';
import { originalSource } from '../content-source/grammar-builder';
import { presentSimple } from '../content-source/present-simple';
import { v33GrammarSource } from '../content-source/v33-grammar';
import raw from '../content-source/v33-grammar.json';
import { tenseGroups } from '../packages/shared/tenses';

test('all ten V3.3 chapters retain source examples and quizzes when updating an existing library',()=>{
  const dir = mkdtempSync(join(tmpdir(),'bloom-grammar-'));
  const store = openStore(dir);
  try {
    putSource(store.content,originalSource);
    putLessons(store.content,[presentSimple.lesson]);
    putQuestions(store.content,[],presentSimple.questions);
    const completion = appendEvent(store,'present-simple',{type:'lesson',payload:{done:true}});
    seedContent(store,true,false); seedContent(store,true,false); validateContent(store.content);
    const stats = coverage(store.content);
    assert.equal(stats.grammarLessons,38);
    assert.equal(stats.grammarCases,286);
    assert.equal(stats.grammarExamples,630);
    assert.equal(stats.reviewedLessons,0);
    const ps = getLesson(store.content,'present-simple')!;
    assert.equal(ps.cases.length,15);
    assert.equal(ps.revision,2);
    assert.equal(store.progress.prepare('SELECT count(*) FROM study_events WHERE event_id=?').pluck().get(completion.event_id),1);
    for (const id of tenseGroups.flatMap(group=>[...group.ids])) {
      const lesson = getLesson(store.content,id)!;
      assert.ok(lesson.cases.length>=5, id);
      assert.ok(lesson.formulas.length>=3 && lesson.exceptions.length>0 && lesson.comparisons.length>0, id);
      assert.ok(lesson.cases.every(use=>use.examples.length>=2 && use.examples.every(e=>e.en!==e.vi)), id);
      assert.ok(lesson.cases.some(use=>use.exerciseIds.length), id);
    }
    const ids = ['word-forms','verb-tenses','passive-voice','relative-clauses','conjunctions-prepositions','conditionals',
      'comparisons-quantifiers','verb-patterns-modals','advanced-structures','present-simple'];
    for (const [index,id] of ids.entries()) {
      const lesson = getLesson(store.content,id)!;
      const chapter = raw.chapters[index];
      assert.ok(lesson.sourceId===v33GrammarSource.id || lesson.supplementalSourceId===v33GrammarSource.id);
      for (const originalCase of chapter.cases) {
        const use = lesson.cases.find(c=>c.title===originalCase.title || c.supplementalExplanations?.some(v=>v.title===originalCase.title));
        assert.ok(use, originalCase.title);
        for (const example of originalCase.examples) assert.ok(use.examples.some(added=>added.en===example.en && added.vi===example.vi),example.en);
      }
      const quiz = getQuestion(store.content,id+':v33-quiz')!;
      assert.deepEqual(quiz.options,chapter.lesson.options);
      assert.equal(quiz.answer,chapter.lesson.correct);
      assert.ok(lesson.cases.some(use=>use.exerciseIds.includes(quiz.id)));
    }
    for (const id of ['present-simple','conditionals','word-forms']) {
      const lesson = getLesson(store.content,id)!;
      assert.ok(lesson.cases.length >= 14 && lesson.exceptions.length >= 5);
      for (const c of lesson.cases) {
        assert.ok(c.examples.every(e=>e.en !== e.vi));
        const q = getQuestion(store.content,c.exerciseIds[0])!;
        assert.deepEqual(q.caseIds,[c.id]);
        assert.equal(q.options.length,q.rationales.length);
      }
    }
  } finally { store.close(); rmSync(dir,{recursive:true,force:true}); }
});
