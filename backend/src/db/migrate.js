const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

/**
 * Applies schema.sql. Every statement is IF NOT EXISTS, so this runs safely on
 * every boot and doubles as the migration step on deploy.
 */
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  return true;
}

module.exports = { migrate };

// Allow `npm run migrate` as a standalone deploy step.
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Schema applied.');
      return pool.end();
    })
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}
