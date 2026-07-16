/**
 * Database Seed Script
 *
 * Seeds create realistic sample data for development.
 * They help you:
 * - Test the UI with real-looking data immediately
 * - Share a consistent starting state with other developers
 * - Demo the application without manually creating data
 *
 * IMPORTANT: Seeds are for development only. They use hardcoded
 * passwords ('password123') which is fine for dev but never for production.
 */

import bcrypt from 'bcryptjs';
import pool, { query } from './pool.js';
import config from '../config/index.js';

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data in reverse dependency order
  // (delete children before parents to avoid FK violations)
  await query('DELETE FROM task_tags');
  await query('DELETE FROM tags');
  await query('DELETE FROM task_comments');
  await query('DELETE FROM tasks');
  await query('DELETE FROM project_members');
  await query('DELETE FROM projects');
  await query('DELETE FROM users');

  // Reset sequences so IDs start from 1 again
  await query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
  await query('ALTER SEQUENCE projects_id_seq RESTART WITH 1');
  await query('ALTER SEQUENCE tasks_id_seq RESTART WITH 1');

  // ── Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', config.bcryptRounds);

  const { rows: users } = await query(`
    INSERT INTO users (email, password_hash, full_name, avatar_color, bio) VALUES
      ('alex@example.com', $1, 'Alex Chen', '#4F46E5', 'Senior engineer and team lead. Loves clean code and strong coffee.'),
      ('sam@example.com',  $1, 'Sam Rivera', '#0891B2', 'Product designer turned developer. I care about the pixels.'),
      ('jordan@example.com', $1, 'Jordan Kim', '#059669', 'Backend engineer. If it can be scripted, it should be.')
    RETURNING id, full_name
  `, [passwordHash]);

  console.log('  ✅ Created 3 users (password: password123)');
  users.forEach(u => console.log(`     - ${u.full_name} (id: ${u.id})`));

  const [alex, sam, jordan] = users;

  // ── Projects ───────────────────────────────────────────
  const { rows: projects } = await query(`
    INSERT INTO projects (owner_id, name, description, color, status) VALUES
      ($1, 'TaskFlow App', 'Building the TaskFlow project management application itself. Meta, right?', '#4F46E5', 'active'),
      ($1, 'API Redesign', 'Redesign the public API to be more RESTful and developer-friendly.', '#0891B2', 'active'),
      ($2, 'Design System', 'Build a reusable component library and design tokens.', '#DB2777', 'active'),
      ($3, 'Infrastructure', 'Set up CI/CD, monitoring, and deployment automation.', '#059669', 'archived')
    RETURNING id, name
  `, [alex.id, sam.id, jordan.id]);

  console.log('\n  ✅ Created 4 projects');

  const [taskflowProject, apiProject, designProject] = projects;

  // ── Project Members ─────────────────────────────────────
  await query(`
  INSERT INTO project_members (project_id, user_id, role) VALUES
    ($1, $2, 'admin'),
    ($1, $3, 'member'),
    ($1, $4, 'member'),

    ($5, $2, 'admin'),
    ($5, $4, 'admin'),
    ($5, $3, 'viewer'),

    ($6, $3, 'admin'),
    ($6, $2, 'member')
`, [
    taskflowProject.id,
    alex.id,
    sam.id,
    jordan.id,
    apiProject.id,
    designProject.id
  ]);

  console.log('  ✅ Created project memberships');

  // ── Tags ────────────────────────────────────────────────
  const { rows: tags } = await query(`
    INSERT INTO tags (project_id, name, color) VALUES
      ($1, 'bug', '#EF4444'),
      ($1, 'feature', '#3B82F6'),
      ($1, 'frontend', '#8B5CF6'),
      ($1, 'backend', '#F59E0B'),
      ($1, 'urgent', '#EF4444')
    RETURNING id, name
  `, [taskflowProject.id]);

  const tagMap = Object.fromEntries(tags.map(t => [t.name, t.id]));
  console.log('  ✅ Created tags');

  // ── Tasks ───────────────────────────────────────────────
  const { rows: tasks } = await query(`
    INSERT INTO tasks (project_id, creator_id, assignee_id, title, description, status, priority, due_date, position) VALUES
      -- Done tasks
      ($1, $2, $2, 'Set up project repository', 'Initialize Git repo, create README, configure .gitignore', 'done', 'high', NOW() - INTERVAL '10 days', 1),
      ($1, $2, $3, 'Design database schema', 'Create ERD and write initial migrations for users, projects, tasks', 'done', 'high', NOW() - INTERVAL '8 days', 2),
      ($1, $2, $4, 'Set up Express server', 'Basic Express app with middleware, error handling, and health check endpoint', 'done', 'high', NOW() - INTERVAL '6 days', 3),

      -- In Progress
      ($1, $2, $2, 'Implement JWT authentication', 'Register, login, logout endpoints with bcrypt hashing and JWT tokens', 'in_progress', 'high', NOW() + INTERVAL '2 days', 4),
      ($1, $3, $3, 'Build SPA router', 'Client-side routing with history API, route guards, and page transitions', 'in_progress', 'medium', NOW() + INTERVAL '3 days', 5),
      ($1, $4, $4, 'Write API integration tests', 'Test all auth and project endpoints with a test database', 'in_progress', 'medium', NOW() + INTERVAL '5 days', 6),

      -- In Review
      ($1, $2, $3, 'Create dashboard UI', 'Stats cards, recent activity feed, and quick task creation', 'in_review', 'medium', NOW() + INTERVAL '1 day', 7),
      ($1, $3, $2, 'Fix login form validation', 'Client-side validation messages are not clearing on success', 'in_review', 'high', NOW() - INTERVAL '1 day', 8),

      -- Todo
      ($1, $2, NULL, 'Add search functionality', 'Global search across tasks and projects with keyboard shortcut', 'todo', 'medium', NOW() + INTERVAL '7 days', 9),
      ($1, $2, $3, 'Write README documentation', 'Complete setup guide, architecture overview, and API docs', 'todo', 'low', NOW() + INTERVAL '14 days', 10),
      ($1, $4, NULL, 'Set up CI pipeline', 'GitHub Actions to run tests on every PR', 'todo', 'medium', NOW() + INTERVAL '10 days', 11),
      ($1, $2, NULL, 'Performance audit', 'Profile DB queries and add missing indexes', 'todo', 'low', NOW() + INTERVAL '21 days', 12)
    RETURNING id, title
  `, [taskflowProject.id, alex.id, sam.id, jordan.id]);

  console.log(`  ✅ Created ${tasks.length} tasks`);

  // ── Task Tags ───────────────────────────────────────────
  const [,, setupTask, authTask,,, dashTask, fixTask] = tasks;

  await query(`
  INSERT INTO task_tags (task_id, tag_id) VALUES
    ($1, $2), ($1, $3),
    ($4, $5), ($4, $6),
    ($7, $8), ($7, $9),
    ($10, $11)
`, [
    tasks[3].id, tagMap['feature'], tagMap['backend'],   // auth task
    tasks[4].id, tagMap['feature'], tagMap['frontend'],  // router task
    tasks[6].id, tagMap['feature'], tagMap['frontend'],  // dashboard task
    tasks[7].id, tagMap['bug']                           // fix login task
  ]);

  console.log('  ✅ Created task tags');

  // ── Comments ─────────────────────────────────────────────
  await query(`
  INSERT INTO task_comments (task_id, author_id, content) VALUES
    ($1, $2, 'I''ve started on this. Using bcryptjs and jsonwebtoken packages.'),
    ($1, $3, 'Should we use refresh tokens too, or just long-lived JWTs for now?'),
    ($1, $2, 'Let''s keep it simple for v1 — 7-day JWT. We can add refresh tokens later.'),
    ($4, $3, 'Almost done with the router. History API pushState is working, just need to handle the back button properly.'),
    ($4, $2, 'Don''t forget to handle the case where someone links directly to a client-side route — the server needs to serve index.html for those.'),
    ($4, $5, 'Found a good pattern for this — popstate event on window handles the back button.')
`, [
    tasks[3].id, // $1 auth task
    alex.id,     // $2
    sam.id,      // $3
    tasks[4].id, // $4 router task
    jordan.id    // $5
  ]);

  console.log('  ✅ Created comments');

  console.log('\n✨ Seed complete! You can log in with:');
  console.log('   alex@example.com / password123');
  console.log('   sam@example.com  / password123');
  console.log('   jordan@example.com / password123');

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
