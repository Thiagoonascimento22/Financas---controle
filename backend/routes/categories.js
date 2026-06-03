const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE user_id=$1 ORDER BY name',
    [req.userId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  try {
    const { name, icon, color, color_bg } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const { rows } = await pool.query(
      'INSERT INTO categories (user_id, name, icon, color, color_bg) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, name.trim(), icon || 'ti-tag', color || '#5F5E5A', color_bg || '#F1EFE8']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, icon, color, color_bg } = req.body;
    const { rows } = await pool.query(
      'UPDATE categories SET name=$1, icon=$2, color=$3, color_bg=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [name, icon, color, color_bg, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar.' });
  }
});

module.exports = router;
