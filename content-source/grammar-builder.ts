import type { Lesson, Question } from '../packages/shared/content';

export const originalSource = {
  id:'bloom-original',name:'TOEIC Bloom · nội dung biên soạn',url:'urn:toeic-bloom:original',
  version:'1.0',license:'Original project material, local educational use',
  attribution:'Ví dụ, giải thích và câu hỏi do dự án TOEIC Bloom biên soạn.',
};
export type CaseSpec = {
  key:string; title:string; usage:string; formula:string; signals:string; note:string;
  examples:[string,string,string,string]; exercise:[string,string,string,string,string,string,string,string,string];
  advanced?:true;
};

export function compileLesson(meta: Omit<Lesson,'cases'|'status'|'sourceId'|'revision'>, cases: CaseSpec[]) {
  const questions: Question[] = [];
  const useCases = cases.map((c,i) => {
    const id = meta.id + ':' + c.key;
    const exerciseId = id + ':practice';
    const [prompt,right,a,b,d,why,wa,wb,wd] = c.exercise;
    const answer = i % 4;
    const options = [a,b,d];
    const rationales = [wa,wb,wd];
    options.splice(answer,0,right);
    rationales.splice(answer,0,why);
    questions.push({id:exerciseId,part:5,position:i,topic:meta.topic,subtype:c.title,difficulty:c.advanced ? 'hard' : meta.level,
      prompt,options,answer,explanation:why,rationales,caseIds:[id],senseIds:[],status:'needs_review',sourceId:originalSource.id,revision:1});
    return {
      id,title:c.title,usage:c.usage,formula:c.formula,signals:c.signals,note:c.note,frequency:c.advanced ? 'specialized' as const : 'common' as const,
      examples:[{en:c.examples[0],vi:c.examples[1]},{en:c.examples[2],vi:c.examples[3]}],exerciseIds:[exerciseId],
    };
  });
  return { lesson:{...meta,cases:useCases,status:'needs_review' as const,sourceId:originalSource.id,revision:1}, questions };
}
