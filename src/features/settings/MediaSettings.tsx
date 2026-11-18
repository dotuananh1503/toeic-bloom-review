import { useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../../shared/api';
import type { Media, Word } from '../../../packages/shared/content';
import { useResource } from '../../shared/resource';

export function MediaSettings() {
  const [usage,setUsage]=useState<Media['usage']>('vocabulary');
  const [file,setFile]=useState<File>();
  const [targetId,setTarget]=useState('');
  const [accent,setAccent]=useState<Media['accent']>('en-US');
  const [license,setLicense]=useState('Own recording (permission confirmed)');
  const [source,setSource]=useState('');
  const [credit,setCredit]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const words=useResource<{items:Word[]}>('/vocab?limit=100');
  const groups=useResource<{id:string;title:string;part:number}[]>('/media-targets');
  async function upload() {
    if (!file || !targetId || !confirm) return;
    setBusy(true);setStatus('');
    const assetKey=crypto.randomUUID();
    const meta={id:'local:'+assetKey,usage,accent:usage==='vocabulary'?accent:undefined,targetId,
      source:{id:'source:'+assetKey,name:source,url:'urn:toeic-bloom:user-recording',version:'1',license,attribution:credit}};
    try {
      await api('/media',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Bloom-Media':encodeURIComponent(JSON.stringify(meta))},body:file});
      setStatus('Đã cài tệp và liên kết vào nội dung.');
    } catch (error) { setStatus((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="card panel"><h2><Upload size={18}/> Cài media cục bộ</h2>
    <form className="stack" onSubmit={e=>{e.preventDefault();void upload();}}>
      <div className="fields">
        <label>Mục đích<select value={usage} onChange={e=>{setUsage(e.target.value as Media['usage']);setTarget('');}}>
          <option value="vocabulary">Phát âm từ vựng</option><option value="listening">Bài nghe</option><option value="scene">Ảnh Part 1</option>
        </select></label>
        <label>Nội dung<select value={targetId} onChange={e=>setTarget(e.target.value)} required><option value="">Chọn nội dung</option>
          {usage==='vocabulary' ? words.data?.items.map(w=><option key={w.id} value={w.id}>{w.lemma}</option>) :
            groups.data?.filter(g=>usage==='listening' || g.part===1).map(g=><option key={g.id} value={g.id}>Part {g.part} · {g.title}</option>)}</select></label>
        {usage==='vocabulary' && <label>Giọng<select value={accent} onChange={e=>setAccent(e.target.value as Media['accent'])}><option value="en-US">US</option><option value="en-GB">UK</option></select></label>}
        <label>Tệp tối đa 32 MiB<input type="file" accept={usage==='scene'?'image/png,image/jpeg,image/webp':'audio/wav,audio/mpeg,audio/ogg'} required onChange={e=>setFile(e.target.files?.[0])}/></label>
      </div>
      <div className="fields"><label>Giấy phép<select value={license} onChange={e=>setLicense(e.target.value)}>{['Own recording (permission confirmed)','CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','Public Domain'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Tên nguồn<input value={source} onChange={e=>setSource(e.target.value)} required maxLength={150}/></label>
        <label>Ghi công và thông tin quyền<input value={credit} onChange={e=>setCredit(e.target.value)} required maxLength={300}/></label></div>
      <label className="inline"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)} required /> Tôi có quyền sử dụng và chuyển kèm tệp trong ZIP cá nhân.</label>
      <button className="btn" disabled={busy || !file || !confirm}>Cài media</button>
    </form>
    <p role="status">{status}</p>
  </section>;
}
