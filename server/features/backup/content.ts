import { existsSync,readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { grammarCase, group, id, lesson, lexemeData, media, provenance, question, senseData, senseInput } from '../../../packages/shared/content';
import type { Changes } from '../../../packages/shared/backup';
import type { Sqlite, Store } from '../../core/db';
import { hash, refreshWordSearch, wordId } from '../content/knowledge';
import { assetPath, safeRelative } from '../media/paths';
import { inspectMedia } from '../media/media';

const base=z.object({id,revision:z.number().int().positive(),updated_at:z.string().min(10).max(40)});
const text=z.string().max(50000);
const data=base.extend({data:z.string().max(2_000_000)});
export const tableSchemas={
  sources:base.extend({name:text,url:text,version:text,license:text,attribution:text,sha256:z.string().nullable()}),
  lexemes:data.extend({lemma:text,normalized:text,source_id:id}),
  senses:data.extend({lexeme_id:id,pos:text,English:text,Vietnamese:text.nullable(),domain:text,priority:z.union([z.literal(0),z.literal(1)]),status:text,source_id:id}),
  grammar_lessons:data.extend({title:text,topic:text,level:text,source_id:id,status:text}),
  grammar_cases:data.extend({lesson_id:id,position:z.number().int().nonnegative()}),
  media_assets:data.extend({relative_path:text,mime:text,byte_length:z.number().int().positive(),sha256:text,source_id:id}),
  question_groups:data.extend({part:z.number().int(),audio_id:id.nullable(),image_id:id.nullable(),source_id:id}),
  questions:data.extend({part:z.number().int(),group_id:id.nullable(),position:z.number().int(),difficulty:text,source_id:id,status:text}),
};
export type Table=keyof typeof tableSchemas;
export const tables=Object.keys(tableSchemas) as Table[];
const pkgSchema=z.object({
  sources:z.array(tableSchemas.sources),lexemes:z.array(tableSchemas.lexemes),senses:z.array(tableSchemas.senses),
  grammar_lessons:z.array(tableSchemas.grammar_lessons),grammar_cases:z.array(tableSchemas.grammar_cases),media_assets:z.array(tableSchemas.media_assets),
  question_groups:z.array(tableSchemas.question_groups),questions:z.array(tableSchemas.questions),
});
export type ContentPackage=z.infer<typeof pkgSchema>;
const recognized=(license:string)=>/^(CC-BY-(2\.0|3\.0|4\.0)( \/ Princeton WordNet License)?|CC-BY-SA-(2\.0|3\.0|4\.0)|CC0-1\.0|GPL-3\.0|Public Domain|Own recording \(permission confirmed\)|Original project material, local educational use|User-supplied material, local educational use)$/.test(license);
export function contentFromDb(db:Sqlite,since?:string) {
  const raw=Object.fromEntries(tables.map(t=>{
    const columns=Object.keys(tableSchemas[t].shape).join(',');
    const sql='SELECT '+columns+' FROM '+t+(since?' WHERE datetime(updated_at)>=datetime(?)':'')+' ORDER BY id';
    return [t,since?db.prepare(sql).all(since):db.prepare(sql).all()];
  }));
  return parseContent(raw);
}
const agree=(condition:unknown,id:string)=>{ if (!condition) throw new Error('Nội dung không khớp ID hoặc manifest: '+id); };
export function parseContent(raw:unknown) {
  const pkg=pkgSchema.parse(raw);
  for (const key of tables) {
    const list=pkg[key];
    agree(new Set(list.map(x=>x.id)).size===list.length,key);
  }
  for (const s of pkg.sources) {
    provenance.parse({...s,sha256:s.sha256 ?? undefined});
    if (!recognized(s.license)) throw new Error('Giấy phép chưa được xác nhận: '+s.id);
  }
  for (const w of pkg.lexemes) {
    lexemeData.parse(JSON.parse(w.data));
    agree(w.id===wordId(w.lemma) && w.normalized===w.lemma.normalize('NFC').toLowerCase().trim(),w.id);
  }
  for (const s of pkg.senses) {
    const extra=senseData.parse(JSON.parse(s.data));
    senseInput.parse({...extra,id:s.id,lemma:'validated against lexeme ID',pos:s.pos,en:s.English,vi:s.Vietnamese??undefined,domain:s.domain,priority:Boolean(s.priority),status:s.status,revision:s.revision});
  }
  for (const l of pkg.grammar_lessons) {
    const json=JSON.parse(l.data);
    const header=lesson.omit({cases:true}).parse(json);
    agree(header.id===l.id && header.title===l.title && header.topic===l.topic && header.level===l.level &&
      header.status===l.status && header.sourceId===l.source_id && header.revision===l.revision,l.id);
  }
  for (const c of pkg.grammar_cases) agree(grammarCase.parse(JSON.parse(c.data)).id===c.id,c.id);
  for (const row of pkg.media_assets) {
    const m=media.parse(JSON.parse(row.data));
    agree(m.id===row.id && m.path===row.relative_path && m.mime===row.mime && m.bytes===row.byte_length && m.sha256===row.sha256 &&
      m.sourceId===row.source_id && m.revision===row.revision && safeRelative(m.path) && m.path.split('/').at(-1)?.startsWith(m.sha256+'.'),m.id);
  }
  for (const row of pkg.question_groups) {
    const g=group.parse(JSON.parse(row.data));
    agree(g.id===row.id && g.part===row.part && g.sourceId===row.source_id && g.revision===row.revision
      && (g.audioId??null)===row.audio_id && (g.imageId??null)===row.image_id,g.id);
  }
  for (const row of pkg.questions) {
    const q=question.parse(JSON.parse(row.data));
    agree(q.id===row.id && q.part===row.part && q.difficulty===row.difficulty && q.position===row.position &&
      (q.groupId??null)===row.group_id && q.sourceId===row.source_id && q.revision===row.revision && q.status===row.status,q.id);
  }
  return pkg;
}
export function verifyStagedMedia(pkg:ContentPackage,dir:string) {
  for (const row of pkg.media_assets) {
    const m=media.parse(JSON.parse(row.data));
    const file=join(dir,'assets',row.relative_path);
    if (!existsSync(file)) throw new Error('ZIP thiếu media: '+m.id);
    const content=readFileSync(file);
    if (content.length!==m.bytes || hash(content)!==m.sha256 || inspectMedia(content).mime!==m.mime) {
      throw new Error('Media trong ZIP không khớp: '+m.id);
    }
  }
}
const hasReview=(status:unknown)=>status==='reviewed' || status==='published_reviewed';
export function mergeContent(store:Store,pkg:ContentPackage,dir:string,preferReviewed:boolean) {
  const db=store.content;
  const summary:Changes={added:0,updated:0,duplicate:0,conflicts:0};
  const index=new Set<string>();
  for (const name of tables) {
    const keys=Object.keys(tableSchemas[name].shape);
    const equality=keys.filter(key=>key!=='updated_at');
    const select=db.prepare('SELECT '+keys.join(',')+' FROM '+name+' WHERE id=?');
    const insert=db.prepare('INSERT INTO '+name+' ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+') ON CONFLICT(id) DO UPDATE SET '+
      keys.filter(key=>key!=='id').map(key=>key+'=excluded.'+key).join(','));
    for (const item of pkg[name]) {
      const old=select.get(item.id) as Record<string,unknown>|undefined;
      const row=item as Record<string,unknown>;
      if (old && equality.every(key=>old[key]===row[key])) { summary.duplicate++; continue; }
      if (old && ['lexeme_id','lesson_id'].some(key=>old[key]!==row[key])) throw new Error('Thay đổi liên kết của ID ổn định: '+item.id);
      const conflict=old && ((old.revision as number)===item.revision || (hasReview(old.status) && !hasReview(row.status)));
      if (conflict) summary.conflicts++;
      if (old && (item.revision<(old.revision as number) || (conflict && !(preferReviewed && hasReview(row.status) && !hasReview(old.status))))) continue;
      insert.run(...keys.map(key=>row[key]));
      if (old) summary.updated++; else summary.added++;
      if (name==='lexemes') index.add(item.id);
      if (name==='senses') index.add(row.lexeme_id as string);
      if (name==='questions') {
        const q=question.parse(JSON.parse(row.data as string));
        db.prepare('DELETE FROM question_links WHERE question_id=?').run(q.id);
        const write=db.prepare('INSERT INTO question_links VALUES (?,?,?)');
        for (const id of new Set(q.caseIds)) write.run(q.id,id,null);
        for (const id of new Set(q.senseIds)) write.run(q.id,null,id);
      }
    }
  }
  for (const id of index) refreshWordSearch(db,id);
  for (const row of pkg.lexemes) {
    const current=db.prepare('SELECT data FROM lexemes WHERE id=?').pluck().get(row.id) as string;
    for (const p of lexemeData.parse(JSON.parse(current)).pronunciations) {
      if (p.assetId && !db.prepare('SELECT 1 FROM media_assets WHERE id=?').get(p.assetId)) throw new Error('Thiếu media tham chiếu: '+p.assetId);
    }
  }
  for (const row of pkg.media_assets) {
    const m=media.parse(JSON.parse(row.data));
    if (!assetPath(store.path,m) && !existsSync(join(dir,'assets',m.path))) throw new Error('Thiếu media tham chiếu: '+m.id);
  }
  return summary;
}
