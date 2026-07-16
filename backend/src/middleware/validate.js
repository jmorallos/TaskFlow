/**
 * Validation Middleware
 *
 * We use express-validator to define rules and check them.
 * This file contains:
 * 1. A `validate` function that checks results and calls next(error)
 * 2. Reusable rule sets for common validations
 *
 * WHY VALIDATE IN MIDDLEWARE?
 * Validation before the controller runs means:
 * - Controllers always receive clean, valid data
 * - Validation rules are declarative and reusable
 * - Separation of concerns: controller focuses on logic, not validation
 *
 * DEFENSE IN DEPTH:
 * We validate at the API level (here), but the DB also has constraints.
 * Both layers protect data integrity independently.
 */

import { validationResult, body, param, query as queryValidator } from 'express-validator';

/**
 * Run after validation rules. Checks results and passes errors to error handler.
 * Always use this as the last item in a validation middleware array.
 *
 * @example
 * router.post('/users', [
 *   body('email').isEmail(),
 *   body('password').isLength({ min: 8 }),
 *   validate,           // ← catches errors from above
 * ], userController.create);
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors as a field → message map for easy frontend display
    const formatted = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg;
      return acc;
    }, {});

    const error = new Error('Validation failed');
    error.type = 'validation';
    error.errors = formatted;
    return next(error);
  }
  next();
}

// ── Reusable Validation Rule Sets ─────────────────────────────

export const authValidation = {
  register: [
    body('email')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(), // Lowercases, removes dots in gmail, etc.
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  ],

  login: [
    body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
};

export const projectValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Project name is required (max 100 chars)'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description max 500 characters'),
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Project name max 100 chars'),
    body('status')
      .optional()
      .isIn(['active', 'archived', 'completed']).withMessage('Invalid status'),
  ],
};

export const taskValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 }).withMessage('Task title is required (max 200 chars)'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'in_review', 'done']).withMessage('Invalid status'),
    body('assigneeId')
      .optional()
      .isInt({ min: 1 }).withMessage('Invalid assignee ID'),
    body('dueDate')
      .optional()
      .isISO8601().withMessage('Due date must be a valid date'),
  ],

  update: [
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'in_review', 'done']).withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  ],

  filters: [
    queryValidator('status')
      .optional()
      .isIn(['todo', 'in_progress', 'in_review', 'done']).withMessage('Invalid status filter'),
    queryValidator('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority filter'),
    queryValidator('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
};
