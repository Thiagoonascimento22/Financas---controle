const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',   icon: 'ti-tools-kitchen-2', color: '#22c55e', color_bg: 'rgba(34,197,94,0.15)' },
  { name: 'Combustível',   icon: 'ti-gas-station',     color: '#f97316', color_bg: 'rgba(249,115,22,0.15)' },
  { name: 'Moradia',       icon: 'ti-home',             color: '#60a5fa', color_bg: 'rgba(96,165,250,0.15)' },
  { name: 'Saúde',         icon: 'ti-heart-rate-monitor', color: '#f87171', color_bg: 'rgba(248,113,113,0.15)' },
  { name: 'Educação',      icon: 'ti-school',           color: '#a78bfa', color_bg: 'rgba(167,139,250,0.15)' },
  { name: 'Lazer',         icon: 'ti-confetti',         color: '#fbbf24', color_bg: 'rgba(251,191,36,0.15)' },
  { name: 'Vestuário',     icon: 'ti-shirt',            color: '#e879f9', color_bg: 'rgba(232,121,249,0.15)' },
  { name: 'Assinaturas',   icon: 'ti-device-tv',        color: '#38bdf8', color_bg: 'rgba(56,189,248,0.15)' },
  { name: 'Mercado',       icon: 'ti-shopping-cart',    color: '#4ade80', color_bg: 'rgba(74,222,128,0.15)' },
  { name: 'Farmácia',      icon: 'ti-pill',             color: '#fb7185', color_bg: 'rgba(251,113,133,0.15)' },
  { name: 'Investimento',  icon: 'ti-trending-up',      color: '#34d399', color_bg: 'rgba(52,211,153,0.15)' },
  { name: 'Outros',        icon: 'ti-dots',             color: '#94a3b8', color_bg: 'rgba(148,163,184,0.15)' },
];

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email',
      [name.trim(), email.toLowerCase(), hash]
    );
    const user = rows[0];

    for (const cat of DEFAULT_CATEGORIES) {
      await pool.query(
        'INSERT INTO categories (user_id, name, icon, color, color_bg) VALUES ($1,$2,$3,$4,$5)',
        [user.id, cat.name, cat.icon, cat.color, cat.color_bg]
      );
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Preencha e-mail e senha.' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!rows.length)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, created_at FROM users WHERE id=$1', [req.userId]);
  res.json(rows[0]);
});

module.exports = router;
