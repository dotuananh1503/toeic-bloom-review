import { originalSource } from '../../grammar-builder';
import type { Lesson,Question } from '../../../packages/shared/content';

type Quiz = [lessonId:string,caseKey:string,prompt:string,answer:number,options:string[],rationales:string[]];
const practice: Quiz[] = [
  ['present-continuous','temporary','The main office is closed this week, so the team ___ from the temporary branch.',2,
    ['was working','work','is working','has work'],
    ['Was working places the activity in the past.','Work does not agree with the singular team in this sentence.','Is working describes an ongoing temporary arrangement this week.','Has work does not form a verb phrase for the activity.']],
  ['present-perfect','unfinished-period','As of today, the hiring committee ___ four interviews this month.',1,
    ['will conduct','has conducted','conduct','is conducting'],
    ['Will conduct describes future interviews.','Has conducted counts completed interviews up to the present.','Conduct does not match the singular committee in this sentence.','Is conducting presents an ongoing activity rather than the completed count.']],
  ['present-perfect-continuous','continuing','The technicians ___ for the source of the leak since eight, and they are still looking.',3,
    ['had looked','looked','have been looked','have been looking'],
    ['Had looked requires a past reference point.','Looked does not describe the activity continuing to now.','Have been looked uses a passive structure that does not fit the technicians as agents.','Have been looking emphasizes the continuing activity since eight.']],
  ['past-simple','completed','The courier ___ the parcel at 3:15 yesterday, according to the delivery record.',0,
    ['delivered','has delivered','delivers','will deliver'],
    ['Delivered is simple past with a finished time.','Has delivered does not fit the precise finished time.','Delivers normally describes a habit or schedule.','Will deliver points to the future.']],
  ['past-continuous','interrupt','The coordinator ___ name tags when the printer suddenly stopped.',2,
    ['prints','has printed','was printing','will print'],
    ['Prints suggests a present habit.','Has printed sets the reference point at the present.','Was printing provides the background activity interrupted by stopped.','Will print refers to the future.']],
  ['past-perfect','earlier','By the time the auditor arrived, all three clerks ___ the receipts.',1,
    ['have checked','had checked','had checking','will check'],
    ['Have checked uses a present reference point.','Had checked puts the completed checks before the past arrival.','Had checking is not the past perfect form.','Will check looks to the future.']],
  ['past-perfect-continuous','past-traces','The movers looked exhausted because they ___ furniture all morning before the break.',0,
    ['had been carrying','have been carrying','had been carried','will be carrying'],
    ['Had been carrying explains the fatigue by a previous period of activity.','Have been carrying looks back from the present.','Had been carried makes the movers recipients of the action.','Will be carrying looks forward.']],
  ['future-simple','decision','“The entry form is missing.” “I ___ another copy right now.”',3,
    ['had printed','have printed','was printing','will print'],
    ['Had printed requires an earlier past action.','Have printed says it is already completed.','Was printing is a past process.','Will print expresses a decision made in response to the news.']],
  ['future-continuous','future-point','At this time tomorrow, we ___ the candidates, so please use the other room.',2,
    ['interviewed','have interviewed','will be interviewing','had been interviewing'],
    ['Interviewed is in the past.','Have interviewed describes results up to the present.','Will be interviewing describes the activity in progress at the future time.','Had been interviewing refers to activity before a past point.']],
  ['future-perfect','deadline','By the time the exhibition opens, the technicians ___ all the lights.',1,
    ['have installed yesterday','will have installed','will have installing','installing'],
    ['Yesterday contradicts the future reference here and does not fit the present perfect.','Will have installed shows completion by the opening time.','Will have requires the past participle installed.','Installing lacks a finite verb.']],
  ['future-perfect-continuous','duration','By June, Anita ___ on the upgrade team for a full year, and she plans to continue.',0,
    ['will have been working','will be work','had been working','has been worked'],
    ['Will have been working gives the length of an activity at a future point.','Will be work does not form a continuous verb phrase.','Had been working looks back from a past point.','Has been worked is passive and does not describe Anita’s activity.']],
];

export function addTensePractice(lessons:Lesson[]) {
  const lookup = new Map(lessons.map(lesson=>[lesson.id,lesson]));
  const questions:Question[] = practice.map(([lessonId,caseKey,prompt,answer,options,details],index)=>{
    const lesson = lookup.get(lessonId);
    const caseId = lessonId+':'+caseKey;
    const usage = lesson?.cases.find(use=>use.id===caseId);
    if (!lesson || !usage) throw new Error('Missing tense practice case '+caseId);
    return {
      id:lessonId+':guide-practice',part:5,position:200+index,topic:lesson.topic,subtype:usage.title,difficulty:lesson.level,prompt,options,answer,
      explanation:details[answer],rationales:details,caseIds:[caseId],senseIds:[],status:'needs_review',sourceId:originalSource.id,revision:1,
    };
  });
  const annotated = lessons.map(lesson=>({
    ...lesson,cases:lesson.cases.map(use=>({...use,exerciseIds:[...use.exerciseIds,...questions.filter(q=>q.caseIds.includes(use.id)).map(q=>q.id)]})),
  }));
  return {lessons:annotated,questions};
}
