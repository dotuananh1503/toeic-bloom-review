import { z } from 'zod';
import type { Sqlite } from '../../core/db';
import type { Changes } from '../../../packages/shared/backup';
import { eventMeta, eventPayload } from '../../../packages/shared/progress';
import { decodeEvent,rebuildSrs,type StoredEvent } from '../progress/progress';

const device=z.object({id:z.uuid(),created_at:z.iso.datetime()});
const rawEvent=eventMeta.extend({type:z.string(),payload:z.string().max(10_000_000)});
const progressSchema=z.object({devices:z.array(device).max(10_000),events:z.array(rawEvent).max(1_000_000)});
export type ProgressPackage=z.infer<typeof progressSchema>;
export function parseProgress(input:unknown) {
  const {devices,events}=progressSchema.parse(input);
  const deviceIds=new Set(devices.map(d=>d.id));
  const eventIds=new Set<string>();
  const sequences=new Set<string>();
  if (deviceIds.size!==devices.length) throw new Error('ZIP chứa nhiều thiết bị cùng ID.');
  for (const event of events) {
    const key=event.device_id+':'+event.local_seq;
    if (!deviceIds.has(event.device_id) || eventIds.has(event.event_id) || sequences.has(key)) throw new Error('ID/sequence tiến độ không hợp lệ.');
    eventIds.add(event.event_id);
    sequences.add(key);
    const decoded=decodeEvent(event as StoredEvent);
    event.payload=JSON.stringify(eventPayload.parse(decoded).payload);
  }
  return {devices,events};
}
export function progressFromDb(db:Sqlite) {
  return parseProgress({
    devices:db.prepare('SELECT id,created_at FROM devices ORDER BY id').all(),
    events:db.prepare('SELECT event_id,device_id,local_seq,type,entity_id,payload,happened_at FROM study_events ORDER BY device_id,local_seq').all(),
  });
}

export function mergeProgress(db:Sqlite,pkg:ProgressPackage) {
  const stats:Changes={added:0,updated:0,duplicate:0,conflicts:0};
  const affected=new Set<string>();
  const register=db.prepare('INSERT OR IGNORE INTO pr.devices VALUES (?,?)');
  for (const device of pkg.devices) register.run(device.id,device.created_at);
  const one=db.prepare('SELECT * FROM pr.study_events WHERE event_id=? OR (device_id=? AND local_seq=?)');
  const write=db.prepare('INSERT INTO pr.study_events VALUES (?,?,?,?,?,?,?)');
  for (const e of pkg.events) {
    const old=one.get(e.event_id,e.device_id,e.local_seq) as typeof e | undefined;
    if (old) {
      if (old.event_id!==e.event_id || old.device_id!==e.device_id || old.local_seq!==e.local_seq || old.type!==e.type ||
        old.entity_id!==e.entity_id || old.happened_at!==e.happened_at ||
        JSON.stringify(decodeEvent(old as StoredEvent).payload)!==e.payload) {
        throw new Error('Xung đột ID sự kiện hoặc sequence của thiết bị. ZIP chưa được nhập.');
      }
      stats.duplicate++;
      continue;
    }
    write.run(e.event_id,e.device_id,e.local_seq,e.type,e.entity_id,e.payload,e.happened_at);
    if (e.type==='review') affected.add(e.entity_id);
    stats.added++;
  }
  rebuildSrs(db,affected,'pr.');
  return stats;
}

export function mergeWarnings(db:Sqlite) {
  const clockWarnings=db.prepare(`SELECT count(*) FROM (
    SELECT happened_at,lag(happened_at) OVER(PARTITION BY device_id ORDER BY local_seq) AS prior
    FROM pr.study_events) WHERE happened_at<prior OR julianday(happened_at)>julianday('now','+1 day')`).pluck().get() as number;
  const noteConflicts=db.prepare(`SELECT count(*) FROM (
    SELECT n.entity_id FROM pr.study_events n
    WHERE n.type='note' AND NOT EXISTS (
      SELECT 1 FROM pr.study_events next, json_each(next.payload,'$.parents') AS parent
      WHERE next.type='note' AND next.entity_id=n.entity_id AND parent.value=n.event_id
    ) GROUP BY n.entity_id HAVING count(*)>1)`).pluck().get() as number;
  return {clockWarnings,noteConflicts};
}
