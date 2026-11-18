import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { inspectMedia } from './media';

type Engine = (config: {
  arguments: string[];
  print: (text:string)=>void;
  printErr: (text:string)=>void;
}) => Promise<{ FS: { readFile(path:string):Uint8Array } }>;
let engine: Promise<Engine> | undefined;

export async function synthesizeSpeech(text:string, voice:string, rate:number, withIpa=false) {
  const load = () => {
    const packagePath = createRequire(import.meta.url).resolve('espeak-ng');
    return import(pathToFileURL(packagePath).href).then(module=>module.default as Engine);
  };
  const synth = await (engine ??= load());
  const instance = await synth({
    arguments:['-v',voice,'-s',String(rate),...(withIpa ? ['--ipa','--phonout','ipa.txt'] : []),'-w','voice.wav','--',text],
    print:()=>{}, printErr:()=>{},
  });
  const wav = Buffer.from(instance.FS.readFile('voice.wav'));
  inspectMedia(wav);
  const ipa = withIpa ? Buffer.from(instance.FS.readFile('ipa.txt')).toString('utf8').trim().replace(/\s+/g,' ') : '';
  return {wav,ipa};
}
