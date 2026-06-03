const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Must be logged in + be admin
const adminOnly = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT is_admin FROM users WHERE id=$1', [req.userId]);
    if (!rows.length || !rows[0].is_admin)
      return res.status(403).json({ error: 'Acesso negado.' });
    next();
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
};

router.use(authMiddleware);
router.use(adminOnly);

// List all users with stats
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.is_admin, u.is_blocked, u.created_at,
        COUNT(DISTINCT e.id) AS total_entries,
        COALESCE(SUM(CASE WHEN e.type='in' THEN e.amount ELSE 0 END), 0) AS total_in,
        COALESCE(SUM(CASE WHEN e.type='out' THEN e.amount ELSE 0 END), 0) AS total_out,
        MAX(e.created_at) AS last_entry_at
      FROM users u
      LEFT JOIN entries e ON e.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// Block / unblock user
router.patch('/users/:id/block', async (req, res) => {
  try {
    const { blocked } = req.body;
    if (parseInt(req.params.id) === req.userId)
      return res.status(400).json({ error: 'Você não pode bloquear sua própria conta.' });
    await pool.query('UPDATE users SET is_blocked=$1 WHERE id=$2', [blocked, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.userId)
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir.' });
  }
});

// Stats overview
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_admin=FALSE) AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_blocked=TRUE) AS blocked_users,
        (SELECT COUNT(*) FROM entries) AS total_entries,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND is_admin=FALSE) AS new_this_week
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro.' });
  }
});

module.exports = router;
