const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { month, year, type, category_id } = req.query;
    let query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             c.color as category_color, c.color_bg as category_color_bg
      FROM entries e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
    `;
    const params = [req.userId];
    let i = 2;

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM e.entry_date) = $${i++} AND EXTRACT(YEAR FROM e.entry_date) = $${i++}`;
      params.push(month, year);
    }
    if (type) { query += ` AND e.type = $${i++}`; params.push(type); }
    if (category_id) { query += ` AND e.category_id = $${i++}`; params.push(category_id); }

    query += ' ORDER BY e.entry_date DESC, e.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar lançamentos.' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(YEAR FROM entry_date)::int  AS year,
        EXTRACT(MONTH FROM entry_date)::int AS month,
        type,
        SUM(amount) AS total
      FROM entries
      WHERE user_id = $1
        AND entry_date >= DATE_TRUNC('month', NOW()) - INTERVAL '${parseInt(months) - 1} months'
      GROUP BY year, month, type
      ORDER BY year, month
    `, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo.' });
  }
});

router.get('/by-category', async (req, res) => {
  try {
    const { month, year } = req.query;
    const { rows } = await pool.query(`
      SELECT c.id, c.name, c.icon, c.color, c.color_bg,
             SUM(e.amount) AS total
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND e.type = 'out'
        AND EXTRACT(MONTH FROM e.entry_date) = $2
        AND EXTRACT(YEAR FROM e.entry_date) = $3
      GROUP BY c.id, c.name, c.icon, c.color, c.color_bg
      ORDER BY total DESC
    `, [req.userId, month, year]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar por categoria.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { description, amount, type, entry_date, category_id } = req.body;
    if (!description || !amount || !type || !entry_date)
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    if (!['in','out'].includes(type))
      return res.status(400).json({ error: 'Tipo inválido.' });

    const { rows } = await pool.query(
      `INSERT INTO entries (user_id, category_id, description, amount, type, entry_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.userId, category_id || null, description.trim(), parseFloat(amount), type, entry_date]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar lançamento.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { description, amount, type, entry_date, category_id } = req.body;
    const { rows } = await pool.query(
      `UPDATE entries SET description=$1, amount=$2, type=$3, entry_date=$4, category_id=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [description, parseFloat(amount), type, entry_date, category_id || null, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM entries WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Não encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar.' });
  }
});

module.exports = router;
