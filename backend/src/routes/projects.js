/**
 * Project Routes
 *
 * REST API design: resources and their actions mapped to HTTP verbs.
 *
 * GET    /api/projects          → list all projects for current user
 * POST   /api/projects          → create a new project
 * GET    /api/projects/:id      → get a single project
 * PATCH  /api/projects/:id      → update a project
 * DELETE /api/projects/:id      → delete a project
 * POST   /api/projects/:id/members        → add a member
 * DELETE /api/projects/:id/members/:userId → remove a member
 *
 * All routes require authentication (authenticate middleware).
 * Authorization (can this user do this action?) is in the service layer.
 */

import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { projectValidation, validate } from '../middleware/validate.js';

const router = Router();

// All project routes require auth — apply once at the router level
router.use(authenticate);

router.get('/', projectController.listProjects);
router.post('/', [...projectValidation.create, validate], projectController.createProject);
router.get('/:id', projectController.getProject);
router.patch('/:id', [...projectValidation.update, validate], projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Member management
router.post('/:id/members', projectController.addMember);
router.delete('/:id/members/:userId', projectController.removeMember);

export default router;
