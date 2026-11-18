import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, ChevronRight, Flame, History, Layers3, ListChecks, Target, Trophy } from 'lucide-react';
import type { Analytics, ContentCoverage } from '../../../packages/shared/analytics';
import { Label, Loading, statusLabels } from '../../shared/components';
import { useResource } from '../../shared/resource';
import { api,json } from '../../shared/api';

const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const analyticsUrl='/analytics?tz='+encodeURIComponent(timezone ?? 'UTC');
function Summary({stats}: {stats:Analytics}) {
  const metrics=[
    {label:'Đến hạn ôn',value:stats.due,Icon:History,detail:stats.learnedSenses+' nghĩa đã học'},
    {label:'Chuỗi học',value:stats.streak,Icon:Flame,detail:'ngày liên tiếp'},
    {label:'Ngữ pháp đã học',value:stats.completedLessons,Icon:BookOpen,detail:'bài đã đánh dấu'},
    {label:'Bài thi đã nộp',value:stats.examCount,Icon:Trophy,detail:stats.attempts+' lượt trả lời'},
  ];
  return <div className="metrics">{metrics.map(({label,value,Icon,detail},i)=><article className={'card metric metric-'+i} key={label}>
    <div><span>{label}</span><i><Icon size={17}/></i></div><strong>{value}</strong><small>{detail}</small>
  </article>)}</div>;
}

export function Dashboard() {
  const stats=useResource<Analytics>(analyticsUrl);
  const content=useResource<Pick<ContentCoverage,'lexemes'|'grammarLessons'|'questions'>>('/coverage');
  const total=content.data?.questions.reduce((n,p)=>n+p.total,0);
  return <>
    <header className="page-head"><h1>Tổng quan học tập</h1></header>
    <section className="hero"><div><div className="eyebrow">TOEIC Listening & Reading</div>
      <h2>Học mỗi ngày, tiến xa hơn.</h2><p>Luyện ngữ pháp, từ vựng và kỹ năng làm bài ngay trên máy của bạn.</p>
      <div className="actions"><Link className="btn white" to={stats.data?.resume?'/exams/'+stats.data.resume.id:'/grammar'}><BookOpen size={17} /> {stats.data?.resume?'Tiếp tục bài làm':'Học ngữ pháp'}</Link>
        <Link className="btn glass" to="/vocabulary?mode=flash">Ôn từ vựng <ChevronRight size={16}/></Link></div>
    </div><div className="hero-goal"><strong>700–800</strong><span>Mục tiêu TOEIC</span></div></section>
    {stats.data ? <Summary stats={stats.data}/> : <Loading error={stats.error}/>}
    <div className="dashboard-grid"><div>
      <div className="section-head"><h2>Tiếp tục học</h2><Link to="/progress">Xem tiến độ</Link></div>
      <div className="tile-grid dash-tiles">
        <StudyTile to="/grammar" icon={<BookOpen size={22}/>} title="Ngữ pháp" stats={content.data ? content.data.grammarLessons+' bài trong thư viện' : undefined}/>
        <StudyTile to="/vocabulary" icon={<Layers3 size={22}/>} title="Từ vựng" stats={content.data ? content.data.lexemes+' mục từ' : undefined}/>
        <StudyTile to="/practice" icon={<Target size={22}/>} title="Luyện Part 1–7" stats={total===undefined ? undefined : total+' câu đã nhập'}/>
      </div>
    </div>{stats.data && <section className="card panel daily-card"><h2>Mục tiêu hôm nay</h2><p><strong>{stats.data.todayReviews} / {stats.data.goal}</strong> lượt ôn</p>
      <progress max={stats.data.goal} value={Math.min(stats.data.goal,stats.data.todayReviews)} aria-label="Tiến độ mục tiêu ôn hôm nay"/>
      <Link className="btn" to="/vocabulary?mode=flash">Mở bộ thẻ</Link></section>}</div>
  </>;
}
function StudyTile({to,icon,title,stats}: {to:string;icon:React.ReactNode;title:string;stats?:string}) {
  return <Link className="card tile" to={to}><span className="tile-icon">{icon}</span><h3>{title}</h3><div className="tile-foot"><span>{stats}</span><ChevronRight size={17}/></div></Link>;
}
export function Progress() {
  const [tab,setTab]=useState<'study'|'content'>('study');
  return <><header className="page-head"><h1>Tiến độ và độ phủ</h1><p>Hoạt động học và số liệu nội dung trên thiết bị.</p></header>
    <div className="section-head"><div className="segmented"><button aria-pressed={tab==='study'} onClick={()=>setTab('study')}>Tiến độ</button><button aria-pressed={tab==='content'} onClick={()=>setTab('content')}>Độ phủ nội dung</button></div></div>
    {tab==='study'?<StudyProgress/>:<Coverage/>}
  </>;
}
function StudyProgress() {
  const [mode,setMode]=useState<'reviews'|'answers'>('reviews');
  const [goal,setGoal]=useState<number>();
  const [message,setMessage]=useState('');
  const result=useResource<Analytics>(analyticsUrl);
  if (!result.data) return <Loading error={result.error}/>;
  const data=result.data;
  const max=Math.max(1,...data.days.map(d=>d[mode]));
  return <><Summary stats={data}/>
    <div className="detail-grid"><section className="card panel">
      <div className="section-head"><h2><Activity size={19}/> 7 ngày gần đây</h2><div className="segmented"><button aria-pressed={mode==='reviews'} onClick={()=>setMode('reviews')}>Lượt ôn</button><button aria-pressed={mode==='answers'} onClick={()=>setMode('answers')}>Lượt trả lời</button></div></div>
      <div className="activity-chart" role="list" aria-label={mode==='reviews'?'Lượt ôn theo ngày':'Lượt trả lời theo ngày'}>
        {data.days.map(day=><div className="chart-col" key={day.day} role="listitem"><span>{day[mode]}</span><div><i style={{height:Math.max(2,day[mode]/max*100)+'%'}}/></div><small>{day.day.slice(8)}/{day.day.slice(5,7)}</small></div>)}
      </div>
    </section><aside className="card panel"><h2><Target size={18}/> Mục tiêu ôn</h2><form className="stack" onSubmit={async e=>{
      e.preventDefault();
      try {await api('/goal',json('PUT',{reviews:goal ?? data.goal}));setMessage('Đã lưu mục tiêu.');result.refresh();}
      catch(error) {setMessage((error as Error).message);}
    }}><label>Lượt ôn mỗi ngày<input required type="number" min="1" max="100" value={goal ?? data.goal} onChange={e=>setGoal(e.target.valueAsNumber)}/></label><button className="btn">Lưu mục tiêu</button></form><p role="status">{message}</p>
    <p>{data.totalReviews} lượt ôn · {data.attempts ? Math.round(data.correct/data.attempts*100)+'% lựa chọn đúng' : 'Chưa trả lời câu hỏi'}</p>
    <Link to="/mistakes">Xem sổ lỗi sai</Link></aside></div>
  </>;
}
const names:Record<string,string>={sense:'Nghĩa từ',question:'Câu hỏi',lesson:'Bài ngữ pháp'};
function Coverage() {
  const [filter,setFilter]=useState('all');
  const data=useResource<ContentCoverage>('/coverage');
  if (!data.data) return <Loading error={data.error}/>;
  const info=data.data;
  const cards=[
    {label:'Mục từ đã nhập',n:info.lexemes,sub:(info.senses-info.glossarySenses)+' nghĩa · '+info.glossarySenses+' chú giải Anh–Việt'},
    {label:'Nghĩa đã kiểm duyệt',n:info.reviewedSenses,sub:info.missingTranslation+' nghĩa thiếu bản dịch'},
    {label:'Bài ngữ pháp',n:info.grammarLessons,sub:info.reviewedLessons+' bài đã kiểm duyệt'},
    {label:'Tệp media',n:info.assets,sub:info.audio.synthetic+' tệp giọng máy'},
  ];
  return <>
    <div className="metrics">{cards.map(c=><article className="card metric" key={c.label}><div>{c.label}</div><strong>{c.n}</strong><small>{c.sub}</small></article>)}</div>
    <div className="detail-grid"><section className="card panel">
      <h2>Ngân hàng câu hỏi</h2><div className="coverage-rows">
        {info.availability.parts.map(p=><div key={p.part}><strong>Part {p.part}</strong><span>{p.total} đã nhập</span><span>{p.available} khả dụng</span><Label>{info.questions.find(q=>q.part===p.part)?.reviewed ?? 0} đã kiểm duyệt</Label></div>)}
      </div></section>
      <aside className="card panel"><h2>Tài nguyên nghe</h2><p>Tệp phát âm lưu sẵn · {info.audio.us} mục từ có US · {info.audio.uk} mục từ có UK</p>
        <p>{info.audio.onDemandWords} mục từ hỗ trợ tạo giọng máy US và UK trên thiết bị.</p><p>{info.audio.listening} đoạn nghe · {info.audio.images} ảnh</p></aside></div>
    <section className="card panel"><div className="section-head"><h2><ListChecks size={19}/> Hàng đợi kiểm duyệt</h2>
      <label>Loại nội dung<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option>{Object.entries(names).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
      <div className="coverage-rows">{info.reviewQueue.filter(x=>filter==='all' || x.kind===filter).map(row=><div key={row.kind+row.status}><strong>{names[row.kind]}</strong><span>{statusLabels[row.status as keyof typeof statusLabels]}</span><span>{row.total}</span></div>)}</div>
    </section>
    <div className="settings-grid"><section className="card panel"><h2>Từ vựng theo chủ đề</h2>
      <div className="coverage-rows">{info.vocabularyTopics.map(t=><div key={t.topic}><strong>{t.topic}</strong><span>{t.total} nghĩa</span><span>{t.translated} đã dịch</span><span>{t.reviewed} đã kiểm duyệt</span></div>)}</div>
    </section><section className="card panel"><h2>Ngữ pháp theo chủ điểm</h2>
      <div className="coverage-rows">{info.grammarTopics.map(t=><div key={t.topic}><strong>{t.topic}</strong><span>{t.total} bài</span><span>{t.reviewed} đã kiểm duyệt</span></div>)}</div></section></div>
  </>;
}
