/**
 * Auth Controller
 *
 * WHY IS THIS SO THIN?
 * Controllers should only:
 * 1. Extract data from req (body, params, query)
 * 2. Call the service
 * 3. Format and send the response
 *
 * Business logic belongs in services.
 * SQL belongs in the DB layer.
 * A thin controller is easier to test, read, and modify.
 *
 * RESPONSE FORMAT:
 * We use a consistent response shape across all endpoints:
 * Success: { data: { ... } }
 * Error: { error: "...", code: "..." }
 *
 * This consistency makes the frontend API client much simpler.
 */

import * as authService from '../services/authService.js';
import * as userQueries from '../db/userQueries.js';

export async function register(req, res, next) {
  try {
    const { email, password, fullName } = req.body;
    const { user, token } = await authService.register({ email, password, fullName });

    res.status(201).json({
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });

    res.json({ data: { user, token } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the current user. Used by the frontend to verify a stored token.
 * req.user is populated by the authenticate middleware.
 */
export async function me(req, res) {
  // req.user is already set by the authenticate middleware
  // We just format and return it
  res.json({ data: { user: req.user } });
}

export async function updateProfile(req, res, next) {
  try {
    const { fullName, bio, avatarColor } = req.body;
    const updated = await userQueries.updateUser(req.user.id, { fullName, bio, avatarColor });
    res.json({ data: { user: updated } });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    res.json({ data: { message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
}
