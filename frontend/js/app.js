const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const state = {
  user: null, categories: [], formType: 'in', editId: null,
  currentMonth: new Date().getMonth() + 1, currentYear: new Date().getFullYear(),
  selectedColor: '#2563eb', selectedColorBg: 'rgba(37,99,235,0.12)',
  charts: {}, darkMode: false
};

const COLOR_OPTIONS = [
  { color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  { color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  { color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  { color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
  { color: '#db2777', bg: 'rgba(219,39,119,0.12)' },
  { color: '#0891b2', bg: 'rgba(8,145,178,0.12)' },
  { color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
];

const fmt = v => 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = v => { const n = parseFloat(v); if (Math.abs(n) >= 1000) return 'R$'+(n/1000).toFixed(1)+'k'; return 'R$'+Math.round(n); };
const el = id => document.getElementById(id);
const showError = (id, msg) => { const e=el(id); e.textContent=msg; e.classList.remove('hidden'); };
const hideError = id => el(id).classList.add('hidden');

// ── THEME ──
function initTheme() {
  const saved = localStorage.getItem('cf_theme');
  const dark = saved === 'dark';
  setTheme(dark);
}
function setTheme(dark) {
  state.darkMode = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const icon = el('theme-icon'), label = el('theme-label'), pill = el('theme-pill');
  if (icon) icon.className = dark ? 'ti ti-sun' : 'ti ti-moon';
  if (label) label.textContent = dark ? 'Modo claro' : 'Modo escuro';
  if (pill) pill.classList.toggle('on', dark);
  localStorage.setItem('cf_theme', dark ? 'dark' : 'light');
  destroyCharts();
  setTimeout(() => {
    if (el('page-dashboard').classList.contains('active')) renderChartsOnly();
    if (el('page-graficos').classList.contains('active')) loadGraficos();
  }, 50);
}
function toggleTheme() { setTheme(!state.darkMode); }

// ── AUTH ──
function switchTab(tab) {
  el('form-login').classList.toggle('hidden', tab !== 'login');
  el('form-register').classList.toggle('hidden', tab !== 'register');
  el('tab-login').classList.toggle('active', tab === 'login');
  el('tab-register').classList.toggle('active', tab === 'register');
  hideError('login-error'); hideError('register-error');
}
function togglePass(inputId, icon) {
  const inp = el(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('ti-eye'); icon.classList.toggle('ti-eye-off');
}
async function doLogin() {
  hideError('login-error');
  const email = el('login-email').value.trim(), password = el('login-pass').value;
  if (!email || !password) return showError('login-error', 'Preencha e-mail e senha.');
  try {
    const data = await API.login({ email, password });
    localStorage.setItem('fp_token', data.token);
    state.user = data.user; initApp();
  } catch(e) { showError('login-error', e.message); }
}
async function doRegister() {
  hideError('register-error');
  const name = el('reg-name').value.trim(), email = el('reg-email').value.trim();
  const password = el('reg-pass').value;
  const invite_code = el('reg-code').value.trim().toUpperCase();
  if (!name || !email || !password || !invite_code) return showError('register-error', 'Preencha todos os campos, incluindo o código de acesso.');
  try {
    const data = await API.register({ name, email, password, invite_code });
    localStorage.setItem('fp_token', data.token);
    state.user = data.user; initApp();
  } catch(e) { showError('register-error', e.message); }
}
function logout() {
  localStorage.removeItem('fp_token'); state.user = null; state.categories = [];
  destroyCharts();
  el('app-screen').classList.add('hidden');
  el('auth-screen').classList.remove('hidden');
  el('form-login').classList.remove('hidden');
  el('form-register').classList.add('hidden');
  el('login-email').value = ''; el('login-pass').value = '';
}

// ── INIT ──
async function initApp() {
  el('auth-screen').classList.add('hidden');
  el('app-screen').classList.remove('hidden');
  const u = state.user;
  el('user-name').textContent = u.name;
  el('user-email').textContent = u.email;
  el('user-avatar').textContent = u.name.charAt(0).toUpperCase();
  if (u.is_admin) {
    el('admin-nav-section').classList.remove('hidden');
    el('admin-nav-item').classList.remove('hidden');
  }
  updateMonthLabel();
  await loadCategories();
  await loadDashboard();
}
async function autoLogin() {
  initTheme();
  const token = localStorage.getItem('fp_token');
  if (!token) return;
  try { state.user = await API.me(); initApp(); }
  catch { localStorage.removeItem('fp_token'); }
}

// ── NAVIGATION ──
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el('page-'+page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  const titles = { dashboard:'Dashboard', ia:'Análise com IA', lancamentos:'Lançamentos', graficos:'Gráficos', categorias:'Categorias', admin:'Painel Admin' };
  el('page-title').textContent = titles[page];
  if (page === 'lancamentos') loadLancamentos();
  if (page === 'graficos') loadGraficos();
  if (page === 'categorias') renderCatManage();
  if (page === 'admin') loadAdminPage();
}
function changeMonth(dir) {
  state.currentMonth += dir;
  if (state.currentMonth > 12) { state.currentMonth = 1; state.currentYear++; }
  if (state.currentMonth < 1)  { state.currentMonth = 12; state.currentYear--; }
  updateMonthLabel(); loadDashboard();
}
function updateMonthLabel() {
  el('month-label').textContent = MONTHS_SHORT[state.currentMonth-1]+' '+state.currentYear;
  const now = new Date();
  const dateEl = el('topbar-date');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
}

// ── AI ──
async function runAI() {
  el('ia-result').classList.add('hidden');
  el('ia-loading').classList.remove('hidden');
  el('btn-analyze').disabled = true;

  try {
    const entries = await API.getEntries({ month: state.currentMonth, year: state.currentYear });
    const summary = await API.getSummary(6);
    const catData = await API.getByCategory(state.currentMonth, state.currentYear);

    const ins  = entries.filter(e => e.type === 'in');
    const outs = entries.filter(e => e.type === 'out');
    const sumIn  = ins.reduce((a,e)=>a+parseFloat(e.amount),0);
    const sumOut = outs.reduce((a,e)=>a+parseFloat(e.amount),0);

    if (!entries.length) {
      el('ia-loading').classList.add('hidden');
      el('ia-result').classList.remove('hidden');
      el('ia-result-body').innerHTML = '<span style="color:var(--txt3)">Você ainda não tem lançamentos neste mês. Adicione suas receitas e despesas para receber a análise.</span>';
      el('ia-result-meta').textContent = '';
      el('btn-analyze').disabled = false;
      return;
    }

    const catSummary = catData.map(c=>`${c.name}: R$${parseFloat(c.total).toFixed(2)}`).join(', ');
    const topExp = outs.sort((a,b)=>b.amount-a.amount).slice(0,5).map(e=>`${e.description} (R$${parseFloat(e.amount).toFixed(2)})`).join(', ');

    const hist = [];
    for (let i=5;i>=0;i--) {
      let m=state.currentMonth-i, y=state.currentYear;
      if (m<1){m+=12;y--;}
      const si = parseFloat(summary.find(s=>s.month===m&&s.year===y&&s.type==='in')?.total||0);
      const so = parseFloat(summary.find(s=>s.month===m&&s.year===y&&s.type==='out')?.total||0);
      hist.push(`${MONTHS_SHORT[m-1]}/${String(y).slice(2)}: receita R$${si.toFixed(0)}, despesa R$${so.toFixed(0)}`);
    }

    const context = `Dados do usuário — ${MONTHS[state.currentMonth-1]} ${state.currentYear}:
- Receitas: R$${sumIn.toFixed(2)} (${ins.length} lançamentos)
- Despesas: R$${sumOut.toFixed(2)} (${outs.length} lançamentos)
- Saldo: R$${(sumIn-sumOut).toFixed(2)}
- Taxa de poupança: ${sumIn>0?(((sumIn-sumOut)/sumIn)*100).toFixed(1):0}%
- Gastos por categoria: ${catSummary||'nenhum'}
- Maiores despesas: ${topExp||'nenhuma'}
- Histórico 6 meses: ${hist.join(' | ')}`;

    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+localStorage.getItem('fp_token') },
      body: JSON.stringify({ context })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro na IA');

    el('ia-loading').classList.add('hidden');
    el('ia-result').classList.remove('hidden');
    el('ia-result-body').innerHTML = data.text;
    el('ia-result-meta').textContent = `Gerado em ${new Date().toLocaleString('pt-BR')} · ${MONTHS[state.currentMonth-1]} ${state.currentYear}`;
  } catch(e) {
    el('ia-loading').classList.add('hidden');
    el('ia-result').classList.remove('hidden');
    el('ia-result-body').innerHTML = `<span style="color:var(--red)">Erro: ${e.message}. Verifique se a variável ANTHROPIC_API_KEY está configurada no Railway.</span>`;
    el('ia-result-meta').textContent = '';
  }
  el('btn-analyze').disabled = false;
}

// ── CATEGORIES ──
async function loadCategories() { state.categories = await API.getCategories(); }
function populateCatSelect(selectId, type) {
  const sel = el(selectId); sel.innerHTML = '';
  if (type === 'out' || !type) {
    state.categories.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
  } else {
    ['Salário','Freelance','Investimento','Bonificação','Outros'].forEach(n => { const o=document.createElement('option'); o.value=''; o.textContent=n; sel.appendChild(o); });
  }
}
function renderCatManage() {
  const list = el('cat-list');
  if (!state.categories.length) { list.innerHTML='<div class="empty"><i class="ti ti-tag"></i>Nenhuma categoria ainda</div>'; return; }
  list.innerHTML = state.categories.map(c=>`
    <div class="cat-manage-item">
      <div class="cat-badge" style="background:${c.color_bg};color:${c.color}"><i class="ti ${c.icon}"></i></div>
      <span style="flex:1;font-size:13px;font-weight:500">${c.name}</span>
      <button class="btn-del" onclick="deleteCategory(${c.id})"><i class="ti ti-trash"></i></button>
    </div>`).join('');
}
function openCatModal() {
  state.selectedColor=COLOR_OPTIONS[0].color; state.selectedColorBg=COLOR_OPTIONS[0].bg;
  el('color-picker').innerHTML=COLOR_OPTIONS.map((opt,i)=>`<div class="color-swatch ${i===0?'selected':''}" style="background:${opt.color}" onclick="selectColor(${i},this)"></div>`).join('');
  el('cat-name').value=''; hideError('cat-error');
  el('cat-modal').classList.remove('hidden');
}
function closeCatModal(e) { if(!e||e.target===el('cat-modal')) el('cat-modal').classList.add('hidden'); }
function selectColor(i, elem) {
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));
  elem.classList.add('selected'); state.selectedColor=COLOR_OPTIONS[i].color; state.selectedColorBg=COLOR_OPTIONS[i].bg;
}
async function saveCat() {
  const name=el('cat-name').value.trim();
  if (!name) return showError('cat-error','Nome obrigatório.'); hideError('cat-error');
  try { const c=await API.createCategory({name,icon:'ti-tag',color:state.selectedColor,color_bg:state.selectedColorBg}); state.categories.push(c); closeCatModal(); renderCatManage(); }
  catch(e) { showError('cat-error',e.message); }
}
async function deleteCategory(id) {
  if (!confirm('Excluir categoria?')) return;
  try { await API.deleteCategory(id); state.categories=state.categories.filter(c=>c.id!==id); renderCatManage(); }
  catch(e) { alert(e.message); }
}

// ── MODAL ──
function openModal(entry=null) {
  state.editId=entry?entry.id:null;
  el('modal-title-text').textContent=entry?'Editar lançamento':'Novo lançamento';
  el('edit-id').value=entry?entry.id:'';
  el('f-date').value=entry?entry.entry_date.toString().split('T')[0]:new Date().toISOString().split('T')[0];
  el('f-desc').value=entry?entry.description:'';
  el('f-val').value=entry?entry.amount:'';
  setType(entry?entry.type:'in');
  populateCatSelect('f-cat-modal',entry?entry.type:'in');
  if (entry&&entry.category_id) el('f-cat-modal').value=entry.category_id;
  hideError('modal-error');
  el('modal').classList.remove('hidden');
  setTimeout(()=>el('f-desc').focus(),50);
}
function closeModal(e) { if(!e||e.target===el('modal')) el('modal').classList.add('hidden'); }
function setType(t) {
  state.formType=t;
  el('t-in').className='ttype'+(t==='in'?' active-in':'');
  el('t-out').className='ttype'+(t==='out'?' active-out':'');
  populateCatSelect('f-cat-modal',t);
}
async function saveEntry() {
  const description=el('f-desc').value.trim(), amount=parseFloat(el('f-val').value);
  const entry_date=el('f-date').value, category_id=el('f-cat-modal').value||null, type=state.formType;
  if (!description||!amount||!entry_date) return showError('modal-error','Preencha todos os campos.');
  if (amount<=0) return showError('modal-error','Valor deve ser maior que zero.');
  hideError('modal-error');
  try {
    if (state.editId) await API.updateEntry(state.editId,{description,amount,entry_date,type,category_id});
    else await API.createEntry({description,amount,entry_date,type,category_id});
    el('modal').classList.add('hidden');
    loadDashboard();
    if (el('page-lancamentos').classList.contains('active')) loadLancamentos();
    if (el('page-graficos').classList.contains('active')) loadGraficos();
  } catch(e) { showError('modal-error',e.message); }
}
async function deleteEntry(id) {
  if (!confirm('Excluir lançamento?')) return;
  try { await API.deleteEntry(id); loadDashboard(); if (el('page-lancamentos').classList.contains('active')) loadLancamentos(); }
  catch(e) { alert(e.message); }
}

// ── DASHBOARD ──
async function loadDashboard() {
  const entries=await API.getEntries({month:state.currentMonth,year:state.currentYear});
  const catData=await API.getByCategory(state.currentMonth,state.currentYear);
  const summary=await API.getSummary(6);
  const ins=entries.filter(e=>e.type==='in'), outs=entries.filter(e=>e.type==='out');
  const sumIn=ins.reduce((a,e)=>a+parseFloat(e.amount),0), sumOut=outs.reduce((a,e)=>a+parseFloat(e.amount),0), bal=sumIn-sumOut;
  el('s-in').textContent=fmt(sumIn); el('s-out').textContent=fmt(sumOut);
  el('s-bal').textContent=fmt(Math.abs(bal)); el('s-bal').style.color=bal>=0?'var(--green)':'var(--red)';
  el('s-count').textContent=entries.length;
  el('s-in-count').textContent=ins.length+' lançamento'+(ins.length!==1?'s':'');
  el('s-out-count').textContent=outs.length+' lançamento'+(outs.length!==1?'s':'');
  el('s-bal-txt').textContent=bal>=0?'▲ saldo positivo':'▼ saldo negativo';
  renderRecentList(entries.slice(0,6)); renderCatBars(catData);
  renderBarChart(summary); renderDonutChart(catData);
}

function renderRecentList(entries) {
  const list=el('recent-list');
  if (!entries.length) { list.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Nenhum lançamento neste mês</div>'; return; }
  list.innerHTML=entries.map(e=>txnItem(e)).join('');
}

function txnItem(e, showActions=false) {
  const rawDate=e.entry_date?e.entry_date.toString().split('T')[0]:'';
  const d=rawDate?new Date(rawDate+'T12:00:00'):null;
  const dateStr=d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'—';
  const color=e.category_color||'#64748b', colorBg=e.category_color_bg||'rgba(100,116,139,0.12)';
  const icon=e.category_icon||'ti-tag', catName=e.category_name||'—';
  const safeEntry=JSON.stringify(e).replace(/'/g,"\\'");
  const actions=showActions?`<button class="btn-edit" onclick='openModal(${safeEntry})'><i class="ti ti-edit"></i></button><button class="btn-del" onclick="deleteEntry(${e.id})"><i class="ti ti-trash"></i></button>`:'';
  return `<div class="txn-item">
    <div class="txn-icon" style="background:${colorBg};color:${color}"><i class="ti ${icon}"></i></div>
    <div class="txn-info"><div class="txn-name">${e.description}</div><div class="txn-meta">${catName} · ${dateStr}</div></div>
    <div class="txn-right">
      <div class="txn-amount" style="color:${e.type==='in'?'var(--green)':'var(--red)'}">${e.type==='in'?'+':'-'}${fmt(e.amount)}</div>
      <span class="badge badge-${e.type}">${e.type==='in'?'Receita':'Despesa'}</span>
    </div>${actions}</div>`;
}

function renderCatBars(catData) {
  const bars=el('cat-bars');
  if (!catData.length) { bars.innerHTML='<div class="empty" style="padding:1rem">Nenhuma despesa ainda</div>'; return; }
  const max=Math.max(...catData.map(c=>parseFloat(c.total)));
  bars.innerHTML=catData.map(c=>`<div class="cat-row">
    <div class="cat-row-label">${c.name}</div>
    <div class="cat-bar-bg"><div class="cat-bar" style="width:${Math.round(parseFloat(c.total)/max*100)}%;background:${c.color}"></div></div>
    <div class="cat-row-val">${fmt(c.total)}</div></div>`).join('');
}

// ── LANCAMENTOS ──
async function loadLancamentos() {
  const list=el('lancamentos-list');
  list.innerHTML='<div class="loader">Carregando...</div>';
  const fType=el('f-type').value, fCat=el('f-cat').value, fMonthVal=el('f-month-filter').value;
  const mSel=el('f-month-filter');
  if (mSel.options.length<=1) {
    const now=new Date();
    for (let i=0;i<12;i++) { let m=now.getMonth()-i,y=now.getFullYear(); if(m<0){m+=12;y--;} const o=document.createElement('option'); o.value=`${y}-${m+1}`; o.textContent=MONTHS[m]+' '+y; mSel.appendChild(o); }
  }
  const cSel=el('f-cat');
  if (cSel.options.length<=1) { state.categories.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;cSel.appendChild(o);}); }
  const params={};
  if (fType) params.type=fType; if (fCat) params.category_id=fCat;
  if (fMonthVal) { const [y,m]=fMonthVal.split('-'); params.month=m; params.year=y; }
  const entries=await API.getEntries(params);
  if (!entries.length) { list.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Nenhum lançamento encontrado</div>'; return; }
  list.innerHTML=entries.map(e=>txnItem(e,true)).join('');
}

// ── GRAFICOS ──
async function loadGraficos() {
  const summary=await API.getSummary(12);
  const months12=[];
  for (let i=11;i>=0;i--) { let m=state.currentMonth-i,y=state.currentYear; if(m<1){m+=12;y--;} months12.push({label:MONTHS_SHORT[m-1]+'/'+String(y).slice(2),m,y}); }
  const labels=months12.map(x=>x.label);
  const ins=months12.map(({m,y})=>parseFloat(summary.find(s=>s.month===m&&s.year===y&&s.type==='in')?.total||0));
  const outs=months12.map(({m,y})=>parseFloat(summary.find(s=>s.month===m&&s.year===y&&s.type==='out')?.total||0));
  const bals=ins.map((v,i)=>v-outs[i]);
  destroyChart('lineChart');
  state.charts.lineChart=new Chart(el('lineChart'),{type:'line',data:{labels,datasets:[{label:'Saldo',data:bals,borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,0.08)',tension:0.4,fill:true,pointRadius:4,pointBackgroundColor:'#6366f1'}]},options:chartOpts()});
  destroyChart('inChart');
  state.charts.inChart=new Chart(el('inChart'),{type:'bar',data:{labels,datasets:[{label:'Receitas',data:ins,backgroundColor:'rgba(22,163,74,0.7)',borderRadius:6,borderSkipped:false}]},options:chartOpts()});
  destroyChart('outChart');
  state.charts.outChart=new Chart(el('outChart'),{type:'bar',data:{labels,datasets:[{label:'Despesas',data:outs,backgroundColor:'rgba(220,38,38,0.65)',borderRadius:6,borderSkipped:false}]},options:chartOpts()});
}

// ── CHARTS ──
function getTC() { return state.darkMode?'#555a72':'#9ba3c0'; }
function getGC() { return state.darkMode?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)'; }
function chartOpts() {
  return { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
    scales:{ x:{grid:{display:false},border:{display:false},ticks:{font:{size:10},color:getTC(),maxRotation:45,autoSkip:false}},
             y:{grid:{color:getGC()},border:{display:false},ticks:{font:{size:11},color:getTC(),callback:v=>fmtShort(v)}} }};
}
function renderBarChart(summary) {
  const months6=[];
  for (let i=5;i>=0;i--) { let m=state.currentMonth-i,y=state.currentYear; if(m<1){m+=12;y--;} months6.push({label:MONTHS_SHORT[m-1]+'/'+String(y).slice(2),m,y}); }
  const ins=months6.map(({m,y})=>parseFloat(summary.find(s=>s.month===m&&s.year===y&&s.type==='in')?.total||0));
  const outs=months6.map(({m,y})=>parseFloat(summary.find(s=>s.month===m&&s.year===y&&s.type==='out')?.total||0));
  destroyChart('barChart');
  state.charts.barChart=new Chart(el('barChart'),{type:'bar',data:{labels:months6.map(x=>x.label),datasets:[
    {label:'Receitas',data:ins,backgroundColor:'rgba(22,163,74,0.7)',borderRadius:6,borderSkipped:false},
    {label:'Despesas',data:outs,backgroundColor:'rgba(220,38,38,0.65)',borderRadius:6,borderSkipped:false}
  ]},options:chartOpts()});
}
function renderDonutChart(catData) {
  destroyChart('donutChart');
  if (!catData.length) return;
  state.charts.donutChart=new Chart(el('donutChart'),{type:'doughnut',data:{labels:catData.map(c=>c.name),datasets:[{data:catData.map(c=>parseFloat(c.total)),backgroundColor:catData.map(c=>c.color),borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:10,padding:8,color:getTC()}}}}});
}
async function renderChartsOnly() {
  const [summary, catData] = await Promise.all([API.getSummary(6), API.getByCategory(state.currentMonth,state.currentYear)]);
  renderBarChart(summary); renderDonutChart(catData);
}
function destroyChart(key) { if(state.charts[key]){state.charts[key].destroy();delete state.charts[key];} }
function destroyCharts() { Object.keys(state.charts).forEach(k=>destroyChart(k)); }


// ── ADMIN ──
async function loadAdminPage() {
  loadAdminStats();
  loadAdminUsers();
}

async function loadAdminStats() {
  try {
    const stats = await API.adminStats();
    el('admin-stats').innerHTML = `
      <div class="admin-stat">
        <div class="admin-stat-label">Total de usuários</div>
        <div class="admin-stat-value">${stats.total_users}</div>
        <div class="admin-stat-sub">contas ativas</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-label">Novos esta semana</div>
        <div class="admin-stat-value">${stats.new_this_week}</div>
        <div class="admin-stat-sub">últimos 7 dias</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-label">Total de lançamentos</div>
        <div class="admin-stat-value">${stats.total_entries}</div>
        <div class="admin-stat-sub">na plataforma</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-label">Bloqueados</div>
        <div class="admin-stat-value" style="color:var(--red)">${stats.blocked_users}</div>
        <div class="admin-stat-sub">contas suspensas</div>
      </div>`;
  } catch(e) { console.error(e); }
}

async function loadAdminUsers() {
  const list = el('admin-users-list');
  list.innerHTML = '<div class="loader">Carregando usuários...</div>';
  try {
    const users = await API.adminUsers();
    if (!users.length) { list.innerHTML = '<div class="empty"><i class="ti ti-users"></i>Nenhum usuário ainda</div>'; return; }
    list.innerHTML = users.map(u => {
      const joined = new Date(u.created_at).toLocaleDateString('pt-BR');
      const lastEntry = u.last_entry_at ? new Date(u.last_entry_at).toLocaleDateString('pt-BR') : 'nunca';
      const bal = parseFloat(u.total_in) - parseFloat(u.total_out);
      return `<div class="admin-user-row" id="user-row-${u.id}">
        <div class="admin-user-avatar ${u.is_blocked?'blocked':''}">${u.name.charAt(0).toUpperCase()}</div>
        <div class="admin-user-info">
          <div class="admin-user-name">
            ${u.name}
            ${u.is_admin ? '<span class="badge-admin">Admin</span>' : ''}
            ${u.is_blocked ? '<span class="badge-blocked">Bloqueado</span>' : ''}
          </div>
          <div class="admin-user-email">${u.email} · cadastro em ${joined}</div>
        </div>
        <div class="admin-user-stats">
          <div class="admin-stat-pill"><span>Lançamentos</span><strong>${u.total_entries}</strong></div>
          <div class="admin-stat-pill"><span>Último uso</span><strong>${lastEntry}</strong></div>
          <div class="admin-stat-pill"><span>Saldo total</span><strong style="color:${bal>=0?'var(--green)':'var(--red)'}">${fmt(bal)}</strong></div>
        </div>
        ${!u.is_admin ? `<div class="admin-actions">
          <button class="btn-block ${u.is_blocked?'active':''}" onclick="toggleBlock(${u.id},${u.is_blocked})">
            <i class="ti ti-${u.is_blocked?'lock-open':'lock'}"></i>
            ${u.is_blocked?'Desbloquear':'Bloquear'}
          </button>
          <button class="btn-del-user" onclick="deleteUser(${u.id},'${u.name}')" title="Excluir conta"><i class="ti ti-trash"></i></button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = '<div class="empty"><i class="ti ti-alert-circle"></i>Erro ao carregar usuários</div>';
  }
}

async function toggleBlock(id, currentlyBlocked) {
  try {
    await API.blockUser(id, !currentlyBlocked);
    loadAdminUsers();
    loadAdminStats();
  } catch(e) { alert(e.message); }
}

async function deleteUser(id, name) {
  if (!confirm(`Excluir a conta de "${name}"? Todos os dados serão apagados permanentemente.`)) return;
  try {
    await API.deleteUser(id);
    loadAdminUsers();
    loadAdminStats();
  } catch(e) { alert(e.message); }
}

// ── KEYBOARD ──
document.addEventListener('keydown', e => {
  if (e.key==='Escape') { el('modal').classList.add('hidden'); el('cat-modal').classList.add('hidden'); }
  if ((e.metaKey||e.ctrlKey)&&e.key==='n') { e.preventDefault(); if(!el('app-screen').classList.contains('hidden')) openModal(); }
});
el('login-pass').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
el('reg-pass').addEventListener('keydown',   e=>{ if(e.key==='Enter') doRegister(); });

autoLogin();
