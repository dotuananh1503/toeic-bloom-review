import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { SaxesParser } from 'saxes';
import { coreWords, englishWordnet, enrichment, families, ipa, officeTopics } from '../../content-source/vocabulary';
import { hash, putSource, putSenses } from '../../server/features/content/knowledge';
import type { Sqlite } from '../../server/core/db';
import { lexemeData, provenance, type Provenance } from '../shared/content';

export async function digestFile(file: string) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
export async function downloadSource(registryInput: Provenance, target: string) {
  const registry = provenance.parse(registryInput);
  if (!registry.sha256 || !registry.url.startsWith('https://')) throw new Error('Download requires HTTPS and a pinned SHA-256.');
  if (existsSync(target) && await digestFile(target) === registry.sha256) return;
  mkdirSync(dirname(target), { recursive:true });
  const staging = target + '.part';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(registry.url,{ signal:AbortSignal.timeout(180_000) });
      if (!response.ok || !response.body) throw new Error('Source HTTP ' + response.status);
      const reader = response.body.getReader();
      const contents = async function* () {
        try {
          for (;;) {
            const {done,value} = await reader.read();
            if (done) return;
            yield value;
          }
        } finally { reader.releaseLock(); }
      };
      await pipeline(contents(),createWriteStream(staging));
      if (await digestFile(staging) !== registry.sha256) throw new Error('Source checksum changed.');
      renameSync(staging,target);
      return;
    } catch (error) {
      rmSync(staging,{ force:true });
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
    }
  }
}

type Entry = { lemma: string; pos: string; synset: string; id: string; forms: string[] };
type Synset = { definition: string; examples: string[]; related: string[] };
const pos: Record<string,string> = {n:'noun',v:'verb',a:'adjective',s:'adjective',r:'adverb'};

export async function extractOewn(file: string, selected = [...new Set([...coreWords,...officeTopics.keys()])]) {
  if (await digestFile(file) !== englishWordnet.sha256) throw new Error('Expected the OEWN 2025 published input SHA-256.');
  const words = new Set(selected.map(s => s.toLowerCase()));
  const entries: Entry[] = [];
  const wanted = new Set<string>();
  const synsets = new Map<string,Synset>();
  let lemma = '', tagPos = '', synId = '', capture = '';
  let entryRows: Entry[] = [], forms: string[] = [];
  let current: Synset | undefined;
  const parser = new SaxesParser();
  parser.on('opentag', tag => {
    const a = tag.attributes;
    switch (tag.name) {
      case 'LexicalEntry': lemma = ''; entryRows = []; forms = []; break;
      case 'Lemma': lemma = a.writtenForm; tagPos = pos[a.partOfSpeech] ?? a.partOfSpeech; break;
      case 'Form': if (words.has(lemma.toLowerCase())) forms.push(a.writtenForm); break;
      case 'Sense': if (words.has(lemma.toLowerCase())) {
        entryRows.push({ lemma,pos:tagPos,synset:a.synset,id:a.id,forms });
        wanted.add(a.synset);
      } break;
      case 'Synset':
        synId = a.id;
        current = wanted.has(synId) ? { definition:'',examples:[],related:[] } : undefined;
        break;
      case 'Definition': case 'Example': capture = ''; break;
      case 'SynsetRelation': if (current && a.target) current.related.push(a.relType + ': ' + a.target); break;
    }
  });
  parser.on('text', text => { if (current) capture += text; });
  parser.on('closetag', tag => {
    switch (tag.name) {
      case 'LexicalEntry': entries.push(...entryRows); break;
      case 'Definition': if (current) current.definition = capture.trim(); break;
      case 'Example': if (current && capture.trim()) current.examples.push(capture.trim()); break;
      case 'Synset': if (current) synsets.set(synId,current); current = undefined; break;
    }
  });
  const stream = createReadStream(file).pipe(createGunzip()).setEncoding('utf8');
  for await (const chunk of stream) parser.write(chunk);
  parser.close();
  const allForms = new Map<string, Set<string>>();
  for (const e of entries) {
    const current = allForms.get(e.lemma) ?? new Set<string>();
    for (const form of e.forms) current.add(form);
    allForms.set(e.lemma,current);
  }
  return entries.flatMap(e => {
    const s = synsets.get(e.synset);
    if (!s?.definition) return [];
    const enriched = (enrichment as Record<string, readonly string[]>)[e.id.replace(/^oewn-/,'')];
    const pronunciation = ipa[e.lemma];
    return [{
      id:'oewn:' + hash(e.id).slice(0,32), externalId:e.id, lemma:e.lemma, pos:e.pos, en:s.definition,
      vi:enriched?.[0], domain:enriched?.[1] ?? (!coreWords.includes(e.lemma) ? officeTopics.get(e.lemma.toLowerCase()) : undefined) ?? 'General', priority:!!enriched,
      status:enriched ? 'needs_review' : 'needs_translation',
      sourceExamples:s.examples, relations:s.related, collocations:enriched ? [enriched[2]] : [],
      examples:enriched ? [{ en:enriched[3],vi:enriched[4] },{ en:enriched[5],vi:enriched[6] }] : [],
      word:lexemeData.parse({ forms:[...(allForms.get(e.lemma) ?? [])],family:families[e.lemma] ?? [],
        pronunciations:pronunciation ? [{accent:'en-US',ipa:pronunciation[0]},{accent:'en-GB',ipa:pronunciation[1]}] : [] }),
    }];
  });
}

export async function importKaikki(db: Sqlite, file: string, info: Provenance) {
  if (!/CC-BY-SA/.test(info.license) || !info.sha256 || await digestFile(file) !== info.sha256) throw new Error('Kaikki requires a confirmed CC BY-SA source and matching SHA-256.');
  putSource(db,info);
  const stream = createReadStream(file);
  const source = file.endsWith('.gz') ? stream.pipe(createGunzip()) : stream;
  const input = createInterface({ input:source, crlfDelay:Infinity });
  let number = 0;
  let imported = 0;
  const jobId = info.id + ':' + info.sha256;
  const checkpoint = db.prepare('SELECT json_extract(details,\'$.line\') FROM import_jobs WHERE id=?').pluck().get(jobId) as number | undefined;
  const log = db.prepare(`INSERT INTO import_jobs VALUES (?,'kaikki',?,CURRENT_TIMESTAMP,?)
    ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated_at=CURRENT_TIMESTAMP,details=excluded.details`);
  const batch: unknown[] = [];
  const flush = (state: string) => db.transaction(() => {
    imported += putSenses(db,batch,info.id);
    log.run(jobId,state,JSON.stringify({ line:number }));
    batch.length = 0;
  })();
  for await (const line of input) {
    if (++number <= (checkpoint ?? 0)) continue;
    const row = JSON.parse(line) as {
      lang_code?: string; word?: string; pos?: string; sounds?: { ipa?: string; tags?: string[] }[];
      forms?: { form?: string }[]; senses?: { glosses?: string[]; tags?: string[]; topics?: string[]; id?: string }[];
    };
    if (row.lang_code !== 'en' || !row.word || !row.pos) continue;
    for (const item of row.senses ?? []) {
      if (!item.glosses?.length) continue;
      const stable = item.id ?? JSON.stringify([row.word,row.pos,item.glosses,[...(item.tags ?? [])].sort(),[...(item.topics ?? [])].sort()]);
      batch.push({
        id:'kaikki:' + hash(stable).slice(0,40), lemma:row.word,pos:row.pos,en:item.glosses.join(' / '),
        labels:item.tags ?? [],domain:item.topics?.[0] ?? 'General',status:'needs_translation',
        word:{ forms:[...new Set((row.forms ?? []).map(f => f.form).filter(Boolean))], pronunciations:(row.sounds ?? []).filter(s => s.ipa)
          .map(s => ({ ipa:s.ipa,accent:s.tags?.includes('US') ? 'en-US' : s.tags?.includes('UK') ? 'en-GB' : 'unspecified' })) },
      });
    }
    if (batch.length >= 500) flush('running');
  }
  flush('done');
  return imported;
}
export async function importOewn(db: Sqlite, file: string, lemmas?: string[]) {
  const data = await extractOewn(file,lemmas);
  db.transaction(() => { putSource(db,englishWordnet); putSenses(db,data,englishWordnet.id); }).immediate();
  return data;
}
