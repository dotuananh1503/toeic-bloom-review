import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChartNoAxesColumn, ChevronRight, Home, Layers3, Menu, Search, Settings as SettingsIcon, Sparkles, Target, Trophy, X } from 'lucide-react';
import { AiTutor } from '../features/ai/AiTutor';
import { Dashboard, Progress } from '../features/progress/Progress';
import { Settings } from '../features/settings/Settings';
import { MockTests, Practice } from '../features/exams/Exams';
import { ExamPlayer } from '../features/exams/ExamPlayer';
import { Mistakes } from '../features/exams/ExamResults';
import { Grammar } from '../features/grammar/Grammar';
import { GrammarDetail } from '../features/grammar/GrammarDetail';
import { Vocabulary } from '../features/vocabulary/Vocabulary';
import { WordDetail } from '../features/vocabulary/WordDetail';
import { PageHead } from '../shared/components';

export const links = [
  ['/', 'Tổng quan', Home], ['/grammar', 'Ngữ pháp', BookOpen], ['/vocabulary', 'Từ vựng', Layers3],
  ['/practice', 'Luyện tập', Target], ['/exams', 'Thi thử TOEIC', Trophy], ['/progress', 'Tiến độ', ChartNoAxesColumn],
  ['/ai', 'AI Tutor', Sparkles], ['/settings', 'Cài đặt', SettingsIcon],
] as const;

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const menuButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if (!menu) return;
    document.querySelector<HTMLElement>('.sidebar a[aria-current=page],.sidebar nav a')?.focus();
    function escape(e:KeyboardEvent) {
      if (e.key==='Escape') {setMenu(false);menuButton.current?.focus();}
    }
    window.addEventListener('keydown',escape);
    return ()=>window.removeEventListener('keydown',escape);
  },[menu]);
  useEffect(()=>{ if (!location.hash) window.scrollTo(0,0); },[location.pathname,location.hash]);
  const item = links.find(([path]) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  return <div className="app">
    <a className="skip" href="#main">Đến nội dung</a>
    {menu && <button className="overlay" aria-label="Đóng menu" onClick={() => {setMenu(false);menuButton.current?.focus();}} />}
    <aside className={'sidebar' + (menu ? ' shown' : '')} id="sidebar">
      <Link className="brand" to="/" onClick={() => setMenu(false)}><i><Sparkles size={22} /></i><div><strong>TOEIC Bloom<span>.</span></strong><small>LISTENING & READING</small></div></Link>
      <nav aria-label="Điều hướng chính">{links.map(([path, label, Icon]) => <NavLink key={path} end={path === '/'} onClick={() => setMenu(false)} to={path}><Icon size={19} />{label}</NavLink>)}</nav>
      <div className="side-bottom"><Target size={16} /><span>Mục tiêu TOEIC<strong>700–800</strong></span></div>
    </aside>
    <div className="main">
      <header className="topbar">
        <div className="crumb"><button className="iconbtn mobile" ref={menuButton} aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu} aria-controls="sidebar" onClick={() => setMenu(!menu)}>{menu ? <X size={19} /> : <Menu size={19} />}</button><span>TOEIC Bloom</span><ChevronRight size={14} /><strong>{item?.[1]}</strong></div>
        <form className="global-search" onSubmit={e => { e.preventDefault(); navigate('/vocabulary?q=' + encodeURIComponent(query)); }}><Search size={16} /><input aria-label="Tìm từ vựng" placeholder="Tìm từ vựng…" value={query} onChange={e => setQuery(e.target.value)} /></form>
      </header>
      <main id="main" tabIndex={-1} className="content" key={location.pathname}>
        <Routes><Route path="/" element={<Dashboard />} /><Route path="/settings" element={<Settings />} />
          <Route path="/vocabulary" element={<Vocabulary />} /><Route path="/vocabulary/:id" element={<WordDetail />} />
          <Route path="/grammar" element={<Grammar />} /><Route path="/grammar/:id" element={<GrammarDetail />} />
          <Route path="/practice" element={<Practice />} /><Route path="/exams" element={<MockTests />} /><Route path="/exams/:id" element={<ExamPlayer />} /><Route path="/mistakes" element={<Mistakes />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/ai" element={<AiTutor />} />
          <Route path="*" element={<PageHead title="Không tìm thấy trang"><Link to="/">Về tổng quan</Link></PageHead>} />
        </Routes>
      </main>
    </div>
  </div>;
}
