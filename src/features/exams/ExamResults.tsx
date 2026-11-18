import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { ExamState, ReviewItem } from '../../../packages/shared/exam';
import { Back, Label, Loading, statusLabels } from '../../shared/components';
import { difficultyLabels, Explanation } from '../../shared/questions/QuestionFeedback';
import { useResource } from '../../shared/resource';
import { modes } from './modes';
import { Stimulus } from './Stimulus';

export function Results({exam}: {exam:ExamState}) {
  const result=exam.result!;
  const [wrong,setWrong]=useState(false);
  return <><Back to="/exams">Danh sách bài thi</Back><header className="page-head"><h1>Kết quả bài làm</h1><p>{modes[exam.mode]}</p></header>
    <section className="hero score"><div><Label><CheckCircle2 size={17} /> Điểm thô</Label><h2>{result.score} / {result.total}</h2><p>{Math.round(result.score/result.total*100)}% câu đúng</p></div></section>
    <div className="fields filterbar"><label className="inline"><input type="checkbox" checked={wrong} onChange={e=>setWrong(e.target.checked)}/> Chỉ câu sai hoặc bỏ trống</label><Link to="/mistakes">Sổ lỗi sai</Link></div>
    {result.items.filter(q=>!wrong || q.selected!==q.answer).map(q=><Review key={q.id} item={q} />)}
  </>;
}
function Review({item}: {item:ReviewItem}) {
  return <article className="card panel"><div className="inline"><Label>Part {item.part}</Label><Label>{difficultyLabels[item.difficulty]}</Label><Label tone="gold">{statusLabels[item.status]}</Label></div>
    <h3 lang="en">{item.prompt}</h3>{item.group && <details><summary>Xem ngữ liệu</summary><Stimulus group={item.group}/></details>}
    <p>{item.selected===null ? 'Bỏ trống' : 'Đã chọn ' + 'ABCD'[item.selected] + ' · '+item.options[item.selected]}</p>
    <Explanation feedback={{...item,correct:item.selected===item.answer}} />
    <div className="actions">{item.grammarLinks.map(x=><Link to={'/grammar/'+x.lessonId+'#'+x.caseId} key={x.caseId}>Ôn cách dùng ngữ pháp</Link>)}{item.wordLinks.map(x=><Link to={'/vocabulary/'+x.wordId+'#'+x.senseId} key={x.senseId}>Ôn nghĩa từ</Link>)}</div>
  </article>;
}
export function Mistakes() {
  const result=useResource<ReviewItem[]>('/mistakes');
  return <><Back to="/practice">Luyện tập</Back><header className="page-head"><h1>Sổ lỗi sai</h1></header>
    {!result.data ? <Loading error={result.error} /> : result.data.length ? result.data.map(q=><Review key={q.id} item={q}/>) : <p className="notice">Chưa ghi nhận câu trả lời sai.</p>}</>;
}
