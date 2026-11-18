import { useState } from 'react';
import { PenLine } from 'lucide-react';
import type { PublicQuestion } from '../../../packages/shared/content';
import { api, json } from '../../shared/api';
import { Loading } from '../../shared/components';
import { Explanation, Options, type Feedback } from '../../shared/questions/QuestionFeedback';
import { useResource } from '../../shared/resource';

export function Exercise({id}: {id:string}) {
  const q = useResource<PublicQuestion>('/exercise/' + id);
  const [selected,setSelected] = useState<number>();
  const [feedback,setFeedback] = useState<Feedback>();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  if (!q.data) return <Loading error={q.error} />;
  const question = q.data;
  async function submit() {
    setBusy(true);
    try { setFeedback(await api('/exercise/' + id,json('POST',{selected}))); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="exercise"><h3><PenLine size={16} /> Luyện cách dùng này</h3><p lang="en">{question.prompt}</p>
    <Options options={question.options} selected={selected} onSelect={setSelected} disabled={busy || Boolean(feedback)} answer={feedback?.answer} />
    {feedback ? <><Explanation feedback={feedback} /><button className="btn" onClick={()=>{setSelected(undefined);setFeedback(undefined);}}>Làm lại</button></> :
      <button className="btn primary" disabled={selected===undefined || busy} onClick={submit}>Kiểm tra đáp án</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
