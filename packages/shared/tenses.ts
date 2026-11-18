export const tenseTopic = 'Thì và thể';

export const tenseGroups = [
  { name:'Hiện tại', ids:['present-simple','present-continuous','present-perfect','present-perfect-continuous'] },
  { name:'Quá khứ', ids:['past-simple','past-continuous','past-perfect','past-perfect-continuous'] },
  { name:'Tương lai', ids:['future-simple','future-continuous','future-perfect','future-perfect-continuous'] },
] as const;

export const tenseOverviewId = 'verb-tenses';
export const isTenseLesson = (id:string) => tenseGroups.some(group=>group.ids.some(lessonId=>lessonId===id));
