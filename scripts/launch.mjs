import { spawn } from 'node:child_process';
import { once } from 'node:events';

const npm=process.env.npm_execpath;
if (!npm) throw new Error('Run this launcher with npm run launch.');
let child;
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child?.kill());
for (const task of ['build','db:seed','start']) {
  child=spawn(process.execPath,[npm,'run',task],{stdio:'inherit'});
  const [code,signal]=await once(child,'exit');
  if (code || signal) {process.exitCode=code ?? 1;break;}
}
