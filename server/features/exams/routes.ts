import { Router } from 'express';
import { z } from 'zod';
import type { Store } from '../../core/db';
import { availability, finishExam, getExam, mistakes, recentExams, saveAnswer, setFlag, startExam } from './exam';
import { difficulty,id,part } from '../../../packages/shared/content';

export function examRouter(store:Store) {
  const router=Router();
  router.get('/exam/availability',(_req,res)=>res.json(availability(store)));
  router.get('/exam',(_req,res)=>res.json(recentExams(store)));
  router.get('/mistakes',(_req,res)=>res.json(mistakes(store)));
  router.post('/exam',(req,res)=>res.status(201).json(startExam(store,z.object({
    mode:z.enum(['practice','mini','reading','half','full']),part:part.optional(),
    topic:z.string().max(100).optional(),difficulty:difficulty.optional(),length:z.number().int().min(1).max(100).optional(),
  }).parse(req.body))));
  router.get('/exam/:id',(req,res)=>res.json(getExam(store,z.uuid().parse(req.params.id))));
  router.post('/exam/:id/answer',(req,res)=>{
    const input=z.object({questionId:id,selected:z.number().int().min(0).max(3)}).parse(req.body);
    saveAnswer(store,z.uuid().parse(req.params.id),input.questionId,input.selected);
    res.json({saved:true});
  });
  router.post('/exam/:id/flag',(req,res)=>{
    const input=z.object({questionId:id,flag:z.boolean()}).parse(req.body);
    setFlag(store,z.uuid().parse(req.params.id),input.questionId,input.flag);
    res.json({saved:true});
  });
  router.post('/exam/:id/finish',(req,res)=>res.json(finishExam(store,z.uuid().parse(req.params.id))));
  return router;
}
