/**
 * Task Service
 *
 * Tasks belong to projects, so many operations here involve checking
 * that the user has access to the parent project first.
 *
 * This demonstrates a common pattern: "has access to parent resource"
 * checks before acting on a child resource.
 */

import * as taskQueries from '../db/taskQueries.js';
import * as projectQueries from '../db/projectQueries.js';
import { createError } from '../middleware/errorHandler.js';

/**
 * Check that a user is a member of the project containing this task.
 * Returns the user's role if they have access.
 */
async function requireProjectAccess(projectId, userId) {
  const role = await projectQueries.getUserRoleInProject(projectId, userId);
  if (!role) {
    throw createError(403, 'You are not a member of this project', 'FORBIDDEN');
  }
  return role;
}

export async function listTasks(projectId, userId, filters) {
  await requireProjectAccess(projectId, userId);
  return taskQueries.getTasksForProject(projectId, filters);
}

export async function getTask(taskId, userId) {
  const task = await taskQueries.getTaskById(taskId);
  if (!task) throw createError(404, 'Task not found', 'NOT_FOUND');

  await requireProjectAccess(task.project_id, userId);
  return task;
}

export async function createTask(projectId, userId, taskData) {
  const role = await requireProjectAccess(projectId, userId);

  // Viewers can't create tasks
  if (role === 'viewer') {
    throw createError(403, 'Viewers cannot create tasks', 'FORBIDDEN');
  }

  return taskQueries.createTask({
    projectId,
    creatorId: userId,
    ...taskData,
  });
}

export async function updateTask(taskId, userId, updates) {
  const task = await taskQueries.getTaskById(taskId);
  if (!task) throw createError(404, 'Task not found', 'NOT_FOUND');

  const role = await requireProjectAccess(task.project_id, userId);
  if (role === 'viewer') throw createError(403, 'Viewers cannot update tasks', 'FORBIDDEN');

  return taskQueries.updateTask(taskId, updates);
}

export async function deleteTask(taskId, userId) {
  const task = await taskQueries.getTaskById(taskId);
  if (!task) throw createError(404, 'Task not found', 'NOT_FOUND');

  const role = await requireProjectAccess(task.project_id, userId);

  // Can delete if: you're an admin, OR you created the task
  if (role !== 'admin' && task.creator_id !== userId) {
    throw createError(403, 'Only admins or the task creator can delete tasks', 'FORBIDDEN');
  }

  await taskQueries.deleteTask(taskId);
}

export async function addComment(taskId, userId, content) {
  const task = await taskQueries.getTaskById(taskId);
  if (!task) throw createError(404, 'Task not found', 'NOT_FOUND');

  await requireProjectAccess(task.project_id, userId);

  return taskQueries.addComment({ taskId, authorId: userId, content });
}

export async function getDashboardData(userId) {
  const [stats, recentTasks] = await Promise.all([
    taskQueries.getTaskStatsForUser(userId),
    taskQueries.getRecentTasksForUser(userId, 8),
  ]);

  return { stats, recentTasks };
}
