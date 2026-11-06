import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as notificationService from '../services/notificationService.js';
import { AppError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await notificationService.listNotifications(req.user._id, { page, limit });
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user._id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const item = await notificationService.markRead(req.user._id, req.params.id);
    if (!item) throw new AppError('Notification not found', 404);
    res.json({ success: true, notification: item });
  } catch (e) {
    next(e);
  }
});

export default router;
