# FinançasPro — Sistema Financeiro com Login

Sistema financeiro multi-usuário completo. Cada pessoa cria sua conta, faz login e vê somente seus dados.

## Stack
- **Backend:** Node.js + Express
- **Banco:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Frontend:** HTML/CSS/JS puro (sem framework)
- **Deploy:** Railway

---

## Como fazer o deploy no Railway

### 1. Suba o código no GitHub
```bash
git init
git add .
git commit -m "FinançasPro v1.0"
git remote add origin https://github.com/SEU_USUARIO/financas-pro.git
git push -u origin main
```

### 2. Crie o projeto no Railway
1. Acesse https://railway.app
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório que você acabou de criar

### 3. Adicione o banco PostgreSQL
1. No projeto Railway, clique em **New → Database → PostgreSQL**
2. Aguarde o banco ser criado

### 4. Configure as variáveis de ambiente
No serviço do seu app (não no banco), clique em **Variables** e adicione:

```
DATABASE_URL  = (cole o valor de DATABASE_URL que aparece nas variáveis do banco)
JWT_SECRET    = uma_senha_longa_e_aleatoria_qualquer_ex_xK92mPqR7wZnT5vL
NODE_ENV      = production
```

> **Dica para JWT_SECRET:** use pelo menos 32 caracteres aleatórios. Ex: `meu-sistema-financas-2026-chave-secreta-unica`

### 5. Aguarde o deploy
O Railway vai detectar o `nixpacks.toml`, instalar as dependências e iniciar o servidor.

Após o deploy, clique em **Settings → Domains → Generate Domain** para ter uma URL pública tipo `financas-pro.up.railway.app`.

---

## Primeira vez usando
1. Acesse a URL gerada pelo Railway
2. Clique em **Criar conta**
3. Informe nome, e-mail e senha (mínimo 6 caracteres)
4. Pronto! O sistema cria automaticamente as categorias padrão

---

## Estrutura de arquivos
```
financas-pro/
├── backend/
│   ├── db/index.js          # Conexão PostgreSQL + criação de tabelas
│   ├── middleware/auth.js   # Validação JWT
│   ├── routes/
│   │   ├── auth.js          # /api/auth (login, registro, me)
│   │   ├── entries.js       # /api/entries (CRUD lançamentos)
│   │   └── categories.js    # /api/categories (CRUD categorias)
│   ├── server.js            # Express + serve o frontend
│   └── package.json
├── frontend/
│   ├── index.html           # App completo (SPA)
│   ├── css/style.css        # Estilos
│   └── js/
│       ├── api.js           # Cliente HTTP
│       └── app.js           # Toda a lógica do app
├── nixpacks.toml            # Config de build Railway
├── railway.json             # Config Railway
└── .gitignore
```

---

## Funcionalidades
- Cadastro e login com senha criptografada
- Cada usuário tem dados 100% isolados
- Lançar receitas e despesas com categoria, valor e data
- Dashboard com cards de resumo
- Gráficos de barras (receitas x despesas 6 meses)
- Gráfico donut (despesas por categoria)
- Gráfico de linha (evolução do saldo 12 meses)
- Filtro de lançamentos por tipo, categoria e mês
- Gerenciar categorias personalizadas
- Editar e excluir lançamentos
- Atalho de teclado: Ctrl+N para novo lançamento
