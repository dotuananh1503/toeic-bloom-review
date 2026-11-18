import { createWriteStream,mkdirSync,openSync,readSync,closeSync,statSync } from 'node:fs';
import { dirname,join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import yazl from 'yazl';
import { digestFile } from '../../../packages/data-builder/vocab';
import { safeRelative } from '../media/paths';

export const zipLimit=128*1024*1024;
const expandedLimit=512*1024*1024;
const entryLimit=256*1024*1024;
export const names={
  manifest:'manifest.json',content:'content.sqlite',progress:'progress.sqlite',
  delta:'content.json',events:'progress.json',licenses:'licenses.json',oewn:'licenses/OEWN-LICENSE.txt',fvdp:'licenses/FVDP-GPL-3.0.txt',
};
export function zipPath(path:string) {
  return safeRelative(path) && (Object.values(names).includes(path) ||
    /^assets\/(?:images|listening|vocabulary-audio\/(?:us|uk))\/[a-f0-9]{64}\.(?:wav|mp3|ogg|jpg|png|webp)$/.test(path));
}
export async function writeZip(out:string,files:readonly { path:string; file?:string; buffer?:Buffer }[]) {
  const zip=new yazl.ZipFile();
  const writer=pipeline(zip.outputStream,createWriteStream(out,{flags:'wx'}));
  try {
    for (const item of files) {
      if (item.file) zip.addFile(item.file,item.path);
      else zip.addBuffer(item.buffer!,item.path);
    }
    zip.end();
    await writer;
  } catch (error) {
    (zip.outputStream as Readable).destroy();
    await writer.catch(()=>{});
    throw error;
  }
}

function checkZip(file:string) {
  const size=statSync(file).size;
  if (size<22 || size>zipLimit) throw new Error('ZIP rỗng hoặc vượt 128 MiB.');
  const fd=openSync(file,'r');
  try {
    const signature=Buffer.alloc(4);
    readSync(fd,signature,0,4,0);
    if (!signature.equals(Buffer.from([0x50,0x4b,0x03,0x04]))) throw new Error('Tệp không có chữ ký ZIP.');
  } finally { closeSync(fd); }
}
export async function extractZip(filepath:string,dir:string) {
  checkZip(filepath);
  const zip=await new Promise<yauzl.ZipFile>((resolve,reject)=>yauzl.open(filepath,{
    lazyEntries:true,autoClose:false,strictFileNames:true,validateEntrySizes:true,
  },(error,zip)=>error || !zip ? reject(error ?? new Error('ZIP không hợp lệ.')) : resolve(zip)));
  const files=new Map<string,{path:string;sha256:string;size:number}>();
  const folded=new Set<string>();
  let size=0;
  try {
    if (zip.entryCount<=0 || zip.entryCount>2001) throw new Error('Số mục ZIP vượt giới hạn.');
    return await new Promise<typeof files>((resolve,reject)=>{
      zip.once('error',reject);
      zip.once('end',()=>resolve(files));
      zip.on('entry',entry=>{
        void (async ()=>{
          const path=entry.fileName;
          const kind=(entry.externalFileAttributes>>>16)&0o170000;
          if (!zipPath(path) || folded.has(path.toLowerCase()) || (kind!==0 && kind!==0o100000) || (entry.externalFileAttributes&0x10)) {
            throw new Error('Đường dẫn ZIP không hợp lệ hoặc bị lặp.');
          }
          if (entry.isEncrypted() || ![0,8].includes(entry.compressionMethod) || entry.uncompressedSize>entryLimit ||
            (entry.uncompressedSize>1024*1024 && entry.uncompressedSize>Math.max(1,entry.compressedSize)*300)) throw new Error('Kích thước hoặc nén ZIP không an toàn.');
          if (path===names.manifest && entry.uncompressedSize>512*1024) throw new Error('Manifest ZIP quá lớn.');
          size+=entry.uncompressedSize;
          if (size>expandedLimit) throw new Error('Tổng dữ liệu giải nén vượt giới hạn.');
          folded.add(path.toLowerCase());
          const output=join(dir,path);
          mkdirSync(dirname(output),{recursive:true});
          const stream=await new Promise<NodeJS.ReadableStream>((resolve,reject)=>zip.openReadStream(entry,(error,stream)=>error || !stream ? reject(error) : resolve(stream)));
          await pipeline(stream,createWriteStream(output,{flags:'wx'}));
          files.set(path,{path:output,sha256:await digestFile(output),size:entry.uncompressedSize});
          zip.readEntry();
        })().catch(reject);
      });
      zip.readEntry();
    });
  } finally { zip.close(); }
}
