import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Layers3, RotateCcw, Search } from 'lucide-react';
import type { Word } from '../../../packages/shared/content';
import { studyListIds,studyListLabels } from '../../../packages/shared/study-lists';
import { Label, Loading, statusLabels } from '../../shared/components';
import { useResource } from '../../shared/resource';
import { Flashcards } from './Flashcards';

type WordList = {items:(Word & {reviewed:number;due:number})[];total:number};
export function Vocabulary() {
  const [params,setParams] = useSearchParams();
  const flash = params.get('mode') === 'flash';
  const page = Number(params.get('page') ?? 1);
  const filters = useResource<{domains:string[];pos:string[]}>('/vocab-filters');
  const query = new URLSearchParams(params);
  query.delete('mode');
  const list = useResource<WordList>(flash ? '' : '/vocab?' + query.toString());
  function set(key:string,value:string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key,value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next,{replace:true});
  }
  return <>
    <section className="vocab-hero"><div><div className="eyebrow">Vocabulary Studio</div><h1>Từ vựng trong ngữ cảnh</h1><p>Khám phá từng nghĩa, nghe phát âm và ôn theo lịch cá nhân.</p></div><div className="vocab-art" aria-hidden="true"><span>noun</span><span>Aa</span><span>verb</span></div></section>
    <div className="section-head"><h2>{flash ? 'Học bằng Flashcard' : 'Thư viện từ vựng'}</h2><div className="segmented" aria-label="Chế độ từ vựng">
      <button type="button" aria-pressed={!flash} onClick={()=>set('mode','')}><Layers3 size={16} /> Danh sách</button>
      <button type="button" aria-pressed={flash} onClick={()=>set('mode','flash')}><RotateCcw size={16} /> Flashcard</button>
    </div></div>
    {flash ? <Flashcards collection={params.get('collection') ?? ''} setCollection={value=>set('collection',value)} /> : <section className="card collection">
      <div className="fields filterbar">
        <label className="filter-search">Tìm từ, nghĩa hoặc cụm từ<div className="input-icon"><Search size={17} /><input value={params.get('q') ?? ''} placeholder="Ví dụ: hạn chót" onChange={e=>set('q',e.target.value)} /></div></label>
        <label>Chủ đề<select value={params.get('domain') ?? ''} onChange={e=>set('domain',e.target.value)}><option value="">Tất cả</option>{filters.data?.domains.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Bộ từ<select value={params.get('collection') ?? ''} onChange={e=>set('collection',e.target.value)}><option value="">Tất cả</option>{studyListIds.map(id=><option key={id} value={id}>{studyListLabels[id]}</option>)}</select></label>
        <label>Từ loại<select value={params.get('pos') ?? ''} onChange={e=>set('pos',e.target.value)}><option value="">Tất cả</option>{filters.data?.pos.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Kiểm duyệt<select value={params.get('status') ?? ''} onChange={e=>set('status',e.target.value)}><option value="">Tất cả</option>{Object.entries(statusLabels).filter(([k])=>k!=='retired').map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label>Trạng thái ôn<select value={params.get('study') ?? ''} onChange={e=>set('study',e.target.value)}><option value="">Tất cả</option><option value="new">Có nghĩa chưa ôn</option><option value="due">Có nghĩa đến hạn</option><option value="reviewed">Có nghĩa đã ôn</option></select></label>
        <label>Sắp xếp<select value={params.get('sort') ?? 'asc'} onChange={e=>set('sort',e.target.value)}><option value="asc">A → Z</option><option value="desc">Z → A</option><option value="topic">Chủ đề</option><option value="frequency">Xếp hạng tần suất</option></select></label>
        <label className="inline"><input type="checkbox" checked={params.get('priority')==='true'} onChange={e=>set('priority',e.target.checked?'true':'')}/> Trọng tâm TOEIC</label>
      </div>
      {!list.data ? <div className="panel"><Loading error={list.error} /></div> : <>
        <p className="collection-count"><strong>{list.data.total}</strong> mục từ</p>
        <div className="table-wrap"><table className="vocab-table"><thead><tr><th>Mục từ</th><th>Nghĩa tiêu biểu</th><th>Chủ đề</th><th>Tiến độ ôn</th></tr></thead>
          <tbody>{list.data.items.map(word=><tr key={word.id}><td><Link className="word-name" to={'/vocabulary/' + word.id}><span>{word.lemma[0].toUpperCase()}</span><div><strong>{word.lemma}</strong><small>{[...new Set(word.senses.map(s=>s.pos))].join(' · ')}</small></div></Link></td>
          <td>{word.senses.slice(0,2).map(s=><div key={s.id} lang={s.vi ? 'vi':'en'}>{s.vi || s.en}</div>)}</td><td><Label tone="mint">{word.senses[0]?.domain}</Label></td><td>{word.reviewed}/{word.senses.length} đã ôn{word.due>0 && <><br/><Label tone="gold">{word.due} đến hạn</Label></>}</td></tr>)}</tbody></table></div>
        {list.data.total === 0 && <p className="panel">Không tìm thấy mục từ phù hợp.</p>}
        <div className="pager"><button className="btn" disabled={page<=1} onClick={()=>set('page',String(page-1))}><ArrowLeft size={16} /> Trước</button><span>Trang {page} / {Math.max(1,Math.ceil(list.data.total/12))}</span><button className="btn" disabled={page*12>=list.data.total} onClick={()=>set('page',String(page+1))}>Sau <ArrowRight size={16} /></button></div>
      </>}
    </section>}
  </>;
}
