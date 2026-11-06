import { AppError } from '../utils/errors.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: err.errors },
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { message: `Duplicate ${field}`, code: 'DUPLICATE' },
    });
  }

  console.error('[error]', err.message);
  return res.status(500).json({
    success: false,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}
