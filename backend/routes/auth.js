const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',  icon: 'ti-shopping-cart', color: '#3B6D11', color_bg: '#EAF3DE' },
  { name: 'Moradia',      icon: 'ti-home',           color: '#185FA5', color_bg: '#E6F1FB' },
  { name: 'Transporte',   icon: 'ti-car',            color: '#534AB7', color_bg: '#EEEDFE' },
  { name: 'Saúde',        icon: 'ti-heart',          color: '#A32D2D', color_bg: '#FCEBEB' },
  { name: 'Lazer',        icon: 'ti-device-gamepad', color: '#854F0B', color_bg: '#FAEEDA' },
  { name: 'Educação',     icon: 'ti-school',         color: '#0F6E56', color_bg: '#E1F5EE' },
  { name: 'Vestuário',    icon: 'ti-shirt',          color: '#993556', color_bg: '#FBEAF0' },
  { name: 'Outros',       icon: 'ti-dots',           color: '#5F5E5A', color_bg: '#F1EFE8' },
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
