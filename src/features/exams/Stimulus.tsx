import type { Media } from '../../../packages/shared/content';
import type { PublicGroup } from '../../../packages/shared/exam';
import { SourceLine } from '../../shared/components';
import { useResource } from '../../shared/resource';

export function Stimulus({group}: {group:PublicGroup & {transcript?:string}}) {
  const asset=useResource<Media>(group.audioId ? '/media-info/'+group.audioId : '');
  const settings=useResource<{rate:number}>('/settings');
  return <div className="stimulus">
    {group.imageId && <img src={'/media/'+group.imageId} alt="Ảnh tình huống của câu hỏi" />}
    {group.audioId && <><audio controls preload="metadata" src={'/media/'+group.audioId} onLoadedMetadata={e=>{e.currentTarget.playbackRate=settings.data?.rate ?? 1;}} aria-label="Đoạn nghe" />
      {asset.data && <small className="source-line">{asset.data.synthetic ? 'Giọng máy · audio luyện nghe offline' : 'Bản thu luyện nghe'}<SourceLine id={asset.data.sourceId} /></small>}</>}
    {group.passages.map(p=><section key={p.title} className="example" lang="en"><h3>{p.title}</h3><p className="passage">{p.text}</p></section>)}
    {group.transcript && <details><summary>Kịch bản nghe</summary><p className="passage" lang="en">{group.transcript}</p></details>}
  </div>;
}
