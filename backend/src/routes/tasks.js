/**
 * Task Routes
 *
 * Tasks are nested under projects in the URL:
 * GET /api/projects/:projectId/tasks — tasks belong to a project
 *
 * But tasks are also accessible directly for operations on a single task:
 * GET /api/tasks/:id — get a task by ID (without needing the project ID)
 *
 * The dashboard endpoint is at /api/tasks/dashboard
 * (before /:id to avoid 'dashboard' being treated as an ID param)
 */

import { Router } from 'express';
import * as taskController from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';
import { taskValidation, validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// Dashboard — must be before /:id
router.get('/dashboard', taskController.getDashboard);

// Tasks nested under projects
router.get('/project/:projectId', [...taskValidation.filters, validate], taskController.listTasks);
router.post('/project/:projectId', [...taskValidation.create, validate], taskController.createTask);

// Individual task operations
router.get('/:id', taskController.getTask);
router.patch('/:id', [...taskValidation.update, validate], taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Comments
router.post('/:id/comments', taskController.addComment);

export default router;
