import { Bot, LockKeyhole, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Label, Loading } from '../../shared/components';
import { useResource } from '../../shared/resource';

type TutorStatus={connected:false;available:false;reason:string;usage:string};
export function AiTutor() {
  const data=useResource<TutorStatus>('/ai/status');
  return <>
    <header className="page-head"><h1>AI Tutor</h1><p>Trợ giúp tùy chọn khi bạn chủ động hỏi về một bài, từ hoặc câu sai.</p></header>
    <section className="card panel tutor-panel">
      <div className="tile-icon"><Bot size={23}/></div>
      <div><h2>Sign in with ChatGPT</h2>
        {data.data ? <><Label tone="gold">Chưa kết nối</Label><p>{data.data.reason}</p></> : <Loading error={data.error}/>}
      </div>
      <button className="btn primary" disabled>Continue with ChatGPT</button>
    </section>
    <div className="settings-grid">
      <section className="card panel"><h2><Sparkles size={19} /> Hỏi AI</h2><p>Kết nối đã xác thực là điều kiện để gửi câu hỏi.</p><button className="btn" disabled>Gửi câu hỏi</button></section>
      <section className="card panel"><h2><LockKeyhole size={18} /> Dữ liệu học</h2><p>Bài học, lời giải và thống kê tiếp tục có sẵn trên thiết bị.</p><Link to="/practice">Xem bài luyện</Link></section>
    </div>
  </>;
}
