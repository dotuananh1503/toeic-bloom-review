import { knowledgeRouter } from '../features/content/routes';
import { studyRouter } from '../features/progress/routes';
import { examRouter } from '../features/exams/routes';
import { HttpError } from './errors';
import { mediaRouter } from '../features/media/routes';
import { pronunciationRouter } from '../features/media/pronunciation';
import { backupRouter } from '../features/backup/routes';
import { analyticsRouter } from '../features/progress/analytics';
import { appendEvent } from '../features/progress/progress';
import { aiRouter } from '../features/ai/routes';
import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, type Store } from './db';
import { getDevPort, loopbackHost, loopbackUrl } from '../../packages/shared/local-config';

import { readSettings, settingsSchema } from '../features/settings/settings';

export function createApp(store: Store, dev = false) {
  const app = express();
  const devOrigin = dev ? loopbackUrl(getDevPort()) : undefined;
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const host = req.get('host');
    const origin = req.get('origin');
    const port = req.socket.localPort;
    if (host !== loopbackHost + ':' + port && host !== 'localhost:' + port) return res.status(403).json({ error: 'Chỉ chấp nhận localhost.' });
    if (origin && origin !== 'http://' + host && origin !== devOrigin) {
      return res.status(403).json({ error: 'Nguồn yêu cầu không được phép.' });
    }
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', "default-src 'self'; img-src 'self'; media-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'");
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '256kb', strict: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, deviceId: store.deviceId }));
  app.get('/api/settings', (_req, res) => res.json(readSettings(store)));
  app.put('/api/settings', (req, res) => {
    if (!req.is('application/json')) throw new HttpError(415, 'Cần application/json.');
    const settings = settingsSchema.parse(req.body);
    store.progress.transaction(()=>{
      if (settings.studyGoal!==readSettings(store).studyGoal) appendEvent(store,'daily',{type:'goal',payload:{reviews:settings.studyGoal}});
      store.progress.prepare("INSERT INTO app_settings VALUES ('learning',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(settings));
    }).immediate();
    res.json(settings);
  });

  app.use(mediaRouter(store), pronunciationRouter(store));
  app.use('/api', knowledgeRouter(store), studyRouter(store), examRouter(store), backupRouter(store), analyticsRouter(store), aiRouter());
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy yêu cầu.' }));
  const dist = join(root, 'dist');
  if (existsSync(join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false }));
    app.get('/{*path}', (req, res) => {
      if (!req.accepts('html')) return res.sendStatus(404);
      res.sendFile(join(dist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => res.send('TOEIC Bloom API. Run npm run build for the production UI.'));
  }
  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.', issues: error.issues });
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.status === 400 || error.status === 413) return res.status(error.status).json({ error: 'Yêu cầu không hợp lệ hoặc quá lớn.' });
    console.error(error instanceof Error ? error.name : 'Unknown error');
    res.status(500).json({ error: 'Yêu cầu thất bại.' });
  };
  app.use(errorHandler);
  return app;
}
