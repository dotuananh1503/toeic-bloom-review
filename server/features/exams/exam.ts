import { randomUUID } from 'node:crypto';
import type { Sqlite, Store } from '../../core/db';
import type { Group, Question } from '../../../packages/shared/content';
import type { ExamAvailability, ExamState, Mode, ReviewItem, Session } from '../../../packages/shared/exam';
import { partInfo } from '../../../packages/shared/exam';
import { getGroup, getMedia, getQuestion, rows } from '../content/knowledge';
import { appendEvent, decodeEvent, type StoredEvent } from '../progress/progress';
import { publicQuestion } from '../content/course';
import { HttpError } from '../../core/errors';
import { assetExists } from '../media/paths';

export const blueprints = [
  {mode:'mini',parts:[1,2,3,3,4,4,3],minutes:15},
  {mode:'reading',parts:[0,0,0,0,3,4,13],minutes:20},
  {mode:'half',parts:[3,12,21,15,14,8,27],minutes:60},
  {mode:'full',parts:partInfo.map(p=>p.count),minutes:120},
] as const;

export function groupAvailable(store:Store, group:Group | undefined) {
  if (!group || group.part>=5) return true;
  const audio=group.audioId && getMedia(store.content,group.audioId);
  if (!audio || !assetExists(store.path,audio)) return false;
  if (group.part!==1) return true;
  const image=group.imageId && getMedia(store.content,group.imageId);
  return Boolean(image && assetExists(store.path,image));
}
function bank(db: Sqlite) {
  return rows<Question>(db,"SELECT data FROM questions WHERE status NOT IN ('retired','draft') ORDER BY part,coalesce(group_id,''),position,id");
}
function grouped(store: Store, all: Question[]) {
  const result = new Map<string,{ items:Question[]; group?:Group; ready:boolean }>();
  for (const q of all) {
    const id=q.groupId ?? q.id;
    const existing=result.get(id);
    if (existing) existing.items.push(q);
    else {
      const group=q.groupId ? getGroup(store.content,q.groupId) : undefined;
      result.set(id,{items:[q],group,ready:q.part>=5 || Boolean(group && groupAvailable(store,group))});
    }
  }
  return [...result.values()];
}
export function exactGroups(groups: Question[][], total: number) {
  if (total===0) return [];
  const candidates=new Map<number,Question[]>([[0,[]]]);
  for (const group of groups) {
    for (const [sum,selection] of [...candidates].reverse()) {
      if (sum+group.length>total || candidates.has(sum+group.length)) continue;
      const next=[...selection,...group];
      if (next.length===total) return next;
      candidates.set(sum+group.length,next);
    }
  }
}
function modeSet(groups: ReturnType<typeof grouped>, mode: Exclude<Mode,'practice'>) {
  const blueprint=blueprints.find(b=>b.mode===mode)!;
  const selection=blueprint.parts.map((count,i)=>exactGroups(groups.filter(g=>g.ready && g.items[0].part===i+1
    && (mode!=='full' || g.items.every(q=>q.status==='reviewed' || q.status==='published_reviewed'))).map(g=>g.items),count));
  return selection.every(Boolean) ? selection.flatMap(q=>q!) : undefined;
}
export function availability(store:Store):ExamAvailability {
  const all=bank(store.content);
  const groups=grouped(store,all);
  return {
    modes:blueprints.map(b=>({mode:b.mode,count:[...b.parts].reduce((n,v)=>n+v,0),minutes:b.minutes,ready:!!modeSet(groups,b.mode)})),
    parts:partInfo.map((_,i)=>({part:i+1,total:all.filter(q=>q.part===i+1).length,available:groups.filter(g=>g.ready && g.items[0].part===i+1).reduce((n,g)=>n+g.items.length,0)})),
    topics:[...new Set(all.map(q=>q.topic))].sort(),draftsAvailable:all.some(q=>q.status==='needs_review'),
  };
}
export function validateQuestionGroups(db:Sqlite) {
  const all=bank(db);
  const groups=rows<Group>(db,'SELECT data FROM question_groups');
  for (const g of groups) {
    const matching=all.filter(q=>q.groupId===g.id);
    const n=matching.length;
    if (!n) continue;
    if ((g.part<=2 && n!==1) || (g.part>=3 && g.part<=4 && n!==3) || (g.part===6 && (n!==4 || g.passages.length!==1))
      || (g.part===7 && (g.passages.length===1 ? (n<2 || n>4) : n!==5))) throw new Error('Incorrect group count: ' + g.id);
    if (new Set(matching.map(q=>q.position)).size!==n) throw new Error('Repeated positions: ' + g.id);
  }
}

type Create = {mode:Mode;part?:number;topic?:string;difficulty?:Question['difficulty'];length?:number};
export function startExam(store:Store, request:Create, now=new Date()) {
  const all=grouped(store,bank(store.content));
  let selected:Question[] | undefined;
  let duration=1200;
  if (request.mode==='practice') {
    const limit=request.length ?? 10;
    const eligible=all.filter(g=>g.ready && (!request.part || g.items[0].part===request.part)
      && g.items.some(q=>(!request.topic || q.topic===request.topic) && (!request.difficulty || q.difficulty===request.difficulty)));
    selected=[];
    for (const g of eligible) if (selected.length+g.items.length<=limit) selected.push(...g.items);
    if (!selected.length && eligible.length) selected=eligible[0].items;
    duration = 7200;
  } else {
    selected=modeSet(all,request.mode);
    duration=blueprints.find(b=>b.mode===request.mode)!.minutes*60;
  }
  if (!selected?.length) throw new HttpError(409,'Chưa đủ câu hỏi và tài nguyên đã cài cho bộ luyện này.');
  const id=randomUUID();
  const assets=new Map(all.filter(x=>x.group).map(x=>[x.group!.id,x.group!]));
  appendEvent(store,id,{type:'exam_start',payload:{mode:request.mode,questionIds:selected.map(q=>q.id),startedAt:now.toISOString(),duration,
    items:selected.map(question=>({question,group:question.groupId ? assets.get(question.groupId) : undefined}))}},now);
  return getExam(store,id,now);
}

function history(store:Store,id:string) {
  const raw=store.progress.prepare("SELECT * FROM study_events WHERE entity_id=? AND type IN ('exam_start','exam_finish','flag') UNION ALL SELECT * FROM study_events WHERE type='attempt' AND json_extract(payload,'$.sessionId')=? ORDER BY happened_at,device_id,local_seq,event_id").all(id,id) as StoredEvent[];
  const events=raw.map(decodeEvent);
  const start=events.find(e=>e.type==='exam_start');
  if (!start || start.type!=='exam_start') throw new HttpError(404,'Không tìm thấy bài luyện.');
  const session=start.payload;
  const finish=events.findLast(e=>e.type==='exam_finish');
  const answers:Record<string,number>=Object.create(null);
  const flags=new Set<string>();
  const cutoff=finish ? events.lastIndexOf(finish) : events.length;
  for (const e of events.slice(0,cutoff)) {
    if (e.type==='attempt') answers[e.entity_id]=e.payload.selected;
    if (e.type==='flag') {
      if (e.payload.flag) flags.add(e.payload.questionId); else flags.delete(e.payload.questionId);
    }
  }
  return {session,finish:finish?.type==='exam_finish' ? finish.payload : undefined,answers,flags:[...flags]};
}
function snapshot(store:Store,session:Session) {
  if (session.items) return session.items;
  return session.questionIds.flatMap(id=>{
    const question=getQuestion(store.content,id);
    return question ? [{question,group:question.groupId ? getGroup(store.content,question.groupId) : undefined}] : [];
  });
}
export function reviewItem(store:Store, q:Question, selected:number|null, stimulus?:Group):ReviewItem {
  const grammarLinks=q.caseIds.flatMap(caseId=>{
    const lessonId=store.content.prepare('SELECT lesson_id FROM grammar_cases WHERE id=?').pluck().get(caseId) as string|undefined;
    return lessonId ? [{caseId,lessonId}] : [];
  });
  const wordLinks=q.senseIds.flatMap(senseId=>{
    const wordId=store.content.prepare('SELECT lexeme_id FROM senses WHERE id=?').pluck().get(senseId) as string|undefined;
    return wordId ? [{senseId,wordId}] : [];
  });
  return {...q,selected,group:stimulus,grammarLinks,wordLinks};
}
export function getExam(store:Store,id:string,now=new Date()):ExamState {
  const {session,finish,answers,flags}=history(store,id);
  const items=snapshot(store,session);
  const groups=new Map<string,Omit<Group,'transcript'>>();
  for (const {group} of items) {
    if (!group) continue;
    const {transcript,...visible}=group;
    void transcript;
    groups.set(visible.id,visible);
  }
  const remaining=Math.max(0,session.duration-Math.floor((now.getTime()-Date.parse(session.startedAt))/1000));
  const {items: saved, ...publicSession}=session;
  void saved;
  return {...publicSession,id,questions:items.map(x=>publicQuestion(x.question)),groups:[...groups.values()],answers,flags,remaining,
    result:finish ? { ...finish,items:items.map(x=>reviewItem(store,x.question,answers[x.question.id]??null,x.group)) } : undefined};
}
function ongoing(store:Store,id:string,questionId:string,now:Date) {
  const {session,finish,answers,flags}=history(store,id);
  if (finish || now.getTime()>=Date.parse(session.startedAt)+session.duration*1000) throw new HttpError(409,'Bài luyện đã nộp hoặc hết giờ.');
  const item=snapshot(store,session).find(x=>x.question.id===questionId);
  if (!item) throw new HttpError(404,'Câu hỏi không thuộc bài này.');
  return {question:item.question,answers,flags,seconds:Math.max(0,Math.floor((now.getTime()-Date.parse(session.startedAt))/1000))};
}
export function saveAnswer(store:Store,id:string,questionId:string,selected:number,now=new Date()) {
  store.progress.transaction(()=>{
    const {question,seconds,answers}=ongoing(store,id,questionId,now);
    if (!Number.isInteger(selected) || selected<0 || selected>=question.options.length) throw new HttpError(400,'Lựa chọn không hợp lệ.');
    if (answers[questionId]!==selected) appendEvent(store,questionId,{type:'attempt',payload:{selected,correct:selected===question.answer,sessionId:id,seconds}},now);
  }).immediate();
}
export function setFlag(store:Store,id:string,questionId:string,flag:boolean,now=new Date()) {
  store.progress.transaction(()=>{
    const {flags}=ongoing(store,id,questionId,now);
    if (flags.includes(questionId)!==flag) appendEvent(store,id,{type:'flag',payload:{questionId,flag}},now);
  }).immediate();
}
export function finishExam(store:Store,id:string,now=new Date()) {
  store.progress.transaction(()=>{
    const {session,finish,answers}=history(store,id);
    if (!finish) {
      const score=snapshot(store,session).filter(x=>answers[x.question.id]===x.question.answer).length;
      appendEvent(store,id,{type:'exam_finish',payload:{score,total:session.questionIds.length}},now);
    }
  }).immediate();
  return getExam(store,id,now);
}
export function recentExams(store:Store) {
  const ids=store.progress.prepare("SELECT entity_id FROM study_events WHERE type='exam_start' ORDER BY happened_at DESC LIMIT 30").pluck().all() as string[];
  return ids.map(id=>{
    const {session,finish,answers}=history(store,id);
    return {id,mode:session.mode,total:session.questionIds.length,startedAt:session.startedAt,answered:Object.keys(answers).length,score:finish?.score};
  });
}
export function mistakes(store:Store) {
  const events=(store.progress.prepare("SELECT * FROM mistake_book ORDER BY happened_at DESC LIMIT 100").all() as StoredEvent[]).map(decodeEvent);
  const unique=new Map<string,ReviewItem>();
  for (const e of events) {
    if (e.type!=='attempt' || unique.has(e.entity_id)) continue;
    if (e.payload.sessionId) {
      const state=history(store,e.payload.sessionId);
      if (!state.finish || state.answers[e.entity_id]!==e.payload.selected) continue;
      const x=snapshot(store,state.session).find(x=>x.question.id===e.entity_id);
      if (x && x.question.answer!==e.payload.selected) unique.set(e.entity_id,reviewItem(store,x.question,e.payload.selected,x.group));
    } else {
      const q=getQuestion(store.content,e.entity_id);
      if (q) unique.set(e.entity_id,reviewItem(store,q,e.payload.selected,q.groupId ? getGroup(store.content,q.groupId) : undefined));
    }
  }
  return [...unique.values()];
}
