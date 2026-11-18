import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const dataPath = () => resolve(process.env.BLOOM_DATA_DIR || join(root, 'data'));
export type Sqlite = Database.Database;

export function migrate(db: Sqlite, name: 'content' | 'progress') {
  const dir = join(root, 'migrations', name);
  const files=readdirSync(dir).filter(name=>/^\d+\.sql$/.test(name)).sort();
  if ((db.pragma('user_version',{simple:true}) as number)>Number.parseInt(files.at(-1)!,10)) throw new Error('Database schema is newer than this app.');
  for (const file of files) {
    const version = Number.parseInt(file, 10);
    db.transaction(() => {
      const current = db.pragma('user_version', { simple: true }) as number;
      if (current >= version) return;
      if (current !== version - 1) throw new Error('Missing migration before ' + file);
      db.exec(readFileSync(join(dir, file), 'utf8'));
      db.pragma('user_version = ' + version);
    }).immediate();
  }
}

function open(path: string, name: 'content' | 'progress') {
  const db = new Database(join(path, name + '.sqlite'));
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = DELETE');
  db.pragma('synchronous = FULL');
  migrate(db, name);
  return db;
}

export function openStore(path = dataPath()) {
  mkdirSync(path, { recursive: true });
  const content = open(path, 'content');
  const progress = open(path, 'progress');
  const settings = progress.prepare('SELECT value FROM app_settings WHERE key = ?');
  const set = progress.prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const deviceId = progress.transaction(() => {
    const row = settings.get('deviceId') as { value: string } | undefined;
    if (row) return JSON.parse(row.value) as string;
    const id = randomUUID();
    progress.prepare('INSERT INTO devices VALUES (?,?)').run(id, new Date().toISOString());
    set.run('deviceId', JSON.stringify(id));
    return id;
  }).immediate();
  return { path, content, progress, deviceId,
    close() { content.close(); progress.close(); },
  };
}

export type Store = ReturnType<typeof openStore>;
