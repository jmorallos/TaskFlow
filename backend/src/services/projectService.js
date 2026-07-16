/**
 * Project Service
 *
 * This layer handles the business logic and authorization rules
 * for projects. The key questions here are:
 *
 * - "Is this user allowed to do this action on this project?"
 * - "What are the side effects of this action?"
 * - "What data transformations are needed?"
 *
 * Authorization here means: does this authenticated user have
 * the right ROLE in this specific project to do this action?
 * (Not just "are they logged in?" — that's handled by the auth middleware)
 */

import * as projectQueries from '../db/projectQueries.js';
import * as userQueries from '../db/userQueries.js';
import { createError } from '../middleware/errorHandler.js';

// Role hierarchy: admins can do everything members can, etc.
const ROLE_LEVELS = { viewer: 1, member: 2, admin: 3 };

/**
 * Check if a user has at least the required role in a project.
 * Throws a 403 error if not.
 */
async function requireRole(projectId, userId, minRole) {
  const role = await projectQueries.getUserRoleInProject(projectId, userId);
  if (!role) {
    throw createError(404, 'Project not found or access denied', 'NOT_FOUND');
  }
  if (ROLE_LEVELS[role] < ROLE_LEVELS[minRole]) {
    throw createError(403, `This action requires ${minRole} role`, 'INSUFFICIENT_ROLE');
  }
  return role;
}

export async function listProjects(userId) {
  return projectQueries.getProjectsForUser(userId);
}

export async function getProject(projectId, userId) {
  const project = await projectQueries.getProjectById(projectId, userId);
  if (!project) {
    throw createError(404, 'Project not found', 'NOT_FOUND');
  }
  return project;
}

export async function createProject(userId, { name, description, color }) {
  return projectQueries.createProject({
    ownerId: userId,
    name,
    description,
    color: color || '#4F46E5',
  });
}

export async function updateProject(projectId, userId, updates) {
  // Must be admin to update project settings
  await requireRole(projectId, userId, 'admin');
  const project = await projectQueries.updateProject(projectId, updates);
  if (!project) throw createError(404, 'Project not found', 'NOT_FOUND');
  return project;
}

export async function deleteProject(projectId, userId) {
  // Only the owner can delete a project
  const project = await projectQueries.getProjectById(projectId, userId);
  if (!project) throw createError(404, 'Project not found', 'NOT_FOUND');
  if (project.owner_id !== userId) {
    throw createError(403, 'Only the project owner can delete a project', 'FORBIDDEN');
  }
  await projectQueries.deleteProject(projectId);
}

export async function addMember(projectId, requestingUserId, { email, role }) {
  await requireRole(projectId, requestingUserId, 'admin');

  const targetUser = await userQueries.findUserByEmail(email);
  if (!targetUser) throw createError(404, 'User not found', 'USER_NOT_FOUND');

  return projectQueries.addProjectMember(projectId, targetUser.id, role);
}

export async function removeMember(projectId, requestingUserId, targetUserId) {
  const project = await projectQueries.getProjectById(projectId, requestingUserId);
  if (!project) throw createError(404, 'Project not found', 'NOT_FOUND');

  // Can remove if: you're an admin, OR you're removing yourself
  const isAdmin = project.user_role === 'admin';
  const isSelf = requestingUserId === parseInt(targetUserId);

  if (!isAdmin && !isSelf) {
    throw createError(403, 'Only admins can remove other members', 'FORBIDDEN');
  }

  // Can't remove the owner
  if (project.owner_id === parseInt(targetUserId)) {
    throw createError(400, 'Cannot remove the project owner', 'CANNOT_REMOVE_OWNER');
  }

  await projectQueries.removeProjectMember(projectId, targetUserId);
}
