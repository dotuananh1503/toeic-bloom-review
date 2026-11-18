import { Router } from 'express';
import { z } from 'zod';
import type { Store } from '../../core/db';
import { assetExists } from '../media/paths';
import { count, rows } from '../content/knowledge';
import { coverage } from '../content/course';
import { availability, recentExams } from '../exams/exam';
import { lexemeData, type Media } from '../../../packages/shared/content';
import type { Analytics, ContentCoverage } from '../../../packages/shared/analytics';
import { readSettings } from '../settings/settings';
import { appendEvent } from './progress';

const daysAgo=(day:string,n:number)=>new Date(Date.parse(day+'T12:00:00Z')-n*86_400_000).toISOString().slice(0,10);
function localDay(timeZone:string) {
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  return (date:string|Date)=>{
    const values=Object.fromEntries(formatter.formatToParts(new Date(date)).map(x=>[x.type,x.value]));
    return [values.year,values.month,values.day].join('-');
  };
}

export function analytics(store:Store,timeZone='UTC',now=new Date()):Analytics {
  const db=store.progress;
  const day=localDay(timeZone);
  const today=day(now);
  const activities=db.prepare(`SELECT type,happened_at,CAST(json_extract(payload,'$.correct') AS INTEGER) AS correct
    FROM study_events WHERE type IN ('review','attempt') ORDER BY happened_at`).all() as {type:string;happened_at:string;correct:number|null}[];
  const byDay=new Map<string,Analytics['days'][number]>();
  let totalReviews=0,attempts=0,correct=0;
  for (const item of activities) {
    const key=day(item.happened_at);
    const data=byDay.get(key) ?? {day:key,reviews:0,answers:0,correct:0};
    if (item.type==='review') {data.reviews++;totalReviews++;}
    else {data.answers++;data.correct+=item.correct ?? 0;attempts++;correct+=item.correct ?? 0;}
    byDay.set(key,data);
  }
  let streak=0;
  for (let n=byDay.has(today)?0:1;byDay.has(daysAgo(today,n));n++) streak++;
  const goal=db.prepare("SELECT json_extract(payload,'$.reviews') FROM study_events WHERE type='goal' ORDER BY happened_at DESC,device_id DESC,local_seq DESC LIMIT 1").pluck().get() as number|undefined;
  return {
    todayReviews:byDay.get(today)?.reviews ?? 0,streak,totalReviews,goal:goal ?? readSettings(store).studyGoal,
    due:count(db,'SELECT count(*) FROM srs_state WHERE due<=?',now.toISOString()),
    learnedSenses:count(db,'SELECT count(*) FROM srs_state'),
    completedLessons:count(db,`SELECT count(*) FROM (
      SELECT payload,row_number() OVER (PARTITION BY entity_id ORDER BY happened_at DESC,device_id DESC,local_seq DESC) AS n
      FROM study_events WHERE type='lesson') WHERE n=1 AND json_extract(payload,'$.done')=1`),
    examCount:count(db,"SELECT count(DISTINCT entity_id) FROM study_events WHERE type='exam_finish'"),
    attempts,correct,
    days:Array.from({length:7},(_,i)=>{
      const key=daysAgo(today,6-i);
      return byDay.get(key) ?? {day:key,reviews:0,answers:0,correct:0};
    }),
    resume:recentExams(store).find(x=>x.score===undefined) ?? null,
  };
}
export function contentCoverage(store:Store):ContentCoverage {
  const db=store.content;
  const assets=rows<Media>(db,'SELECT data FROM media_assets').filter(item=>assetExists(store.path,item));
  const assetKeys=new Set(assets.map(m=>m.id));
  const words=rows<ReturnType<typeof lexemeData.parse>>(db,'SELECT data FROM lexemes');
  const has=(word:typeof words[number],accent:string)=>word.pronunciations.some(p=>p.accent===accent && p.assetId && assetKeys.has(p.assetId));
  return {...coverage(db),
    audio:{us:words.filter(w=>has(w,'en-US')).length,uk:words.filter(w=>has(w,'en-GB')).length,
      missingWords:words.filter(w=>!has(w,'en-US') || !has(w,'en-GB')).length,
      onDemandWords:count(db,'SELECT count(*) FROM lexemes WHERE length(lemma)<=160'),
      listening:assets.filter(m=>m.usage==='listening').length,synthetic:assets.filter(m=>m.synthetic).length,images:assets.filter(m=>m.usage==='scene').length},
    grammarTopics:db.prepare("SELECT topic,count(*) AS total,sum(status IN ('reviewed','published_reviewed')) AS reviewed FROM grammar_lessons WHERE status!='retired' GROUP BY topic ORDER BY topic").all() as ContentCoverage['grammarTopics'],
    vocabularyTopics:db.prepare("SELECT domain AS topic,count(*) AS total,sum(status IN ('reviewed','published_reviewed')) AS reviewed,sum(Vietnamese IS NOT NULL) AS translated FROM senses WHERE status!='retired' GROUP BY domain ORDER BY domain").all() as ContentCoverage['vocabularyTopics'],
    reviewQueue:db.prepare('SELECT kind,status,count(*) AS total FROM content_review_queue GROUP BY kind,status ORDER BY kind,status').all() as ContentCoverage['reviewQueue'],
    availability:availability(store),
  };
}
export function analyticsRouter(store:Store) {
  const router=Router();
  router.get('/analytics',(req,res)=>{
    const timezone=z.string().max(100).default('UTC').refine(t=>{
      try {new Intl.DateTimeFormat('en',{timeZone:t});return true;} catch{return false;}
    }).parse(req.query.tz);
    res.json(analytics(store,timezone));
  });
  router.get('/coverage',(_req,res)=>res.json(contentCoverage(store)));
  router.put('/goal',(req,res)=>{
    const reviews=z.number().int().min(1).max(100).parse(req.body?.reviews);
    res.json(appendEvent(store,'daily',{type:'goal',payload:{reviews}}));
  });
  return router;
}
