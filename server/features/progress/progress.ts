import { randomUUID } from 'node:crypto';
import { createEmptyCard, fsrs, type Card } from 'ts-fsrs';
import type { Sqlite, Store } from '../../core/db';
import { eventMeta, eventPayload, type EventPayload, type StudyEvent } from '../../../packages/shared/progress';

export type StoredEvent = Omit<StudyEvent,'payload'> & { payload: string };
const engine = fsrs({enable_fuzz:false});
export function decodeEvent(event: StoredEvent): StudyEvent {
  return { ...eventMeta.parse(event), ...eventPayload.parse({ type:event.type,payload:JSON.parse(event.payload) }) };
}
export function rebuildSrs(db: Sqlite, keys?: Iterable<string>, prefix = '') {
  const schema = prefix === 'pr.' ? 'pr.' : '';
  const ids = keys ? [...new Set(keys)] : db.prepare(`SELECT DISTINCT entity_id FROM ${schema}study_events WHERE type='review'`).pluck().all() as string[];
  if (!keys) db.prepare(`DELETE FROM ${schema}srs_state`).run();
  const get = db.prepare(`SELECT * FROM ${schema}study_events WHERE type='review' AND entity_id=? ORDER BY happened_at,device_id,local_seq,event_id`);
  const upsert = db.prepare(`INSERT INTO ${schema}srs_state VALUES (?,?,?) ON CONFLICT(sense_id) DO UPDATE SET due=excluded.due,data=excluded.data`);
  for (const id of ids) {
    let card: Card | undefined;
    for (const event of (get.all(id) as StoredEvent[]).map(decodeEvent)) {
      if (event.type !== 'review') continue;
      const date = new Date(event.happened_at);
      card = engine.next(card ?? createEmptyCard(date),date,event.payload.rating).card;
    }
    if (card) upsert.run(id,card.due.toISOString(),JSON.stringify(card));
  }
}
export function appendEvent(store: Store, entity: string, input: EventPayload, at = new Date()) {
  const data = eventPayload.parse(input);
  return store.progress.transaction(() => {
    const seq = store.progress.prepare('SELECT coalesce(max(local_seq),0)+1 FROM study_events WHERE device_id=?').pluck().get(store.deviceId) as number;
    const event = { ...eventMeta.parse({ event_id:randomUUID(),device_id:store.deviceId,local_seq:seq,entity_id:entity,happened_at:at.toISOString() }), ...data };
    store.progress.prepare('INSERT INTO study_events VALUES (?,?,?,?,?,?,?)')
      .run(event.event_id,event.device_id,event.local_seq,event.type,event.entity_id,JSON.stringify(event.payload),event.happened_at);
    if (event.type === 'review') rebuildSrs(store.progress,[entity]);
    return event;
  }).immediate();
}
export function noteBranches(db: Sqlite, entity: string) {
  const events = (db.prepare("SELECT * FROM study_events WHERE type='note' AND entity_id=? ORDER BY happened_at,device_id,local_seq").all(entity) as StoredEvent[]).map(decodeEvent);
  const replaced = new Set(events.flatMap(e => e.type === 'note' ? e.payload.parents : []));
  return events.filter(e => e.type === 'note' && !replaced.has(e.event_id));
}
