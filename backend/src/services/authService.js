/**
 * Authentication Service
 *
 * WHY A SERVICE LAYER?
 * The service layer contains BUSINESS LOGIC — the "what should happen"
 * decisions that don't belong in controllers (HTTP handling) or
 * the DB layer (SQL).
 *
 * This service handles:
 * - Password hashing (bcrypt)
 * - JWT creation
 * - Business rules: "you can't register with an existing email"
 *
 * The controller calls these functions and handles the HTTP response.
 * The service doesn't know it's being called via HTTP.
 * This makes services easy to test and reuse.
 *
 * BCRYPT EXPLAINED:
 * bcrypt is a password hashing algorithm specifically designed to be slow.
 * The "rounds" parameter (12) controls how many iterations are run.
 * Higher = slower to compute = harder to brute force.
 * 12 rounds takes ~300ms — fast enough for users, slow for attackers.
 *
 * JWT EXPLAINED:
 * A JWT has 3 parts: header.payload.signature
 * The payload contains the userId. The signature proves it wasn't tampered with.
 * Anyone can READ a JWT (it's base64 encoded, not encrypted).
 * Only the server can VERIFY it (it requires the secret).
 * Never put sensitive data (passwords, SSNs) in the payload.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import * as userQueries from '../db/userQueries.js';
import { createError } from '../middleware/errorHandler.js';

// Predefined avatar colors for new users
const AVATAR_COLORS = [
  '#4F46E5', '#0891B2', '#059669', '#D97706',
  '#DC2626', '#7C3AED', '#DB2777', '#0284C7',
];

/**
 * Register a new user.
 * Returns the created user and a JWT token.
 */
export async function register({ email, password, fullName }) {
  // Business rule: email must be unique
  const exists = await userQueries.emailExists(email);
  if (exists) {
    throw createError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
  }

  // Hash the password before storing
  // bcrypt.hash is async and CPU-intensive — don't block the event loop
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  // Pick a random avatar color for visual variety
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await userQueries.createUser({
    email,
    passwordHash,
    fullName,
    avatarColor,
  });

  const token = createToken(user.id);

  return { user, token };
}

/**
 * Authenticate a user with email and password.
 * Returns the user and a JWT token.
 *
 * SECURITY NOTE on timing attacks:
 * We always call bcrypt.compare even if the user doesn't exist.
 * If we returned immediately for "user not found", attackers could
 * measure the response time to determine if an email is registered.
 * bcrypt.compare against a dummy hash takes the same time.
 */
export async function login({ email, password }) {
  const user = await userQueries.findUserByEmail(email);

  // The dummy hash ensures the same time is spent even for unknown emails
  const DUMMY_HASH = '$2a$12$LCY0MefVIEc3Dpeessa4KelrI3Pq/AKIf7X.MNmHYepGF3jGKUYi6';
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;

  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isValid) {
    // Same error message for "wrong email" and "wrong password"
    // — don't reveal which part was wrong (user enumeration)
    throw createError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = createToken(user.id);

  // Remove password hash before returning
  const { password_hash, ...safeUser } = user;

  return { user: safeUser, token };
}

/**
 * Creates a signed JWT for a user.
 * The payload contains only the userId — minimal data.
 */
function createToken(userId) {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Change a user's password.
 * Requires the current password for verification.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userQueries.findUserByEmail(
    // We need the email to get the hash — a bit awkward, so fetch by id with hash
    (await userQueries.findUserById(userId)).email
  );

  // Re-fetch with password hash (findUserById doesn't return it)
  const userWithHash = await userQueries.findUserByEmail(user.email);
  const isValid = await bcrypt.compare(currentPassword, userWithHash.password_hash);

  if (!isValid) {
    throw createError(401, 'Current password is incorrect', 'WRONG_PASSWORD');
  }

  const newHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await userQueries.updatePassword(userId, newHash);
}
