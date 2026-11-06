import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { unauthorized } from '../utils/errors.js';

const COOKIE_NAME = 'payflow_token';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
  });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = req.cookies?.[COOKIE_NAME] || bearer;
    if (!token) throw unauthorized();

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) throw unauthorized();

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch {
    next(unauthorized());
  }
}

export { COOKIE_NAME };
