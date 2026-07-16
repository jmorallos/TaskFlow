/**
 * Task Database Queries
 *
 * The getTasks query is the most complex here — it demonstrates
 * dynamic query building for search and filter functionality.
 *
 * DYNAMIC QUERY BUILDING:
 * When users can filter by status, assignee, priority, and search text,
 * you need to build different WHERE clauses at runtime.
 * We do this by pushing conditions into an array and joining them with AND.
 * This is safer than string concatenation and cleaner than many ORM approaches.
 */

import { query } from './pool.js';

/**
 * Get tasks for a project with optional filters.
 *
 * @param {number} projectId
 * @param {object} filters - Optional: { status, assigneeId, priority, search, page, limit }
 */
export async function getTasksForProject(projectId, filters = {}) {
  const {
    status,
    assigneeId,
    priority,
    search,
    page = 1,
    limit = 50,
  } = filters;

  // Build parameterized WHERE conditions dynamically
  // params[0] is always the projectId ($1 in SQL)
  const params = [projectId];
  const conditions = ['t.project_id = $1'];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (assigneeId) {
    params.push(assigneeId);
    conditions.push(`t.assignee_id = $${params.length}`);
  }

  if (priority) {
    params.push(priority);
    conditions.push(`t.priority = $${params.length}`);
  }

  if (search) {
    // ILIKE is case-insensitive LIKE in PostgreSQL
    // The % wildcards allow matching anywhere in the string
    // For production, consider PostgreSQL full-text search (tsvector)
    // which is faster and supports stemming/ranking
    params.push(`%${search}%`);
    conditions.push(
      `(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`
    );
  }

  // Pagination
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const limitParam = `$${params.length - 1}`;
  const offsetParam = `$${params.length}`;

  const whereClause = conditions.join(' AND ');

  const { rows } = await query(
    `SELECT
       t.id,
       t.title,
       t.description,
       t.status,
       t.priority,
       t.due_date,
       t.position,
       t.created_at,
       t.updated_at,
       t.project_id,
       t.creator_id,
       t.assignee_id,

       -- Embed assignee info so the frontend doesn't need extra requests
       assignee.full_name    AS assignee_name,
       assignee.avatar_color AS assignee_avatar_color,

       -- Creator info
       creator.full_name     AS creator_name,

       -- Comment count for display
       COUNT(tc.id)          AS comment_count,

       -- Tags as JSON array
       COALESCE(
         JSON_AGG(
           DISTINCT JSONB_BUILD_OBJECT('id', tg.id, 'name', tg.name, 'color', tg.color)
         ) FILTER (WHERE tg.id IS NOT NULL),
         '[]'
       ) AS tags

     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assignee_id
     LEFT JOIN users creator  ON creator.id  = t.creator_id
     LEFT JOIN task_comments tc ON tc.task_id = t.id
     LEFT JOIN task_tags tt ON tt.task_id = t.id
     LEFT JOIN tags tg ON tg.id = tt.tag_id
     WHERE ${whereClause}
     GROUP BY t.id, assignee.full_name, assignee.avatar_color, creator.full_name
     ORDER BY t.position ASC, t.created_at ASC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return rows;
}

/**
 * Get a single task with comments and tags.
 */
export async function getTaskById(taskId) {
  const { rows: taskRows } = await query(
    `SELECT
       t.*,
       assignee.full_name    AS assignee_name,
       assignee.avatar_color AS assignee_avatar_color,
       creator.full_name     AS creator_name,
       COALESCE(
         JSON_AGG(
           DISTINCT JSONB_BUILD_OBJECT('id', tg.id, 'name', tg.name, 'color', tg.color)
         ) FILTER (WHERE tg.id IS NOT NULL),
         '[]'
       ) AS tags
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assignee_id
     LEFT JOIN users creator  ON creator.id  = t.creator_id
     LEFT JOIN task_tags tt ON tt.task_id = t.id
     LEFT JOIN tags tg ON tg.id = tt.tag_id
     WHERE t.id = $1
     GROUP BY t.id, assignee.full_name, assignee.avatar_color, creator.full_name`,
    [taskId]
  );

  if (!taskRows[0]) return null;

  // Get comments separately (simpler than another nested aggregation)
  const { rows: comments } = await query(
    `SELECT
       tc.id, tc.content, tc.created_at, tc.updated_at,
       u.id AS author_id, u.full_name AS author_name, u.avatar_color AS author_avatar_color
     FROM task_comments tc
     JOIN users u ON u.id = tc.author_id
     WHERE tc.task_id = $1
     ORDER BY tc.created_at ASC`,
    [taskId]
  );

  return { ...taskRows[0], comments };
}

export async function createTask({ projectId, creatorId, title, description, assigneeId, priority, dueDate, position }) {
  const { rows } = await query(
    `INSERT INTO tasks (project_id, creator_id, title, description, assignee_id, priority, due_date, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [projectId, creatorId, title, description, assigneeId, priority, dueDate, position || 0]
  );
  return rows[0];
}

export async function updateTask(taskId, updates) {
  const { title, description, status, priority, assigneeId, dueDate, position } = updates;
  const { rows } = await query(
    `UPDATE tasks
     SET
       title       = COALESCE($2, title),
       description = COALESCE($3, description),
       status      = COALESCE($4, status),
       priority    = COALESCE($5, priority),
       assignee_id = COALESCE($6, assignee_id),
       due_date    = COALESCE($7, due_date),
       position    = COALESCE($8, position)
     WHERE id = $1
     RETURNING *`,
    [taskId, title, description, status, priority, assigneeId, dueDate, position]
  );
  return rows[0] || null;
}

export async function deleteTask(taskId) {
  await query('DELETE FROM tasks WHERE id = $1', [taskId]);
}

export async function addComment({ taskId, authorId, content }) {
  const { rows } = await query(
    `INSERT INTO task_comments (task_id, author_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [taskId, authorId, content]
  );
  return rows[0];
}

export async function deleteComment(commentId) {
  await query('DELETE FROM task_comments WHERE id = $1', [commentId]);
}

/**
 * Get task statistics for a user's dashboard.
 * Returns counts grouped by status for "my tasks".
 */
export async function getTaskStatsForUser(userId) {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'todo')        AS todo,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE status = 'in_review')   AS in_review,
       COUNT(*) FILTER (WHERE status = 'done')        AS done,
       COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') AS overdue,
       COUNT(*)                                        AS total
     FROM tasks
     WHERE assignee_id = $1`,
    [userId]
  );
  return rows[0];
}

/**
 * Get recently updated tasks for a user.
 * Used in the dashboard activity feed.
 */
export async function getRecentTasksForUser(userId, limit = 10) {
  const { rows } = await query(
    `SELECT
       t.id, t.title, t.status, t.priority, t.updated_at,
       p.name AS project_name, p.color AS project_color
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = $1
     ORDER BY t.updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}
