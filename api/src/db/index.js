const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

/**
 * Initialize database schema if not already present
 */
async function initDb(retries = 10, delay = 2000) {
  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          CREATE EXTENSION IF NOT EXISTS "pgcrypto";

          CREATE TABLE IF NOT EXISTS tasks (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              title VARCHAR(255) NOT NULL,
              description TEXT,
              status VARCHAR(50) NOT NULL DEFAULT 'TODO',
              priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
          CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
        `);
        console.log('[DB] Database schema verified and initialized.');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      retries -= 1;
      console.warn(`[DB] Waiting for database connection (${retries} retries left)... Error: ${err.message}`);
      if (retries === 0) {
        throw err;
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDb,
};
