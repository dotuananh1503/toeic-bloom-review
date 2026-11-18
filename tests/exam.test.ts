import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../server/core/db';
import { seedContent } from '../server/features/content/course';
import { availability, finishExam, getExam, mistakes, saveAnswer, setFlag, startExam, validateQuestionGroups } from '../server/features/exams/exam';

test('TOEIC engine holds complete groups, gates media and resumes a persisted scored exam',()=>{
  const dir=mkdtempSync(join(tmpdir(),'bloom-exam-'));
  let store=openStore(dir);
  try {
    seedContent(store,false,false); validateQuestionGroups(store.content);
    const info=availability(store);
    assert.deepEqual(info.parts.map(p=>p.total),[1,3,3,3,64,4,13]);
    assert.deepEqual(info.parts.slice(0,4).map(p=>p.available),[0,0,0,0]);
    assert.equal(info.modes.find(m=>m.mode==='full')?.ready,false);
    assert.equal(info.modes.find(m=>m.mode==='reading')?.ready,true);
    assert.throws(()=>startExam(store,{mode:'practice',part:4}),/Chưa đủ/);
    const session=startExam(store,{mode:'reading'});
    assert.equal(session.questions.length,20);
    assert.deepEqual(session.groups.map(g=>g.passages.length).sort(),[1,1,2,3]);
    assert.ok(session.questions.every(q=>!('answer' in q)));
    saveAnswer(store,session.id,session.questions[0].id,1);
    setFlag(store,session.id,session.questions[1].id,true);
    store.close(); store=openStore(dir);
    const resumed=getExam(store,session.id);
    assert.equal(Object.keys(resumed.answers).length,1);
    assert.equal(resumed.flags.length,1);
    const result=finishExam(store,session.id).result!;
    assert.equal(result.total,20);
    assert.equal(result.items[0].selected,1);
    assert.equal(result.items[0].grammarLinks.length,1);
    assert.ok(mistakes(store).length===1 || result.score===1);
    assert.equal(finishExam(store,session.id).result?.score,result.score);
    assert.throws(()=>saveAnswer(store,session.id,session.questions[1].id,1),/đã nộp/);
  } finally { store.close();rmSync(dir,{recursive:true,force:true}); }
});
