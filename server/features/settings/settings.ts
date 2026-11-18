import { z } from 'zod';
import type { Store } from '../../core/db';

export const settingsSchema = z.strictObject({
  accent: z.enum(['en-US', 'en-GB']).default('en-US'),
  rate: z.number().min(.65).max(1.5).default(1),
  localVoice: z.boolean().default(false),
  studyGoal: z.number().int().min(1).max(100).default(12),
});
export type Settings = z.infer<typeof settingsSchema>;
export function readSettings(store: Store) {
  const value=store.progress.prepare("SELECT value FROM app_settings WHERE key='learning'").pluck().get() as string | undefined;
  const settings=settingsSchema.parse(value ? JSON.parse(value) : {});
  const goal=store.progress.prepare("SELECT json_extract(payload,'$.reviews') FROM study_events WHERE type='goal' ORDER BY happened_at DESC,device_id DESC,local_seq DESC LIMIT 1").pluck().get() as number|undefined;
  return goal===undefined ? settings : {...settings,studyGoal:goal};
}
