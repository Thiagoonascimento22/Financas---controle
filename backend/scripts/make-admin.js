require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const email = process.argv[2];
if (!email) { console.error('Uso: node scripts/make-admin.js email@exemplo.com'); process.exit(1); }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

(async () => {
  const { rowCount } = await pool.query(
    'UPDATE users SET is_admin=TRUE WHERE email=$1', [email.toLowerCase()]
  );
  if (rowCount) console.log('OK - ' + email + ' agora é admin!');
  else console.log('Erro - Email não encontrado: ' + email);
  await pool.end();
})();
