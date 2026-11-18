import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { root, type Store } from '../../core/db';
import { getMedia, hash, putMedia, putSource, rows } from '../content/knowledge';
import { assetPath, safeRelative } from './paths';
import { id, lexemeData, media, provenance, type Media } from '../../../packages/shared/content';

export const assetLimit=32*1024*1024;
const licenseList=/^(CC0-1\.0|CC-BY-(2\.0|3\.0|4\.0)|CC-BY-SA-(2\.0|3\.0|4\.0)|Public Domain|Own recording \(permission confirmed\)|Original project material, local educational use)$/;
const installSchema = z.object({
  id,source:provenance,usage:z.enum(['vocabulary','listening','scene']),
  synthetic:z.boolean().default(false),accent:z.enum(['en-US','en-GB']).optional(),
  targetId:id.optional(),
});
export type AssetInstall=z.infer<typeof installSchema>;

export function inspectMedia(bytes:Buffer) {
  const ascii=(start:number,end:number)=>bytes.toString('ascii',start,end);
  if (bytes.length<12 || bytes.length>assetLimit) throw new Error('Tệp media rỗng hoặc vượt 32 MiB.');
  if (ascii(0,4)==='RIFF' && ascii(8,12)==='WAVE') {
    if (bytes.readUInt32LE(4)+8 !== bytes.length) throw new Error('Kích thước WAV sai.');
    let byteRate=0,dataLength=0;
    for (let offset=12; offset+8<=bytes.length;) {
      const size=bytes.readUInt32LE(offset+4);
      if (offset+8+size>bytes.length) throw new Error('WAV bị cắt dữ liệu.');
      if (ascii(offset,offset+4)==='fmt ' && size>=16 && bytes.readUInt16LE(offset+8)===1) byteRate=bytes.readUInt32LE(offset+16);
      if (ascii(offset,offset+4)==='data') dataLength=size;
      offset+=8+size+(size%2);
    }
    if (!byteRate || !dataLength) throw new Error('WAV cần PCM hợp lệ.');
    const duration=dataLength/byteRate;
    if (duration<0.05 || duration>900) throw new Error('Thời lượng WAV nằm ngoài khoảng hỗ trợ.');
    return {mime:'audio/wav' as const, ext:'wav',duration};
  }
  if (ascii(0,3)==='ID3' || (bytes[0]===0xff && (bytes[1]&0xe0)===0xe0 && (bytes[1]&0x06)!==0)) return {mime:'audio/mpeg' as const,ext:'mp3'};
  if (ascii(0,4)==='OggS') return {mime:'audio/ogg' as const,ext:'ogg'};
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && ascii(12,16)==='IHDR') return {mime:'image/png' as const,ext:'png'};
  if (bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff && bytes.at(-2)===0xff && bytes.at(-1)===0xd9) return {mime:'image/jpeg' as const,ext:'jpg'};
  if (ascii(0,4)==='RIFF' && ascii(8,12)==='WEBP') return {mime:'image/webp' as const,ext:'webp'};
  throw new Error('Không nhận dạng được định dạng media.');
}
export function ensureAssetParent(dataRoot:string,relativePath:string) {
  if (!safeRelative(relativePath)) throw new Error('Đường dẫn media không hợp lệ.');
  const pieces=['assets',...relativePath.split('/').slice(0,-1)];
  let path=dataRoot;
  for (const piece of pieces) {
    path=join(path,piece);
    try { mkdirSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code!=='EEXIST') throw error; }
    const st=lstatSync(path);
    if (!st.isDirectory() || st.isSymbolicLink()) throw new Error('Thư mục media không an toàn.');
  }
}
function attachAsset(store: Store,input:AssetInstall,asset:Media,replaceExisting:boolean) {
  const db=store.content;
  if (!input.targetId) return;
  if (input.usage==='vocabulary') {
    if (!input.accent) throw new Error('Chọn giọng US hoặc UK.');
    const row = db.prepare('SELECT data FROM lexemes WHERE id=?').pluck().get(input.targetId) as string|undefined;
    if (!row) throw new Error('Không tìm thấy mục từ cho âm thanh.');
    const data=lexemeData.parse(JSON.parse(row));
    const pron=data.pronunciations.find(x=>x.accent===input.accent);
    if (pron?.assetId && (pron.assetId===asset.id || !replaceExisting)) return;
    if (pron) pron.assetId=asset.id;
    else data.pronunciations.push({ accent:input.accent,assetId:asset.id });
    db.prepare('UPDATE lexemes SET data=?, revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(JSON.stringify(data),input.targetId);
  } else {
    const raw=db.prepare('SELECT data FROM question_groups WHERE id=?').pluck().get(input.targetId) as string|undefined;
    if (!raw) throw new Error('Không tìm thấy nhóm câu hỏi.');
    const data=JSON.parse(raw) as {part:number;audioId?:string;imageId?:string;revision:number};
    if (data.part>4 || (input.usage==='scene' && data.part!==1)) throw new Error('Media không phù hợp Part.');
    const key=input.usage==='scene'?'imageId':'audioId';
    if (data[key] && (data[key]===asset.id || !replaceExisting)) return;
    data[key]=asset.id; data.revision++;
    const column=key==='imageId'?'image_id':'audio_id';
    db.prepare('UPDATE question_groups SET ' + column + '=?,data=?,revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(asset.id,JSON.stringify(data),data.revision,input.targetId);
  }
}
export function ingestAsset(store:Store,raw:unknown,bytes:Buffer,replaceExisting=true) {
  const input=installSchema.parse(raw);
  if (!licenseList.test(input.source.license)) throw new Error('Cần giấy phép sử dụng và chuyển tệp đã xác nhận.');
  const info=inspectMedia(bytes);
  if ((input.usage==='scene')!==info.mime.startsWith('image/')) throw new Error('Loại tệp và mục đích sử dụng không khớp.');
  const sha256=hash(bytes);
  const folder=input.usage==='scene'?'images':input.usage==='listening'?'listening':'vocabulary-audio/'+(input.accent==='en-GB'?'uk':'us');
  const path=folder+'/'+sha256+'.'+info.ext;
  const old=getMedia(store.content,input.id);
  if (old && (old.sha256!==sha256 || old.path!==path || old.sourceId!==input.source.id)) throw new Error('ID media đã gắn với tệp khác. Dùng ID mới.');
  const asset=media.parse({...info,...input,path,bytes:bytes.length,sha256,sourceId:input.source.id});
  ensureAssetParent(store.path,path);
  const target=join(store.path,'assets',path);
  try { writeFileSync(target,bytes,{flag:'wx'}); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code!=='EEXIST' || !assetPath(store.path,asset) || hash(readFileSync(target))!==sha256) throw error;
  }
  store.content.transaction(()=>{
    putSource(store.content,input.source);
    const same=store.content.prepare('SELECT id FROM media_assets WHERE relative_path=?').pluck().get(path) as string|undefined;
    if (same && same!==input.id) {
      const registered=getMedia(store.content,same)!;
      if (registered.sourceId!==asset.sourceId || registered.usage!==asset.usage) throw new Error('Tệp có provenance khác trong thư viện.');
      attachAsset(store,input,registered,replaceExisting);
    } else {
      putMedia(store.content,asset);
      attachAsset(store,input,asset,replaceExisting);
    }
  }).immediate();
  return getMedia(store.content,input.id) ?? rows<Media>(store.content,'SELECT data FROM media_assets WHERE relative_path=?',path)[0];
}

type Bundled={source:AssetInstall['source']; items:(Omit<AssetInstall,'source'> & {file:string;sha256:string})[]};
export function installBundledMedia(store:Store) {
  const dir=join(root,'assets-source');
  const manifest=join(dir,'media.json');
  if (!existsSync(manifest)) return;
  const sources=JSON.parse(readFileSync(manifest,'utf8')) as Bundled[];
  store.content.transaction(()=>{
    for (const bundle of sources) for (const item of bundle.items) {
      if (!safeRelative(item.file)) throw new Error('Invalid bundled media path.');
      const file=join(dir,item.file);
      if (statSync(file).size>assetLimit) throw new Error('Bundled media exceeds limit.');
      const bytes=readFileSync(file);
      if (hash(bytes)!==item.sha256) throw new Error('Bundled media checksum differs: '+item.file);
      ingestAsset(store,{...item,source:bundle.source},bytes,false);
    }
  }).immediate();
}

export function validateAssets(store:Store) {
  for (const item of rows<Media>(store.content,'SELECT data FROM media_assets')) {
    const m=media.parse(item);
    const path=assetPath(store.path,m);
    if (!path) throw new Error('Media thiếu hoặc đường dẫn không hợp lệ: '+m.id);
    const found=readFileSync(path);
    if (hash(found)!==m.sha256 || inspectMedia(found).mime!==m.mime) throw new Error('Tệp media không khớp manifest: '+m.id);
  }
}
export function copyAssetNoOverwrite(from:string,to:string,bytes:Buffer) {
  try { copyFileSync(from,to,constants.COPYFILE_EXCL); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code!=='EEXIST') throw error;
    const stat=lstatSync(to);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size!==bytes.length || hash(readFileSync(to))!==hash(bytes)) throw new Error('Tệp đã cài khác checksum.');
  }
}
