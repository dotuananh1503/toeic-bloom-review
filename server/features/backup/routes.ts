import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Router,raw } from 'express';
import { z } from 'zod';
import type { Store } from '../../core/db';
import { exportBackup,importBackup,writeUploadedZip } from './backup';
import { backupType } from '../../../packages/shared/backup';
import { zipLimit } from './zip';
import { hash } from '../content/knowledge';
import { HttpError } from '../../core/errors';

export function backupRouter(store:Store) {
  const router=Router();
  const receipts=new Map<string,{sha:string;preferReviewed:boolean;expires:number}>();
  router.get('/backup/audit',(_req,res)=>res.json((store.progress.prepare('SELECT * FROM import_audit ORDER BY added_at DESC LIMIT 20').all() as {details:string}[])
    .map(row=>({...row,details:JSON.parse(row.details)}))));
  router.post('/backup/export',async(req,res)=>{
    const type=backupType.parse(req.body?.type);
    const since=z.iso.datetime().optional().parse(req.body?.since);
    const tmp=mkdtempSync(join(tmpdir(),'bloom-web-export-'));
    try {
      const name='toeic-bloom-'+type+'-'+new Date().toISOString().slice(0,10)+'.zip';
      const out=join(tmp,name);
      await exportBackup(store,type,out,since);
      res.attachment(name).type('application/zip').send(readFileSync(out));
    } catch(error) { throw new HttpError(400,(error as Error).message); }
    finally {rmSync(tmp,{recursive:true,force:true});}
  });
  router.post('/backup/import/:action',raw({type:['application/zip','application/octet-stream'],limit:zipLimit}),async(req,res)=>{
    const action=z.enum(['preview','merge']).parse(req.params.action);
    if (!Buffer.isBuffer(req.body)) throw new HttpError(415,'Cần tệp ZIP.');
    const preferReviewed=req.get('X-Bloom-Prefer-Reviewed')==='true';
    const sha=hash(req.body);
    const now=Date.now();
    for (const [id,receipt] of receipts) if (receipt.expires<=now) receipts.delete(id);
    if (action==='merge') {
      const key=req.get('X-Bloom-Receipt') ?? '';
      const receipt=receipts.get(key);
      if (!receipt || receipt.sha!==sha || receipt.preferReviewed!==preferReviewed) throw new HttpError(409,'Hãy xem trước đúng tệp và tùy chọn hợp nhất trước.');
      receipts.delete(key);
    }
    const tmp=mkdtempSync(join(tmpdir(),'bloom-web-import-'));
    try {
      const path=join(tmp,'upload.zip');
      writeUploadedZip(path,req.body);
      const result=await importBackup(store,path,{commit:action==='merge',preferReviewed});
      if (action==='preview') {
        if (receipts.size>=32) receipts.delete(receipts.keys().next().value!);
        result.receipt=randomUUID();
        receipts.set(result.receipt,{sha,preferReviewed,expires:now+10*60*1000});
      }
      res.json(result);
    } catch (error) { throw new HttpError(400,(error as Error).message); }
    finally {rmSync(tmp,{recursive:true,force:true});}
  });
  return router;
}
