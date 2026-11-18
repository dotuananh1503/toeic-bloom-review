import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import type { StudyEvent } from '../../packages/shared/progress';
import { api, json } from './api';
import { Loading } from './components';
import { useResource } from './resource';

type Study = { notes: (StudyEvent & {type:'note'})[]; bookmarked:boolean; done:boolean };
export function PersonalStudy({id, lesson}: {id:string;lesson?:boolean}) {
  const study = useResource<Study>('/study/' + id);
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!study.data) return <Loading error={study.error} />;
  const data = study.data;
  async function save(type: string, payload: object) {
    setError(''); setBusy(true);
    try { await api('/study/' + id,json('POST',{type,payload})); study.refresh(); if (type === 'note') setDraft(undefined); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="card panel">
    <h2>Học tập cá nhân</h2><div className="actions">
      <button className="btn" aria-pressed={data.bookmarked} disabled={busy} onClick={()=>save('bookmark',{active:!data.bookmarked})}><Bookmark size={16} /> {data.bookmarked ? 'Đã lưu' : 'Lưu nội dung'}</button>
      {lesson && <button className="btn" aria-pressed={data.done} disabled={busy} onClick={()=>save('lesson',{done:!data.done})}>{data.done ? 'Đã học' : 'Đánh dấu đã học'}</button>}
    </div>
    {data.notes.length > 1 && <div className="notice"><strong>Có nhiều phiên bản ghi chú</strong>{data.notes.map(n=><div key={n.event_id}><p>{n.payload.text}</p><button className="btn" onClick={()=>setDraft(n.payload.text)}>Dùng phiên bản này</button></div>)}</div>}
    <form className="stack" onSubmit={e=>{e.preventDefault();save('note',{text:draft ?? data.notes[0]?.payload.text ?? '',parents:data.notes.map(n=>n.event_id)});}}>
      <label>Ghi chú<textarea rows={3} value={draft ?? data.notes[0]?.payload.text ?? ''} onChange={e=>setDraft(e.target.value)} /></label>
      <button className="btn" disabled={busy}>{data.notes.length > 1 ? 'Hợp nhất ghi chú' : 'Lưu ghi chú'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
  </section>;
}
