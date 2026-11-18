import { Router } from 'express';

export function aiRouter() {
  const router=Router();
  router.get('/ai/status',(_req,res)=>res.json({
    connected:false,available:false,usage:'disabled',
    reason:'TOEIC Bloom chưa xác thực được phiên Sign in with ChatGPT trên thiết bị. Hiện chưa thể kết nối tài khoản hoặc hỏi AI.',
  }));
  return router;
}
