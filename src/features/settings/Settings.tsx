import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { api, json } from '../../shared/api';
import { PageHead } from '../../shared/components';
import { BackupSettings } from './BackupSettings';
import { MediaSettings } from './MediaSettings';

type SettingsValue = { accent: 'en-US' | 'en-GB'; rate: number; localVoice: boolean; studyGoal: number };
export function Settings() {
  const [value, setValue] = useState<SettingsValue>();
  const [message, setMessage] = useState('');
  useEffect(() => { api<SettingsValue>('/settings').then(setValue).catch(error => setMessage(error.message)); }, []);
  return <><PageHead title="Cài đặt" /><section className="card panel">
    <h2><Headphones size={19} /> Âm thanh và học tập</h2>
    {value && <form className="fields" onSubmit={async event => {
      event.preventDefault();
      try { setValue(await api('/settings', json('PUT', value))); setMessage('Đã lưu trên thiết bị.'); }
      catch (error) { setMessage((error as Error).message); }
    }}>
      <label>Giọng phát âm<select value={value.accent} onChange={e => setValue({ ...value, accent: e.target.value as SettingsValue['accent'] })}><option value="en-US">US</option><option value="en-GB">UK</option></select></label>
      <label>Tốc độ<input type="number" min=".65" max="1.5" step=".05" value={value.rate} onChange={e => setValue({ ...value, rate: e.target.valueAsNumber })} required /></label>
      <label>Mục tiêu số lượt ôn / ngày<input type="number" min="1" max="100" value={value.studyGoal} onChange={e => setValue({ ...value, studyGoal: e.target.valueAsNumber })} required /></label>
      <label className="inline"><input type="checkbox" checked={value.localVoice} onChange={e => setValue({ ...value, localVoice: e.target.checked })} /> Cho phép giọng máy cục bộ khi thiếu bản thu</label>
      <button className="btn primary">Lưu cài đặt</button>
    </form>}
    <p role="status">{message}</p>
  </section><BackupSettings /><MediaSettings /><section className="card panel"><h2>AI Tutor</h2><Link to="/ai">Trạng thái kết nối ChatGPT</Link></section></>;
}
