export const difficultyLabels = { easy:'Cơ bản',medium:'Trung cấp',hard:'Nâng cao' };

export type Feedback = { answer:number;explanation:string;rationales:string[];correct:boolean };

export function Options({options,selected,onSelect,disabled,answer}: {options:string[];selected?:number;onSelect:(value:number)=>void;disabled?:boolean;answer?:number}) {
  return <div className="options" role="group" aria-label="Phương án">
    {options.map((value,i)=><button type="button" lang="en" className={'option' + (i===answer ? ' right' : answer!==undefined && i===selected ? ' wrong' : '')} disabled={disabled} aria-pressed={selected===i} key={i} onClick={()=>onSelect(i)}><span>{'ABCD'[i]}</span>{value}</button>)}
  </div>;
}

export function Explanation({feedback}: {feedback:Feedback}) {
  return <div className={'notice' + (feedback.correct?'':' warn')} role="status"><strong>{feedback.correct ? 'Chính xác' : 'Đáp án ' + 'ABCD'[feedback.answer]}</strong><p>{feedback.explanation}</p>
    <ol type="A">{feedback.rationales.map((text,i)=><li key={i}>{text}</li>)}</ol></div>;
}
