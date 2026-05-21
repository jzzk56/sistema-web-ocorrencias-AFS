'use strict';

// → Estado
const S = {
  page:       'dashboard',
  list:       [],
  stats:      null,
  meta:       { cursos: [], anos: [], gravidades: [] },
  filters:    { aluno: '', curso: '', ano: '', gravidade: '' },
  pagination: { page: 1, perPage: 20, total: 0, totalPages: 1 },
  editId:     null,
};

// → API
const API = {
  base: '/api',

  async req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(this.base + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return { data, headers: res.headers };
  },

  get:  (path)       => API.req('GET',    path),
  post: (path, body) => API.req('POST',   path, body),
  put:  (path, body) => API.req('PUT',    path, body),
  del:  (path)       => API.req('DELETE', path),

  async getOcorrencias(params = {}) {
    const q = new URLSearchParams({ page: S.pagination.page, per_page: S.pagination.perPage, ...params }).toString();
    const r = await this.req('GET', `/ocorrencias?${q}`);
    S.pagination.total      = parseInt(r.headers.get('X-Total-Count') || '0', 10);
    S.pagination.totalPages = parseInt(r.headers.get('X-Total-Pages') || '1', 10);
    return r.data;
  },

  getStats()        { return this.req('GET', '/stats').then(r => r.data); },
  getMeta()         { return this.req('GET', '/meta').then(r => r.data); },
  getOcorrencia(id) { return this.req('GET', `/ocorrencias/${id}`).then(r => r.data); },
  create(body)      { return this.req('POST', '/ocorrencias', body).then(r => r.data); },
  update(id, body)  { return this.req('PUT', `/ocorrencias/${id}`, body).then(r => r.data); },
  remove(id)        { return this.req('DELETE', `/ocorrencias/${id}`).then(r => r.data); },
};

// → DOM
const $  = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)              e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

// → Toast
const Toast = {
  show(msg, type = 'info', ms = 3500) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const t = el('div', `toast ${type}`, `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`);
    $('toastWrap').prepend(t);
    setTimeout(() => {
      t.classList.add('removing');
      t.addEventListener('animationend', () => t.remove());
    }, ms);
  },
};

// → Confirm
const Confirm = {
  resolve: null,
  show(msg) {
    $('confirmMsg').textContent = msg;
    $('confirmBackdrop').classList.add('open');
    return new Promise(res => { this.resolve = res; });
  },
  close(result) {
    $('confirmBackdrop').classList.remove('open');
    if (this.resolve) this.resolve(result);
    this.resolve = null;
  },
};
$('confirmYes').onclick = () => Confirm.close(true);
$('confirmNo').onclick  = () => Confirm.close(false);

// → Modal
const Modal = {
  open(title, html) {
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML    = html;
    $('modalBackdrop').classList.add('open');
  },
  close() { $('modalBackdrop').classList.remove('open'); },
};
$('modalClose').onclick    = () => Modal.close();
$('modalBackdrop').onclick = e => { if (e.target === $('modalBackdrop')) Modal.close(); };

// → Roteador
const PAGE_TITLES = {
  dashboard:   'Menu de Registro',
  nova:        'Nova Ocorrência',
  editar:      'Editar Ocorrência',
  ocorrencias: 'Ocorrências',
};

function navigate(page, opts = {}) {
  S.page   = page;
  S.editId = opts.id || null;
  window.location.hash = page + (opts.id ? `/${opts.id}` : '');
  renderPage();
}

function renderPage() {
  const pages = { dashboard, nova, ocorrencias, editar };
  const fn    = pages[S.page] || dashboard;

  document.querySelectorAll('.nav-item').forEach(a => {
    const target = a.dataset.page;
    a.classList.toggle('active', target === S.page || (S.page === 'editar' && target === 'ocorrencias'));
  });

  $('topbarTitle').textContent = PAGE_TITLES[S.page] || 'Painel';
  $('page').innerHTML = '';
  fn();
}

// → Utilitários
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.toString().substring(0, 10).split('-');
  return `${day}/${m}/${y}`;
}

function badgeHtml(g) {
  const cls = { Leve: 'leve', Média: 'media', Grave: 'grave' }[g] || 'leve';
  return `<span class="badge badge-${cls}">${g}</span>`;
}

function gravityColor(g) {
  return { Leve: '#22c55e', Média: '#f59e0b', Grave: '#ef4444' }[g] || '#6b7280';
}

function cursoAno(row) { return `${row.curso} · ${row.ano}`; }

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

function loading()     { return `<div class="loading"><div class="spinner"></div> Carregando…</div>`; }
function loadingCard() {
  return `<div class="stat-card">
    <div class="stat-label" style="background:var(--surface-2);height:12px;border-radius:4px;width:60%"></div>
    <div class="stat-value" style="background:var(--surface-2);height:32px;border-radius:6px;width:50%;margin-top:8px"></div>
  </div>`;
}

// → Página: Dashboard
async function dashboard() {
  const wrap = el('div', 'fade-in');
  wrap.innerHTML = `
    <div class="page-heading"><div><h1>Ocorrências AFS</h1><p>Visão geral das ocorrências registradas.</p></div></div>
    <div class="stats-grid" id="statsGrid">
      ${loadingCard()} ${loadingCard()} ${loadingCard()} ${loadingCard()}
    </div>
    <div class="dash-grid">
      <div class="card" id="recentCard">
        <div class="card-header"><span class="card-title">Últimas ocorrências</span></div>
        <div class="card-body">${loading()}</div>
      </div>
      <div class="card" id="cursoCard">
        <div class="card-header"><span class="card-title">Por curso</span></div>
        <div class="card-body">${loading()}</div>
      </div>
    </div>`;
  $('page').appendChild(wrap);

  try {
    const stats = await API.getStats();
    S.stats = stats;
    renderStats(stats);
    renderRecent(stats.recentes);
    renderCursoChart(stats.por_curso);
  } catch {
    Toast.show('Erro ao carregar estatísticas.', 'error');
  }
}

function renderStats(s) {
  const total = s.total;
  const pg    = s.por_gravidade;
  const items = [
    { label: 'Total de ocorrências', value: total,              sub: 'registros',                                                                              cls: '' },
    { label: 'Leve',                 value: pg.Leve   || 0,    sub: `${total ? Math.round(((pg.Leve||0)          / total) * 100) : 0}% do total`, cls: 'leve' },
    { label: 'Média',                value: pg['Média'] || 0,  sub: `${total ? Math.round(((pg['Média']||0)      / total) * 100) : 0}% do total`, cls: 'media' },
    { label: 'Grave',                value: pg.Grave  || 0,    sub: `${total ? Math.round(((pg.Grave||0)         / total) * 100) : 0}% do total`, cls: 'grave' },
  ];
  $('statsGrid').innerHTML = items.map(i => `
    <div class="stat-card ${i.cls}">
      <span class="stat-label">${i.label}</span>
      <span class="stat-value">${i.value}</span>
      <span class="stat-sub">${i.sub}</span>
    </div>`).join('');
}

function renderRecent(rows) {
  const body = $('recentCard').querySelector('.card-body');
  if (!rows?.length) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><h3>Sem ocorrências</h3><p>Nenhum registro encontrado.</p></div>`;
    return;
  }
  body.innerHTML = `<div class="occ-list">${rows.map(r => `
    <div class="occ-row" onclick='showDetail(${r.id})'>
      <div>
        <div class="occ-name">${r.nome_aluno}</div>
        <div class="occ-meta">${cursoAno(r)} · ${fmtDate(r.data_ocorrencia)}</div>
      </div>
      ${badgeHtml(r.gravidade)}
    </div>`).join('')}</div>
  <div style="text-align:center;margin-top:14px">
    <button class="btn btn-ghost" onclick="navigate('ocorrencias')">Ver todas →</button>
  </div>`;
}

function renderCursoChart(por_curso) {
  const body = $('cursoCard').querySelector('.card-body');
  if (!por_curso?.length) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><h3>Sem dados</h3></div>`;
    return;
  }
  const max = Math.max(...por_curso.map(r => r.total), 1);
  body.innerHTML = `<div class="bar-chart">${por_curso.map(r => `
    <div class="bar-item">
      <div class="bar-label"><span>${r.curso}</span><strong>${r.total}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.total / max) * 100}%"></div></div>
    </div>`).join('')}</div>`;
}

// → Página: Ocorrências
async function ocorrencias() {
  const meta = await ensureMeta();
  const wrap = el('div', 'fade-in');
  wrap.innerHTML = `
    <div class="page-heading">
      <div><h1>Ocorrências</h1><p>Lista completa de ocorrências disciplinares.</p></div>
    </div>
    <div class="filters">
      <div class="filter-group wide">
        <label>Buscar por aluno</label>
        <input type="search" id="fAluno" placeholder="Nome do aluno…" value="${S.filters.aluno}" />
      </div>
      <div class="filter-group">
        <label>Curso</label>
        <select id="fCurso">
          <option value="">Todos os cursos</option>
          ${meta.cursos.map(c => `<option value="${c}" ${S.filters.curso === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Ano</label>
        <select id="fAno">
          <option value="">Todos os anos</option>
          ${meta.anos.map(a => `<option value="${a}" ${S.filters.ano === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Gravidade</label>
        <select id="fGravidade">
          <option value="">Todas</option>
          ${meta.gravidades.map(g => `<option value="${g}" ${S.filters.gravidade === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" onclick="applyFilters()">Filtrar</button>
      <button class="btn btn-ghost"   onclick="clearFilters()">Limpar</button>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <span class="table-count" id="tableCount">Carregando…</span>
        <button class="btn btn-primary" onclick="navigate('nova')">
          <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Nova
        </button>
      </div>
      <div id="tableBody">${loading()}</div>
    </div>`;

  $('page').appendChild(wrap);
  $('fAluno').addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
  await loadTable();
}

async function loadTable() {
  const body = $('tableBody');
  if (!body) return;
  body.innerHTML = loading();

  try {
    const rows = await API.getOcorrencias(activeFilters());
    S.list = rows;

    const count = $('tableCount');
    if (count) count.textContent = `${S.pagination.total} ocorrência(s) encontrada(s)`;

    if (!rows.length) {
      body.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><h3>Nenhuma ocorrência encontrada</h3><p>Tente ajustar os filtros ou <a href="#nova" onclick="navigate('nova')">cadastre uma nova</a>.</p></div>`;
      return;
    }

    body.innerHTML = `
      <table>
        <thead>
          <tr><th>#</th><th>Aluno</th><th>Turma</th><th>Data</th><th>Gravidade</th><th>Descrição</th><th></th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `
          <tr onclick="showDetail(${r.id})">
            <td data-label="ID">${r.id}</td>
            <td data-label="Aluno" class="td-name">${escHtml(r.nome_aluno)}</td>
            <td data-label="Turma">${escHtml(r.curso)} · ${escHtml(r.ano)}</td>
            <td data-label="Data" class="td-date">${fmtDate(r.data_ocorrencia)}</td>
            <td data-label="Gravidade">${badgeHtml(r.gravidade)}</td>
            <td data-label="Descrição" class="td-desc">${escHtml(r.descricao)}</td>
            <td class="td-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" title="Editar" onclick="navigate('editar',{id:${r.id}})">
                <svg viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>
              <button class="btn-icon danger" title="Excluir" onclick="deleteOcorrencia(${r.id})">
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9h6V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${paginationHtml()}`;
  } catch (err) {
    console.error(err);
    Toast.show('Erro ao carregar ocorrências.', 'error');
    body.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><h3>Erro ao carregar</h3><p>Verifique a conexão com o servidor.</p></div>`;
  }
}

function paginationHtml() {
  const { page, totalPages } = S.pagination;
  if (totalPages <= 1) return '';

  let btns = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2)
      btns += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    else if (Math.abs(i - page) === 3)
      btns += `<span style="padding:0 4px;color:var(--ink-faint)">…</span>`;
  }

  return `<div class="pagination">
    <button class="page-btn" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>
    ${btns}
    <button class="page-btn" onclick="goPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>
  </div>`;
}

function goPage(n)       { S.pagination.page = n; loadTable(); }
function activeFilters() { return Object.fromEntries(Object.entries(S.filters).filter(([, v]) => v)); }

function applyFilters() {
  S.filters.aluno     = $('fAluno')?.value.trim() || '';
  S.filters.curso     = $('fCurso')?.value || '';
  S.filters.ano       = $('fAno')?.value || '';
  S.filters.gravidade = $('fGravidade')?.value || '';
  S.pagination.page   = 1;
  loadTable();
}

function clearFilters() {
  S.filters = { aluno: '', curso: '', ano: '', gravidade: '' };
  S.pagination.page = 1;
  navigate('ocorrencias');
}

// → Página: Nova / Editar
async function nova()   { await formPage(null); }
async function editar() { await formPage(S.editId); }

async function formPage(id) {
  const meta    = await ensureMeta();
  let defaults  = {};

  if (id) {
    try { defaults = await API.getOcorrencia(id); }
    catch { Toast.show('Ocorrência não encontrada.', 'error'); navigate('ocorrencias'); return; }
  }

  const v    = defaults;
  const wrap = el('div', 'form-page fade-in');
  wrap.innerHTML = `
    <div class="form-card">
      <div class="form-card-header">
        <h2>${id ? 'Editar Ocorrência' : 'Nova Ocorrência'}</h2>
        <p>${id ? `Atualizando registro #${id}` : 'Preencha todos os campos obrigatórios.'}</p>
      </div>
      <div class="form-body">
        <div class="field">
          <label>Nome completo do aluno *</label>
          <input type="text" id="fNome" placeholder="Ex.: Maria da Silva" maxlength="255"
                 value="${escHtml(v.nome_aluno || '')}" />
          <span class="field-error" id="errNome"></span>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Curso *</label>
            <select id="fCursoForm">
              <option value="">Selecione…</option>
              ${meta.cursos.map(c => `<option value="${c}" ${v.curso === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <span class="field-error" id="errCurso"></span>
          </div>
          <div class="field">
            <label>Ano *</label>
            <select id="fAnoForm">
              <option value="">Selecione…</option>
              ${meta.anos.map(a => `<option value="${a}" ${v.ano === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
            <span class="field-error" id="errAno"></span>
          </div>
        </div>
        <div class="field" style="max-width:220px">
          <label>Data da ocorrência *</label>
          <input type="date" id="fData"
                 value="${v.data_ocorrencia ? v.data_ocorrencia.substring(0, 10) : ''}"
                 max="${todayISO()}" />
          <span class="field-error" id="errData"></span>
        </div>
        <div class="field">
          <label>Gravidade *</label>
          <div class="gravity-pills">
            ${meta.gravidades.map(g => {
              const cls = { Leve: 'leve', Média: 'media', Grave: 'grave' }[g];
              const chk = v.gravidade === g ? 'checked' : '';
              return `<div class="gravity-pill">
                <input type="radio" name="gravidade" id="g${g}" value="${g}" ${chk} />
                <label for="g${g}" class="${cls}">${g}</label>
              </div>`;
            }).join('')}
          </div>
          <span class="field-error" id="errGravidade"></span>
        </div>
        <div class="field">
          <label>Descrição detalhada *</label>
          <textarea id="fDesc" placeholder="Descreva o ocorrido com detalhes…" maxlength="2000"
                    rows="5">${escHtml(v.descricao || '')}</textarea>
          <span class="field-error" id="errDesc"></span>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost"   onclick="navigate('ocorrencias')">Cancelar</button>
        <button class="btn btn-primary" id="submitBtn" onclick="submitForm(${id || 'null'})">
          ${id ? 'Salvar alterações' : 'Registrar ocorrência'}
        </button>
      </div>
    </div>`;

  $('page').appendChild(wrap);
}

async function submitForm(id) {
  ['Nome', 'Curso', 'Ano', 'Data', 'Gravidade', 'Desc'].forEach(k => {
    const e = $('err' + k); if (e) e.textContent = '';
  });
  ['fNome', 'fCursoForm', 'fAnoForm', 'fData', 'fDesc'].forEach(fid => {
    const e = $(fid); if (e) e.classList.remove('error');
  });

  const nome  = $('fNome')?.value.trim();
  const curso = $('fCursoForm')?.value;
  const ano   = $('fAnoForm')?.value;
  const data  = $('fData')?.value;
  const desc  = $('fDesc')?.value.trim();
  const grav  = document.querySelector('input[name="gravidade"]:checked')?.value;

  let valid = true;

  if (!nome || nome.length < 3) {
    $('errNome').textContent = nome ? 'Nome deve ter ao menos 3 caracteres.' : 'Nome é obrigatório.';
    $('fNome').classList.add('error'); valid = false;
  }
  if (!curso) { $('errCurso').textContent    = 'Selecione um curso.';      $('fCursoForm').classList.add('error'); valid = false; }
  if (!ano)   { $('errAno').textContent      = 'Selecione o ano.';         $('fAnoForm').classList.add('error');   valid = false; }
  if (!data)  { $('errData').textContent     = 'Data é obrigatória.';      $('fData').classList.add('error');      valid = false; }
  if (!grav)  { $('errGravidade').textContent = 'Selecione a gravidade.';  valid = false; }
  if (!desc || desc.length < 10) {
    $('errDesc').textContent = desc ? 'Descrição muito curta (mínimo 10 caracteres).' : 'Descrição é obrigatória.';
    $('fDesc').classList.add('error'); valid = false;
  }

  if (!valid) { Toast.show('Corrija os erros antes de salvar.', 'error'); return; }

  const btn = $('submitBtn');
  btn.disabled    = true;
  btn.textContent = id ? 'Salvando…' : 'Registrando…';

  const body = { nome_aluno: nome, curso, ano, data_ocorrencia: data, descricao: desc, gravidade: grav };

  try {
    if (id) {
      await API.update(id, body);
      Toast.show('Ocorrência atualizada com sucesso!', 'success');
    } else {
      await API.create(body);
      Toast.show('Ocorrência registrada com sucesso!', 'success');
    }
    navigate('ocorrencias');
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = id ? 'Salvar alterações' : 'Registrar ocorrência';
    const errs = err?.data?.errors;
    Toast.show(errs?.length ? errs[0] : 'Erro ao salvar. Tente novamente.', 'error');
  }
}

// → Modal de detalhe
async function showDetail(id) {
  Modal.open('Carregando…', loading());
  try {
    const r = await API.getOcorrencia(id);
    $('modalTitle').textContent = r.nome_aluno;
    $('modalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><label>Curso</label><span>${escHtml(r.curso)}</span></div>
        <div class="detail-item"><label>Ano</label><span>${escHtml(r.ano)}</span></div>
        <div class="detail-item"><label>Data</label><span>${fmtDate(r.data_ocorrencia)}</span></div>
        <div class="detail-item"><label>Gravidade</label>${badgeHtml(r.gravidade)}</div>
        <div class="detail-item"><label>Registrado em</label><span>${fmtDate(r.created_at)}</span></div>
        ${r.updated_at ? `<div class="detail-item"><label>Atualizado em</label><span>${fmtDate(r.updated_at)}</span></div>` : ''}
      </div>
      <div class="detail-item detail-desc">
        <label>Descrição</label>
        <p>${escHtml(r.descricao)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost"   onclick="Modal.close()">Fechar</button>
        <button class="btn btn-ghost"   onclick="Modal.close();navigate('editar',{id:${r.id}})">Editar</button>
        <button class="btn btn-danger"  onclick="Modal.close();deleteOcorrencia(${r.id})">Excluir</button>
      </div>`;
  } catch {
    $('modalBody').innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><h3>Erro ao carregar</h3></div>`;
  }
}

// → Exclusão
async function deleteOcorrencia(id) {
  const ok = await Confirm.show('Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.');
  if (!ok) return;
  try {
    await API.remove(id);
    Toast.show('Ocorrência excluída.', 'success');
    if (S.page === 'ocorrencias') loadTable();
    else navigate('dashboard');
  } catch {
    Toast.show('Erro ao excluir.', 'error');
  }
}

// → Cache de meta
async function ensureMeta() {
  if (!S.meta.cursos.length) {
    try { S.meta = await API.getMeta(); } catch { /* mantém defaults */ }
  }
  return S.meta;
}

// → Sidebar (mobile)
function toggleSidebar() {
  $('sidebar').classList.toggle('open');
  $('sidebarOverlay').classList.toggle('open');
}
$('menuBtn').onclick        = toggleSidebar;
$('sidebarOverlay').onclick = toggleSidebar;

// → Navegação
document.querySelectorAll('.nav-item[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    if ($('sidebar').classList.contains('open')) toggleSidebar();
    navigate(link.dataset.page);
  });
});

$('topbarCta').onclick = () => navigate('nova');

// → Hash routing
function parseHash() {
  const hash  = window.location.hash.replace('#', '').split('/');
  const page  = hash[0] || 'dashboard';
  const id    = hash[1] || null;
  const VALID = ['dashboard', 'nova', 'ocorrencias', 'editar'];
  S.page   = VALID.includes(page) ? page : 'dashboard';
  S.editId = id;
}

window.addEventListener('hashchange', () => { parseHash(); renderPage(); });

// → Globais para handlers inline
Object.assign(window, {
  navigate, applyFilters, clearFilters, goPage, showDetail,
  deleteOcorrencia, submitForm, Modal,
});

// → Init
(async function init() {
  await ensureMeta();
  parseHash();
  renderPage();
})();
