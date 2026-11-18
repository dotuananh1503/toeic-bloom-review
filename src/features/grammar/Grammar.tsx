import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { Lesson } from '../../../packages/shared/content';
import { isTenseLesson,tenseGroups,tenseOverviewId,tenseTopic } from '../../../packages/shared/tenses';
import { Label, Loading } from '../../shared/components';
import { difficultyLabels } from '../../shared/questions/QuestionFeedback';
import { useResource } from '../../shared/resource';

type Overview = Omit<Lesson,'cases'> & { caseCount:number };
const normalize = (value:string)=>value.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d');

export function Grammar() {
  const [query,setQuery] = useState('');
  const [level,setLevel] = useState('');
  const [params,setParams] = useSearchParams();
  const topic = params.get('topic')==='tenses' ? tenseTopic : params.get('topic') ?? '';
  const lessons = useResource<Overview[]>('/grammar');
  const topics = [...new Set(lessons.data?.map(lesson=>lesson.topic))];
  const filtered = lessons.data?.filter(l=>(!level || l.level===level) && (!topic || l.topic===topic) && normalize(l.title+' '+l.titleVi+' '+l.topic).includes(normalize(query)));
  const overview = filtered?.find(lesson=>lesson.id===tenseOverviewId);
  const tenses = new Map(filtered?.filter(lesson=>isTenseLesson(lesson.id)).map(lesson=>[lesson.id,lesson]));
  const others = filtered?.filter(lesson=>!isTenseLesson(lesson.id) && lesson.id!==tenseOverviewId) ?? [];
  function setTopic(value:string) {
    const next = new URLSearchParams(params);
    if (value) next.set('topic',value===tenseTopic ? 'tenses' : value);
    else next.delete('topic');
    setParams(next,{replace:true});
  }
  return <>
    <section className="grammar-hero"><div><div className="eyebrow">Grammar Studio</div><h1>Ngữ pháp trong ngữ cảnh</h1><p>Công thức, ví dụ Anh–Việt và bài luyện theo từng cách dùng.</p>
      {tenses.size>0 && topic!==tenseTopic && <Link className="btn primary" to="/grammar?topic=tenses"><BookOpen size={17} /> Ôn 12 thì tiếng Anh <ChevronRight size={16} /></Link>}
    </div><div className="grammar-art" aria-hidden="true"><strong>Subject + Verb</strong><span>Word Forms</span><span>If + clause</span></div></section>
    <div className="section-head"><h2>Thư viện ngữ pháp</h2><Label>{lessons.data?.length ?? '…'} bài</Label></div>
    <div className="fields filterbar"><label className="filter-search">Tìm bài ngữ pháp<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ví dụ: câu điều kiện" /></label>
      <label>Cấp độ<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">Tất cả</option>{Object.entries(difficultyLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Chủ điểm<select value={topic} onChange={e=>setTopic(e.target.value)}><option value="">Tất cả</option>{topics.map(value=><option key={value}>{value}</option>)}</select></label>
    </div>
    {!filtered && <Loading error={lessons.error} />}
    {(overview || tenses.size>0) && <section id="tense-library">
      <div className="section-head"><h2>12 thì tiếng Anh</h2>{overview && <Link to={'/grammar/'+overview.id}>{overview.titleVi} <ChevronRight size={15}/></Link>}</div>
      {tenseGroups.map(group=>{
        const chapters = group.ids.flatMap(id=>tenses.has(id) ? [tenses.get(id)!] : []);
        return chapters.length>0 && <section key={group.name} aria-label={group.name}>
          <h3>{group.name}</h3><CardGrid chapters={chapters} />
        </section>;
      })}
    </section>}
    {others.length>0 && <section><h2>{topic || 'Các chủ điểm khác'}</h2><CardGrid chapters={others} /></section>}
    {filtered?.length===0 && <p className="notice">Không tìm thấy bài phù hợp.</p>}
  </>;
}

function CardGrid({chapters}: {chapters:Overview[]}) {
  return <div className="tile-grid">{chapters.map((lesson,i)=><article key={lesson.id} className={'card tile tone-' + i%3}>
    <div className="section-head"><div className="tile-icon"><BookOpen size={21} /></div><Label>{difficultyLabels[lesson.level]}</Label></div>
    <h3>{lesson.titleVi}</h3><small lang="en">{lesson.title}</small><p>{lesson.summary}</p>
    <div className="tile-foot"><span>{lesson.caseCount} trường hợp</span><Link to={'/grammar/'+lesson.id}>Xem bài <ChevronRight size={15} /></Link></div>
  </article>)}</div>;
}
