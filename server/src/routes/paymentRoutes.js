import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendPaymentSchema, historyQuerySchema } from '../validators/schemas.js';
import * as paymentService from '../services/paymentService.js';
import * as userService from '../services/userService.js';
import { User } from '../models/User.js';
import { rupeesToPaise } from '../utils/money.js';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

const router = Router();

router.use(requireAuth);

router.get('/receive', async (req, res, next) => {
  try {
    const payload = await userService.getReceivePayload(req.user._id);
    res.json({ success: true, ...payload });
  } catch (e) {
    next(e);
  }
});

router.post('/send', validate(sendPaymentSchema), async (req, res, next) => {
  try {
    let { recipientId, recipientUpiId, recipientPhone, amountPaise, amountRupees, note, idempotencyKey, category } =
      req.body;

    if (!recipientId) {
      const resolved = await userService.resolveRecipient(req.user._id, {
        upiId: recipientUpiId,
        phone: recipientPhone,
      });
      recipientId = resolved.id;
    }

    if (!amountPaise) {
      amountPaise = rupeesToPaise(amountRupees);
    }

    const txn = await paymentService.sendPayment(req.user._id, {
      recipientId,
      amountPaise,
      note,
      idempotencyKey,
      category,
    });

    const user = await User.findById(req.user._id);
    res.status(201).json({
      success: true,
      transaction: txn,
      demoBalancePaise: user.demoBalancePaise,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/history', validate(historyQuerySchema), async (req, res, next) => {
  try {
    const data = await paymentService.listHistory(req.user._id, req.query);
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const txn = await paymentService.getTransactionForUser(req.params.id, req.user._id);
    res.json({ success: true, transaction: txn });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/simulate-failure', async (req, res, next) => {
  try {
    if (env.isProduction) {
      throw new AppError('Not available in production', 404);
    }
    const txn = await paymentService.markTransactionFailed(
      req.params.id,
      req.user._id,
      req.body?.reason || 'Simulated failure for demo'
    );
    res.json({ success: true, transaction: txn });
  } catch (e) {
    next(e);
  }
});

export default router;
