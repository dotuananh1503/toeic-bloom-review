import { z } from 'zod';
import { studyListIds } from './study-lists';

export const id = z.string().min(1).max(200).regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/);
export const nonempty = z.string().trim().min(1);
export const statuses = ['draft','needs_translation','needs_review','reviewed','published_reviewed','retired'] as const;
export const status = z.enum(statuses);
export const difficulty = z.enum(['easy','medium','hard']);
export const part = z.number().int().min(1).max(7);
export const provenance = z.object({
  id, name: nonempty, url: nonempty, version: nonempty, license: nonempty, attribution: nonempty,
  sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});
export const example = z.object({ en: nonempty, vi: nonempty });
export const pronunciation = z.object({ accent: z.enum(['en-US','en-GB','unspecified']), ipa: nonempty.optional(), assetId: id.optional() });
export const studyList = z.enum(studyListIds);
export const lexemeData = z.object({
  pronunciations: z.array(pronunciation).default([]),
  family: z.array(nonempty).default([]), forms: z.array(nonempty).default([]),
  studyLists: z.partialRecord(studyList,z.number().int().positive()).optional(),
});
export const senseData = z.object({
  examples: z.array(example).default([]), sourceExamples: z.array(nonempty).default([]),
  collocations: z.array(nonempty).default([]), relations: z.array(nonempty).default([]),
  labels: z.array(nonempty).default([]), register: nonempty.optional(), externalId: nonempty.optional(),
  glossaryOnly: z.boolean().optional(),
});
export const senseInput = senseData.extend({
  id, lemma: nonempty, pos: nonempty, en: z.string().trim(), vi: nonempty.optional(),
  domain: nonempty.default('General'), priority: z.boolean().default(false),
  status: status.default('needs_translation'), word: lexemeData.optional(), revision: z.number().int().positive().default(1),
}).superRefine((sense, ctx) => {
  if (!sense.en && !(sense.glossaryOnly && sense.vi)) {
    ctx.addIssue({code:'custom',message:'An English definition or a sourced Vietnamese gloss is required.'});
  }
  if (sense.status === 'reviewed' || sense.status === 'published_reviewed') {
    if (!sense.vi || (sense.priority && sense.examples.length < 2)) {
      ctx.addIssue({code:'custom',message:'Reviewed senses require Vietnamese and two bilingual examples for priority senses.'});
    }
  }
});
const grammarExplanation = z.object({ title: nonempty, usage: nonempty, formula: nonempty, note: nonempty.optional() });
export const grammarCase = grammarExplanation.extend({
  id, signals: nonempty.optional(), frequency: z.enum(['common','specialized']),
  examples: z.array(example).min(2), exerciseIds: z.array(id),
  supplementalExplanations: z.array(grammarExplanation).optional(),
}).refine(row => new Set(row.examples.map(e => e.en)).size === row.examples.length, 'Examples must be distinct.');
export const lesson = z.object({
  id, title: nonempty, titleVi: nonempty, topic: nonempty, level: difficulty, summary: nonempty,
  parts: z.array(part).min(1), status, sourceId: id, revision: z.number().int().positive().default(1),
  references: z.array(z.url()),
  supplementalSourceId: id.optional(),
  overviewNotes: z.array(nonempty).optional(),
  overviewExamples: z.array(example).optional(),
  checkedOn: z.string().optional(),
  formulas: z.array(z.object({ label: nonempty, pattern: nonempty, note: nonempty })).min(1),
  cases: z.array(grammarCase).min(1), exceptions: z.array(nonempty),
  comparisons: z.array(z.object({ title: nonempty, text: nonempty })),
  errors: z.array(z.object({ wrong: nonempty, correct: nonempty, why: nonempty })).min(1),
});
export const question = z.object({
  id, part, groupId: id.optional(), position: z.number().int().nonnegative().default(0),
  topic: nonempty, subtype: nonempty, difficulty, prompt: nonempty, options: z.array(nonempty).min(3).max(4),
  answer: z.number().int().nonnegative(), explanation: nonempty, rationales: z.array(nonempty).min(3).max(4),
  caseIds: z.array(id).default([]), senseIds: z.array(id).default([]), status, sourceId: id,
  revision: z.number().int().positive().default(1),
}).refine(q => q.options.length === (q.part === 2 ? 3 : 4) && q.rationales.length === q.options.length
  && q.answer < q.options.length && new Set(q.options).size === q.options.length
  && (q.part === 5 || q.groupId), 'Invalid options, answer or stimulus group.');
export const group = z.object({
  id, part, title: nonempty, passages: z.array(z.object({ title: nonempty, text: nonempty })).max(3).default([]),
  transcript: nonempty.optional(), audioId: id.optional(), imageId: id.optional(),
  revision: z.number().int().positive().default(1), sourceId: id,
}).refine(item => item.part < 6 ? Boolean(item.transcript) : item.passages.length >= 1, 'Stimulus is missing.');
export const media = z.object({
  id, path: nonempty, mime: z.enum(['audio/wav','audio/mpeg','audio/ogg','image/png','image/jpeg','image/webp']),
  bytes: z.number().int().positive(), sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourceId: id, usage: z.enum(['vocabulary','listening','scene']), duration: z.number().positive().optional(),
  accent: z.enum(['en-US','en-GB']).optional(), synthetic: z.boolean().default(false),
  revision: z.number().int().positive().default(1),
});

export type Lesson = z.infer<typeof lesson>;
export type Question = z.infer<typeof question>;
export type Group = z.infer<typeof group>;
export type Media = z.infer<typeof media>;
export type SenseInput = z.infer<typeof senseInput>;
export type Provenance = z.infer<typeof provenance>;
export type LexemeData = z.infer<typeof lexemeData>;
export type SenseData = z.infer<typeof senseData>;
export type Status = z.infer<typeof status>;
export type PublicQuestion = Omit<Question, 'answer' | 'explanation' | 'rationales'>;
export type Word = LexemeData & { id: string; lemma: string; sourceId: string; senses: Sense[] };
export type Sense = SenseData & { id: string; pos: string; en: string; vi: string | null; domain: string; priority: boolean; status: Status; sourceId: string };
