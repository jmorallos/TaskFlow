-- ============================================================
-- Migration 002: Create Projects Table
--
-- DESIGN DECISIONS:
--
-- owner_id REFERENCES users(id):
--   Foreign key enforces referential integrity at the DB level.
--   ON DELETE CASCADE means if a user is deleted, their projects
--   are too. Alternatives:
--   - ON DELETE RESTRICT: prevent deleting a user who owns projects
--   - ON DELETE SET NULL: keep projects, clear the owner field
--   Choose based on your business rules. CASCADE is common for
--   "owned" resources.
--
-- status CHECK constraint:
--   Validates data at the database level, not just application level.
--   This is defense-in-depth — even if your app has a bug, the DB
--   won't accept invalid values.
--
-- color VARCHAR(7):
--   Each project gets a color for visual identification in the UI.
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'archived', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the most common query pattern: "get all projects for user X"
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- Index for filtering by status (common in dashboards)
CREATE INDEX idx_projects_status ON projects(status);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Project Members (Many-to-Many Join Table)
--
-- WHY A JOIN TABLE?
-- A project can have many members, and a user can be in many projects.
-- This is a many-to-many relationship, which requires a join table.
--
-- role CHECK constraint:
--   'admin' can edit/delete the project and manage members.
--   'member' can create and manage tasks.
--   'viewer' can only read.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_members (
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member', 'viewer')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite primary key: a user can only be in a project once
  PRIMARY KEY (project_id, user_id)
);

-- Index for "get all projects a user is a member of"
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
