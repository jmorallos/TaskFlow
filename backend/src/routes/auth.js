/**
 * Auth Routes
 *
 * Routes files should be pure URL mapping.
 * They declare: "this URL + HTTP method → this middleware chain → this controller"
 *
 * Reading a route file, you should understand the full API surface at a glance.
 *
 * MIDDLEWARE CHAIN PATTERN:
 * router.post('/path', [middleware1, middleware2, validate], controller)
 *
 * Express runs them left to right. If any calls next(error), the chain stops
 * and the error handler runs.
 */

import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authValidation } from '../middleware/validate.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public routes (no auth required)
router.post('/register', [...authValidation.register, validate], authController.register);
router.post('/login', [...authValidation.login, validate], authController.login);

// Protected routes (require valid JWT)
router.get('/me', authenticate, authController.me);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
