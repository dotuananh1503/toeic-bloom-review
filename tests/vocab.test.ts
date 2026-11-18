import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore, root } from '../server/core/db';
import { getWord, listWords, putSenses, putSource, wordId } from '../server/features/content/knowledge';
import { englishWordnet } from '../content-source/vocabulary';
import { appendEvent } from '../server/features/progress/progress';

test('real OEWN subset preserves three parts of speech, distinct senses and independent FSRS',()=>{
  const dir = mkdtempSync(join(tmpdir(),'bloom-vocab-'));
  const store = openStore(dir);
  try {
    const db = store.content;
    const input = JSON.parse(readFileSync(join(root,'content-source','oewn-core.json'),'utf8'));
    putSource(db,englishWordnet);
    assert.equal(putSenses(db,input,englishWordnet.id),input.length);
    assert.ok(input.length>=86);
    assert.equal(putSenses(db,input,englishWordnet.id),0);
    const direct = getWord(db,wordId('direct'))!;
    assert.equal(new Set(direct.senses.map(s=>s.pos)).size,3);
    assert.equal(direct.senses.length,24);
    assert.equal(direct.senses[0].priority,true);
    const invoice = listWords(db,{q:'hoa don',page:1,limit:12}).items[0];
    assert.equal(invoice.lemma,'invoice');
    appendEvent(store,invoice.senses[0].id,{type:'review',payload:{rating:3}},new Date('2026-01-01T00:00:00Z'));
    assert.ok(store.progress.prepare('SELECT * FROM srs_state WHERE sense_id=?').get(invoice.senses[0].id));
    assert.equal(store.progress.prepare('SELECT * FROM srs_state WHERE sense_id=?').get(invoice.senses[1].id),undefined);
  } finally { store.close(); rmSync(dir,{recursive:true,force:true}); }
});
