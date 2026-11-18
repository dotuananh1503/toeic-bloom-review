import type { PublicQuestion, Group, Question } from './content';
import type { z } from 'zod';
import type { sessionSchema } from './progress';

export const partInfo = [
  {title:'Mô tả ảnh',count:6},{title:'Hỏi và đáp',count:25},{title:'Hội thoại',count:39},{title:'Bài nói',count:30},
  {title:'Hoàn thành câu',count:30},{title:'Hoàn thành đoạn văn',count:16},{title:'Đọc hiểu',count:54},
];
export type Session = z.infer<typeof sessionSchema>;
export type Mode = Session['mode'];
export type PublicGroup = Omit<Group,'transcript'>;
export type ReviewItem = Pick<Question,'id'|'prompt'|'options'|'part'|'answer'|'rationales'|'explanation'|'caseIds'|'senseIds'|'status'|'difficulty'> & {
  selected:number | null; group?:Group; grammarLinks:{lessonId:string;caseId:string}[]; wordLinks:{wordId:string;senseId:string}[];
};
export type ExamState = Omit<Session,'items'> & {
  id:string; questions:PublicQuestion[]; groups:PublicGroup[];
  answers:Record<string,number>; flags:string[]; remaining:number;
  result?:{score:number;total:number;items:ReviewItem[]};
};
export type ExamAvailability = { modes:{ mode:Exclude<Mode,'practice'>; count:number; minutes:number; ready:boolean }[];
  parts:{part:number;total:number;available:number}[]; topics:string[]; draftsAvailable:boolean };
