import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { refundSchema } from '../validators/schemas.js';
import * as refundService from '../services/refundService.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(refundSchema), async (req, res, next) => {
  try {
    const result = await refundService.requestRefund(req.user._id, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const refund = await refundService.getRefund(req.params.id, req.user._id);
    res.json({ success: true, refund });
  } catch (e) {
    next(e);
  }
});

export default router;
