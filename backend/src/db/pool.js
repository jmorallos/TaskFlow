/**
 * Database Connection Pool
 *
 * WHY A POOL?
 * Creating a new PostgreSQL connection for every request is slow (~50-100ms).
 * A pool keeps a set of connections open and reuses them.
 * pg's Pool handles this automatically — we just configure it.
 *
 * WHY ONE FILE?
 * This pool is a singleton. If we created a new Pool() in every file that needs
 * the DB, we'd have multiple pools competing for connections, leaking resources.
 * All DB modules import from this single file.
 *
 * QUERY HELPER:
 * We export a `query` function that wraps pool.query. This gives us one place
 * to add logging, metrics, or error transformation in the future.
 */

import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

// Pool configuration
// pg uses these to manage the connection lifecycle
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  // Max connections in the pool. Default is 10.
  // For a learning project, this is fine. Production apps tune this based on
  // PostgreSQL's max_connections setting and expected concurrent load.
  max: 10,
  // How long to wait for a connection before throwing an error (ms)
  connectionTimeoutMillis: 5000,
  // How long a connection can sit idle before being closed (ms)
  idleTimeoutMillis: 30000,
});

// Log when pool has issues — useful for debugging in development
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a parameterized SQL query.
 *
 * ALWAYS use parameterized queries (the $1, $2 syntax) — never concatenate
 * user input into SQL strings. Parameterized queries are immune to SQL injection.
 *
 * @param {string} text - SQL query with $1, $2 placeholders
 * @param {Array} params - Values to substitute for placeholders
 * @returns {Promise<pg.QueryResult>}
 *
 * @example
 * const result = await query(
 *   'SELECT * FROM users WHERE email = $1',
 *   [email]
 * );
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);

  // Log slow queries in development — great for catching N+1 problems early
  if (config.isDev) {
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text);
    }
  }

  return result;
}

/**
 * Get a client from the pool for transactions.
 * IMPORTANT: Always release the client in a finally block.
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT ...');
 *   await client.query('COMMIT');
 * } catch (err) {
 *   await client.query('ROLLBACK');
 *   throw err;
 * } finally {
 *   client.release(); // Always release, even on error
 * }
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
