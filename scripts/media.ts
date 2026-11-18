import { readFileSync, statSync } from 'node:fs';
import { openStore } from '../server/core/db';
import { assetLimit, ingestAsset, installBundledMedia, validateAssets } from '../server/features/media/media';

const args=process.argv.slice(2);
const value=(flag:string)=>args[args.indexOf(flag)+1];
if (args.includes('--help') || !args.length) console.log('media ingest --meta metadata.json --file recording.wav | media install | media validate');
else {
  const store=openStore();
  try {
    switch(args[0]) {
      case 'ingest': {
        if (!args.includes('--meta') || !args.includes('--file')) throw new Error('Required: --meta and --file');
        const file=value('--file');
        if (statSync(file).size>assetLimit) throw new Error('Media exceeds 32 MiB.');
        console.log(ingestAsset(store,JSON.parse(readFileSync(value('--meta'),'utf8')),readFileSync(file)));
        break;
      }
      case 'install': installBundledMedia(store); console.log('Bundled media installed.'); break;
      case 'validate': validateAssets(store); console.log('Media verified.'); break;
      default: throw new Error('Unknown media action.');
    }
  } finally { store.close(); }
}
