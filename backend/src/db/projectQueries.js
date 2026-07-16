/**
 * Project Database Queries
 *
 * Notice the JOIN patterns here. Real applications almost always
 * need to join tables to return useful data. For example, when
 * listing projects, the UI needs member avatars and task counts —
 * not just the project row itself.
 *
 * Aggregating in SQL (COUNT, GROUP BY) is almost always faster
 * than fetching rows and counting in JavaScript.
 */

import { query } from './pool.js';

/**
 * Get all projects accessible by a user.
 * Includes projects they own AND projects they're a member of.
 *
 * The LEFT JOIN with task counts is done in a subquery to keep
 * the main query readable. PostgreSQL optimizes this well.
 */
export async function getProjectsForUser(userId) {
  const { rows } = await query(
    `SELECT
       p.id,
       p.name,
       p.description,
       p.color,
       p.status,
       p.owner_id,
       p.created_at,
       pm.role                           AS user_role,

       -- Aggregate task counts per status using FILTER — cleaner than CASE WHEN
       COUNT(t.id) FILTER (WHERE t.status = 'todo')        AS todo_count,
       COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
       COUNT(t.id) FILTER (WHERE t.status = 'done')        AS done_count,
       COUNT(t.id)                                         AS total_tasks,

       -- Member count for display
       (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) AS member_count

     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
     LEFT JOIN tasks t ON t.project_id = p.id
     GROUP BY p.id, pm.role
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Get a single project with its members.
 * Returns null if not found or user doesn't have access.
 */
export async function getProjectById(projectId, userId) {
  // First check the project exists and user has access
  const { rows: projectRows } = await query(
    `SELECT
       p.id, p.name, p.description, p.color, p.status, p.owner_id, p.created_at, p.updated_at,
       pm.role AS user_role
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
     WHERE p.id = $1`,
    [projectId, userId]
  );

  if (!projectRows[0]) return null;

  // Get all members
  const { rows: memberRows } = await query(
    `SELECT
       u.id, u.full_name, u.avatar_color, u.email,
       pm.role, pm.joined_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.joined_at ASC`,
    [projectId]
  );

  return { ...projectRows[0], members: memberRows };
}

export async function createProject({ ownerId, name, description, color }) {
  const client = await (await import('./pool.js')).getClient();

  try {
    await client.query('BEGIN');

    // Create the project
    const { rows: [project] } = await client.query(
      `INSERT INTO projects (owner_id, name, description, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ownerId, name, description, color]
    );

    // Add the creator as an admin member automatically
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [project.id, ownerId]
    );

    await client.query('COMMIT');
    return project;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateProject(projectId, { name, description, color, status }) {
  const { rows } = await query(
    `UPDATE projects
     SET
       name        = COALESCE($2, name),
       description = COALESCE($3, description),
       color       = COALESCE($4, color),
       status      = COALESCE($5, status)
     WHERE id = $1
     RETURNING *`,
    [projectId, name, description, color, status]
  );
  return rows[0] || null;
}

export async function deleteProject(projectId) {
  // CASCADE on FK constraints handles deleting members, tasks, etc.
  await query('DELETE FROM projects WHERE id = $1', [projectId]);
}

export async function addProjectMember(projectId, userId, role = 'member') {
  const { rows } = await query(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
     RETURNING *`,
    [projectId, userId, role]
  );
  return rows[0];
}

export async function removeProjectMember(projectId, userId) {
  await query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
}

export async function getUserRoleInProject(projectId, userId) {
  const { rows } = await query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return rows[0]?.role || null;
}
