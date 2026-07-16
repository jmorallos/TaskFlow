/**
 * User Database Queries
 *
 * WHY SEPARATE QUERY FILES?
 * This layer's only job is SQL. It takes typed inputs, runs parameterized
 * queries, and returns plain JavaScript objects. It knows nothing about:
 * - HTTP (no req/res here)
 * - Business logic (no "is this user allowed to do X?")
 * - Password hashing (that's the service layer's job)
 *
 * Benefits:
 * - You can test DB queries independently from business logic
 * - SQL is readable and easy to optimize
 * - Moving to a different DB means changing only this layer
 *
 * ABOUT THE SQL:
 * We use RETURNING clauses to get the inserted/updated row back in one
 * query instead of doing INSERT then SELECT. More efficient.
 */

import { query } from './pool.js';

/**
 * Find a user by email address.
 * Used during login to look up the user before checking their password.
 * Returns null if not found.
 */
export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, full_name, avatar_color, bio, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

/**
 * Find a user by ID.
 * Notice we don't select password_hash here — the caller doesn't need it.
 * Never return more data than needed.
 */
export async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, email, full_name, avatar_color, bio, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Create a new user.
 * Note: we accept password_hash, not a plain password.
 * Hashing happens in the service layer before calling this.
 */
export async function createUser({ email, passwordHash, fullName, avatarColor }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, avatar_color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, avatar_color, bio, created_at`,
    [email, passwordHash, fullName, avatarColor]
  );
  return rows[0];
}

/**
 * Update a user's profile.
 * Only updates the fields the user provides (partial update pattern).
 *
 * Why not just UPDATE all fields?
 * If you always update all fields, you need to know the current value of
 * every field before updating. Selective updates are simpler and safer.
 */
export async function updateUser(id, { fullName, bio, avatarColor }) {
  const { rows } = await query(
    `UPDATE users
     SET
       full_name    = COALESCE($2, full_name),
       bio          = COALESCE($3, bio),
       avatar_color = COALESCE($4, avatar_color)
     WHERE id = $1
     RETURNING id, email, full_name, avatar_color, bio, updated_at`,
    [id, fullName, bio, avatarColor]
  );
  return rows[0] || null;
}

/**
 * Update a user's password.
 * Separate from profile update — different authorization requirements.
 */
export async function updatePassword(id, newPasswordHash) {
  await query(
    'UPDATE users SET password_hash = $2 WHERE id = $1',
    [id, newPasswordHash]
  );
}

/**
 * Check if an email already exists.
 * Used during registration to give a clear "email taken" error
 * before attempting the INSERT.
 */
export async function emailExists(email) {
  const { rows } = await query(
    'SELECT 1 FROM users WHERE email = $1',
    [email]
  );
  return rows.length > 0;
}
