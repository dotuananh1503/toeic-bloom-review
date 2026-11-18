import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore, migrate } from '../server/core/db';
import { putSource, putSenses, listWords, wordId, getWord, putQuestions } from '../server/features/content/knowledge';

test('knowledge migrations, idempotent senses, FK and accent-insensitive FTS', () => {
  const path = mkdtempSync(join(tmpdir(), 'bloom-schema-'));
  const store = openStore(path);
  try {
    const db = store.content;
    migrate(db,'content');
    putSource(db,{ id:'fixture', name:'Fixture QA', url:'urn:fixture', version:'1', license:'CC0-1.0', attribution:'Local tests' });
    const items = [
      { id:'plan:n:1', lemma:'plan', pos:'noun', en:'a proposal for doing something', vi:'kế hoạch' },
      { id:'plan:v:1', lemma:'plan', pos:'verb', en:'to make arrangements', vi:'lên kế hoạch' },
    ];
    assert.throws(() => putSenses(db,items,'unknown'), /FOREIGN KEY/);
    assert.equal(putSenses(db,items,'fixture'),2);
    assert.equal(putSenses(db,items,'fixture'),0);
    assert.equal(getWord(db,wordId('plan'))?.senses.length,2);
    assert.equal(listWords(db,{ q:'ke hoach', page:1,limit:12 }).total,1);
    assert.equal(listWords(db,{ q:'" OR *', page:1,limit:12 }).total,0);
    assert.throws(() => putQuestions(db,[],[{ id:'bad',part:7,prompt:'Invalid' }]));
    assert.deepEqual(db.pragma('foreign_key_check'),[]);
  } finally { store.close(); rmSync(path,{ recursive:true,force:true }); }
});
