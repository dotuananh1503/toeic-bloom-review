import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { openStore } from '../server/core/db';
import { seedContent } from '../server/features/content/course';
import { analytics,contentCoverage } from '../server/features/progress/analytics';
import { appendEvent } from '../server/features/progress/progress';
import { getWord,listWords,putSenses,putSource,wordId } from '../server/features/content/knowledge';

test('daily figures reflect local time, persisted events and installed coverage',()=>{
  const dir=mkdtempSync(join(tmpdir(),'bloom-analytics-'));
  const store=openStore(dir);
  try {
    seedContent(store,true,false);
    const s=getWord(store.content,wordId('invoice'))!.senses[0];
    const previous=new Date('2026-11-17T16:00:00.000Z');
    const today=new Date('2026-11-17T21:00:00.000Z');
    appendEvent(store,s.id,{type:'review',payload:{rating:3}},previous);
    appendEvent(store,s.id,{type:'review',payload:{rating:1}},today);
    appendEvent(store,'present-simple',{type:'lesson',payload:{done:true}},today);
    appendEvent(store,'daily',{type:'goal',payload:{reviews:15}},today);
    const stats=analytics(store,'Asia/Bangkok',today);
    assert.equal(stats.todayReviews,1);
    assert.equal(stats.streak,2);
    assert.equal(stats.goal,15);
    assert.equal(stats.completedLessons,1);
    assert.equal(analytics(store,'UTC',today).todayReviews,2);
    const content=contentCoverage(store);
    assert.equal(content.grammarCases,286);
    assert.equal(content.audio.synthetic,38);
    assert.ok(content.availability.modes.find(x=>x.mode==='mini')?.ready);
    assert.equal(content.reviewedSenses,0);
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('FTS and pagination handle 8,000 ephemeral vocabulary test records',()=>{
  const dir=mkdtempSync(join(tmpdir(),'bloom-perf-'));
  const store=openStore(dir);
  try {
    const db=store.content;
    putSource(db,{id:'perf-fixture',name:'QA rows',url:'urn:test',version:'1',license:'CC0-1.0',attribution:'Ephemeral test data'});
    const records=Array.from({length:8000},(_,i)=>({id:'fixture:'+i,lemma:'performance-term-'+i,pos:'noun',en:'Query fixture '+i,domain:'QA'}));
    const at=performance.now();
    putSenses(db,records,'perf-fixture');
    const imported=performance.now()-at;
    assert.equal(listWords(db,{page:667,limit:12}).items.length,8);
    const beforeSearch=performance.now();
    const result=listWords(db,{q:'query fixture 7452',page:1,limit:12});
    const elapsed=performance.now()-beforeSearch;
    assert.equal(result.items[0].lemma,'performance-term-7452');
    console.log('Vocabulary fixture: '+Math.round(imported)+' ms import; '+elapsed.toFixed(1)+' ms FTS lookup');
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
