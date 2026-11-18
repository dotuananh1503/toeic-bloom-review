import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './db';

export const appVersion=(JSON.parse(readFileSync(join(root,'package.json'),'utf8')) as {version:string}).version;
