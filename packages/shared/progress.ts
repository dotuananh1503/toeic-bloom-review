import { z } from 'zod';
import { group, id, question } from './content';

export const ratingSchema = z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]);
export const sessionSchema = z.object({
  mode:z.enum(['practice','mini','half','full','reading']), questionIds:z.array(id).min(1).max(200),
  startedAt:z.iso.datetime(), duration:z.number().int().min(1).max(7200),
  items:z.array(z.object({question,group:group.optional()})).max(200).optional(),
});
export const eventPayload = z.discriminatedUnion('type',[
  z.object({type:z.literal('review'),payload:z.object({rating:ratingSchema})}),
  z.object({type:z.literal('lesson'),payload:z.object({done:z.boolean()})}),
  z.object({type:z.literal('attempt'),payload:z.object({selected:z.number().int().min(0).max(3),correct:z.boolean(),sessionId:z.uuid().optional(),seconds:z.number().int().nonnegative().max(7200).optional()})}),
  z.object({type:z.literal('exam_start'),payload:sessionSchema}),
  z.object({type:z.literal('exam_finish'),payload:z.object({score:z.number().int().min(0).max(200),total:z.number().int().min(1).max(200)})}),
  z.object({type:z.literal('flag'),payload:z.object({questionId:id,flag:z.boolean()})}),
  z.object({type:z.literal('bookmark'),payload:z.object({active:z.boolean(),kind:z.enum(['word','lesson'])})}),
  z.object({type:z.literal('note'),payload:z.object({ text:z.string().max(10000),parents:z.array(z.uuid()).max(100) })}),
  z.object({type:z.literal('goal'),payload:z.object({reviews:z.number().int().min(1).max(100)})}),
]);
export const eventMeta = z.object({
  event_id:z.uuid(),device_id:z.uuid(),local_seq:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  entity_id:id,happened_at:z.iso.datetime(),
});
export type EventPayload = z.infer<typeof eventPayload>;
export type StudyEvent = z.infer<typeof eventMeta> & EventPayload;
export type Rating = z.infer<typeof ratingSchema>;
