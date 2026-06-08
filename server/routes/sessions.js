const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/save', async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });

  const { scenario, messages, feedback, duration_seconds } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO sessions_log (scenario, messages, feedback, duration_seconds)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [scenario, JSON.stringify(messages), feedback || null, duration_seconds || null]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('DB save error:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.get('/history', async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT id, scenario, feedback, duration_seconds, created_at,
              jsonb_array_length(messages) as message_count
       FROM sessions_log
       ORDER BY created_at DESC
       LIMIT 30`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('DB history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/:id', async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      'SELECT * FROM sessions_log WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

module.exports = router;
