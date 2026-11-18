import { z } from 'zod';

export const backupType = z.enum(['full','content','progress']);
export type BackupType = z.infer<typeof backupType>;
export const manifestSchema = z.strictObject({
  format_version:z.literal(1),app_version:z.string().min(1).max(30),created_utc:z.iso.datetime(),
  source_device_id:z.uuid(),backup_type:backupType,
  content_schema_version:z.number().int().positive(),progress_schema_version:z.number().int().positive(),
  item_counts:z.record(z.string().max(50),z.number().int().nonnegative()),
  base_export_cursor:z.iso.datetime().optional(),
  files:z.array(z.strictObject({path:z.string().max(250),sha256:z.string().regex(/^[a-f0-9]{64}$/),size:z.number().int().nonnegative()})).max(2000),
});
export type Manifest=z.infer<typeof manifestSchema>;
export type Changes={added:number;updated:number;duplicate:number;conflicts:number};
export type MergePreview={
  manifest:Manifest; content:Changes; progress:Changes; noteConflicts:number;
  clockWarnings:number; warnings:string[]; restorePoint?:string; receipt?:string;
};
