const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',   icon: 'ti-tools-kitchen-2',    color: '#16a34a', color_bg: 'rgba(22,163,74,0.12)' },
  { name: 'Combustível',   icon: 'ti-gas-station',         color: '#ea580c', color_bg: 'rgba(234,88,12,0.12)' },
  { name: 'Moradia',       icon: 'ti-home',                color: '#2563eb', color_bg: 'rgba(37,99,235,0.12)' },
  { name: 'Saúde',         icon: 'ti-heart-rate-monitor',  color: '#dc2626', color_bg: 'rgba(220,38,38,0.12)' },
  { name: 'Educação',      icon: 'ti-school',              color: '#7c3aed', color_bg: 'rgba(124,58,237,0.12)' },
  { name: 'Lazer',         icon: 'ti-confetti',            color: '#d97706', color_bg: 'rgba(217,119,6,0.12)' },
  { name: 'Vestuário',     icon: 'ti-shirt',               color: '#db2777', color_bg: 'rgba(219,39,119,0.12)' },
  { name: 'Assinaturas',   icon: 'ti-device-tv',           color: '#0891b2', color_bg: 'rgba(8,145,178,0.12)' },
  { name: 'Mercado',       icon: 'ti-shopping-cart',       color: '#059669', color_bg: 'rgba(5,150,105,0.12)' },
  { name: 'Farmácia',      icon: 'ti-pill',                color: '#e11d48', color_bg: 'rgba(225,29,72,0.12)' },
  { name: 'Investimento',  icon: 'ti-trending-up',         color: '#0d9488', color_bg: 'rgba(13,148,136,0.12)' },
  { name: 'Outros',        icon: 'ti-dots',                color: '#64748b', color_bg: 'rgba(100,116,139,0.12)' },
];

// Register — requires invite code
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, invite_code } = req.body;
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
    res.status(500).json({ error: 'Erro interno.' });
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
    res.status(500).json({ error: 'Erro interno.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, is_admin, created_at FROM users WHERE id=$1', [req.userId]);
  res.json(rows[0]);
});

// ── ADMIN routes (protected by ADMIN_SECRET header) ──
const adminOnly = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });
  next();
};

// Create invite code
router.post('/invite', adminOnly, async (req, res) => {
  try {
    const { label, quantity = 1 } = req.body;
    const codes = [];
    for (let i = 0; i < Math.min(quantity, 50); i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { rows } = await pool.query(
        'INSERT INTO invite_codes (code, label) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *',
        [code, label || null]
      );
      if (rows.length) codes.push(rows[0]);
    }
    res.json({ codes });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar código.' });
  }
});

// List all invite codes
router.get('/invites', adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ic.*, u.name as used_by_name, u.email as used_by_email
    FROM invite_codes ic LEFT JOIN users u ON ic.used_by = u.id
    ORDER BY ic.created_at DESC
  `);
  res.json(rows);
});

// Delete invite code
router.delete('/invite/:id', adminOnly, async (req, res) => {
  await pool.query('DELETE FROM invite_codes WHERE id=$1 AND used_by IS NULL', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
