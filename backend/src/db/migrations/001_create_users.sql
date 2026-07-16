-- ============================================================
-- Migration 001: Create Users Table
--
-- DESIGN DECISIONS:
--
-- id SERIAL PRIMARY KEY:
--   Auto-incrementing integer. Simple and fast for joins.
--   Some teams prefer UUID (gen_random_uuid()) for security
--   (can't enumerate users by guessing IDs), but integers are
--   faster for indexes and joins. Both are valid choices.
--
-- email CITEXT:
--   Case-insensitive text. PostgreSQL extension that ensures
--   'User@Example.com' and 'user@example.com' are treated as
--   equal. This prevents duplicate account creation.
--   Requires: CREATE EXTENSION IF NOT EXISTS citext;
--
-- password_hash TEXT:
--   We store the bcrypt hash, never the plain password.
--   bcrypt hashes are always 60 chars but TEXT is safer than CHAR(60).
--
-- avatar_color VARCHAR(7):
--   Instead of storing uploaded images (complex), we generate
--   a colored avatar from initials. Stores a hex color like '#4F46E5'.
--
-- Timestamps:
--   created_at/updated_at are on every table. You will always want
--   to know when records were created and last modified.
--   DEFAULT NOW() sets the value automatically on INSERT.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           CITEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  avatar_color    VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
  bio             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email for fast lookup during login
-- PostgreSQL creates an index automatically for UNIQUE constraints,
-- but it's good practice to be explicit about your indexing strategy
-- in migrations (this one is implicit from UNIQUE above).

-- Trigger to auto-update updated_at on every UPDATE
-- This is a common pattern: one trigger function reused across all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
