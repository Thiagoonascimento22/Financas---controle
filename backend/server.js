require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createTables } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/entries',    require('./routes/entries'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/ai',         require('./routes/ai'));
app.use('/api/admin',      require('./routes/admin'));

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;

createTables().then(() => {
  app.listen(PORT, () => console.log(`FinançasPro rodando na porta ${PORT}`));
}).catch(err => {
  console.error('Erro ao criar tabelas:', err);
  process.exit(1);
});
