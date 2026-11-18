export const studyListIds = ['tsl','ngsl','bsl'] as const;
export type StudyList = typeof studyListIds[number];
export const studyListLabels: Record<StudyList,string> = {
  tsl:'TOEIC Service List',ngsl:'New General Service List',bsl:'Business Service List',
};
