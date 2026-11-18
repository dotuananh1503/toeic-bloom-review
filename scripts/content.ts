import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAssets } from '../server/features/media/media';
import { validateQuestionGroups } from '../server/features/exams/exam';
import { openStore } from '../server/core/db';
import { putSource, putSenses, putLessons, putQuestions } from '../server/features/content/knowledge';
import { downloadSource, importKaikki, importOewn } from '../packages/data-builder/vocab';
import { englishWordnet } from '../content-source/vocabulary';
import { coverage, seedContent, validateContent } from '../server/features/content/course';
import { provenance } from '../packages/shared/content';

const [action, ...args] = process.argv.slice(2);
const flag = (name: string) => { const index = args.indexOf('--' + name); return index < 0 ? undefined : args[index+1]; };
const read = (path: string) => JSON.parse(readFileSync(path,'utf8'));
const needed = (key: string) => { const value = flag(key); if (!value) throw new Error('Required: --' + key); return value; };
if (!action || args.includes('--help')) {
  console.log('migrate | seed | source:register --file JSON | source:download [--output FILE] | vocab --file FILE [--words comma,list | --source JSON for Kaikki | --format bundle] | grammar --file JSON | questions --file JSON | validate | report | review:queue | build [--file OEWN.gz] | publish --version ID');
} else {
  const store = openStore();
  const db = store.content;
  const cache = join(store.path,'cache','english-wordnet-2025.xml.gz');
  const report = () => coverage(db);
  const validate = () => { validateContent(db);validateQuestionGroups(db);validateAssets(store); };
  try {
    switch (action) {
      case 'migrate': console.log('Content:',db.pragma('user_version',{simple:true}),'Progress:',store.progress.pragma('user_version',{simple:true})); break;
      case 'seed': seedContent(store); console.log(report()); break;
      case 'source:register': putSource(db,provenance.parse(read(needed('file')))); break;
      case 'source:download': await downloadSource(englishWordnet,flag('output') ?? cache); console.log(flag('output') ?? cache); break;
      case 'vocab': {
        const file = needed('file');
        if (flag('source')) console.log('Imported',await importKaikki(db,file,provenance.parse(read(needed('source')))));
        else if (flag('format')==='bundle') { putSource(db,englishWordnet); console.log('Imported',putSenses(db,read(file),englishWordnet.id)); }
        else {
          const items = await importOewn(db,file,flag('words')?.split(',').map(v=>v.trim()).filter(Boolean));
          if (flag('output')) writeFileSync(needed('output'),JSON.stringify(items,null,2)+'\n');
          console.log('Processed',items.length);
        }
        break;
      }
      case 'grammar': putLessons(db,read(needed('file'))); break;
      case 'questions': { const content = read(needed('file')); putQuestions(db,content.groups,content.questions); break; }
      case 'build': {
        const file = flag('file') ?? cache;
        if (!flag('file')) await downloadSource(englishWordnet,file);
        await importOewn(db,file);
        seedContent(store);
        validate();
        console.log(report());
        break;
      }
      case 'validate':
        validate();
        console.log(report());
        break;
      case 'report': console.log(JSON.stringify(report(),null,2)); break;
      case 'review:queue': console.log(JSON.stringify(db.prepare('SELECT * FROM content_review_queue ORDER BY kind,id').all(),null,2)); break;
      case 'publish': validate(); db.prepare('INSERT INTO content_versions VALUES (?,?,?)').run(needed('version'),new Date().toISOString(),JSON.stringify(report())); break;
      default: throw new Error('Unknown action: ' + action);
    }
  } finally { store.close(); }
}
