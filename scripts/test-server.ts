import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openStore } from '../server/core/db';
import { seedContent } from '../server/features/content/course';
import { createApp } from '../server/core/http';

const dir=mkdtempSync(join(tmpdir(),'bloom-browser-qa-'));
const store=openStore(dir);
seedContent(store);
const server=createApp(store).listen(Number(process.env.BLOOM_E2E_PORT || 4199),'127.0.0.1');
const close=()=>server.close(()=>{store.close();rmSync(dir,{force:true,recursive:true});});
process.on('SIGINT',close);
process.on('SIGTERM',close);
