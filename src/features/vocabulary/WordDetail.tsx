import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Provenance, Sense, Word } from '../../../packages/shared/content';
import { studyListIds,studyListLabels } from '../../../packages/shared/study-lists';
import type { Rating } from '../../../packages/shared/progress';
import { api, json } from '../../shared/api';
import { Back, Label, Loading, SourceCredit, statusLabels } from '../../shared/components';
import { PersonalStudy } from '../../shared/PersonalStudy';
import { useResource } from '../../shared/resource';
import { Speak } from './Pronunciation';

export function WordDetail() {
  const {id} = useParams();
  const result = useResource<Word>('/vocab/' + id);
  const provenance = useResource<Provenance[]>('/sources');
  const [language,setLanguage] = useState('all');
  const word = result.data;
  if (!word) return <Loading error={result.error} />;
  const sources = new Map(provenance.data?.map(source=>[source.id,source]));
  const visible = word.senses.filter(s=>language==='all' || (language==='vi' ? Boolean(s.vi) : Boolean(s.en)));
  return <>
    <Back to="/vocabulary">Thư viện từ vựng</Back>
    <section className="vocab-hero"><div><div className="eyebrow">Từ điển</div><h1 lang="en">{word.lemma}</h1><Speak key={word.id} word={word} /></div><Label tone="mint">{word.senses.length} mục nghĩa</Label></section>
    <div className="fields filterbar"><label>Loại chú giải<select value={language} onChange={e=>setLanguage(e.target.value)}>
      <option value="all">Tất cả</option><option value="vi">Có nghĩa tiếng Việt</option><option value="en">Có định nghĩa tiếng Anh</option>
    </select></label></div>
    <div className="detail-grid"><div>{[...new Set(visible.map(s=>s.pos))].map(pos=><SenseGroup key={pos} pos={pos} senses={visible.filter(s=>s.pos===pos)} sources={sources} />)}
      {!visible.length && <p className="notice">Chưa có chú giải trong nhóm đã chọn.</p>}</div>
    <aside><section className="card panel"><h2>Họ từ và biến thể</h2>{word.family.length > 0 && <p lang="en">{word.family.join(' · ')}</p>}{word.forms.length > 0 && <p lang="en">{word.forms.join(' · ')}</p>}{!word.family.length && !word.forms.length && <p>Chưa có dữ liệu.</p>}
      {studyListIds.map(list=>word.studyLists?.[list] && <div key={list}><p>{studyListLabels[list]} · hạng {word.studyLists[list]}</p><SourceCredit source={sources.get(list+'-1.2')}/></div>)}
      <SourceCredit source={sources.get(word.sourceId)} /></section><PersonalStudy id={word.id} /></aside></div>
  </>;
}

function SenseGroup({pos,senses,sources}: {pos:string;senses:Sense[];sources:Map<string,Provenance>}) {
  const [limit,setLimit] = useState(12);
  const target = senses.findIndex(s=>'#'+s.id===location.hash);
  const count = Math.max(limit,target+1);
  return <section className="card panel"><h2 lang="en">{pos}</h2>
    {senses.slice(0,count).map(s=><SenseDetail key={s.id} sense={s} source={sources.get(s.sourceId)}/>)}
    {count<senses.length && <button className="btn" onClick={()=>setLimit(count+12)}>Xem thêm ({senses.length-count})</button>}
  </section>;
}

function SenseDetail({sense,source}: {sense:Sense;source?:Provenance}) {
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function review(rating:Rating) {
    setBusy(true);
    try { const result = await api<{due:string}>('/review/' + sense.id,json('POST',{rating})); setMessage('Ôn lại ' + new Date(result.due).toLocaleString('vi-VN')); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <article id={sense.id} className="sense"><div className="inline"><Label>{statusLabels[sense.status]}</Label>{sense.priority && <Label tone="mint">Trọng tâm TOEIC</Label>}{sense.glossaryOnly && <Label tone="mint">Từ điển Anh–Việt</Label>}<span>{sense.domain}</span></div>
    <h3>{sense.vi ?? 'Thiếu bản dịch'}</h3>{sense.en && <p lang="en">{sense.en}</p>}
    {sense.examples.map(example=><div className="example" key={example.en}><strong lang="en">{example.en}</strong><p>{example.vi}</p></div>)}
    {sense.sourceExamples.length > 0 && <details><summary>Ví dụ tiếng Anh từ nguồn</summary><ul>{sense.sourceExamples.map((en,i)=><li key={i} lang="en">{en}</li>)}</ul></details>}
    {sense.collocations.length > 0 && <p className="colloc" lang="en">{sense.collocations.join(' · ')}</p>}
    {sense.status !== 'draft' && <div className="actions"><button className="btn" disabled={busy} onClick={()=>review(1)}>Cần ôn lại</button><button className="btn" disabled={busy} onClick={()=>review(3)}>Đã nhớ</button><small role="status">{message}</small></div>}
    <SourceCredit source={source} />
  </article>;
}
