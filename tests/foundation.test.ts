import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openStore } from '../server/core/db';
import { createApp } from '../server/core/http';
import { readSettings } from '../server/features/settings/settings';
import { getDevPort, loopbackHost, loopbackUrl } from '../packages/shared/local-config';

test('SQLite FTS5 and persistence through a fresh connection', async () => {
  const path = mkdtempSync(join(tmpdir(), 'bloom-foundation-'));
  const first = openStore(path);
  const server = createApp(first).listen(0, '127.0.0.1');
  try {
    first.content.exec('CREATE VIRTUAL TABLE temp.probe USING fts5(text)');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    assert.equal(address.address, '127.0.0.1');
    const url = 'http://127.0.0.1:' + address.port;
    assert.equal((await fetch(url + '/api/settings', { headers: { Origin: 'https://foreign.invalid' } })).status, 403);
    assert.equal((await fetch(url + '/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rate: -1 }) })).status, 400);
    const good = await fetch(url + '/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accent: 'en-GB', studyGoal: 18 }) });
    assert.equal(good.status, 200);
    const second = openStore(path);
    try {
      assert.equal(second.deviceId, first.deviceId);
      assert.equal(readSettings(second).studyGoal, 18);
    } finally { second.close(); }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    first.close();
    rmSync(path, { recursive: true, force: true });
  }
});

test('dev API accepts the configured Vite origin while production rejects it', async () => {
  const path = mkdtempSync(join(tmpdir(), 'bloom-dev-origin-'));
  const store = openStore(path);
  const dev = createApp(store, true).listen(0, loopbackHost);
  const production = createApp(store).listen(0, loopbackHost);
  try {
    await Promise.all([once(dev, 'listening'), once(production, 'listening')]);
    const headers = { Origin: loopbackUrl(getDevPort()) };
    for (const [server, status] of [[dev, 200], [production, 403]] as const) {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const response = await fetch(loopbackUrl(address.port) + '/api/health', { headers });
      assert.equal(response.status, status);
    }
  } finally {
    await Promise.all([dev, production].map(server => new Promise<void>(resolve => server.close(() => resolve()))));
    store.close();
    rmSync(path, { recursive: true, force: true });
  }
});
