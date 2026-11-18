import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,existsSync,truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { openStore } from '../server/core/db';
import { seedContent } from '../server/features/content/course';
import { appendEvent,noteBranches } from '../server/features/progress/progress';
import { getWord,wordId,hash } from '../server/features/content/knowledge';
import { finishExam,getExam,mistakes,saveAnswer,startExam } from '../server/features/exams/exam';
import { exportBackup,importBackup } from '../server/features/backup/backup';
import { extractZip,writeZip,zipLimit } from '../server/features/backup/zip';
import { validateAssets } from '../server/features/media/media';
import { readSettings } from '../server/features/settings/settings';

function directory() { return mkdtempSync(join(tmpdir(),'bloom-transfer-')); }
test('Full, Content and Progress ZIPs roundtrip; 20 + 15 reviews merge once on both devices',async()=>{
  const dir=directory();
  const a=openStore(join(dir,'a')), b=openStore(join(dir,'b')), restored=openStore(join(dir,'restored'));
  try {
    seedContent(a,true,false); seedContent(b,true,false);
    const word=getWord(a.content,wordId('invoice'))!;
    const sense=word.senses[0].id;
    const review=(store:typeof a,n:number,offset:number)=>{
      for (let i=0;i<n;i++) appendEvent(store,sense,{type:'review',payload:{rating:i%2===0 ? 3:1}},new Date(Date.UTC(2026,0,1+i,offset)));
    };
    review(a,20,0);review(b,15,2);
    appendEvent(a,word.id,{type:'note',payload:{text:'Ghi chú PC',parents:[]}});
    appendEvent(b,word.id,{type:'note',payload:{text:'Ghi chú máy thứ hai',parents:[]}});
    appendEvent(a,word.id,{type:'bookmark',payload:{kind:'word',active:true}});
    appendEvent(b,'daily',{type:'goal',payload:{reviews:18}});
    const started=startExam(a,{mode:'reading'});
    const id=started.questions[0].id;
    const correct=JSON.parse(String(a.content.prepare('SELECT data FROM questions WHERE id=?').pluck().get(id))).answer as number;
    saveAnswer(a,started.id,id,(correct+1)%4);
    finishExam(a,started.id);
    a.progress.prepare("INSERT INTO app_settings VALUES ('oauth-token',?)").run(JSON.stringify('private-unexported-token'));
    a.progress.prepare("INSERT INTO app_settings VALUES ('learning',?)").run(JSON.stringify({accent:'en-GB',studyGoal:18}));

    const progressA=join(dir,'a-progress.zip'),progressB=join(dir,'b-progress.zip');
    await exportBackup(a,'progress',progressA);
    const preview=await importBackup(b,progressA);
    assert.equal(preview.progress.added,25);
    assert.equal(preview.noteConflicts,1);
    assert.equal(b.progress.prepare('SELECT count(*) FROM flashcard_reviews').pluck().get(),15);
    const applied=await importBackup(b,progressA,{commit:true});
    assert.equal(applied.noteConflicts,1);
    assert.ok(existsSync(join(b.path,'backups',applied.restorePoint!)));
    await exportBackup(b,'progress',progressB);
    await importBackup(a,progressB,{commit:true});
    for (const [target,zip] of [[a,progressB],[b,progressA]] as const) {
      for (let i=0;i<2;i++) assert.equal((await importBackup(target,zip,{commit:true})).progress.added,0);
      assert.equal(target.progress.prepare('SELECT count(DISTINCT event_id) FROM flashcard_reviews').pluck().get(),35);
      assert.equal(noteBranches(target.progress,word.id).length,2);
      assert.equal(getExam(target,started.id).result?.score,0);
      assert.equal(mistakes(target)[0].id,id);
    }
    assert.deepEqual(a.progress.prepare('SELECT * FROM srs_state ORDER BY sense_id').all(),b.progress.prepare('SELECT * FROM srs_state ORDER BY sense_id').all());
    assert.equal(readSettings(b).accent,'en-US');

    const delta=join(dir,'a-content.zip');
    a.content.prepare("UPDATE senses SET revision=revision+1, Vietnamese='hóa đơn đã đối chiếu',updated_at='2099-01-01 00:00:00' WHERE id=?").run(sense);
    const manifest=await exportBackup(a,'content',delta,'2098-12-31T00:00:00.000Z');
    assert.equal(manifest.item_counts.senses,1);
    assert.equal(manifest.item_counts.lexemes,0);
    assert.equal((await importBackup(b,delta,{commit:true})).content.updated,1);
    assert.equal(getWord(b.content,word.id)?.senses[0].vi,'hóa đơn đã đối chiếu');
    assert.equal(b.progress.prepare('SELECT count(*) FROM flashcard_reviews').pluck().get(),35);
    const full=join(dir,'a-full.zip');
    await exportBackup(a,'full',full);
    const files=join(dir,'inspect');mkdirSync(files);
    await extractZip(full,files);
    assert.equal(readFileSync(join(files,'progress.sqlite')).includes(Buffer.from('private-unexported-token')),false);
    const snapshot=new Database(join(files,'progress.sqlite'),{readonly:true});
    try {assert.deepEqual(snapshot.prepare('SELECT key FROM app_settings').pluck().all(),['learning']);}
    finally {snapshot.close();}
    await importBackup(restored,full,{commit:true});
    validateAssets(restored);
    assert.equal(restored.progress.prepare('SELECT count(*) FROM flashcard_reviews').pluck().get(),35);
    assert.equal(getWord(restored.content,word.id)?.senses[0].vi,'hóa đơn đã đối chiếu');
    assert.notEqual(restored.deviceId,a.deviceId);
    assert.equal(readSettings(restored).accent,'en-GB');
  } finally {a.close();b.close();restored.close();rmSync(dir,{recursive:true,force:true});}
});

test('rejects checksum, invalid schema, bad ZIP path, oversized files, missing media and a failed merge',async()=>{
  const dir=directory();
  const store=openStore(join(dir,'db'));
  try {
    seedContent(store,true,false);
    const initial=join(dir,'source.zip');
    await exportBackup(store,'progress',initial);
    const temp=join(dir,'extract');mkdirSync(temp);
    const files=await extractZip(initial,temp);
    const events=readFileSync(files.get('progress.json')!.path);
    const manifest=JSON.parse(readFileSync(files.get('manifest.json')!.path,'utf8'));
    const make=(name:string,type:unknown=manifest,body:Buffer=events)=>{
      const out=join(dir,name);
      return writeZip(out,[{path:'manifest.json',buffer:Buffer.from(JSON.stringify(type))},{path:'progress.json',buffer:body}]).then(()=>out);
    };
    await assert.rejects(importBackup(store,await make('bad-sha.zip',manifest,Buffer.from(events.toString().replace('events','evints')))),/Checksum/);
    await assert.rejects(importBackup(store,await make('bad-schema.zip',{...manifest,progress_schema_version:9999})),/Schema ZIP/);
    await assert.rejects(importBackup(store,await make('bad-manifest.zip',{...manifest,files:[]})),/Manifest/);
    const invalid=join(dir,'invalid.zip');
    await writeZip(invalid,[{path:'aaaaaaaaaaaaa',buffer:Buffer.from('x')}]);
    const zip=readFileSync(invalid);
    for(let at=zip.indexOf('aaaaaaaaaaaaa');at>=0;at=zip.indexOf('aaaaaaaaaaaaa',at+1)) zip.write('../escape.txt',at,'ascii');
    writeFileSync(invalid,zip);
    await assert.rejects(importBackup(store,invalid),/relative|đường dẫn|path/i);
    const huge=join(dir,'oversize.zip');writeFileSync(huge,Buffer.alloc(1));truncateSync(huge,zipLimit+1);
    await assert.rejects(importBackup(store,huge),/128 MiB/);

    const source=join(dir,'content.zip');
    await exportBackup(store,'content',source);
    const extraction=join(dir,'content-staging');mkdirSync(extraction);
    const all=await extractZip(source,extraction);
    const full=JSON.parse(readFileSync(all.get('manifest.json')!.path,'utf8'));
    const removed=full.files.find((item:{path:string})=>item.path.startsWith('assets/')).path as string;
    full.files=full.files.filter((item:{path:string})=>item.path!==removed);
    const broken=join(dir,'missing-media.zip');
    await writeZip(broken,[{path:'manifest.json',buffer:Buffer.from(JSON.stringify(full))},...full.files.map((item:{path:string})=>({path:item.path,file:all.get(item.path)!.path}))]);
    await assert.rejects(importBackup(store,broken,{commit:true}),/thiếu media/i);
    assert.equal(store.progress.prepare('SELECT count(*) FROM import_audit').pluck().get(),0);

    const raw=JSON.parse(readFileSync(all.get('content.json')!.path,'utf8'));
    const row=raw.senses[0];
    raw.senses=[{...row,id:'bad-foreign-key',lexeme_id:'word:missing'}];
    const content=Buffer.from(JSON.stringify(raw));
    full.item_counts.senses=1;
    const manifestWithAll=JSON.parse(readFileSync(all.get('manifest.json')!.path,'utf8'));
    manifestWithAll.item_counts.senses=1;
    manifestWithAll.files=manifestWithAll.files.map((r:{path:string})=>r.path==='content.json'?{...r,size:content.length,sha256:hash(content)}:r);
    const againstFK=join(dir,'foreign-key.zip');
    await writeZip(againstFK,[{path:'manifest.json',buffer:Buffer.from(JSON.stringify(manifestWithAll))},...manifestWithAll.files.map((item:{path:string})=>
      item.path==='content.json'?{path:'content.json',buffer:content}:{path:item.path,file:all.get(item.path)!.path})]);
    await assert.rejects(importBackup(store,againstFK,{commit:true}),/FOREIGN KEY/);
    assert.equal(store.content.prepare("SELECT 1 FROM senses WHERE id='bad-foreign-key'").get(),undefined);
    assert.equal(store.progress.prepare('SELECT count(*) FROM study_events').pluck().get(),0);
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
