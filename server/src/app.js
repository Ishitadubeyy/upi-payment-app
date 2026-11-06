import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import refundRoutes from './routes/refundRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import insightsRoutes from './routes/insightsRoutes.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const paymentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'PayFlow UPI', demo: true });
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/payments', paymentLimiter, paymentRoutes);
  app.use('/api/refunds', paymentLimiter, refundRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/insights', insightsRoutes);

  app.use(errorHandler);
  return app;
}
