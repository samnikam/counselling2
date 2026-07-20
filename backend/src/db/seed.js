const bcrypt = require('bcryptjs');
const { pool, one, run } = require('../config/db');
const env = require('../config/env');
const { migrate } = require('./migrate');

/**
 * Creates the schema, the first admin, and the district's institution list.
 *
 * Seeds ONLY structural data — the schools/colleges the portal is built around (PDF §4:
 * 78 Higher Secondary Schools + 10 Colleges) and one admin login. Content (notices, events,
 * counselling, talent, career resources) is never seeded; the district enters that itself.
 *
 * NOTE FOR THE DISTRICT: verify these institution names against the official CEO Anantnag /
 * DSEK roll before going live. Names are editable from Admin → Institutions, and only run
 * on a first, empty database — re-running never overwrites edits.
 */

const HSS = [
  'Govt. Boys HSS Anantnag', 'Govt. Girls HSS Anantnag', 'Govt. Model HSS Anantnag',
  'Govt. HSS Khanabal', 'Govt. HSS Martand', 'Govt. HSS Aishmuqam', 'Govt. HSS Bijbehara',
  'Govt. Girls HSS Bijbehara', 'Govt. HSS Mattan', 'Govt. HSS Seer Hamdan', 'Govt. HSS Dooru',
  'Govt. HSS Verinag', 'Govt. HSS Shangus', 'Govt. HSS Larnoo', 'Govt. HSS Achabal',
  'Govt. Girls HSS Achabal', 'Govt. HSS Kokernag', 'Govt. HSS Sallar', 'Govt. HSS Qazigund',
  'Govt. HSS Vessu', 'Govt. HSS Hiller Shahabad', 'Govt. HSS Srigufwara', 'Govt. HSS Sallar Wagad',
  'Govt. HSS Uttersoo', 'Govt. HSS Nowgam', 'Govt. HSS Pahalgam', 'Govt. HSS Batakoot',
  'Govt. HSS Hassanpora', 'Govt. HSS Ashmuji', 'Govt. HSS Chittergul',
  'Govt. HSS Wanpoh', 'Govt. HSS Sagam', 'Govt. HSS Kapran', 'Govt. HSS Panzgam',
  'Govt. HSS Ranipora', 'Govt. HSS Akingam', 'Govt. HSS Bidder', 'Govt. HSS Hutmarah',
  'Govt. HSS Nagam', 'Govt. HSS Bumthan', 'Govt. HSS Khiram', 'Govt. HSS Sirhama',
  'Govt. HSS Damhal Hanjipora', 'Govt. HSS Yaripora', 'Govt. HSS Behibagh', 'Govt. HSS Kulgam Road',
  'Govt. HSS Anzwalla', 'Govt. HSS Zirpara', 'Govt. HSS Halsidar', 'Govt. HSS Tangpawa',
  'Govt. HSS Naubugh', 'Govt. HSS Waghama', 'Govt. HSS Arwani', 'Govt. HSS Kanelwan',
  'Govt. HSS Gadole', 'Govt. HSS Lissar', 'Govt. HSS Brakpora', 'Govt. HSS Ganishbugh',
  'Govt. HSS Reshipora', 'Govt. HSS Nowpora', 'Govt. HSS Salia', 'Govt. HSS Hakoora',
  'Govt. HSS Malaknag', 'Govt. HSS Janglat Mandi', 'Govt. HSS Sarnal', 'Govt. HSS Dialgam',
  'Govt. HSS Nipora', 'Govt. HSS Wanihama', 'Govt. HSS Chek-i-Nowgam', 'Govt. HSS Kreeri Anantnag',
  'Govt. HSS Shalgam', 'Govt. HSS Watnar', 'Govt. HSS Devsar Road', 'Govt. HSS Larkipora',
  'Govt. HSS Sadiwara', 'Govt. HSS Bonigam', 'Govt. HSS Thajwara', 'Govt. HSS Munand',
];

const COLLEGES = [
  'Govt. Degree College Anantnag', 'Govt. Degree College (Boys) Anantnag',
  'Govt. Degree College (Women) Anantnag', 'Govt. Degree College Bijbehara',
  'Govt. Degree College Dooru', 'Govt. Degree College Kokernag', 'Govt. Degree College Pahalgam',
  'Govt. Degree College Shangus', 'Govt. Degree College Qazigund',
  'Govt. Polytechnic College Anantnag',
];

async function seed() {
  await migrate();

  // Only ever populates an empty table, so the district's edits/deletions are never undone
  // by a restart.
  const anyInstitution = await one('SELECT id FROM institutions LIMIT 1');
  if (!anyInstitution) {
    for (const name of HSS) {
      await run(
        'INSERT INTO institutions (name, type) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [name, 'hss']
      );
    }
    for (const name of COLLEGES) {
      await run(
        'INSERT INTO institutions (name, type) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [name, 'college']
      );
    }
    console.log(`Added ${HSS.length} schools and ${COLLEGES.length} colleges.`);
    console.log('Verify these names in Admin → Institutions before going live.');
  }

  // The first administrator. env.js refuses to boot in production unless ADMIN_PASSWORD is set.
  const admin = await one(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (!admin) {
    await run(
      `INSERT INTO users (email, password_hash, full_name, role, is_verified, must_change_password)
       VALUES ($1, $2, $3, 'admin', TRUE, TRUE)`,
      [env.ADMIN_EMAIL, bcrypt.hashSync(env.ADMIN_PASSWORD, 12), 'District Administrator']
    );
    console.log(`Created the first admin account: ${env.ADMIN_EMAIL}`);
  }

  await run(
    `INSERT INTO portal_settings (key, value) VALUES ('portal_name', 'Anantnag Youth Portal')
     ON CONFLICT (key) DO NOTHING`
  );
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exit(1);
    });
}
