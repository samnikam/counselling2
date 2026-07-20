const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool(
  env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.PGSSL ? { rejectUnauthorized: false } : undefined,
      }
    : undefined // falls back to PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE, read natively by pg
);

// An idle client emitting an error (connection dropped by the server, failover, etc.) would
// otherwise crash the process via an unhandled 'error' event.
pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error:', err));

/** Rows for a SELECT. */
async function all(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

/** First row, or undefined. */
async function one(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/** For INSERT/UPDATE/DELETE. Returns the RETURNING row (if any) and affected count. */
async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return { row: result.rows[0], count: result.rowCount };
}

/**
 * Runs fn inside a transaction, rolling back on any throw. Needed wherever a single
 * user action writes to more than one table and a partial write would corrupt state
 * (e.g. registering for an event = insert registration + bump the seat counter).
 */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, all, one, run, tx };
