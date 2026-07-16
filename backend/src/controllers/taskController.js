/**
 * Task Controller
 */

import * as taskService from '../services/taskService.js';

export async function listTasks(req, res, next) {
  try {
    const { status, assigneeId, priority, search, page, limit } = req.query;
    const tasks = await taskService.listTasks(
      parseInt(req.params.projectId),
      req.user.id,
      { status, assigneeId, priority, search, page, limit }
    );
    res.json({ data: { tasks } });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req, res, next) {
  try {
    const task = await taskService.getTask(parseInt(req.params.id), req.user.id);
    res.json({ data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req, res, next) {
  try {
    const { title, description, assigneeId, priority, dueDate } = req.body;
    const task = await taskService.createTask(
      parseInt(req.params.projectId),
      req.user.id,
      { title, description, assigneeId, priority, dueDate }
    );
    res.status(201).json({ data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req, res, next) {
  try {
    const task = await taskService.updateTask(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.json({ data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req, res, next) {
  try {
    await taskService.deleteTask(parseInt(req.params.id), req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const comment = await taskService.addComment(
      parseInt(req.params.id),
      req.user.id,
      req.body.content
    );
    res.status(201).json({ data: { comment } });
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await taskService.getDashboardData(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
