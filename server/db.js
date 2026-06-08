const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions_log (
        id SERIAL PRIMARY KEY,
        scenario VARCHAR(50) NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        feedback TEXT,
        duration_seconds INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vocabulary_log (
        id SERIAL PRIMARY KEY,
        word VARCHAR(200) NOT NULL,
        context TEXT,
        scenario VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
