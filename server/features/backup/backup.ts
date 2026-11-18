import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { constants,copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync,linkSync,statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename,dirname,join,resolve } from 'node:path';
import { z } from 'zod';
import { root,type Sqlite,type Store } from '../../core/db';
import { manifestSchema,type BackupType,type MergePreview } from '../../../packages/shared/backup';
import { appVersion } from '../../core/version';
import { assetPath } from '../media/paths';
import { contentFromDb,mergeContent,parseContent,tables,verifyStagedMedia,type ContentPackage } from './content';
import { mergeProgress,mergeWarnings,parseProgress,progressFromDb,type ProgressPackage } from './progress';
import { extractZip,names,writeZip,zipLimit } from './zip';
import { copyAssetNoOverwrite,ensureAssetParent } from '../media/media';
import { media } from '../../../packages/shared/content';
import { digestFile } from '../../../packages/data-builder/vocab';
import { hash } from '../content/knowledge';
import { validateLessons } from '../content/course';
import { validateQuestionGroups } from '../exams/exam';
import { settingsSchema } from '../settings/settings';

const schemaVersion=(db:Sqlite)=>db.pragma('user_version',{simple:true}) as number;
type Entry={path:string;file?:string;buffer?:Buffer};
const json=(path:string,data:unknown):Entry=>({path,buffer:Buffer.from(JSON.stringify(data))});
const empty=()=>({added:0,updated:0,duplicate:0,conflicts:0});
const toJson=(path:string)=>JSON.parse(readFileSync(path,'utf8'));

function sqliteSnapshot(db:Sqlite,path:string) {
  db.prepare('VACUUM INTO ?').run(path);
}
function readSnapshot<T>(file:string,version:number,callback:(db:Sqlite)=>T) {
  const db=new Database(file,{readonly:true,fileMustExist:true});
  try {
    db.pragma('trusted_schema = OFF');
    if (schemaVersion(db)!==version || db.pragma('quick_check',{simple:true})!=='ok') throw new Error('SQLite trong ZIP không tương thích hoặc bị hỏng.');
    return callback(db);
  } finally {db.close();}
}
function safeSettings(raw:string) {
  const {accent,rate,localVoice,studyGoal}=JSON.parse(raw);
  return settingsSchema.parse({accent,rate,localVoice,studyGoal});
}
function sanitizeProgress(path:string) {
  const db=new Database(path,{fileMustExist:true});
  try {
    db.transaction(()=>{
      const original=db.prepare("SELECT value FROM app_settings WHERE key='learning'").pluck().get() as string|undefined;
      db.prepare('DELETE FROM app_settings').run();
      if (original) db.prepare("INSERT INTO app_settings VALUES ('learning',?)").run(JSON.stringify(safeSettings(original)));
      const pkg=progressFromDb(db);
      const update=db.prepare('UPDATE study_events SET payload=? WHERE event_id=?');
      for (const e of pkg.events) update.run(e.payload,e.event_id);
      db.prepare('DELETE FROM import_audit').run();
    })();
    db.exec('VACUUM');
  } finally {db.close();}
}
const counts=(content?:ContentPackage,progress?:ProgressPackage)=>{
  const out:Record<string,number>={};
  if (content) for (const table of tables) out[table]=content[table].length;
  if (progress) {out.devices=progress.devices.length;out.events=progress.events.length;}
  return out;
};
const verifyAssets=(pkg:ContentPackage,store:Store,files:Entry[])=>{
  for (const row of pkg.media_assets) {
    const item=media.parse(JSON.parse(row.data));
    const path=assetPath(store.path,item);
    if (!path || hash(readFileSync(path))!==item.sha256) throw new Error('Media chưa sẵn sàng cho backup: '+item.id);
    files.push({path:'assets/'+item.path,file:path});
  }
};
export async function exportBackup(store:Store,type:BackupType,output:string,since?:string) {
  const target=resolve(output);
  if (!target.toLowerCase().endsWith('.zip')) throw new Error('Tên gói cần đuôi .zip.');
  if (existsSync(target)) throw new Error('Gói ZIP đích đã tồn tại.');
  if (since && type!=='content') throw new Error('Mốc xuất áp dụng cho Content Update.');
  if (since) z.iso.datetime().parse(since);
  const staging=mkdtempSync(join(tmpdir(),'bloom-export-'));
  const out=join(dirname(target),'.bloom-export-'+randomUUID()+'.tmp');
  try {
    const files:Entry[]=[];
    let content:ContentPackage|undefined;
    let progress:ProgressPackage|undefined;
    if (type==='full') {
      const contentFile=join(staging,names.content), progressFile=join(staging,names.progress);
      sqliteSnapshot(store.content,contentFile);
      sqliteSnapshot(store.progress,progressFile);
      sanitizeProgress(progressFile);
      content=readSnapshot(contentFile,schemaVersion(store.content),db=>contentFromDb(db));
      progress=readSnapshot(progressFile,schemaVersion(store.progress),progressFromDb);
      files.push({path:names.content,file:contentFile},{path:names.progress,file:progressFile});
    } else if (type==='content') {
      content=contentFromDb(store.content,since);
      files.push(json(names.delta,content));
    } else {
      progress=progressFromDb(store.progress);
      files.push(json(names.events,progress));
    }
    if (content) {
      verifyAssets(content,store,files);
      const all=store.content.prepare('SELECT id,name,url,license,attribution,version,sha256 FROM sources ORDER BY id').all() as {id:string}[];
      const needed=new Set(tables.flatMap(t=>content[t].flatMap(row=>'source_id' in row ? [row.source_id] : t==='sources' ? [row.id] : [])));
      files.push(json(names.licenses,all.filter(s=>type==='full' || needed.has(s.id))));
      if (needed.has('oewn-2025')) files.push({path:names.oewn,file:join(root,'content-source','OEWN-LICENSE.txt')});
      if (needed.has('fvdp-en-vi')) files.push({path:names.fvdp,file:join(root,'content-source','FVDP-GPL-3.0.txt')});
    }
    const manifest=manifestSchema.parse({
      format_version:1,app_version:appVersion,created_utc:new Date().toISOString(),source_device_id:store.deviceId,backup_type:type,
      content_schema_version:schemaVersion(store.content),progress_schema_version:schemaVersion(store.progress),
      item_counts:counts(content,progress),base_export_cursor:since,
      files:await Promise.all(files.map(async e=>{const bytes=e.file ? readFileSync(e.file) : e.buffer!; return {path:e.path,sha256:hash(bytes),size:bytes.length};})),
    });
    if (manifest.files.reduce((total,e)=>total+e.size,0)>512*1024*1024) throw new Error('Tổng dữ liệu backup vượt 512 MiB.');
    await writeZip(out,[json(names.manifest,manifest),...files]);
    if (statSync(out).size>zipLimit) throw new Error('Backup vượt 128 MiB.');
    try { linkSync(out,target); }
    catch (error) {
      if (!['EPERM','ENOTSUP','EXDEV','EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      copyFileSync(out,target,constants.COPYFILE_EXCL);
    }
    return manifest;
  } finally {rmSync(staging,{force:true,recursive:true});rmSync(out,{force:true});}
}

async function stageBackup(store:Store,input:string,staging:string) {
  const files=await extractZip(input,staging);
  const manifestFile=files.get(names.manifest);
  if (!manifestFile) throw new Error('ZIP thiếu manifest.json.');
  const manifest=manifestSchema.parse(toJson(manifestFile.path));
  if (manifest.content_schema_version!==schemaVersion(store.content) || manifest.progress_schema_version!==schemaVersion(store.progress)) {
    throw new Error('Schema ZIP không tương thích với bản ứng dụng.');
  }
  const expected=new Set(manifest.files.map(entry=>entry.path));
  if (expected.size!==manifest.files.length || expected.has(names.manifest) || expected.size+1!==files.size) throw new Error('Manifest không khớp danh mục tệp.');
  for (const file of manifest.files) {
    const actual=files.get(file.path);
    if (!actual || file.size!==actual.size || file.sha256!==actual.sha256) throw new Error('Checksum hoặc kích thước ZIP sai: '+file.path);
  }
  const get=(name:string)=>{const entry=files.get(name); if (!entry) throw new Error('ZIP thiếu '+name); return entry.path;};
  let content:ContentPackage|undefined;
  let progress:ProgressPackage|undefined;
  let settings:ReturnType<typeof safeSettings>|undefined;
  switch (manifest.backup_type) {
    case 'full':
      content=readSnapshot(get(names.content),manifest.content_schema_version,db=>contentFromDb(db));
      progress=readSnapshot(get(names.progress),manifest.progress_schema_version,db=>{
        const learning=db.prepare("SELECT value FROM app_settings WHERE key='learning'").pluck().get() as string|undefined;
        if (learning) settings=safeSettings(learning);
        return progressFromDb(db);
      });
      break;
    case 'content': content=parseContent(toJson(get(names.delta))); break;
    case 'progress': progress=parseProgress(toJson(get(names.events))); break;
  }
  const allowed=new Set<string>(manifest.backup_type==='full' ? [names.content,names.progress] : manifest.backup_type==='content' ? [names.delta] : [names.events]);
  if (content) {
    allowed.add(names.licenses);
    if (expected.has(names.oewn)) allowed.add(names.oewn);
    if (expected.has(names.fvdp)) allowed.add(names.fvdp);
    if (!Array.isArray(toJson(get(names.licenses)))) throw new Error('Danh mục ghi công không hợp lệ.');
    verifyStagedMedia(content,staging);
    for (const item of content.media_assets) allowed.add('assets/'+item.relative_path);
  }
  if (expected.size!==allowed.size || [...expected].some(file=>!allowed.has(file))) throw new Error('ZIP có tệp không đúng loại backup.');
  const actualCounts=counts(content,progress);
  if (Object.keys(actualCounts).length!==Object.keys(manifest.item_counts).length ||
    Object.entries(actualCounts).some(([key,n])=>manifest.item_counts[key]!==n)) throw new Error('Số lượng trong manifest sai.');
  if (progress && !progress.devices.some(d=>d.id===manifest.source_device_id)) throw new Error('Thiết bị tạo ZIP không có trong dữ liệu tiến độ.');
  return {manifest,content,progress,settings};
}

const previewRollback=Symbol('preview rollback');
function apply(store:Store,staged:Awaited<ReturnType<typeof stageBackup>>,dir:string,commit:boolean,preferReviewed:boolean,restorePoint?:string) {
  const db=store.content;
  let result:MergePreview|undefined;
  const addedFiles:string[]=[];
  db.prepare('ATTACH DATABASE ? AS pr').run(join(store.path,'progress.sqlite'));
  try {
    if (db.pragma('pr.journal_mode',{simple:true})!=='delete') throw new Error('SQLite cần chế độ journal DELETE cho hợp nhất cả hai cơ sở dữ liệu.');
    db.pragma('pr.synchronous = FULL');
    db.transaction(()=>{
      const content=staged.content ? mergeContent(store,staged.content,dir,preferReviewed) : empty();
      const progress=staged.progress ? mergeProgress(db,staged.progress) : empty();
      const warnings=mergeWarnings(db);
      if (staged.content) {
        validateLessons(db);
        validateQuestionGroups(db);
      }
      result={manifest:staged.manifest,content,progress,...warnings,warnings:[],restorePoint:restorePoint?basename(restorePoint):undefined};
      if (warnings.clockWarnings) result.warnings.push('Phát hiện giờ thiết bị lệch, lịch FSRS dùng thứ tự thời gian UTC và ID thiết bị.');
      if (warnings.noteConflicts) result.warnings.push('Các phiên bản ghi chú đều được giữ. Mở nội dung để chọn hoặc hợp nhất.');
      if (content.conflicts) result.warnings.push('Bản nội dung cùng revision hoặc bản đã kiểm duyệt cần quyết định hợp nhất.');
      if (!commit) throw previewRollback;
      if (staged.settings) db.prepare("INSERT OR IGNORE INTO pr.app_settings VALUES ('learning',?)").run(JSON.stringify(staged.settings));
      for (const row of staged.content?.media_assets ?? []) {
        const found=db.prepare('SELECT relative_path FROM media_assets WHERE id=?').pluck().get(row.id);
        if (found!==row.relative_path) continue;
        ensureAssetParent(store.path,row.relative_path);
        const from=join(dir,'assets',row.relative_path);
        const to=join(store.path,'assets',row.relative_path);
        const existed=existsSync(to);
        copyAssetNoOverwrite(from,to,readFileSync(from));
        if (!existed) addedFiles.push(to);
      }
      db.prepare('INSERT INTO pr.import_audit VALUES (?,?,?,?)').run(randomUUID(),new Date().toISOString(),staged.manifest.backup_type,
        JSON.stringify({content,progress,...warnings,restorePoint:result.restorePoint}));
    }).immediate();
  } catch (error) {
    for (const file of addedFiles) rmSync(file,{force:true});
    if (error!==previewRollback) throw error;
  } finally { db.exec('DETACH DATABASE pr'); }
  return result!;
}

export async function importBackup(store:Store,file:string,options:{commit?:boolean;preferReviewed?:boolean}={}) {
  const staging=mkdtempSync(join(tmpdir(),'bloom-import-'));
  try {
    const staged=await stageBackup(store,file,staging);
    const choice=Boolean(options.preferReviewed);
    const preview=apply(store,staged,staging,false,choice);
    if (!options.commit) return preview;
    const dir=join(store.path,'backups');
    mkdirSync(dir,{recursive:true});
    const restore=join(dir,'restore-'+randomUUID()+'.zip');
    await exportBackup(store,'full',restore);
    return apply(store,staged,staging,true,choice,restore);
  } finally { rmSync(staging,{force:true,recursive:true}); }
}
export async function digestBackup(file:string) { return digestFile(file); }
export function writeUploadedZip(path:string,bytes:Buffer) { writeFileSync(path,bytes,{flag:'wx'}); }
