import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8),
  }).refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3),
    password: z.string().min(1),
  }),
});

export const sendPaymentSchema = z.object({
  body: z.object({
    recipientId: z.string().min(1).optional(),
    recipientUpiId: z.string().optional(),
    recipientPhone: z.string().optional(),
    amountPaise: z.number().int().positive().optional(),
    amountRupees: z.union([z.number(), z.string()]).optional(),
    note: z.string().max(200).optional(),
    idempotencyKey: z.string().min(8).max(64),
    category: z.string().max(32).optional(),
  }),
});

export const refundSchema = z.object({
  body: z.object({
    transactionId: z.string().min(1),
    reason: z.string().max(300).optional(),
  }),
});

export const profilePatchSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    notificationPreferences: z
      .object({
        paymentSuccess: z.boolean().optional(),
        paymentFailed: z.boolean().optional(),
        incomingPayment: z.boolean().optional(),
        refundUpdates: z.boolean().optional(),
        promotions: z.boolean().optional(),
      })
      .optional(),
  }),
});

export const historyQuerySchema = z.object({
  query: z.object({
    q: z.string().optional(),
    direction: z.enum(['all', 'sent', 'received']).optional(),
    status: z.string().optional(),
    sort: z.enum(['newest', 'oldest']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});
