const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const state = {
  user: null,
  categories: [],
  formType: 'in',
  editId: null,
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  selectedColor: '#185FA5',
  charts: {}
};

const COLOR_OPTIONS = [
  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  { color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  { color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  { color: '#e879f9', bg: 'rgba(232,121,249,0.15)' },
  { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  { color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
];

// ── UTILS ──
const fmt = v => 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = v => {
  const n = parseFloat(v);
  if (n >= 1000) return 'R$' + (n / 1000).toFixed(1) + 'k';
  return 'R$' + Math.round(n);
};
const el = id => document.getElementById(id);
const showError = (id, msg) => { const e = el(id); e.textContent = msg; e.classList.remove('hidden'); };
const hideError = id => el(id).classList.add('hidden');

// ── AUTH ──
function switchTab(tab) {
  el('form-login').classList.toggle('hidden', tab !== 'login');
  el('form-register').classList.toggle('hidden', tab !== 'register');
  el('tab-login').classList.toggle('active', tab === 'login');
  el('tab-register').classList.toggle('active', tab === 'register');
  hideError('login-error');
  hideError('register-error');
}

function togglePass(inputId, icon) {
  const inp = el(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('ti-eye');
  icon.classList.toggle('ti-eye-off');
}

async function doLogin() {
  hideError('login-error');
  const email = el('login-email').value.trim();
  const password = el('login-pass').value;
  if (!email || !password) return showError('login-error', 'Preencha e-mail e senha.');
  try {
    const data = await API.login({ email, password });
    localStorage.setItem('fp_token', data.token);
    state.user = data.user;
    initApp();
  } catch (e) {
    showError('login-error', e.message);
  }
}

async function doRegister() {
  hideError('register-error');
  const name = el('reg-name').value.trim();
  const email = el('reg-email').value.trim();
  const password = el('reg-pass').value;
  if (!name || !email || !password) return showError('register-error', 'Preencha todos os campos.');
  try {
    const data = await API.register({ name, email, password });
    localStorage.setItem('fp_token', data.token);
    state.user = data.user;
    initApp();
  } catch (e) {
    showError('register-error', e.message);
  }
}

function logout() {
  localStorage.removeItem('fp_token');
  state.user = null;
  state.categories = [];
  destroyCharts();
  el('app-screen').classList.add('hidden');
  el('auth-screen').classList.remove('hidden');
  el('form-login').classList.remove('hidden');
  el('form-register').classList.add('hidden');
  el('login-email').value = '';
  el('login-pass').value = '';
}

// ── APP INIT ──
async function initApp() {
  el('auth-screen').classList.add('hidden');
  el('app-screen').classList.remove('hidden');

  const u = state.user;
  el('user-name').textContent = u.name;
  el('user-email').textContent = u.email;
  el('user-avatar').textContent = u.name.charAt(0).toUpperCase();

  updateMonthLabel();
  await loadCategories();
  await loadDashboard();
}

async function autoLogin() {
  const token = localStorage.getItem('fp_token');
  if (!token) return;
  try {
    const user = await API.me();
    state.user = user;
    initApp();
  } catch {
    localStorage.removeItem('fp_token');
  }
}

// ── NAVIGATION ──
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  const titles = { dashboard: 'Dashboard', lancamentos: 'Lançamentos', graficos: 'Gráficos', categorias: 'Categorias' };
  el('page-title').textContent = titles[page];

  if (page === 'lancamentos') loadLancamentos();
  if (page === 'graficos') loadGraficos();
  if (page === 'categorias') renderCatManage();
}

// ── MONTH NAV ──
function changeMonth(dir) {
  state.currentMonth += dir;
  if (state.currentMonth > 12) { state.currentMonth = 1; state.currentYear++; }
  if (state.currentMonth < 1)  { state.currentMonth = 12; state.currentYear--; }
  updateMonthLabel();
  loadDashboard();
}

function updateMonthLabel() {
  el('month-label').textContent = MONTHS_SHORT[state.currentMonth - 1] + ' ' + state.currentYear;
}

// ── CATEGORIES ──
async function loadCategories() {
  state.categories = await API.getCategories();
}

function populateCatSelect(selectId, type) {
  const sel = el(selectId);
  sel.innerHTML = '';
  if (type === 'out' || !type) {
    state.categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      sel.appendChild(o);
    });
  } else {
    ['Salário', 'Freelance', 'Investimento', 'Bonificação', 'Outros'].forEach(n => {
      const o = document.createElement('option');
      o.value = ''; o.textContent = n;
      sel.appendChild(o);
    });
  }
}

function renderCatManage() {
  const list = el('cat-list');
  if (!state.categories.length) {
    list.innerHTML = '<div class="empty"><i class="ti ti-tag"></i>Nenhuma categoria ainda</div>';
    return;
  }
  list.innerHTML = state.categories.map(c => `
    <div class="cat-manage-item">
      <div class="cat-badge" style="background:${c.color_bg};color:${c.color}">
        <i class="ti ${c.icon}"></i>
      </div>
      <span style="flex:1;font-size:13px;font-weight:500">${c.name}</span>
      <button class="btn-del" onclick="deleteCategory(${c.id})" aria-label="Excluir categoria">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `).join('');
}

// ── CAT MODAL ──
function openCatModal() {
  state.selectedColor = COLOR_OPTIONS[0].color;
  const picker = el('color-picker');
  picker.innerHTML = COLOR_OPTIONS.map((opt, i) => `
    <div class="color-swatch ${i === 0 ? 'selected' : ''}"
         style="background:${opt.color}"
         onclick="selectColor(${i}, this)"></div>
  `).join('');
  el('cat-name').value = '';
  hideError('cat-error');
  el('cat-modal').classList.remove('hidden');
}

function closeCatModal(e) {
  if (!e || e.target === el('cat-modal')) el('cat-modal').classList.add('hidden');
}

function selectColor(i, el_) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el_.classList.add('selected');
  state.selectedColor = COLOR_OPTIONS[i].color;
  state.selectedColorBg = COLOR_OPTIONS[i].bg;
}

async function saveCat() {
  const name = el('cat-name').value.trim();
  if (!name) return showError('cat-error', 'Informe um nome para a categoria.');
  hideError('cat-error');
  try {
    const c = await API.createCategory({
      name,
      icon: 'ti-tag',
      color: state.selectedColor,
      color_bg: state.selectedColorBg || COLOR_OPTIONS[0].bg
    });
    state.categories.push(c);
    closeCatModal();
    renderCatManage();
  } catch (e) {
    showError('cat-error', e.message);
  }
}

async function deleteCategory(id) {
  if (!confirm('Excluir esta categoria?')) return;
  try {
    await API.deleteCategory(id);
    state.categories = state.categories.filter(c => c.id !== id);
    renderCatManage();
  } catch (e) {
    alert(e.message);
  }
}

// ── MODAL LANCAMENTO ──
function openModal(entry = null) {
  state.editId = entry ? entry.id : null;
  el('modal-title-text').textContent = entry ? 'Editar lançamento' : 'Novo lançamento';
  el('edit-id').value = entry ? entry.id : '';

  const today = new Date().toISOString().split('T')[0];
  el('f-date').value = entry ? entry.entry_date.split('T')[0] : today;
  el('f-desc').value = entry ? entry.description : '';
  el('f-val').value = entry ? entry.amount : '';

  setType(entry ? entry.type : 'in');

  populateCatSelect('f-cat-modal', entry ? entry.type : 'in');
  if (entry && entry.category_id) el('f-cat-modal').value = entry.category_id;

  hideError('modal-error');
  el('modal').classList.remove('hidden');
  setTimeout(() => el('f-desc').focus(), 50);
}

function closeModal(e) {
  if (!e || e.target === el('modal')) el('modal').classList.add('hidden');
}

function setType(t) {
  state.formType = t;
  el('t-in').className  = 'ttype' + (t === 'in'  ? ' active-in'  : '');
  el('t-out').className = 'ttype' + (t === 'out' ? ' active-out' : '');
  populateCatSelect('f-cat-modal', t);
}

async function saveEntry() {
  const description = el('f-desc').value.trim();
  const amount = parseFloat(el('f-val').value);
  const entry_date = el('f-date').value;
  const category_id = el('f-cat-modal').value || null;
  const type = state.formType;

  if (!description || !amount || !entry_date) return showError('modal-error', 'Preencha todos os campos.');
  if (amount <= 0) return showError('modal-error', 'O valor deve ser maior que zero.');
  hideError('modal-error');

  try {
    const body = { description, amount, entry_date, type, category_id };
    if (state.editId) {
      await API.updateEntry(state.editId, body);
    } else {
      await API.createEntry(body);
    }
    el('modal').classList.add('hidden');
    loadDashboard();
    if (el('page-lancamentos').classList.contains('active')) loadLancamentos();
    if (el('page-graficos').classList.contains('active')) loadGraficos();
  } catch (e) {
    showError('modal-error', e.message);
  }
}

async function deleteEntry(id) {
  if (!confirm('Excluir este lançamento?')) return;
  try {
    await API.deleteEntry(id);
    loadDashboard();
    if (el('page-lancamentos').classList.contains('active')) loadLancamentos();
  } catch (e) {
    alert(e.message);
  }
}

// ── DASHBOARD ──
async function loadDashboard() {
  const entries = await API.getEntries({ month: state.currentMonth, year: state.currentYear });
  const catData = await API.getByCategory(state.currentMonth, state.currentYear);
  const summary = await API.getSummary(6);

  const ins  = entries.filter(e => e.type === 'in');
  const outs = entries.filter(e => e.type === 'out');
  const sumIn  = ins.reduce((a, e) => a + parseFloat(e.amount), 0);
  const sumOut = outs.reduce((a, e) => a + parseFloat(e.amount), 0);
  const bal = sumIn - sumOut;

  el('s-in').textContent    = fmt(sumIn);
  el('s-out').textContent   = fmt(sumOut);
  el('s-bal').textContent   = fmt(Math.abs(bal));
  el('s-bal').style.color   = bal >= 0 ? 'var(--green)' : 'var(--red)';
  el('s-count').textContent = entries.length;
  el('s-in-count').textContent  = ins.length + ' lançamento' + (ins.length !== 1 ? 's' : '');
  el('s-out-count').textContent = outs.length + ' lançamento' + (outs.length !== 1 ? 's' : '');
  el('s-bal-pct').textContent   = bal >= 0 ? '▲ saldo positivo' : '▼ saldo negativo';

  renderRecentList(entries.slice(0, 6));
  renderCatBars(catData);
  renderBarChart(summary);
  renderDonutChart(catData);
}

function renderRecentList(entries) {
  const list = el('recent-list');
  if (!entries.length) {
    list.innerHTML = '<div class="empty"><i class="ti ti-inbox"></i>Nenhum lançamento neste mês</div>';
    return;
  }
  list.innerHTML = entries.map(e => txnItem(e)).join('');
}

function txnItem(e, showActions = false) {
  const d = new Date(e.entry_date + 'T12:00:00');
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const icon = e.category_icon || 'ti-tag';
  const color = e.category_color || '#5F5E5A';
  const colorBg = e.category_color_bg || '#F1EFE8';
  const catName = e.category_name || '—';
  const actions = showActions ? `
    <button class="btn-edit" onclick='openModal(${JSON.stringify(e)})' aria-label="Editar"><i class="ti ti-edit"></i></button>
    <button class="btn-del"  onclick="deleteEntry(${e.id})"             aria-label="Excluir"><i class="ti ti-trash"></i></button>
  ` : '';
  return `
    <div class="txn-item">
      <div class="txn-icon" style="background:${colorBg};color:${color}">
        <i class="ti ${icon}"></i>
      </div>
      <div class="txn-info">
        <div class="txn-name">${e.description}</div>
        <div class="txn-meta">${catName} · ${dateStr}</div>
      </div>
      <div class="txn-right">
        <div class="txn-amount" style="color:${e.type === 'in' ? 'var(--green)' : 'var(--red)'}">
          ${e.type === 'in' ? '+' : '-'}${fmt(e.amount)}
        </div>
        <span class="badge badge-${e.type}">${e.type === 'in' ? 'Receita' : 'Despesa'}</span>
      </div>
      ${actions}
    </div>`;
}

function renderCatBars(catData) {
  const bars = el('cat-bars');
  if (!catData.length) {
    bars.innerHTML = '<div class="empty">Nenhuma despesa neste mês</div>';
    return;
  }
  const max = Math.max(...catData.map(c => parseFloat(c.total)));
  bars.innerHTML = catData.map(c => `
    <div class="cat-row">
      <div class="cat-row-label">${c.name}</div>
      <div class="cat-bar-bg">
        <div class="cat-bar" style="width:${Math.round(parseFloat(c.total) / max * 100)}%;background:${c.color}"></div>
      </div>
      <div class="cat-row-val">${fmt(c.total)}</div>
    </div>
  `).join('');
}

// ── LANCAMENTOS PAGE ──
async function loadLancamentos() {
  const list = el('lancamentos-list');
  list.innerHTML = '<div class="loader">Carregando...</div>';

  const fType = el('f-type').value;
  const fCat  = el('f-cat').value;
  const fMonthVal = el('f-month-filter').value;

  // populate month filter
  const mSel = el('f-month-filter');
  if (mSel.options.length <= 1) {
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      let m = now.getMonth() - i; let y = now.getFullYear();
      if (m < 0) { m += 12; y--; }
      const o = document.createElement('option');
      o.value = `${y}-${m + 1}`;
      o.textContent = MONTHS[m] + ' ' + y;
      mSel.appendChild(o);
    }
  }

  // populate category filter
  const cSel = el('f-cat');
  if (cSel.options.length <= 1) {
    state.categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      cSel.appendChild(o);
    });
  }

  const params = {};
  if (fType) params.type = fType;
  if (fCat) params.category_id = fCat;
  if (fMonthVal) { const [y, m] = fMonthVal.split('-'); params.month = m; params.year = y; }

  const entries = await API.getEntries(params);

  if (!entries.length) {
    list.innerHTML = '<div class="empty"><i class="ti ti-inbox"></i>Nenhum lançamento encontrado</div>';
    return;
  }
  list.innerHTML = entries.map(e => txnItem(e, true)).join('');
}

// ── GRAFICOS PAGE ──
async function loadGraficos() {
  const summary = await API.getSummary(12);

  const months12 = [];
  for (let i = 11; i >= 0; i--) {
    let m = state.currentMonth - i;
    let y = state.currentYear;
    if (m < 1) { m += 12; y--; }
    months12.push({ label: MONTHS_SHORT[m - 1] + '/' + String(y).slice(2), m, y });
  }

  const ins  = months12.map(({ m, y }) => {
    const found = summary.find(s => s.month === m && s.year === y && s.type === 'in');
    return found ? parseFloat(found.total) : 0;
  });
  const outs = months12.map(({ m, y }) => {
    const found = summary.find(s => s.month === m && s.year === y && s.type === 'out');
    return found ? parseFloat(found.total) : 0;
  });
  const bals = ins.map((v, i) => v - outs[i]);
  const labels = months12.map(x => x.label);

  destroyChart('lineChart');
  state.charts.lineChart = new Chart(el('lineChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Saldo', data: bals, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', tension: 0.4, fill: true, pointRadius: 4 }] },
    options: chartOpts(true)
  });

  destroyChart('inChart');
  state.charts.inChart = new Chart(el('inChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Receitas', data: ins, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 }] },
    options: chartOpts()
  });

  destroyChart('outChart');
  state.charts.outChart = new Chart(el('outChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Despesas', data: outs, backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 4 }] },
    options: chartOpts()
  });
}

// ── CHARTS ──
function chartOpts(showNeg = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 }, color: '#555a72', maxRotation: 45, autoSkip: false } },
      y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, border: { display: false }, ticks: { font: { size: 11 }, color: '#555a72', callback: v => fmtShort(v) } }
    }
  };
}

function renderBarChart(summary) {
  const months6 = [];
  for (let i = 5; i >= 0; i--) {
    let m = state.currentMonth - i; let y = state.currentYear;
    if (m < 1) { m += 12; y--; }
    months6.push({ label: MONTHS_SHORT[m - 1] + '/' + String(y).slice(2), m, y });
  }
  const ins  = months6.map(({ m, y }) => parseFloat(summary.find(s => s.month === m && s.year === y && s.type === 'in')?.total  || 0));
  const outs = months6.map(({ m, y }) => parseFloat(summary.find(s => s.month === m && s.year === y && s.type === 'out')?.total || 0));
  const labels = months6.map(x => x.label);

  destroyChart('barChart');
  state.charts.barChart = new Chart(el('barChart'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Receitas', data: ins,  backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6, borderSkipped: false },
      { label: 'Despesas', data: outs, backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 6, borderSkipped: false }
    ]},
    options: chartOpts()
  });
}

function renderDonutChart(catData) {
  destroyChart('donutChart');
  if (!catData.length) return;
  state.charts.donutChart = new Chart(el('donutChart'), {
    type: 'doughnut',
    data: {
      labels: catData.map(c => c.name),
      datasets: [{ data: catData.map(c => parseFloat(c.total)), backgroundColor: catData.map(c => c.color), borderWidth: 2, borderColor: 'rgba(0,0,0,0)' }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } } } }
  });
}

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

function destroyCharts() {
  Object.keys(state.charts).forEach(k => destroyChart(k));
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    el('modal').classList.add('hidden');
    el('cat-modal').classList.add('hidden');
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    if (!el('app-screen').classList.contains('hidden')) openModal();
  }
});

// ── ENTER KEY on auth ──
el('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
el('reg-pass').addEventListener('keydown',   e => { if (e.key === 'Enter') doRegister(); });

// ── BOOT ──
autoLogin();
