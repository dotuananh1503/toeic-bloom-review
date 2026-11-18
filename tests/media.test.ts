import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openStore,root } from '../server/core/db';
import { seedContent } from '../server/features/content/course';
import { getWord,wordId,getMedia } from '../server/features/content/knowledge';
import { ingestAsset,validateAssets } from '../server/features/media/media';
import { createApp } from '../server/core/http';
import { availability } from '../server/features/exams/exam';

test('bundled WAVs and source manifests play from loopback and keep US/UK independent',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'bloom-media-'));
  const store=openStore(dir);
  const server=createApp(store).listen(0,'127.0.0.1');
  try {
    seedContent(store,true,false); validateAssets(store);
    await once(server,'listening');
    const port=(server.address() as {port:number}).port;
    const word=getWord(store.content,wordId('schedule'))!;
    const [us,uk]=word.pronunciations.map(p=>p.assetId!);
    assert.ok(us && uk);
    assert.notEqual(getMedia(store.content,us)?.sha256,getMedia(store.content,uk)?.sha256);
    const response=await fetch('http://127.0.0.1:'+port+'/media/'+uk);
    assert.equal(response.headers.get('content-type'),'audio/wav');
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,4).toString(),'RIFF');
    const info=availability(store);
    assert.deepEqual(info.parts.slice(1,4).map(p=>p.available),[3,3,3]);
    if (existsSync(join(root,'assets-source','meeting-room.jpg'))) assert.equal(info.parts[0].available,1);
    assert.equal((await fetch('http://127.0.0.1:'+port+'/media/%2e%2e%2fsettings')).status,400);
    const good=readFileSync(join(root,'assets-source','audio','schedule-en-us.wav'));
    const input={id:'local-test',usage:'vocabulary',accent:'en-US',source:{id:'local',name:'Local QA',url:'urn:test',version:'1',license:'Unknown',attribution:'QA'}};
    assert.throws(()=>ingestAsset(store,input,good),/giấy phép/);
    assert.throws(()=>ingestAsset(store,{...input,source:{...input.source,license:'CC0-1.0'}},Buffer.from('fake media')),/định dạng|rỗng/);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    store.close();rmSync(dir,{recursive:true,force:true});
  }
});
