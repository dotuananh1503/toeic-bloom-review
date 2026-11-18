import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getApiPort, getDevPort, loopbackHost, loopbackUrl } from './packages/shared/local-config.ts';

export default defineConfig(({ command }) => {
  if (command === 'build') return { plugins: [react()] };
  const apiPort = getApiPort();
  if (apiPort === 0) throw new Error('Vite requires a fixed BLOOM_PORT for the API proxy.');
  const proxy = { target: loopbackUrl(apiPort), changeOrigin: true };
  return {
    plugins: [react()],
    server: {
      host: loopbackHost,
      port: getDevPort(),
      strictPort: true,
      proxy: { '/api': proxy, '/media': proxy },
    },
  };
});
