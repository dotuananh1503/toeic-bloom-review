import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['--import', 'tsx', 'server/start.ts', '--dev'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
const stop = () => children.forEach(child => child.kill());
for (const child of children) child.on('exit', (code) => { stop(); process.exitCode = code ?? 0; });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
