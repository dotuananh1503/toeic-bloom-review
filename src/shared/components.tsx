import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, LoaderCircle } from 'lucide-react';
import type { Provenance, Status } from '../../packages/shared/content';
import { useResource } from './resource';

export function Loading({error}: {error?:string}) {
  return error ? <p className="notice warn" role="alert">{error}</p> : <p role="status" className="inline"><LoaderCircle size={15} /> Đang đọc dữ liệu…</p>;
}
export const statusLabels: Record<Status,string> = {
  draft:'Bản nháp',needs_translation:'Thiếu bản dịch',needs_review:'Chờ kiểm duyệt',reviewed:'Đã kiểm duyệt',published_reviewed:'Đã kiểm duyệt',retired:'Đã lưu trữ',
};
export function Label({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={'tag ' + tone}>{children}</span>; }
export function Back({to,children}: {to:string;children:ReactNode}) { return <Link className="inline back" to={to}><ChevronLeft size={17} /> {children}</Link>; }
export function SourceLine({id}: {id:string}) {
  const sources = useResource<Provenance[]>('/sources');
  return <SourceCredit source={sources.data?.find(s=>s.id===id)} />;
}
export function SourceCredit({source}: {source?:Provenance}) {
  if (!source) return null;
  return <small className="source-line">{source.attribution} · {source.license} · {source.version}
    {source.url.startsWith('https://') && <> · <a href={source.url} target="_blank" rel="noreferrer">Nguồn</a></>}</small>;
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="page-head"><h1>{title}</h1>{children && <p>{children}</p>}</header>;
}
