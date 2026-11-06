import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payflow_upi',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  maxPaymentPaise: Number(process.env.MAX_PAYMENT_PAISE) || 50_000_000,
  initialDemoBalancePaise: Number(process.env.INITIAL_DEMO_BALANCE_PAISE) || 10_000_000,
  useMongoTransactions: process.env.USE_MONGO_TRANSACTIONS !== 'false',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};
