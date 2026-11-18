import type { Lesson } from '../../packages/shared/content';
import { originalSource } from '../grammar-builder';

type Example = [english: string, vietnamese: string];
type Usage = [key: string, title: string, context: string, pattern: string, signals: string, note: string,
  exampleOne: Example, exampleTwo: Example, frequency?: 'specialized'];
type Formula = [label: string, pattern: string, note: string];
type Comparison = [title: string, explanation: string];
type ErrorExample = [wrong: string, correct: string, why: string];

export const tenseReferences = [
  'https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/verb-phrases',
  'https://dictionary.cambridge.org/grammar/british-grammar/tenses-and-time',
];
export const grammarReference = 'https://dictionary.cambridge.org/grammar/british-grammar/';

export function guide(spec: {
  id: string; title: string; titleVi: string; topic?: string; level: Lesson['level']; summary: string;
  references?: string[]; formulas: Formula[]; uses: Usage[]; exceptions: string[];
  comparisons: Comparison[]; errors: ErrorExample[];
}): Lesson {
  const {formulas, uses, comparisons, errors, ...lesson} = spec;
  return {
    ...lesson, topic: spec.topic ?? 'Thì và thể', parts:[5,6,7],
    status:'needs_review', revision:1, sourceId:originalSource.id, references:spec.references ?? tenseReferences,
    formulas:formulas.map(([label, pattern, note]) => ({label, pattern, note})),
    cases:uses.map(([key, title, usage, formula, signals, note, first, second, frequency]) => ({
      id:spec.id+':'+key, title, usage, formula, signals, note, frequency:frequency ?? 'common',
      examples:[first,second].map(([en,vi])=>({en,vi})), exerciseIds:[],
    })),
    comparisons:comparisons.map(([title,text])=>({title,text})),
    errors:errors.map(([wrong,correct,why])=>({wrong,correct,why})),
  };
}
