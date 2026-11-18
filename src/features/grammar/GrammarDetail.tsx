import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import type { Lesson } from '../../../packages/shared/content';
import { isTenseLesson,tenseOverviewId } from '../../../packages/shared/tenses';
import { Back, Label, Loading, SourceLine, statusLabels } from '../../shared/components';
import { PersonalStudy } from '../../shared/PersonalStudy';
import { difficultyLabels } from '../../shared/questions/QuestionFeedback';
import { useResource } from '../../shared/resource';
import { Exercise } from './Exercise';

export function GrammarDetail() {
  const {id} = useParams();
  const resource = useResource<Lesson>('/grammar/' + id);
  const [open,setOpen] = useState<Set<string>>(new Set());
  const l = resource.data;
  if (!l) return <Loading error={resource.error} />;
  const inTenseLibrary = isTenseLesson(l.id) || l.id===tenseOverviewId;
  const allOpen = open.size === l.cases.length;
  const hasComparisons = l.exceptions.length > 0 || l.comparisons.length > 0;
  const anchors = [['overview','Công thức nền tảng'],['use-cases','Các trường hợp sử dụng']];
  if (hasComparisons) anchors.push(['exceptions','Ngoại lệ và so sánh']);
  anchors.push(['errors','Lỗi thường gặp'],['personal','Ghi chú cá nhân']);
  return <>
    <Back to={inTenseLibrary ? '/grammar?topic=tenses' : '/grammar'}>{inTenseLibrary ? '12 thì tiếng Anh' : 'Thư viện ngữ pháp'}</Back>
    <header className="hero lesson-hero"><div><div className="eyebrow">Grammar Studio</div><h1>{l.titleVi} <span lang="en">· {l.title}</span></h1><p>{l.summary}</p>
      <div className="inline"><Label>{l.cases.length} trường hợp</Label><Label tone="mint">{l.cases.reduce((n,c)=>n+c.examples.length,0)} ví dụ Anh–Việt</Label><Label tone="gold">{statusLabels[l.status]}</Label></div></div><BookOpen className="lesson-icon" aria-hidden size={62} /></header>
    <div className="detail-grid">
      <article className="card lesson-main">
        <section id="overview"><h2>Công thức nền tảng</h2><p>Độ khó {difficultyLabels[l.level]} · Part {l.parts.join(', ')}</p>
          {l.overviewNotes?.map(note=><p key={note}>{note}</p>)}
          <div className="formula-grid">{l.formulas.map(f=><div className="formula" key={f.label + ':' + f.pattern}><strong>{f.label}</strong><code>{f.pattern}</code><small>{f.note}</small></div>)}</div>
          {l.overviewExamples?.map(e=><div className="example" key={e.en}><strong lang="en">{e.en}</strong><p>{e.vi}</p></div>)}
          {l.id===tenseOverviewId && <Link className="btn" to="/grammar?topic=tenses">Mở danh sách 12 bài theo thì <ChevronRight size={16} /></Link>}
        </section>
        <section id="use-cases"><div className="section-head"><h2>{l.cases.length} trường hợp sử dụng</h2><button className="btn" onClick={()=>setOpen(allOpen?new Set():new Set(l.cases.map(c=>c.id)))}>{allOpen ? 'Thu gọn tất cả' : 'Mở tất cả'}</button></div>
          <div className="case-stack">{l.cases.map((c,i)=><details id={c.id} key={c.id} open={open.has(c.id) || location.hash === '#' + c.id} onToggle={e=>{
            const value = e.currentTarget.open;
            setOpen(prev=>{if (prev.has(c.id)===value) return prev; const next=new Set(prev); if (value) next.add(c.id); else next.delete(c.id); return next;});
          }}><summary><span className="case-index">{String(i+1).padStart(2,'0')}</span><span><strong>{c.title}</strong><small>{c.usage}</small></span><ChevronDown size={19} /></summary>
            <div className="case-body"><code className="case-formula">{c.formula}</code>{c.signals && <p><strong>Dấu hiệu</strong> · {c.signals}</p>}<Label>{c.frequency === 'specialized' ? 'Chuyên biệt' : 'Phổ biến'}</Label>
              {c.examples.map(e=><div className="example" key={e.en}><strong lang="en">{e.en}</strong><p>{e.vi}</p></div>)}
              {c.note && <p className="notice"><strong>Lưu ý</strong> · {c.note}</p>}
              {c.supplementalExplanations?.map(v=><div className="example" key={v.title}><h3>{v.title}</h3><p>{v.usage}</p><code className="case-formula">{v.formula}</code>{v.note && <p>{v.note}</p>}</div>)}
              {!c.exerciseIds.length && <p className="source-line">Chưa có bài tập riêng cho cách dùng này.</p>}
              {(open.has(c.id) || location.hash === '#' + c.id) && c.exerciseIds.map(id=><Exercise key={id} id={id} />)}
            </div>
          </details>)}</div>
        </section>
        {hasComparisons && <section id="exceptions"><h2>Ngoại lệ và cấu trúc liên quan</h2>{l.exceptions.length > 0 && <ul>{l.exceptions.map(v=><li key={v}>{v}</li>)}</ul>}{l.comparisons.map(v=><div className="example" key={v.title}><h3>{v.title}</h3><p>{v.text}</p></div>)}</section>}
        <section id="errors"><h2>Lỗi dễ nhầm</h2><div className="formula-grid">{l.errors.map(v=><div className="formula" key={v.wrong}><p><span className="incorrect">Sai</span> <del lang="en">{v.wrong}</del></p><p><span className="correct">Đúng</span> <strong lang="en">{v.correct}</strong></p><small>{v.why}</small></div>)}</div></section>
        <section><h2>Nguồn nội dung</h2>{l.references.length > 0 && <ul>{l.references.map(url=><li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname} · {new URL(url).pathname.split('/').at(-1)}</a></li>)}</ul>}<SourceLine id={l.sourceId} />{l.supplementalSourceId && <SourceLine id={l.supplementalSourceId} />}</section>
        <div id="personal"><PersonalStudy id={l.id} lesson /></div>
      </article>
      <aside className="lesson-aside"><div className="card panel"><h2><ClipboardList size={18} /> Nội dung bài học</h2><ol>{anchors.map(([id,label])=><li key={id}><a href={'#'+id}>{label}</a></li>)}</ol></div>
      <div className="card panel"><h2><Sparkles size={17} /> AI Tutor</h2><Link className="btn" to="/ai">Xem trạng thái kết nối <ChevronRight size={15} /></Link></div></aside>
    </div>
  </>;
}
