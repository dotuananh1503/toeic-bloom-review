import { useState } from 'react';
import { Download, HardDrive, Upload } from 'lucide-react';
import type { BackupType,MergePreview } from '../../../packages/shared/backup';
import { api } from '../../shared/api';
import { useResource } from '../../shared/resource';

const backupLabels={full:'Full Backup',content:'Content Update',progress:'Progress Transfer'};
type Audit={id:string;added_at:string;kind:BackupType;details:Pick<MergePreview,'content'|'progress'|'restorePoint'>};
export function BackupSettings() {
  const [type,setType]=useState<BackupType>('full');
  const [since,setSince]=useState('');
  const [file,setFile]=useState<File>();
  const [reviewed,setReviewed]=useState(false);
  const [report,setReport]=useState<MergePreview>();
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState(false);
  const audit=useResource<Audit[]>('/backup/audit');

  async function download() {
    setPending(true);setMessage('');setError(false);
    try {
      const result=await fetch('/api/backup/export',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type,since:type==='content' && since ? new Date(since).toISOString():undefined})});
      if (!result.ok) throw new Error((await result.json()).error);
      const url=URL.createObjectURL(await result.blob());
      const link=document.createElement('a');
      link.href=url;link.download='toeic-bloom-'+type+'-'+new Date().toISOString().slice(0,10)+'.zip';
      link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('Đã tạo gói '+backupLabels[type]+'.');
    } catch (error) {setError(true);setMessage((error as Error).message);}
    finally {setPending(false);}
  }
  async function importZip(merge=false) {
    if (!file) return;
    setPending(true);setMessage('');setError(false);
    try {
      const headers:Record<string,string>={'Content-Type':'application/zip','X-Bloom-Prefer-Reviewed':String(reviewed)};
      if (merge && report?.receipt) headers['X-Bloom-Receipt']=report.receipt;
      setReport(await api<MergePreview>('/backup/import/'+(merge?'merge':'preview'),{method:'POST',headers,body:file}));
      setMessage(merge?'Đã hợp nhất dữ liệu.':'Đã xác minh gói. Dữ liệu đang học chưa thay đổi.');
      if (merge) audit.refresh();
    } catch (error) {setReport(undefined);setError(true);setMessage((error as Error).message);}
    finally {setPending(false);}
  }
  return <section className="card panel"><h2><HardDrive size={18}/> Sao lưu và chuyển dữ liệu</h2>
    <div className="settings-grid">
      <div className="stack"><h3>Xuất ZIP</h3><label>Loại gói<select value={type} onChange={e=>setType(e.target.value as BackupType)}>
        {Object.entries(backupLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select></label>
        {type==='content' && <label>Mốc thay đổi nội dung (tùy chọn)<input type="datetime-local" value={since} onChange={e=>setSince(e.target.value)}/></label>}
        <button className="btn primary" disabled={pending} onClick={download}><Download size={16}/> Tải ZIP</button>
      </div>
      <div className="stack"><h3>Nhập và hợp nhất</h3><label>Tệp ZIP<input type="file" accept=".zip,application/zip" onChange={e=>{setFile(e.target.files?.[0]);setReport(undefined);}} /></label>
        <label className="inline"><input type="checkbox" checked={reviewed} onChange={e=>{setReviewed(e.target.checked);setReport(undefined);}}/> Ưu tiên bản nhập đã kiểm duyệt khi xung đột cùng revision</label>
        <div className="actions"><button className="btn" disabled={!file || pending} onClick={()=>importZip()}><Upload size={16}/> Xem trước</button>
          {report?.receipt && <button className="btn primary" disabled={pending} onClick={()=>importZip(true)}>Xác nhận hợp nhất</button>}</div>
      </div>
    </div>
    {message && <p role={error?'alert':'status'} className={'notice'+(error?' warn':'')}>{message}</p>}
    {report && <div className="notice"><strong>{backupLabels[report.manifest.backup_type]}</strong>
      <p>Thiết bị nguồn {report.manifest.source_device_id} · {new Date(report.manifest.created_utc).toLocaleString('vi-VN')}</p>
      <p>Nội dung: {report.content.added} thêm · {report.content.updated} sửa · {report.content.duplicate} trùng · {report.content.conflicts} xung đột</p>
      <p>Tiến độ: {report.progress.added} sự kiện mới · {report.progress.duplicate} trùng · {report.noteConflicts} mục có ghi chú xung đột</p>
      {report.warnings.length>0 && <ul>{report.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
      {report.restorePoint && <p>Điểm khôi phục trong thư mục backups: {report.restorePoint}</p>}
    </div>}
    <details><summary>Lịch sử nhập ZIP</summary>
      {audit.data?.length ? <ul>{audit.data.map(a=><li key={a.id}>{new Date(a.added_at).toLocaleString('vi-VN')} · {backupLabels[a.kind]} · {a.details.progress.added} sự kiện mới · {a.details.content.added+a.details.content.updated} thay đổi nội dung</li>)}</ul> : <p>Chưa nhập gói nào.</p>}
    </details>
  </section>;
}
