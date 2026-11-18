import { Router } from 'express';
import { z } from 'zod';
import { id,studyList } from '../../../packages/shared/content';
import { ratingSchema } from '../../../packages/shared/progress';
import type { Store } from '../../core/db';
import { appendEvent, noteBranches } from './progress';
import { getLesson, getWord } from '../content/knowledge';

export function studyRouter(store: Store) {
  const router = Router();
  router.get('/review', (req,res) => {
    const priority = req.query.priority === 'true' ? ' AND priority=1' : '';
    const dueOnly = req.query.due !== 'false';
    const translated = req.query.translated === 'false' ? '' : ' AND Vietnamese IS NOT NULL';
    const collection = studyList.optional().parse(req.query.collection);
    const from = collection ? 'senses s JOIN lexemes l ON l.id=s.lexeme_id' : 'senses s';
    const path = '$.studyLists.'+(collection ?? '');
    const filter = collection ? ' AND json_extract(l.data,?) IS NOT NULL' : '';
    const order = collection ? 'json_extract(l.data,?),s.priority DESC,s.lexeme_id,s.id' : 'priority DESC,lexeme_id,id';
    const all = store.content.prepare("SELECT s.id,lexeme_id FROM "+from+" WHERE status NOT IN ('retired','draft')"
      + priority + translated + filter + ' ORDER BY '+order).all(...(collection ? [path,path] : [])) as {id:string;lexeme_id:string}[];
    const dates = new Map((store.progress.prepare('SELECT sense_id,due FROM srs_state').all() as {sense_id:string;due:string}[]).map(s => [s.sense_id,s.due]));
    const now = new Date().toISOString();
    const eligible = all.filter(s => !dueOnly || !dates.get(s.id) || dates.get(s.id)! <= now)
      .sort((a,b) => (dates.get(a.id) ?? '').localeCompare(dates.get(b.id) ?? ''));
    const page = z.coerce.number().int().min(1).max(100000).parse(req.query.page ?? '1');
    res.json({ total:eligible.length,items:eligible.slice((page - 1)*30,page*30).map(row => {
      const word = getWord(store.content,row.lexeme_id)!;
      return { word:{ ...word,senses:[] }, sense:word.senses.find(s=>s.id===row.id)!, due:dates.get(row.id) };
    }) });
  });
  router.post('/review/:id', (req,res) => {
    const key = id.parse(req.params.id);
    if (!store.content.prepare("SELECT 1 FROM senses WHERE id=? AND status NOT IN ('draft','retired')").get(key)) return res.status(404).json({error:'Nghĩa từ chưa có trong bộ ôn.'});
    const rating = ratingSchema.parse(req.body?.rating);
    appendEvent(store,key,{type:'review',payload:{rating}});
    res.json(store.progress.prepare('SELECT due FROM srs_state WHERE sense_id=?').get(key));
  });
  router.get('/study/:key', (req,res) => {
    const key = id.parse(req.params.key);
    const last = store.progress.prepare("SELECT type,payload FROM study_events WHERE entity_id=? AND type IN ('bookmark','lesson') ORDER BY happened_at DESC,device_id DESC,local_seq DESC").all(key) as {type:string;payload:string}[];
    res.json({ notes:noteBranches(store.progress,key), bookmarked:JSON.parse(last.find(r => r.type === 'bookmark')?.payload ?? '{}').active ?? false,
      done:JSON.parse(last.find(r => r.type === 'lesson')?.payload ?? '{}').done ?? false });
  });
  router.post('/study/:key', (req,res) => {
    const key = id.parse(req.params.key);
    const type = req.body?.type;
    const foundLesson = getLesson(store.content,key);
    if (!foundLesson && !getWord(store.content,key)) return res.status(404).json({error:'Không tìm thấy nội dung.'});
    if (type === 'lesson' && foundLesson) {
      return res.json(appendEvent(store,key,{type,payload:z.object({done:z.boolean()}).parse(req.body.payload)}));
    }
    if (type === 'bookmark') {
      const active = z.boolean().parse(req.body.payload?.active);
      return res.json(appendEvent(store,key,{type,payload:{active,kind:foundLesson ? 'lesson':'word'}}));
    }
    const note = z.object({type:z.literal('note'),payload:z.object({text:z.string().max(10000),parents:z.array(z.uuid()).max(100)})}).parse(req.body);
    const branches = new Set(noteBranches(store.progress,key).map(x=>x.event_id));
    if (note.payload.parents.some(parent=>!branches.has(parent))) return res.status(409).json({error:'Ghi chú đã thay đổi. Hãy tải lại để hợp nhất.'});
    res.json(appendEvent(store,key,note));
  });
  return router;
}
