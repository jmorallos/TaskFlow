/**
 * Project Controller
 *
 * Each function follows the same pattern:
 * - Extract from req (body, params, user)
 * - Call service
 * - Return response
 * - Pass errors to next()
 *
 * Note how ALL authorization ("can this user do this?") happens
 * in the service layer, not here. The controller doesn't need to know.
 */

import * as projectService from '../services/projectService.js';

export async function listProjects(req, res, next) {
  try {
    const projects = await projectService.listProjects(req.user.id);
    res.json({ data: { projects } });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject(
      parseInt(req.params.id),
      req.user.id
    );
    res.json({ data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { name, description, color } = req.body;
    const project = await projectService.createProject(req.user.id, {
      name, description, color
    });
    res.status(201).json({ data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const project = await projectService.updateProject(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.json({ data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    await projectService.deleteProject(parseInt(req.params.id), req.user.id);
    res.status(204).send(); // 204 No Content — success with no body
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const member = await projectService.addMember(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.status(201).json({ data: { member } });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    await projectService.removeMember(
      parseInt(req.params.id),
      req.user.id,
      parseInt(req.params.userId)
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
