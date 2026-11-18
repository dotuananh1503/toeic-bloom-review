import { openStore } from './core/db';
import { createApp } from './core/http';
import { getApiPort, loopbackHost, loopbackUrl } from '../packages/shared/local-config';

const dev = process.argv.includes('--dev');
const port = getApiPort();
const store = openStore();
const server = createApp(store, dev).listen(port, loopbackHost, () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log('TOEIC Bloom · ' + loopbackUrl(address.port));
});
server.once('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? 'Cổng ' + port + ' đang bận. Đặt BLOOM_PORT để dùng cổng khác.' : error.message);
  store.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => store.close()));
