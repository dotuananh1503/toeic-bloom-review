import { z } from 'zod';
import { example, nonempty, type Lesson, type Provenance, type Question } from '../packages/shared/content';
import raw from './v33-grammar.json';

const chapterSchema = z.object({
  topic: z.tuple([nonempty, nonempty, z.enum(['Cơ bản', 'Trung cấp', 'Nâng cao']), z.string(), z.number()]),
  lesson: z.object({
    sub: nonempty, formulas: z.array(z.tuple([nonempty, nonempty, nonempty])).min(1),
    example: nonempty, translation: nonempty, tip: nonempty,
    question: nonempty, options: z.array(nonempty).length(4),
    correct: z.number().int().min(0).max(3), explain: nonempty,
  }),
  cases: z.array(z.object({ title: nonempty, pattern: nonempty, usage: nonempty, examples: z.array(example).min(2), tip: z.string() })).min(1),
  mistakes: z.array(z.tuple([nonempty, nonempty, nonempty])).min(1),
  notes: nonempty,
});

export const v33GrammarSource: Provenance = {
  id: 'bloom-v33-user-grammar',
  name: raw.file,
  url: 'urn:toeic-bloom:grammar:v3.3',
  version: 'V3.3',
  license: 'User-supplied material, local educational use',
  attribution: 'Bản tổng hợp ngữ pháp V3.3 do người dùng cung cấp. Dùng cho học tập cục bộ.',
  sha256: raw.sha256,
};
const difficultyByLevel = { 'Cơ bản': 'easy', 'Trung cấp': 'medium', 'Nâng cao': 'hard' } as const;

const chapters = [
  { id: 'word-forms', title: 'Word Forms', titleVi: 'Từ loại và cấu tạo từ', topic: 'Từ loại',
    uses: ['noun', 'adjectives', 'linking', 'adverb', 'adverb', 'auxiliary', 'participle'], quiz: 3,
    distractors: ['Clear là tính từ.', '', 'Clarity là danh từ.', 'Clearing là một dạng động từ hoặc danh từ và không diễn tả cách trình bày.'] },
  { id: 'verb-tenses', title: 'Overview of English Tenses', titleVi: 'Tổng quan 12 thì', topic: 'Thì và thể',
    uses: ['present-simple', 'present-continuous', 'past-simple', 'past-continuous', 'present-perfect-experience', 'present-perfect-result', 'present-perfect-continuous',
      'past-perfect', 'past-perfect-continuous', 'future-simple', 'going-to', 'future-continuous', 'future-perfect', 'future-perfect-continuous'],
    summary: 'Tổng quan 12 thì và be going to, với công thức nền tảng và bài luyện trọng tâm về Past Perfect.', quiz: 7,
    distractors: ['Completes là hiện tại đơn.', '', 'Has completed lấy hiện tại làm mốc.', 'Complete ở dạng nguyên mẫu, không diễn đạt việc hoàn tất trước một mốc quá khứ.'] },
  { id: 'passive-voice', title: 'Passive Voice', titleVi: 'Câu bị động', topic: 'Thể của động từ',
    uses: ['present-simple', 'past-simple', 'modals', 'present-perfect', 'continuous', 'past-perfect', 'nonfinite', 'two-objects'], quiz: 2,
    distractors: ['Process là động từ chủ động, trong khi hóa đơn là đối tượng được xử lý.', '', 'Processed đứng một mình sau must thì thiếu be.', 'Processing là dạng V-ing, không theo trực tiếp sau must.'] },
  { id: 'relative-clauses', title: 'Relative Clauses', titleVi: 'Mệnh đề quan hệ', topic: 'Mệnh đề',
    uses: ['person-subject', 'person-object', 'things', 'possession', 'relative-adverbs', 'defining', 'omitted-object', 'reduced'], quiz: 0,
    distractors: ['Which chỉ vật trong cấu trúc này.', 'Whom dùng ở vị trí tân ngữ.', 'Whose chỉ sở hữu và cần danh từ theo sau trong cấu trúc đang xét.', ''] },
  { id: 'conjunctions-prepositions', title: 'Conjunctions and Prepositions', titleVi: 'Liên từ và giới từ', topic: 'Từ nối và giới từ',
    uses: ['although', 'despite', 'however', 'because', 'therefore', 'whereas', 'condition', 'purpose'], quiz: 1,
    distractors: ['Although cần một mệnh đề.', '', 'However là trạng từ liên kết, không đứng trước cụm danh từ theo cách này.', 'Because cần một mệnh đề. Because of đi với danh từ nhưng chỉ nguyên nhân.'] },
  { id: 'conditionals', title: 'Conditional Sentences', titleVi: 'Câu điều kiện', topic: 'Mệnh đề',
    uses: ['zero', 'first', 'second', 'third', 'mixed-past', 'mixed-present', 'unless', 'had'], quiz: 3,
    distractors: ['Ship là nguyên mẫu và thiếu trợ động từ.', 'Will ship chỉ tương lai, trong khi yesterday chỉ quá khứ.', '', 'Shipped ở quá khứ đơn không diễn đạt kết quả giả định ở đây.'] },
  { id: 'comparisons-quantifiers', title: 'Comparisons and Quantifiers', titleVi: 'So sánh và số lượng', topic: 'So sánh và lượng từ',
    uses: ['comparative', 'superlative', 'equality', 'inferiority', 'correlative', 'too-enough', 'many-much', 'few-little'], quiz: 0,
    distractors: ['Efficient thiếu more trong cấu trúc so sánh hơn.', '', 'Most efficient là dạng so sánh nhất.', 'Efficiently là trạng từ, không làm bổ ngữ tính chất sau is trong câu này.'] },
  { id: 'verb-patterns-modals', title: 'Gerunds, Infinitives and Modals', titleVi: 'Động từ và động từ khuyết thiếu', topic: 'Động từ',
    uses: ['infinitive', 'gerund', 'object-infinitive', 'meaning-change', 'causative', 'obligation', 'possibility', 'modal-perfect', 'used-to'], quiz: 2,
    distractors: ['Complete thiếu to sau be required.', 'Completing không theo sau be required trong cấu trúc này.', '', 'Completed là dạng quá khứ hoặc phân từ, không phù hợp ở vị trí này.'] },
  { id: 'advanced-structures', title: 'Inversion and Advanced Structures', titleVi: 'Đảo ngữ và cấu trúc nâng cao', topic: 'Cấu trúc nâng cao',
    uses: ['not-only', 'negative-adverbs', 'only', 'no-sooner', 'subjunctive', 'parallelism', 'cleft', 'participial'], quiz: 0,
    distractors: ['She completed giữ trật tự chủ ngữ trước động từ.', '', 'She had completed không đảo trợ động từ lên trước she.', 'She has completed cũng giữ trật tự chủ ngữ trước trợ động từ.'] },
  { id: 'present-simple', title: 'Present Simple', titleVi: 'Thì hiện tại đơn', topic: 'Thì và thể',
    uses: ['habit', 'facts', 'stable', 'stative', 'timetable', 'time', 'conditional', 'conditional', 'instructions', 'performative', 'correspondence', 'narrative', 'commentary', 'headline'], quiz: 4,
    distractors: ['Start thiếu -s với chủ ngữ the conference.', '', 'Is starting always đặt always sai vị trí trong phương án này và không phù hợp với lịch được nêu.', 'Started chỉ quá khứ, trong khi next Friday chỉ tương lai.'] },
];

const distinct = <T>(items: T[], key: (item: T) => string) => [...new Map(items.map(item => [key(item), item])).values()];

export function incorporateV33(existing: { lesson: Lesson; questions: Question[] }[]) {
  const originals = new Map(existing.map(item => [item.lesson.id, item]));
  if (chapters.length !== raw.chapters.length) throw new Error('V3.3 chapter map and extraction have different lengths.');
  return chapters.map((meta, index) => {
    const input = chapterSchema.parse(raw.chapters[index]);
    if (input.cases.length !== meta.uses.length) throw new Error('V3.3 case map changed: ' + meta.id);
    const base = originals.get(meta.id);
    const quizId = meta.id + ':v33-quiz';
    const quizCaseId = meta.id + ':' + meta.uses[meta.quiz];
    const sourceCases = input.cases.map((use, i): Lesson['cases'][number] => ({
      id: meta.id + ':' + meta.uses[i],
      title: use.title, usage: use.usage, formula: use.pattern, note: use.tip || undefined,
      examples: use.examples, exerciseIds: i === meta.quiz ? [quizId] : [],
      frequency: input.topic[2] === 'Nâng cao' ? 'specialized' : 'common',
    }));
    const formulas = input.lesson.formulas.map(([label, pattern, note]) => ({ label, pattern, note }));
    const errors = input.mistakes.map(([wrong, correct, why]) => ({ wrong, correct, why }));
    const overviewNotes = [input.notes.replaceAll('**', ''), input.lesson.tip];
    const overviewExamples = [{ en: input.lesson.example.replace(/<\/?strong\b[^>]*>/g, ''), vi: input.lesson.translation }];
    const difficulty = difficultyByLevel[input.topic[2]];
    let lesson: Lesson;
    if (base) {
      const baseLesson = base.lesson;
      const existingCases = new Set(baseLesson.cases.map(use => use.id));
      if (sourceCases.some(use => !existingCases.has(use.id))) throw new Error('V3.3 references an unknown use case: ' + meta.id);
      lesson = {
        ...baseLesson, revision: baseLesson.revision + 1, supplementalSourceId: v33GrammarSource.id, overviewNotes, overviewExamples,
        formulas: distinct([...formulas, ...baseLesson.formulas], formula => formula.label + ':' + formula.pattern),
        errors: distinct([...errors, ...baseLesson.errors], mistake => mistake.wrong),
        cases: baseLesson.cases.map(use => {
          const matches = sourceCases.filter(v => v.id === use.id);
          if (!matches.length) return use;
          return {
            ...use,
            examples: distinct([...matches.flatMap(item => item.examples), ...use.examples], row => row.en),
            exerciseIds: [...use.exerciseIds, ...matches.flatMap(item => item.exerciseIds)],
            supplementalExplanations: matches.map(({ title, usage, formula, note }) => ({ title, usage, formula, note })),
          };
        }),
      };
    } else {
      lesson = {
        id: meta.id, title: meta.title, titleVi: meta.titleVi, topic: meta.topic, level: difficulty,
        summary: meta.summary ?? input.lesson.sub, parts: [5, 6, 7], status: 'needs_review', revision: 1,
        sourceId: v33GrammarSource.id, references: [], formulas, errors, overviewNotes, overviewExamples,
        cases: sourceCases, exceptions: [], comparisons: [],
      };
    }
    const quiz: Question = {
      id: quizId, part: 5, position: 100 + index, topic: lesson.topic,
      subtype: sourceCases[meta.quiz].title, difficulty, prompt: input.lesson.question,
      options: input.lesson.options, answer: input.lesson.correct, explanation: input.lesson.explain,
      rationales: meta.distractors.map((why, i) => i === input.lesson.correct ? input.lesson.explain : why),
      caseIds: [quizCaseId], senseIds: [], status: 'needs_review', sourceId: v33GrammarSource.id, revision: 1,
    };
    return { lesson, questions: [...(base?.questions ?? []), quiz] };
  });
}
