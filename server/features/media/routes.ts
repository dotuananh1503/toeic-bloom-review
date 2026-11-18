import { readFile } from 'node:fs/promises';
import { Router, raw } from 'express';
import { id } from '../../../packages/shared/content';
import type { Store } from '../../core/db';
import { HttpError } from '../../core/errors';
import { getMedia, hash } from '../content/knowledge';
import { assetLimit, ingestAsset } from './media';
import { assetPath } from './paths';

export function mediaRouter(store:Store) {
  const router=Router();
  router.get('/api/media-targets',(_req,res)=>res.json(store.content.prepare("SELECT id,part,json_extract(data,'$.title') AS title FROM question_groups WHERE part<5 ORDER BY part,id").all()));
  router.get('/api/media-info/:id', (req,res)=>{
    const asset=getMedia(store.content,id.parse(req.params.id));
    if (!asset) return res.status(404).json({error:'Không tìm thấy media.'});
    res.json(asset);
  });
  router.get('/media/:id',async(req,res)=>{
    const asset=getMedia(store.content,id.parse(req.params.id));
    const path=asset && assetPath(store.path,asset);
    if (!asset || !path) return res.sendStatus(404);
    const data=await readFile(path);
    if (hash(data)!==asset.sha256) return res.sendStatus(404);
    res.type(asset.mime);
    res.set('Cache-Control','no-cache');
    res.sendFile(path);
  });
  router.post('/api/media',raw({type:'application/octet-stream',limit:assetLimit}),(req,res)=>{
    if (!Buffer.isBuffer(req.body)) throw new HttpError(415,'Cần tải tệp media.');
    const meta=req.get('X-Bloom-Media');
    if (!meta || meta.length>6000) throw new HttpError(400,'Thiếu thông tin nguồn và giấy phép.');
    try {
      const value=JSON.parse(decodeURIComponent(meta));
      res.status(201).json(ingestAsset(store,value,req.body));
    } catch (error) {
      throw new HttpError(400,error instanceof Error?error.message:'Media không hợp lệ.');
    }
  });
  return router;
}
