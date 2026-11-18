import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Layers3, RotateCcw } from 'lucide-react';
import type { Sense, Word } from '../../../packages/shared/content';
import { studyListIds,studyListLabels } from '../../../packages/shared/study-lists';
import type { Rating } from '../../../packages/shared/progress';
import { api, json } from '../../shared/api';
import { Label, Loading } from '../../shared/components';
import { useResource } from '../../shared/resource';
import { Speak } from './Pronunciation';

type Deck = {items:{word:Word;sense:Sense;due?:string}[];total:number};

export function Flashcards({collection,setCollection}: {collection:string;setCollection:(value:string)=>void}) {
  const [priority,setPriority] = useState(false);
  const [due,setDue] = useState(true);
  const [translated,setTranslated] = useState(true);
  const [page,setPage] = useState(1);
  const [index,setIndex] = useState(0);
  const [flipped,setFlipped] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const deck = useResource<Deck>('/review?priority=' + priority + '&due=' + due + '&translated=' + translated + '&page=' + page
    + (collection ? '&collection='+encodeURIComponent(collection) : ''));
  const activeIndex = Math.min(index,Math.max(0,(deck.data?.items.length ?? 1)-1));
  const active = deck.data?.items[activeIndex];
  useEffect(()=>{
    function key(e:KeyboardEvent) {
      if (e.code !== 'Space' || e.repeat || !(e.target === document.body || e.target === document.querySelector('main'))) return;
      e.preventDefault(); setFlipped(value=>!value);
    }
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[]);
  function move(i:number) { setIndex(i); setFlipped(false); setError(''); }
  async function grade(rating: Rating) {
    if (!active) return;
    setBusy(true); setError('');
    try {
      await api('/review/' + active.sense.id,json('POST',{rating}));
      setFlipped(false);
      if (!due && deck.data) setIndex((activeIndex+1)%deck.data.items.length);
      deck.refresh();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <>
    <div className="fields filterbar">
      <label>Bộ từ<select value={collection} onChange={e=>{setCollection(e.target.value);setPage(1);move(0);}}><option value="">Tất cả</option>{studyListIds.map(id=><option key={id} value={id}>{studyListLabels[id]}</option>)}</select></label>
      <label className="inline"><input type="checkbox" checked={priority} onChange={e=>{setPriority(e.target.checked);setPage(1);move(0);}} /> Chỉ nghĩa trọng tâm TOEIC</label>
      <label className="inline"><input type="checkbox" checked={translated} onChange={e=>{setTranslated(e.target.checked);setPage(1);move(0);}} /> Chỉ nghĩa có bản dịch</label>
      <label className="inline"><input type="checkbox" checked={due} onChange={e=>{setDue(e.target.checked);setPage(1);move(0);}} /> Đến hạn ôn</label>
    </div>
    {!deck.data ? <Loading error={deck.error} /> : !active ? <p className="notice">Không có thẻ trong nhóm đã chọn.</p> : <div className="detail-grid">
      <section><div className="card flashcard">
        <div className="section-head"><Label tone="mint"><Layers3 size={15} /> {active.sense.domain}</Label><small>{(page-1)*30+activeIndex+1} / {deck.data.total}</small></div>
        <button className="flash-stage" onClick={()=>setFlipped(!flipped)} aria-label={flipped?'Hiện mặt trước':'Lật thẻ'}><div key={String(flipped)} className="flash-face">
          <Label>{active.sense.pos}</Label><strong lang={flipped ? 'vi' : 'en'}>{flipped ? active.sense.vi ?? active.sense.en : active.word.lemma}</strong>
          {flipped ? <>{active.sense.en && <span lang="en">{active.sense.en}</span>}<small lang="en">{active.sense.examples[0]?.en}</small><small>{active.sense.examples[0]?.vi}</small></> : <span>Nhớ nghĩa rồi lật thẻ</span>}
        </div></button>
        <div className="pager"><Speak key={active.word.id} word={active.word} /><button className="btn" onClick={()=>setFlipped(!flipped)}><RotateCcw size={16} /> {flipped ? 'Mặt trước' : 'Lật thẻ'}</button></div>
      </div>
      <div className="actions flash-nav"><button className="btn" disabled={activeIndex===0} onClick={()=>move(activeIndex-1)}><ArrowLeft size={15}/> Thẻ trước</button><button className="btn" disabled={activeIndex>=deck.data.items.length-1} onClick={()=>move(activeIndex+1)}>Thẻ sau <ArrowRight size={15}/></button></div>
      <div className="grade">{([[1,'Cần ôn lại'],[2,'Khó'],[3,'Đã nhớ'],[4,'Dễ']] as const).map(([value,label])=><button key={value} className="btn" disabled={!flipped || busy} onClick={()=>grade(value)}>{label}</button>)}</div>
      {error && <p role="alert">{error}</p>}
      </section><aside className="card panel"><h2>Thẻ trong bộ ôn</h2>
        <ul className="deck">{deck.data.items.map(({word,sense},i)=><li key={sense.id}><button aria-pressed={sense.id===active.sense.id} className="btn" onClick={()=>move(i)}><BookOpen size={15} /> {word.lemma} · {sense.pos}</button></li>)}</ul>
        <div className="actions"><button className="btn" disabled={page<=1} onClick={()=>{setPage(page-1);move(0);}}>Trang trước</button><button className="btn" disabled={page*30>=deck.data.total} onClick={()=>{setPage(page+1);move(0);}}>Trang sau</button></div>
      </aside>
    </div>}
  </>;
}
