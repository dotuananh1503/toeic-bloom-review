import { Router } from 'express';
import { z } from 'zod';
import type { Store } from '../../core/db';
import { getLesson, getQuestion, getWord, listWords, rows } from './knowledge';
import { publicQuestion } from './course';
import { appendEvent } from '../progress/progress';
import { id, status, studyList, type Lesson, type Provenance } from '../../../packages/shared/content';

const listQuery = z.object({
  q: z.string().max(180).optional(), domain: z.string().max(100).optional(), pos: z.string().max(60).optional(), status: status.optional(),
  priority: z.enum(['true','false']).optional().transform(value => value === 'true'),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1), limit: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(['asc','desc','topic','frequency']).optional(),
  collection:studyList.optional(),
  study:z.enum(['new','due','reviewed']).optional(),
});
export function knowledgeRouter(store: Store) {
  const router = Router();
  const db = store.content;
  router.get('/vocab',(req,res)=>{
    const params=listQuery.parse(req.query);
    const states=store.progress.prepare('SELECT sense_id,due FROM srs_state').all() as {sense_id:string;due:string}[];
    const studied=new Map(states.map(x=>[x.sense_id,x.due]));
    const now=new Date().toISOString();
    const studyFilter=params.study ? {kind:params.study,IDs:states.filter(x=>params.study!=='due' || x.due<=now).map(x=>x.sense_id)} : undefined;
    const found=listWords(db,{...params,studyFilter});
    res.json({...found,items:found.items.map(word=>{
      const reviews=word.senses.map(s=>studied.get(s.id)).filter((due):due is string=>!!due);
      return {...word,reviewed:reviews.length,due:reviews.filter(date=>date<=now).length};
    })});
  });
  router.get('/vocab-filters', (_req,res) => res.json({
    domains: db.prepare('SELECT DISTINCT domain FROM senses ORDER BY domain').pluck().all(),
    pos: db.prepare('SELECT DISTINCT pos FROM senses ORDER BY pos').pluck().all(),
  }));
  router.get('/vocab/:id', (req,res) => {
    const word = getWord(db,req.params.id);
    if (!word) return res.status(404).json({ error: 'Không tìm thấy từ.' });
    res.json(word);
  });
  router.get('/grammar', (_req,res) => res.json(rows<Omit<Lesson,'cases'> & {caseCount:number}>(db,
    "SELECT json_set(data,'$.caseCount',(SELECT count(*) FROM grammar_cases WHERE lesson_id=g.id)) AS data FROM grammar_lessons g WHERE status != 'retired' ORDER BY topic,title")));
  router.get('/exercise/:id', (req,res) => {
    const question = getQuestion(db,id.parse(req.params.id));
    if (!question || !question.caseIds.length || question.status === 'retired') return res.status(404).json({ error:'Không tìm thấy bài tập.' });
    res.json(publicQuestion(question));
  });
  router.post('/exercise/:id', (req,res) => {
    const q = getQuestion(db,id.parse(req.params.id));
    if (!q || !q.caseIds.length || q.status === 'retired') return res.status(404).json({ error:'Không tìm thấy bài tập.' });
    const selected = z.number().int().min(0).max(q.options.length-1).parse(req.body?.selected);
    const correct = selected === q.answer;
    appendEvent(store,q.id,{type:'attempt',payload:{selected,correct}});
    res.json({answer:q.answer,explanation:q.explanation,rationales:q.rationales,correct});
  });
  router.get('/grammar/:id', (req,res) => {
    const lesson = getLesson(db,req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài.' });
    res.json(lesson);
  });
  router.get('/sources', (_req,res) => res.json(db.prepare('SELECT id,name,url,version,license,attribution,sha256 FROM sources ORDER BY id').all() as Provenance[]));
  return router;
}
