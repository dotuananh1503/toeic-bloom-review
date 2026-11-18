import type { ExamAvailability } from './exam';

export type ContentCoverage = {
  lexemes:number;senses:number;glossarySenses:number;translatedSenses:number;reviewedSenses:number;missingTranslation:number;needsReview:number;
  grammarLessons:number;reviewedLessons:number;grammarCases:number;grammarExamples:number;
  questions:{part:number;total:number;reviewed:number}[];assets:number;
  audio:{us:number;uk:number;missingWords:number;onDemandWords:number;listening:number;synthetic:number;images:number};
  grammarTopics:{topic:string;total:number;reviewed:number}[];
  vocabularyTopics:{topic:string;total:number;reviewed:number;translated:number}[];
  reviewQueue:{kind:string;status:string;total:number}[];
  availability:ExamAvailability;
};
export type Analytics={
  streak:number;goal:number;todayReviews:number;totalReviews:number;due:number;learnedSenses:number;
  completedLessons:number;examCount:number;attempts:number;correct:number;
  days:{day:string;reviews:number;answers:number;correct:number}[];
  resume:{id:string;answered:number;total:number;mode:string;startedAt:string}|null;
};
