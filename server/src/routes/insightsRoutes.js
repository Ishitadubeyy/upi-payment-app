import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as insightsService from '../services/insightsService.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', async (req, res, next) => {
  try {
    const summary = await insightsService.getSummary(req.user._id);
    res.json({ success: true, summary });
  } catch (e) {
    next(e);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const data = await insightsService.getMonthly(req.user._id);
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

export default router;
