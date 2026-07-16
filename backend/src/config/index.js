/**
 * Configuration Module
 *
 * WHY THIS EXISTS:
 * Instead of calling process.env.SOMETHING scattered throughout the codebase,
 * all environment variables are read and validated in one place. This means:
 * - If you misspell a variable name, you catch it at startup, not runtime
 * - The rest of your app uses typed, named values (config.port) not raw strings
 * - You can see every config value your app needs just by reading this file
 *
 * PATTERN: This is called the "Config Object" pattern. Very common in Node.js.
 */

import 'dotenv/config';

/**
 * Validates that a required environment variable exists.
 * Throws at startup rather than failing silently during a request.
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'taskflow_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT
  jwt: {
    // requireEnv throws if JWT_SECRET is missing — you want this behavior.
    // A missing JWT secret means ALL tokens would be signed with undefined,
    // which is a security disaster.
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',
};

export default config;
