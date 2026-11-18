import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Play, Trophy } from 'lucide-react';
import { partInfo, type ExamAvailability, type ExamState, type Mode } from '../../../packages/shared/exam';
import { api, json } from '../../shared/api';
import { Loading } from '../../shared/components';
import { difficultyLabels } from '../../shared/questions/QuestionFeedback';
import { useResource } from '../../shared/resource';
import { modes } from './modes';

type Recent={id:string;mode:Mode;total:number;answered:number;startedAt:string;score?:number};
function Start({mode,part,topic,difficulty,length,disabled}: {mode:Mode;part?:number;topic?:string;difficulty?:string;length?:number;disabled?:boolean}) {
  const navigate=useNavigate();
  const [error,setError]=useState('');
  const [pending,setPending]=useState(false);
  async function start() {
    setPending(true);setError('');
    try {
      const exam=await api<ExamState>('/exam',json('POST',{mode,part,topic:topic || undefined,difficulty:difficulty || undefined,length}));
      navigate('/exams/' + exam.id);
    } catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  return <div><button className="btn primary" onClick={start} disabled={disabled || pending}><Play size={16} /> Bắt đầu {modes[mode]}</button>{error && <p role="alert">{error}</p>}</div>;
}
export function Practice() {
  const [part,setPart]=useState(5);
  const [topic,setTopic]=useState('');
  const [level,setLevel]=useState('');
  const [length,setLength]=useState(10);
  const data=useResource<ExamAvailability>('/exam/availability');
  const selected=data.data?.parts.find(p=>p.part===part);
  return <><header className="page-head"><h1>Luyện tập TOEIC</h1><p>Chọn phần và kỹ năng. Câu hỏi cùng ngữ liệu được luyện theo nhóm.</p></header>
    <div className="part-grid">{partInfo.map((p,i)=>{
      const counts=data.data?.parts[i];
      return <button key={p.title} className="card part" aria-pressed={part===i+1} onClick={()=>setPart(i+1)}>
        {i<4?<Headphones size={18}/>:<BookOpen size={18}/>}<strong>Part {i+1}</strong><span>{p.title}</span>
        <small>{counts ? counts.available + ' / ' + counts.total + ' câu khả dụng' : 'Đang tải'}</small>
      </button>;
    })}</div>
    {!data.data ? <Loading error={data.error} /> : <section className="card panel">
      <div className="section-head"><h2>Luyện Part {part} · {partInfo[part-1].title}</h2><Link to="/mistakes">Xem sổ lỗi sai</Link></div>
      {selected && selected.available < selected.total && <p className="notice warn">Cài tệp âm thanh hoặc ảnh đã cấp phép để mở các câu nghe còn thiếu tài nguyên.</p>}
      <div className="fields">
        <label>Chủ đề<select value={topic} onChange={e=>setTopic(e.target.value)}><option value="">Tất cả</option>{data.data.topics.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Độ khó<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">Tất cả</option>{Object.entries(difficultyLabels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
        <label>Số câu mục tiêu<input type="number" min="1" max="100" value={length} onChange={e=>setLength(e.target.valueAsNumber)} /></label>
        <Start mode="practice" part={part} topic={topic} difficulty={level} length={length} disabled={!selected?.available || !(length >= 1 && length <= 100)} />
      </div>
      <small>Bài luyện có thể chứa câu đang chờ kiểm duyệt. Bộ lọc giữ các câu cùng nhóm.</small>
    </section>}
    <RecentExams />
  </>;
}
function RecentExams() {
  const results=useResource<Recent[]>('/exam');
  if (!results.data) return <Loading error={results.error} />;
  return <section className="card panel"><h2>Bài làm gần đây</h2>
    {!results.data.length && <p>Chưa có bài làm.</p>}
    <ul className="study-list">{results.data.map(v=><li key={v.id}><Link to={'/exams/'+v.id}>{modes[v.mode]}</Link><span>{v.score===undefined ? v.answered + ' / ' + v.total + ' đã chọn' : v.score + ' / ' + v.total + ' đúng'}</span><small>{new Date(v.startedAt).toLocaleString('vi-VN')}</small><Link to={'/exams/'+v.id} className="btn">{v.score===undefined?'Tiếp tục':'Xem kết quả'}</Link></li>)}</ul>
  </section>;
}
export function MockTests() {
  const info=useResource<ExamAvailability>('/exam/availability');
  return <><header className="page-head"><h1>Thi thử TOEIC</h1><p>Thực hành với đồng hồ, đánh dấu câu và lưu tự động.</p></header>
    {!info.data ? <Loading error={info.error} /> : <div className="tile-grid exam-grid">{info.data.modes.map(m=><section className="card tile" key={m.mode}>
      <div className="tile-icon">{m.mode==='reading'?<BookOpen size={21}/>:<Trophy size={21}/>}</div>
      <h2>{modes[m.mode]}</h2><p>{m.count} câu · {m.minutes} phút</p>
      {!m.ready && <p className="notice warn">{m.mode==='full' ? 'Cần đủ 200 câu đã kiểm duyệt và tài nguyên nghe hợp lệ.' : 'Chưa đủ ngân hàng câu hỏi hoặc media.'}</p>}
      {m.ready && <p>Đề tự biên soạn · điểm số thô</p>}
      <Start mode={m.mode} disabled={!m.ready} />
    </section>)}</div>}
    <RecentExams />
  </>;
}
