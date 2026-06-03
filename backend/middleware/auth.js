const jwt = require('jsonwebtoken');
const { pool } = require('../db');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido.' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, is_blocked, is_admin FROM users WHERE id=$1', [decoded.userId]);
    if (!rows.length) return res.status(401).json({ error: 'Usuário não encontrado.' });
    if (rows[0].is_blocked) return res.status(403).json({ error: 'Conta bloqueada. Entre em contato com o administrador.' });
    req.userId = decoded.userId;
    req.isAdmin = rows[0].is_admin;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};
