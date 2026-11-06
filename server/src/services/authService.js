import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { generateDemoUpiId } from '../utils/refs.js';
import { toPublicUser } from '../utils/userDto.js';

const AVATAR_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#DC2626'];

export async function registerUser({ name, email, phone, password }) {
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');

  const normalizedPhone = phone.replace(/\s+/g, '');
  const existingPhone = await User.findOne({ phone: normalizedPhone });
  if (existingPhone) throw new AppError('Mobile number already registered', 409, 'DUPLICATE_PHONE');

  let demoUpiId = generateDemoUpiId(name);
  for (let i = 0; i < 5; i += 1) {
    const clash = await User.findOne({ demoUpiId });
    if (!clash) break;
    demoUpiId = generateDemoUpiId(name);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: normalizedPhone,
    passwordHash,
    demoUpiId,
    demoBalancePaise: env.initialDemoBalancePaise,
    avatarColor,
  });

  return toPublicUser(user);
}

export async function loginUser({ identifier, password }) {
  const id = identifier.trim().toLowerCase();
  const isEmail = id.includes('@') && !id.endsWith('@payflow');
  const query = isEmail ? { email: id } : { $or: [{ phone: identifier.trim() }, { demoUpiId: id }] };

  const user = await User.findOne(query).select('+passwordHash');
  if (!user) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  return toPublicUser(user);
}

export async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return toPublicUser(user);
}
