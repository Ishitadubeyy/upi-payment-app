import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import * as authService from '../services/authService.js';
import { requireAuth, signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const user = await authService.registerUser({ name, email, phone, password });
    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.status(201).json({ success: true, user, token, demoNote: 'Phone verification is simulated in this demo.' });
  } catch (e) {
    next(e);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const user = await authService.loginUser(req.body);
    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.json({ success: true, user, token });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.userId);
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', requireAuth, (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

export default router;
