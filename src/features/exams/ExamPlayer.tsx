import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock3, Flag } from 'lucide-react';
import type { ExamState } from '../../../packages/shared/exam';
import { api, json } from '../../shared/api';
import { Back, Label, Loading } from '../../shared/components';
import { difficultyLabels, Options } from '../../shared/questions/QuestionFeedback';
import { useResource } from '../../shared/resource';
import { Results } from './ExamResults';
import { modes } from './modes';
import { Stimulus } from './Stimulus';

export function ExamPlayer() {
  const {id}=useParams();
  const data=useResource<ExamState>('/exam/' + id);
  if (!data.data) return <Loading error={data.error} />;
  return <Player initial={data.data} />;
}
function Player({initial}: {initial:ExamState}) {
  const [exam,setExam]=useState(initial);
  const [index,setIndex]=useState(()=>Math.max(0,initial.questions.findIndex(q=>initial.answers[q.id]===undefined)));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [remaining,setRemaining]=useState(initial.remaining);
  const [confirm,setConfirm]=useState(false);
  const [autoError,setAutoError]=useState(false);
  const q=exam.questions[index];
  const id=exam.id;
  const finished=Boolean(exam.result);
  const timed=exam.mode!=='practice';
  useEffect(()=>{
    if (finished || !timed) return;
    const end=Date.now()+initial.remaining*1000;
    const timer=window.setInterval(()=>setRemaining(Math.max(0,Math.ceil((end-Date.now())/1000))),250);
    return ()=>clearInterval(timer);
  },[finished,initial.remaining,timed]);
  useEffect(()=>{
    if (finished || busy || remaining>0 || autoError) return;
    api<ExamState>('/exam/'+id+'/finish',json('POST',{})).then(setExam).catch(error=>{setError(error.message);setAutoError(true);});
  },[id,busy,finished,remaining,autoError]);
  if (exam.result) return <Results exam={exam} />;
  if (!q) return <p className="notice warn">Thiếu nội dung của bài làm.</p>;
  const stimulus=exam.groups.find(g=>g.id===q.groupId);
  async function save(action:'answer'|'flag'|'finish',payload:object) {
    setBusy(true);setError('');
    try {
      if (action==='finish') setExam(await api<ExamState>('/exam/'+id+'/finish',json('POST',{})));
      else {
        await api('/exam/'+id+'/'+action,json('POST',payload));
        if (action==='answer') setExam(prev=>({...prev,answers:{...prev.answers,[q.id]:(payload as {selected:number}).selected}}));
        else setExam(prev=>({...prev,flags:prev.flags.includes(q.id)?prev.flags.filter(id=>id!==q.id):[...prev.flags,q.id]}));
      }
    } catch(error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <><Back to={timed?'/exams':'/practice'}>Quay lại</Back>
    <div className="section-head"><h1>{modes[exam.mode]}</h1>{timed && <Label tone="gold"><Clock3 size={16} /> {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</Label>}</div>
    <div className="detail-grid exam-player">
      <section className="card panel">
        {stimulus && <Stimulus key={stimulus.id} group={stimulus} />}
        <div className="section-head"><Label>Part {q.part} · Câu {index+1} / {exam.questions.length}</Label><Label tone="gold">{difficultyLabels[q.difficulty]}</Label></div>
        <h2 lang="en">{q.prompt}</h2>
        {q.part<=2 && <p>Chọn ký hiệu tương ứng với đáp án đã nghe.</p>}
        <Options options={q.options} selected={exam.answers[q.id]} onSelect={selected=>save('answer',{questionId:q.id,selected})} disabled={busy || remaining===0} />
        <p role="status">{busy ? 'Đang lưu…' : exam.answers[q.id]===undefined ? '' : 'Đã lưu lựa chọn'}</p>
        <div className="actions"><button className="btn" aria-pressed={exam.flags.includes(q.id)} disabled={busy || remaining===0} onClick={()=>save('flag',{questionId:q.id,flag:!exam.flags.includes(q.id)})}><Flag size={16} /> Đánh dấu</button>
          <button className="btn" disabled={busy || index===0} onClick={()=>setIndex(index-1)}>Câu trước</button>
          <button className="btn" disabled={busy || index===exam.questions.length-1} onClick={()=>setIndex(index+1)}>Câu sau</button></div>
      </section>
      <aside className="card panel"><h2>Điều hướng câu hỏi</h2>
        <p>{Object.keys(exam.answers).length} / {exam.questions.length} đã trả lời</p>
        <div className="number-grid">{exam.questions.map((q,i)=><button className={'btn number'+(exam.answers[q.id]!==undefined?' answered':'')} aria-label={'Câu '+(i+1)+(exam.flags.includes(q.id)?', đã đánh dấu':'')} aria-current={i===index?'step':undefined} disabled={busy} key={q.id} onClick={()=>setIndex(i)}>{i+1}{exam.flags.includes(q.id)&&<Flag size={10} />}</button>)}</div>
        {confirm ? <div className="notice"><p>Nộp {Object.keys(exam.answers).length} câu đã trả lời?</p><div className="actions"><button className="btn primary" disabled={busy} onClick={()=>save('finish',{})}>Xác nhận nộp</button><button className="btn" onClick={()=>setConfirm(false)}>Tiếp tục làm</button></div></div> :
          <button className="btn primary" disabled={busy} onClick={()=>setConfirm(true)}>Nộp bài</button>}
        {error && <p role="alert">{error}</p>}
      </aside>
    </div>
  </>;
}
