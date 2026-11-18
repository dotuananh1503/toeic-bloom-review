import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { extractGrammarArrays } from '../packages/data-builder/grammar-html';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: data:extract:grammar-html -- --file <V3.3.html> --output <grammar.json>');
} else {
  const index = args.indexOf('--file');
  const destIndex = args.indexOf('--output');
  const file = index >= 0 && args[index + 1];
  const output = destIndex >= 0 && args[destIndex + 1];
  if (!file || !output) throw new Error('Required: --file and --output');
  const bytes = readFileSync(file);
  const chapters = extractGrammarArrays(bytes.toString('utf8'));
  const payload = { file: basename(file), sha256: createHash('sha256').update(bytes).digest('hex'), chapters };
  writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
  console.log('Extracted ' + chapters.length + ' grammar chapters.');
}
