const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL,
      icon VARCHAR(40) DEFAULT 'ti-tag',
      color VARCHAR(20) DEFAULT '#185FA5',
      color_bg VARCHAR(20) DEFAULT '#E6F1FB',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description VARCHAR(200) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      type VARCHAR(3) NOT NULL CHECK (type IN ('in','out')),
      entry_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Tabelas criadas/verificadas com sucesso.');
};

module.exports = { pool, createTables };
