import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profilePatchSchema } from '../validators/schemas.js';
import * as userService from '../services/userService.js';
import { parsePayUri } from '../utils/payUri.js';

const router = Router();

router.use(requireAuth);

router.get('/search', async (req, res, next) => {
  try {
    const users = await userService.searchUsers(req.user._id, req.query.q);
    res.json({ success: true, users });
  } catch (e) {
    next(e);
  }
});

router.get('/resolve', async (req, res, next) => {
  try {
    const user = await userService.resolveRecipient(req.user._id, {
      upiId: req.query.upiId,
      phone: req.query.phone,
    });
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
});

router.post('/parse-qr', async (req, res, next) => {
  try {
    const parsed = parsePayUri(req.body?.payload || '');
    if (!parsed.ok) {
      return res.status(400).json({ success: false, error: { message: parsed.error } });
    }
    const user = await userService.resolveRecipient(req.user._id, { upiId: parsed.upiId });
    res.json({
      success: true,
      parsed: { upiId: parsed.upiId, amountPaise: parsed.amountPaise, note: parsed.note },
      recipient: user,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/profile', async (req, res, next) => {
  try {
    const { toPublicUser } = await import('../utils/userDto.js');
    res.json({ success: true, user: toPublicUser(req.user) });
  } catch (e) {
    next(e);
  }
});

router.patch('/profile', validate(profilePatchSchema), async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
});

export default router;
