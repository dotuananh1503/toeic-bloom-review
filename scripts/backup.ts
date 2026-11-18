import { openStore } from '../server/core/db';
import { exportBackup, importBackup } from '../server/features/backup/backup';
import { backupType } from '../packages/shared/backup';

const [action,...args]=process.argv.slice(2);
const flag=(name:string)=>{ const index=args.indexOf('--'+name); return index<0 ? undefined : args[index+1]; };
function required(key:string) { const v=flag(key); if (!v) throw new Error('Required: --'+key); return v; }
if (!action || args.includes('--help')) console.log('backup export --type full|content|progress --output PATH.zip [--since UTC] | import --file PATH.zip --mode merge [--confirm] [--prefer-reviewed] | verify --file PATH.zip');
else {
  const store=openStore();
  try {
    if (action==='export') console.log(await exportBackup(store,backupType.parse(required('type')),required('output'),flag('since')));
    else if (action==='import' || action==='verify') {
      if (flag('mode') && flag('mode')!=='merge') throw new Error('Backup import supports --mode merge.');
      const commit=action==='import' && args.includes('--confirm');
      const report=await importBackup(store,required('file'),{commit,preferReviewed:args.includes('--prefer-reviewed')});
      console.log(JSON.stringify(report,null,2));
      if (action==='import' && !commit) console.log('Preview complete. Run again with --confirm to merge.');
    } else throw new Error('Unknown backup action.');
  } finally {store.close();}
}
