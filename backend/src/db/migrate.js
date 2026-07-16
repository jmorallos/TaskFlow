/**
 * Database Migration Runner
 *
 * HOW MIGRATIONS WORK:
 * Migrations are SQL files that change your database schema over time.
 * Each file is numbered and run in order. Once a migration has been run,
 * it's recorded in a `migrations` table so it won't run again.
 *
 * WHY NOT JUST USE AN ORM'S MIGRATION TOOL?
 * Many ORMs (Sequelize, Prisma, TypeORM) have migration systems.
 * Writing your own teaches you what they do under the hood:
 * 1. Read migration files in order
 * 2. Check which ones have already run
 * 3. Run the new ones
 * 4. Record them so they don't run twice
 *
 * This script reads from src/db/migrations/*.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  console.log('🗄️  Starting database migrations...\n');

  // Create the migrations tracking table if it doesn't exist
  // This is the first thing migration runners do
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get list of already-run migrations
  const { rows: executedMigrations } = await query(
    'SELECT filename FROM migrations ORDER BY filename'
  );
  const executedSet = new Set(executedMigrations.map(r => r.filename));

  // Read all .sql files from the migrations directory, sorted by name
  // The numeric prefix (001_, 002_) ensures correct ordering
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ranCount = 0;

  for (const filename of migrationFiles) {
    if (executedSet.has(filename)) {
      console.log(`  ✓ ${filename} (already run)`);
      continue;
    }

    console.log(`  ⟳ Running ${filename}...`);

    // Each migration runs in a transaction.
    // If the SQL fails halfway through, the whole migration is rolled back.
    // This prevents partial migrations that leave the DB in a broken state.
    const client = await pool.connect();
    try {
      const sql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, filename),
        'utf-8'
      );

      await client.query('BEGIN');
      await client.query(sql);

      // Record the migration as completed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );

      await client.query('COMMIT');
      console.log(`  ✅ ${filename} complete`);
      ranCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ❌ ${filename} FAILED:`, err.message);
      throw err; // Stop all migrations if one fails
    } finally {
      client.release();
    }
  }

  if (ranCount === 0) {
    console.log('\n✨ Database is already up to date.');
  } else {
    console.log(`\n✅ Ran ${ranCount} migration(s) successfully.`);
  }

  await pool.end();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
