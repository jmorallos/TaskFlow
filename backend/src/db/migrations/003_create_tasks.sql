-- ============================================================
-- Migration 003: Create Tasks Table
--
-- DESIGN DECISIONS:
--
-- assignee_id is NULLABLE:
--   Tasks don't need to be assigned. NULL means "unassigned".
--   ON DELETE SET NULL: if the assignee is deleted, the task
--   remains but becomes unassigned. Better UX than deleting tasks.
--
-- priority and status use CHECK constraints:
--   Same defense-in-depth approach as projects.
--
-- due_date TIMESTAMPTZ:
--   Using TIMESTAMPTZ (timestamp with timezone) rather than DATE
--   is usually better — you can always display just the date, but
--   you can't reconstruct timezone info from a bare DATE.
--
-- position INTEGER:
--   Allows manual ordering of tasks within a project.
--   When reordering, update this field. A common pattern for
--   ordered lists in relational databases.
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  title       VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority    VARCHAR(10) NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date    TIMESTAMPTZ,
  position    INTEGER NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The most common query: "get all tasks for project X, ordered by position"
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- Filtering tasks assigned to a specific user (dashboard "my tasks" view)
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);

-- Filtering by status (kanban board columns)
CREATE INDEX idx_tasks_status ON tasks(status);

-- Compound index for the board view: project + status together
-- This is more efficient than two separate indexes when both are in the WHERE clause
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Task Comments
-- Simple append-only log of comments on tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS task_comments (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Task Tags (Many-to-Many)
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#6366F1',
  UNIQUE (project_id, name)  -- Tags are unique within a project
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
