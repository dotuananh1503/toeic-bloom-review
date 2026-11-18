import { Router } from 'express';
import { z } from 'zod';
import { id, type Word } from '../../../packages/shared/content';
import type { Store } from '../../core/db';
import { HttpError } from '../../core/errors';
import { synthesizeSpeech } from './speech';

type Entry=ReturnType<typeof synthesizeSpeech>;
const accents = z.enum(['en-US','en-GB']);

export function pronunciationRouter(store:Store) {
  const router = Router();
  const cache = new Map<string,Entry>();
  let inFlight=0;
  const getLemma = store.content.prepare('SELECT lemma FROM lexemes WHERE id=?');
  router.get('/api/vocab/:id/pronunciation/:accent',async(req,res)=>{
    const key = id.parse(req.params.id);
    const accent = accents.parse(req.params.accent);
    const word = getLemma.get(key) as Pick<Word,'lemma'> | undefined;
    if (!word || word.lemma.length>160) throw new HttpError(404,'Không tìm thấy mục từ để phát âm.');
    const cacheKey = key+':'+accent+':'+word.lemma;
    let entry = cache.get(cacheKey);
    if (entry) {
      cache.delete(cacheKey);
      cache.set(cacheKey,entry);
    } else {
      if (inFlight>=4) throw new HttpError(503,'Bộ phát âm đang bận. Vui lòng thử lại.');
      inFlight++;
      entry = synthesizeSpeech(word.lemma,accent.toLowerCase(),145,true)
        .catch(error=>{cache.delete(cacheKey);throw error;})
        .finally(()=>{inFlight--;});
      cache.set(cacheKey,entry);
      if (cache.size>64) cache.delete(cache.keys().next().value!);
    }
    const {wav,ipa} = await entry;
    res.type('audio/wav').set({
      'X-Bloom-IPA':encodeURIComponent(ipa),
      'Cache-Control':'private, max-age=86400',
      'Accept-Ranges':'bytes',
    });
    const range = req.range(wav.length,{combine:true});
    if (range===-1) {
      res.set('Content-Range','bytes */'+wav.length).sendStatus(416);
    } else if (Array.isArray(range) && range.type==='bytes' && range.length===1) {
      const {start,end}=range[0];
      res.status(206).set('Content-Range','bytes '+start+'-'+end+'/'+wav.length).send(wav.subarray(start,end+1));
    } else res.send(wav);
  });
  return router;
}
