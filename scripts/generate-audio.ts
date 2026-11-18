import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { root } from '../server/core/db';
import { hash, wordId } from '../server/features/content/knowledge';
import { coreWords } from '../content-source/vocabulary';
import { practiceGroups } from '../content-source/practice';
import { inspectMedia, type AssetInstall } from '../server/features/media/media';

const modulePath=createRequire(import.meta.url).resolve('espeak-ng');
const synth=(await import(pathToFileURL(modulePath).href)).default as (input:{arguments:string[]})=>Promise<{FS:{readFile(file:string):Uint8Array}}>;
const dest=join(root,'assets-source');
const dir=join(dest,'audio');
mkdirSync(dir,{recursive:true});

async function wav(text:string,voice:string,rate:number) {
  const instance=await synth({arguments:['-v',voice,'-s',String(rate),'-w','voice.wav',text]});
  const bytes=Buffer.from(instance.FS.readFile('voice.wav'));
  inspectMedia(bytes);
  return bytes;
}
function combine(samples:Buffer[]) {
  const payload=Buffer.concat(samples.flatMap((sample,i)=>i ? [Buffer.alloc(8820),sample.subarray(44)] : [sample.subarray(44)]));
  const header=Buffer.from(samples[0].subarray(0,44));
  header.writeUInt32LE(payload.length+36,4);
  header.writeUInt32LE(payload.length,40);
  return Buffer.concat([header,payload]);
}
type Item=Omit<AssetInstall,'source'> & {file:string;sha256:string};
const audioItems:Item[]=[];
function save(asset:Omit<Item,'file'|'sha256'|'synthetic'>,name:string,bytes:Buffer) {
  const file='audio/'+name+'.wav';
  writeFileSync(join(dest,file),bytes);
  audioItems.push({...asset,file,sha256:hash(bytes),synthetic:true});
}
for (const word of coreWords) for (const accent of ['en-US','en-GB'] as const) {
  const voice=accent.toLowerCase();
  const key=word+'-'+voice;
  save({id:'voice:'+key,usage:'vocabulary',accent,targetId:wordId(word)},key,await wav(word,voice,145));
}
for (const group of practiceGroups.filter(g=>g.part<5)) {
  const transcript=group.transcript!;
  const speech=group.part===3 ? await Promise.all(transcript.split(/(?=(?:Woman|Man): )/).filter(Boolean).map(line=>
    wav(line.replace(/^(Woman|Man): /,''),line.startsWith('Woman:')?'en-us+f3':'en-gb+m3',148))) : [
    await wav(transcript.replace(/\b([ABCD])\. /g,'Option $1. '),group.part===4?'en-gb':'en-us',145),
  ];
  save({id:'listening:'+group.id,usage:'listening',targetId:group.id},group.id,speech.length===1?speech[0]:combine(speech));
}
const imagePath=join(dest,'meeting-room.jpg');
const photo=existsSync(imagePath)?[{
  source:{id:'commons-meeting-room',name:'Chairs-2181923',url:'https://commons.wikimedia.org/wiki/File:Chairs-2181923.jpg',
    version:'2019-01-18',license:'CC0-1.0',attribution:'Pexels (Pixabay), Chairs-2181923, qua Wikimedia Commons. Bản ảnh thu nhỏ.'},
  items:[{id:'scene:meeting-room',file:'meeting-room.jpg',sha256:hash(readFileSync(imagePath)),usage:'scene',targetId:'photo-meeting-room',synthetic:false}],
}]:[];
const source={id:'bloom-espeak',name:'TOEIC Bloom · giọng máy eSpeak NG',url:'https://github.com/ianmarmour/espeak-ng.js',
  version:'espeak-ng.js 1.0.2',license:'Original project material, local educational use',
  attribution:'Lời thoại dự án biên soạn, tổng hợp offline bằng eSpeak NG. Engine GPL-3.0-or-later; chỉ phân phối WAV với gói nội dung.'};
writeFileSync(join(dest,'media.json'),JSON.stringify([{source,items:audioItems},...photo],null,2)+'\n');
console.log('Prepared',audioItems.length,'synthetic audio files and',photo.length,'photos.');
