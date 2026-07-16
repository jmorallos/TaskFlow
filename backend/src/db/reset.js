/**
 * Database Reset Script
 * Drops all tables and reruns migrations + seed.
 * DEVELOPMENT ONLY - never run this in production.
 */
import pool, { query } from './pool.js';

async function reset() {
  console.log('⚠️  Dropping all tables...');

  await query(`
    DROP TABLE IF EXISTS
      task_tags, task_comments, tags, tasks,
      project_members, projects, users, migrations
    CASCADE
  `);

  console.log('✅ All tables dropped.\n');
  await pool.end();

  // Re-run migrate and seed as child processes
  const { execSync } = await import('child_process');
  execSync('node src/db/migrate.js', { stdio: 'inherit' });
  execSync('node src/db/seed.js', { stdio: 'inherit' });
}

reset().catch(err => {
  console.error(err);
  process.exit(1);
});
