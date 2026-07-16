/**
 * Authentication Middleware
 *
 * WHAT IS MIDDLEWARE?
 * In Express, middleware is a function that runs between receiving a request
 * and sending a response. It receives (req, res, next) and can:
 * - Modify req or res
 * - End the request-response cycle (res.json, res.send)
 * - Pass to the next middleware (next())
 * - Pass an error to error handling middleware (next(error))
 *
 * HOW JWT AUTH WORKS:
 * 1. User logs in → server creates a JWT signed with SECRET
 * 2. Client stores JWT and sends it in every request: "Authorization: Bearer <token>"
 * 3. This middleware reads the header, verifies the JWT, and attaches the user to req
 * 4. Route handlers can then access req.user
 *
 * WHY ATTACH TO req?
 * Express's req object flows through all middleware for a given request.
 * Attaching req.user here means every subsequent middleware and controller
 * can access the authenticated user without re-verifying the token.
 */

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { findUserById } from '../db/userQueries.js';

/**
 * Verifies the JWT token and attaches the user to req.
 * Apply to any route that requires authentication.
 */
export async function authenticate(req, res, next) {
  try {
    // Standard Bearer token format: "Authorization: Bearer eyJhbGc..."
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];

    // jwt.verify throws if the token is invalid or expired
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      // Provide specific errors so the client can handle them appropriately
      // (e.g., redirect to login on EXPIRED_TOKEN)
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      return res.status(401).json({ error: 'Invalid or expired token', code });
    }

    // Verify the user still exists in the database
    // This catches cases where a user was deleted after receiving a token
    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Attach user to request for use in controllers
    req.user = user;
    next();
  } catch (err) {
    next(err); // Pass unexpected errors to the error handler
  }
}

/**
 * Optional authentication — doesn't block if no token.
 * Useful for endpoints that return different data for logged-in users
 * vs. anonymous users.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await findUserById(payload.userId);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}
