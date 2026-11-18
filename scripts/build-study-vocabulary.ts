import { readFileSync,writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { compileStudyVocabulary } from '../packages/data-builder/study-vocabulary';

const [sources,oewn,output] = process.argv.slice(2);
if (!sources || !oewn || !output || sources==='--help') {
  console.log('Usage: data:build:study-vocabulary -- <study-sources.json> <oewn.xml.gz> <study-vocabulary.json.gz>');
} else {
  const result=await compileStudyVocabulary(JSON.parse(readFileSync(sources,'utf8')),oewn);
  if (result.missing.length) throw new Error('No learning entries for: '+result.missing.join(', '));
  writeFileSync(output,gzipSync(Buffer.from(JSON.stringify(result))));
  console.log({listed:Object.keys(result.membership).length,english:result.english.length,
    fallback:Object.values(result.enFallback).reduce((total,list)=>total+list.length,0),legacy:result.legacy.length,missing:result.missing});
}
