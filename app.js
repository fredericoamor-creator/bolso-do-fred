// =======================================
// O BOLSO DO FRED — App v2.0
// =======================================

// ===== BANCO DE DADOS =====
const DB_NAME = 'bolso-do-fred';
const DB_VERSION = 2;
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('registros')) {
                const store = database.createObjectStore('registros', { keyPath: 'id' });
                store.createIndex('tipo', 'tipo');
                store.createIndex('data', 'data');
                store.createIndex('categoria', 'categoria');
            }
            if (!database.objectStoreNames.contains('config')) {
                database.createObjectStore('config', { keyPath: 'chave' });
            }
            if (!database.objectStoreNames.contains('fixas')) {
                database.createObjectStore('fixas', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e.target.error);
    });
}

function dbAdd(store, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).add(data);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

function dbPut(store, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

function dbDelete(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

function dbGetAll(store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function dbGet(store, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const request = tx.objectStore(store).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function dbClear(store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// ===== UTILITÁRIOS =====
function formatMoney(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function parseMoney(s) { if (!s) return 0; return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0; }
function formatDate(ds) { const [y, m, d] = ds.split('-'); return `${d}/${m}/${y}`; }
function getMonthName(m) { return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]; }
function getMonthShort(m) { return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m]; }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

function getCategoriaInfo(cat) {
    const m = { alimentacao:{icon:'🍔',label:'Alimentação'}, transporte:{icon:'🚗',label:'Transporte'}, moradia:{icon:'🏠',label:'Moradia'}, lazer:{icon:'🎮',label:'Lazer'}, vestuario:{icon:'👕',label:'Vestuário'}, saude:{icon:'💊',label:'Saúde'}, educacao:{icon:'📚',label:'Educação'}, compras:{icon:'🛒',label:'Compras'}, servicos:{icon:'🔧',label:'Serviços'}, outros:{icon:'❓',label:'Outros'} };
    return m[cat] || {icon:'❓',label:cat||'Outros'};
}
function getInvestimentoInfo(t) {
    const m = { cdb:{icon:'🏦',label:'CDB'}, tesouro:{icon:'🇧🇷',label:'Tesouro Direto'}, fundo:{icon:'📊',label:'Fundo'}, acoes:{icon:'📈',label:'Ações'}, fii:{icon:'🏢',label:'FII'}, cripto:{icon:'₿',label:'Cripto'}, poupanca:{icon:'🐷',label:'Poupança'}, previdencia:{icon:'🔮',label:'Previdência'}, outro:{icon:'📌',label:'Outro'} };
    return m[t] || {icon:'📌',label:t||'Outro'};
}
function getMetodoInfo(m) {
    const map = { credito:'💳 Crédito', debito:'💰 Débito', pix:'📲 Pix', boleto:'📄 Boleto', dinheiro:'💵 Dinheiro' };
    return map[m] || m || '';
}
function getTipoIcon(r) {
    if (r.tipo==='gasto') return getCategoriaInfo(r.categoria).icon;
    if (r.tipo==='receita') return '💵';
    if (r.tipo==='investimento') return getInvestimentoInfo(r.tipoInvestimento).icon;
    if (r.tipo==='resgate') return '🔄';
    return '❓';
}
function applyMoneyMask(input) {
    if (!input) return;
    input.addEventListener('input', () => {
        let v = input.value.replace(/\D/g, '');
        if (!v) { input.value = ''; return; }
        v = (parseInt(v) / 100).toFixed(2);
        input.value = Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    });
}

// ===== NAVEGAÇÃO =====
let currentScreen = 'screen-pin';
let previousScreen = 'screen-dashboard';
let authenticated = false;

function showNav() { document.getElementById('bottom-nav').style.display = 'flex'; }
function hideNav() { document.getElementById('bottom-nav').style.display = 'none'; }

function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) { target.classList.add('active'); previousScreen = currentScreen; currentScreen = screenId; }

    if (authenticated && screenId !== 'screen-pin' && screenId !== 'screen-create-pin') {
        showNav();
    } else {
        hideNav();
    }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = { 'screen-dashboard':'dashboard', 'screen-historico':'historico', 'screen-graficos':'graficos', 'screen-mais':'mais' };
    const activeNav = navMap[screenId];
    if (activeNav) document.querySelectorAll(`.nav-item[data-nav="${activeNav}"]`).forEach(n => n.classList.add('active'));

    if (screenId === 'screen-dashboard') updateDashboard();
    if (screenId === 'screen-historico') updateHistorico();
    if (screenId === 'screen-graficos') updateGraficos();
    if (screenId === 'screen-metas') updateMetas();
    if (screenId === 'screen-fixas') updateFixas();
    if (screenId === 'screen-dados') updateDadosScreen();
    if (screenId === 'screen-notificacoes') updateNotificacoes();
    if (screenId === 'screen-settings') initTheme();

    window.scrollTo(0, 0);
}

function initNavigation() {
    document.querySelectorAll('.nav-item[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('screen-' + btn.dataset.nav));
    });
    ['btn-add','btn-add-2','btn-add-3','btn-add-4'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.addEventListener('click', () => openNovoRegistro());
    });
    document.querySelectorAll('.header-btn-back[data-back]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('screen-' + btn.dataset.back));
    });
    document.getElementById('btn-settings').addEventListener('click', () => navigateTo('screen-settings'));
    document.getElementById('btn-ver-todas').addEventListener('click', () => navigateTo('screen-historico'));
    document.getElementById('btn-ver-metas').addEventListener('click', () => navigateTo('screen-metas'));
    document.getElementById('btn-ver-fixas-dash').addEventListener('click', () => navigateTo('screen-fixas'));
    document.querySelectorAll('[data-mais-nav]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('screen-' + btn.dataset.maisNav));
    });
}

// ===== PIN =====
let pinBuffer = '';
let createPinBuffer = '';
let createPinStep = 1;
let firstPin = '';

async function initPIN() {
    const config = await dbGet('config', 'pin');
    if (!config) {
        navigateTo('screen-create-pin');
    } else {
        navigateTo('screen-pin');
    }

    document.querySelectorAll('#screen-pin .pin-key[data-key]').forEach(key => {
        key.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePinKey(key.dataset.key);
        });
    });

    document.querySelectorAll('#screen-create-pin .pin-key[data-create-key]').forEach(key => {
        key.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCreatePinKey(key.dataset.createKey);
        });
    });
}

function handlePinKey(key) {
    const dots = document.querySelectorAll('#pin-dots .dot');
    const errorEl = document.getElementById('pin-error');
    if (key === 'delete') {
        if (pinBuffer.length > 0) { pinBuffer = pinBuffer.slice(0, -1); dots[pinBuffer.length].classList.remove('filled'); }
        return;
    }
    if (pinBuffer.length >= 4) return;
    pinBuffer += key;
    dots[pinBuffer.length - 1].classList.add('filled');
    if (pinBuffer.length === 4) {
        setTimeout(async () => {
            const config = await dbGet('config', 'pin');
            if (config && config.valor === pinBuffer) {
                errorEl.textContent = '';
                authenticated = true;
                navigateTo('screen-dashboard');
                pinBuffer = '';
                dots.forEach(d => d.classList.remove('filled', 'error'));
            } else {
                errorEl.textContent = 'PIN incorreto';
                dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
                setTimeout(() => { dots.forEach(d => d.classList.remove('error')); pinBuffer = ''; errorEl.textContent = ''; }, 600);
            }
        }, 200);
    }
}

function handleCreatePinKey(key) {
    const dots = document.querySelectorAll('#create-pin-dots .dot');
    const errorEl = document.getElementById('create-pin-error');
    const subtitle = document.getElementById('create-pin-subtitle');
    if (key === 'delete') {
        if (createPinBuffer.length > 0) { createPinBuffer = createPinBuffer.slice(0, -1); dots[createPinBuffer.length].classList.remove('filled'); }
        return;
    }
    if (createPinBuffer.length >= 4) return;
    createPinBuffer += key;
    dots[createPinBuffer.length - 1].classList.add('filled');
    if (createPinBuffer.length === 4) {
        setTimeout(async () => {
            if (createPinStep === 1) {
                firstPin = createPinBuffer; createPinBuffer = ''; createPinStep = 2;
                dots.forEach(d => d.classList.remove('filled'));
                subtitle.textContent = 'Confirme seu PIN';
            } else {
                if (createPinBuffer === firstPin) {
                    await dbPut('config', { chave: 'pin', valor: firstPin });
                    showToast('✅ PIN criado com sucesso!');
                    authenticated = true;
                    createPinBuffer = ''; createPinStep = 1; firstPin = '';
                    dots.forEach(d => d.classList.remove('filled'));
                    subtitle.textContent = 'Crie um PIN de 4 dígitos';
                    navigateTo('screen-dashboard');
                } else {
                    errorEl.textContent = 'PINs não coincidem. Tente novamente.';
                    dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
                    setTimeout(() => { dots.forEach(d => d.classList.remove('error')); createPinBuffer = ''; createPinStep = 1; firstPin = ''; errorEl.textContent = ''; subtitle.textContent = 'Crie um PIN de 4 dígitos'; }, 600);
                }
            }
        }, 200);
    }
}

// ===== DASHBOARD =====
async function updateDashboard() {
    const registros = await dbGetAll('registros');
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    document.getElementById('mes-atual').textContent = getMonthName(mesAtual);

    let tRec=0,tGas=0,tInv=0,tRes=0,tRecAll=0,tGasAll=0,tInvAll=0,tResAll=0;
    registros.forEach(r => {
        const [y,m] = r.data.split('-').map(Number);
        if (r.tipo==='receita') tRecAll += r.valor;
        if (r.tipo==='gasto') tGasAll += r.valor;
        if (r.tipo==='investimento') tInvAll += r.valor;
        if (r.tipo==='resgate') tResAll += r.valor;
        if (y===anoAtual && (m-1)===mesAtual) {
            if (r.tipo==='receita') tRec += r.valor;
            if (r.tipo==='gasto') tGas += r.valor;
            if (r.tipo==='investimento') tInv += r.valor;
            if (r.tipo==='resgate') tRes += r.valor;
        }
    });

    const saldoLivre = tRecAll - tGasAll - tInvAll + tResAll;
    const totalInvestido = tInvAll - tResAll;
    const patrimonio = saldoLivre + totalInvestido;

    document.getElementById('patrimonio-total').textContent = formatMoney(patrimonio);
    document.getElementById('saldo-livre').textContent = formatMoney(saldoLivre);
    document.getElementById('total-investido').textContent = formatMoney(totalInvestido);
    document.getElementById('total-receitas').textContent = '+ ' + formatMoney(tRec);
    document.getElementById('total-gastos').textContent = '- ' + formatMoney(tGas);
    document.getElementById('total-investido-mes').textContent = '→ ' + formatMoney(tInv);

    const ultimas = [...registros].sort((a,b) => { if(b.data!==a.data) return b.data.localeCompare(a.data); return (b.timestamp||0)-(a.timestamp||0); }).slice(0,5);
    const listEl = document.getElementById('movimentacoes-list');
    if (ultimas.length===0) { listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>Nenhuma movimentação ainda.</p><p style="font-size:12px;">Toque no <strong>+</strong> para começar!</p></div>'; }
    else { listEl.innerHTML = ultimas.map(r => renderMovItem(r)).join(''); listEl.querySelectorAll('.mov-item').forEach(i => i.addEventListener('click', () => openDetalhe(i.dataset.id))); }

    await updateFixasPendentes();
    await updateOrcamentoPreview(tGas);
}

function renderMovItem(r) {
    const icon = getTipoIcon(r);
    let desc = r.descricao || '';
    if (!desc) { if(r.tipo==='gasto') desc=getCategoriaInfo(r.categoria).label; else if(r.tipo==='receita') desc='Receita'; else if(r.tipo==='investimento') desc=getInvestimentoInfo(r.tipoInvestimento).label; else if(r.tipo==='resgate') desc='Resgate'; }
    const meta = r.tipo==='gasto' ? `${getCategoriaInfo(r.categoria).label} · ${formatDate(r.data)}` : r.tipo==='investimento' ? `${getInvestimentoInfo(r.tipoInvestimento).label} · ${formatDate(r.data)}` : formatDate(r.data);
    const prefix = r.tipo==='gasto'?'- ':r.tipo==='receita'?'+ ':r.tipo==='investimento'?'→ ':'← ';
    return `<div class="mov-item" data-id="${r.id}"><div class="mov-icon ${r.tipo}">${icon}</div><div class="mov-info"><div class="mov-desc">${desc}</div><div class="mov-meta">${meta}</div></div><div class="mov-valor ${r.tipo}">${prefix}${formatMoney(r.valor)}</div></div>`;
}

// ===== FORMULÁRIO =====
let tipoRegistro = 'gasto';
let metodoSelecionado = 'credito';
let editingId = null;

function initFormulario() {
    document.querySelectorAll('.tipo-btn[data-tipo]').forEach(btn => {
        btn.addEventListener('click', () => { document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); tipoRegistro = btn.dataset.tipo; updateFormVisibility(); });
    });
    document.querySelectorAll('#chips-metodo .chip').forEach(chip => {
        chip.addEventListener('click', () => { document.querySelectorAll('#chips-metodo .chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); metodoSelecionado = chip.dataset.metodo; });
    });
    applyMoneyMask(document.getElementById('input-valor'));
    document.getElementById('input-data').valueAsDate = new Date();
    document.getElementById('form-registro').addEventListener('submit', async (e) => { e.preventDefault(); await salvarRegistro(); });
    document.getElementById('btn-back-registro').addEventListener('click', () => {
        editingId = null;
        document.getElementById('titulo-registro').textContent = 'Novo Registro';
        document.getElementById('btn-salvar').textContent = '💾 Salvar';
        navigateTo(previousScreen || 'screen-dashboard');
    });
}

function updateFormVisibility() {
    const isG = tipoRegistro==='gasto', isI = tipoRegistro==='investimento', isR = tipoRegistro==='resgate';
    document.getElementById('group-metodo').classList.toggle('hidden', isI||isR);
    document.getElementById('group-tipo-investimento').classList.toggle('hidden', !isI&&!isR);
    document.getElementById('group-categoria').classList.toggle('hidden', !isG);
}

function openNovoRegistro(tipo) {
    editingId = null;
    document.getElementById('titulo-registro').textContent = 'Novo Registro';
    document.getElementById('btn-salvar').textContent = '💾 Salvar';
    document.getElementById('input-valor').value = '';
    document.getElementById('input-descricao').value = '';
    document.getElementById('input-nota').value = '';
    document.getElementById('input-data').valueAsDate = new Date();
    if (tipo) { tipoRegistro = tipo; document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active')); document.querySelector(`.tipo-btn[data-tipo="${tipo}"]`)?.classList.add('active'); }
    updateFormVisibility();
    navigateTo('screen-novo-registro');
}

async function salvarRegistro() {
    const valor = parseMoney(document.getElementById('input-valor').value);
    if (valor <= 0) { showToast('⚠️ Informe um valor válido'); return; }
    const data = document.getElementById('input-data').value;
    if (!data) { showToast('⚠️ Informe a data'); return; }
    const reg = { id: editingId || generateId(), tipo: tipoRegistro, valor, data, descricao: document.getElementById('input-descricao').value.trim(), nota: document.getElementById('input-nota').value.trim(), timestamp: Date.now() };
    if (tipoRegistro==='gasto') { reg.categoria = document.getElementById('select-categoria').value; reg.metodo = metodoSelecionado; }
    else if (tipoRegistro==='receita') { reg.metodo = metodoSelecionado; }
    else if (tipoRegistro==='investimento'||tipoRegistro==='resgate') { reg.tipoInvestimento = document.getElementById('select-tipo-investimento').value; }
    await dbPut('registros', reg);
    showToast(editingId ? '✅ Atualizado!' : '✅ Salvo!');
    editingId = null;
    document.getElementById('titulo-registro').textContent = 'Novo Registro';
    document.getElementById('btn-salvar').textContent = '💾 Salvar';
    navigateTo('screen-dashboard');
}

// ===== DETALHES =====
let currentDetalheId = null;
let pendingDeleteId = null;

function initModals() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => { if(e.target===e.currentTarget) closeModal(); });
    document.getElementById('modal-btn-edit').addEventListener('click', editarRegistro);
    document.getElementById('modal-btn-delete').addEventListener('click', confirmarExclusao);
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-delete').addEventListener('click', excluirRegistro);
    document.getElementById('modal-confirm-overlay').addEventListener('click', (e) => { if(e.target===e.currentTarget) closeConfirmModal(); });
}

async function openDetalhe(id) {
    const reg = await dbGet('registros', id); if(!reg) return; currentDetalheId = id;
    const body = document.getElementById('modal-body'); const icon = getTipoIcon(reg);
    const tipoLabel = reg.tipo.charAt(0).toUpperCase()+reg.tipo.slice(1);
    const prefix = reg.tipo==='gasto'?'- ':reg.tipo==='receita'?'+ ':reg.tipo==='investimento'?'→ ':'← ';
    let html = `<div class="detalhe-valor-destaque ${reg.tipo}">${prefix}${formatMoney(reg.valor)}</div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Tipo</span><span class="detalhe-value">${icon} ${tipoLabel}</span></div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Data</span><span class="detalhe-value">${formatDate(reg.data)}</span></div>`;
    if(reg.descricao) html += `<div class="detalhe-row"><span class="detalhe-label">Descrição</span><span class="detalhe-value">${reg.descricao}</span></div>`;
    if(reg.categoria) html += `<div class="detalhe-row"><span class="detalhe-label">Categoria</span><span class="detalhe-value">${getCategoriaInfo(reg.categoria).icon} ${getCategoriaInfo(reg.categoria).label}</span></div>`;
    if(reg.metodo) html += `<div class="detalhe-row"><span class="detalhe-label">Método</span><span class="detalhe-value">${getMetodoInfo(reg.metodo)}</span></div>`;
    if(reg.tipoInvestimento) html += `<div class="detalhe-row"><span class="detalhe-label">Investimento</span><span class="detalhe-value">${getInvestimentoInfo(reg.tipoInvestimento).icon} ${getInvestimentoInfo(reg.tipoInvestimento).label}</span></div>`;
    if(reg.nota) html += `<div class="detalhe-row"><span class="detalhe-label">Nota</span><span class="detalhe-value">${reg.nota}</span></div>`;
    body.innerHTML = html;
    document.getElementById('modal-title').textContent = 'Detalhes';
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

async function editarRegistro() {
    if(!currentDetalheId) return; const reg = await dbGet('registros', currentDetalheId); if(!reg) return;
    closeModal(); editingId = reg.id; tipoRegistro = reg.tipo;
    document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tipo-btn[data-tipo="${reg.tipo}"]`)?.classList.add('active');
    document.getElementById('input-valor').value = Number(reg.valor).toLocaleString('pt-BR',{minimumFractionDigits:2});
    document.getElementById('input-descricao').value = reg.descricao||'';
    document.getElementById('input-data').value = reg.data;
    document.getElementById('input-nota').value = reg.nota||'';
    if(reg.categoria) document.getElementById('select-categoria').value = reg.categoria;
    if(reg.metodo) { metodoSelecionado = reg.metodo; document.querySelectorAll('#chips-metodo .chip').forEach(c => c.classList.remove('active')); document.querySelector(`#chips-metodo .chip[data-metodo="${reg.metodo}"]`)?.classList.add('active'); }
    if(reg.tipoInvestimento) document.getElementById('select-tipo-investimento').value = reg.tipoInvestimento;
    updateFormVisibility();
    document.getElementById('titulo-registro').textContent = 'Editar Registro';
    document.getElementById('btn-salvar').textContent = '💾 Atualizar';
    navigateTo('screen-novo-registro');
}

function confirmarExclusao() {
    pendingDeleteId = currentDetalheId;
    closeModal();
    document.getElementById('confirm-text').textContent = 'Excluir este registro?';
    document.getElementById('confirm-delete').onclick = excluirRegistro;
    document.getElementById('modal-confirm-overlay').classList.add('open');
}

function closeConfirmModal() { document.getElementById('modal-confirm-overlay').classList.remove('open'); pendingDeleteId = null; }

async function excluirRegistro() {
    if(!pendingDeleteId) return;
    await dbDelete('registros', pendingDeleteId);
    closeConfirmModal();
    showToast('🗑️ Registro excluído');
    currentDetalheId = null; pendingDeleteId = null;
    updateDashboard();
    if(currentScreen === 'screen-historico') updateHistorico();
}

// ===== HISTÓRICO =====
let filtroTipo='todos', filtroMes=new Date().getMonth(), filtroAno=new Date().getFullYear(), filtroTodosMeses=false;

function initHistorico() {
    document.querySelectorAll('.filtro-chip[data-filtro-tipo]').forEach(c => {
        c.addEventListener('click', () => {
            document.querySelectorAll('.filtro-chip[data-filtro-tipo]').forEach(x => x.classList.remove('active'));
            c.classList.add('active'); filtroTipo = c.dataset.filtroTipo; updateHistorico();
        });
    });
    document.getElementById('filtro-mes-prev').addEventListener('click', () => { filtroTodosMeses=false; filtroMes--; if(filtroMes<0){filtroMes=11;filtroAno--;} updateHistorico(); });
    document.getElementById('filtro-mes-next').addEventListener('click', () => { filtroTodosMeses=false; filtroMes++; if(filtroMes>11){filtroMes=0;filtroAno++;} updateHistorico(); });
    document.getElementById('filtro-todos-meses').addEventListener('click', () => { filtroTodosMeses=!filtroTodosMeses; updateHistorico(); });
}

async function updateHistorico() {
    const registros = await dbGetAll('registros');
    document.getElementById('filtro-mes-label').textContent = `${getMonthName(filtroMes)} ${filtroAno}`;
    document.getElementById('filtro-todos-meses').classList.toggle('active', filtroTodosMeses);
    let filtered = registros;
    if(!filtroTodosMeses) filtered = filtered.filter(r => { const[y,m]=r.data.split('-').map(Number); return y===filtroAno&&(m-1)===filtroMes; });
    if(filtroTipo!=='todos') filtered = filtered.filter(r => r.tipo===filtroTipo);
    filtered.sort((a,b) => { if(b.data!==a.data) return b.data.localeCompare(a.data); return (b.timestamp||0)-(a.timestamp||0); });
    let soma=0; filtered.forEach(r => { if(r.tipo==='receita'||r.tipo==='resgate') soma+=r.valor; else soma-=r.valor; });
    document.getElementById('historico-count').textContent = `${filtered.length} registro${filtered.length!==1?'s':''}`;
    document.getElementById('historico-soma').textContent = `Saldo: ${formatMoney(soma)}`;
    const listEl = document.getElementById('historico-list');
    if(filtered.length===0) { listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>Nenhuma movimentação encontrada.</p></div>'; return; }
    const groups = {}; filtered.forEach(r => { if(!groups[r.data]) groups[r.data]=[]; groups[r.data].push(r); });
    let html=''; Object.keys(groups).sort((a,b)=>b.localeCompare(a)).forEach(date => { html+=`<div class="historico-grupo"><div class="historico-grupo-header">${formatDate(date)}</div>${groups[date].map(r=>renderMovItem(r)).join('')}</div>`; });
    listEl.innerHTML = html;
    listEl.querySelectorAll('.mov-item').forEach(i => i.addEventListener('click', () => openDetalhe(i.dataset.id)));
}

// ===== TEMA =====
function initTheme() {
    const toggleDark = document.getElementById('toggle-dark-mode');
    const toggleAuto = document.getElementById('toggle-auto-theme');
    const autoDesc = document.getElementById('theme-auto-desc');
    if(!toggleDark||!toggleAuto) return;

    loadThemePreference().then(prefs => {
        const isAuto = prefs.auto!==false;
        toggleAuto.checked = isAuto;
        if(isAuto) {
            const sd = window.matchMedia('(prefers-color-scheme: dark)').matches;
            toggleDark.checked = sd; toggleDark.disabled = true;
            if(autoDesc) autoDesc.textContent = 'Acompanha o sistema';
            applyTheme(sd);
        } else {
            toggleDark.checked = prefs.dark===true; toggleDark.disabled = false;
            if(autoDesc) autoDesc.textContent = 'Manual';
            applyTheme(prefs.dark===true);
        }
    });

    toggleDark.addEventListener('change', () => {
        if(toggleDark.disabled) return;
        applyTheme(toggleDark.checked);
        saveThemePreference({auto:false,dark:toggleDark.checked});
    });

    toggleAuto.addEventListener('change', () => {
        const isAuto = toggleAuto.checked;
        if(isAuto) {
            const sd = window.matchMedia('(prefers-color-scheme: dark)').matches;
            toggleDark.checked = sd; toggleDark.disabled = true;
            if(autoDesc) autoDesc.textContent = 'Acompanha o sistema';
            applyTheme(sd);
            saveThemePreference({auto:true,dark:sd});
        } else {
            toggleDark.disabled = false;
            if(autoDesc) autoDesc.textContent = 'Manual';
            saveThemePreference({auto:false,dark:toggleDark.checked});
        }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if(toggleAuto&&toggleAuto.checked) { toggleDark.checked=e.matches; applyTheme(e.matches); saveThemePreference({auto:true,dark:e.matches}); }
    });
}

function applyTheme(dark) {
    if(dark) { document.documentElement.setAttribute('data-theme','dark'); document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#121a16'); }
    else { document.documentElement.removeAttribute('data-theme'); document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#2d8659'); }
}
async function applyThemeFromSaved() { const p = await loadThemePreference(); if(p.auto!==false) applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches); else applyTheme(p.dark===true); }
async function loadThemePreference() { try { const c = await dbGet('config','theme'); if(c&&c.valor) return c.valor; } catch(e){} return {auto:true,dark:false}; }
async function saveThemePreference(p) { try { await dbPut('config',{chave:'theme',valor:p}); } catch(e){} }

// ===== METAS =====
let currentMetaCategoria = null;

async function initMetas() {
    applyMoneyMask(document.getElementById('input-orcamento-geral'));
    applyMoneyMask(document.getElementById('input-meta-valor'));
    document.getElementById('btn-salvar-orcamento').addEventListener('click', async () => {
        const v = parseMoney(document.getElementById('input-orcamento-geral').value);
        await dbPut('config',{chave:'orcamento-geral',valor:v});
        showToast('✅ Orçamento salvo!');
        updateMetas();
    });
    document.getElementById('modal-meta-close').addEventListener('click', closeMetaModal);
    document.getElementById('modal-meta-overlay').addEventListener('click', (e) => { if(e.target===e.currentTarget) closeMetaModal(); });
    document.getElementById('meta-btn-salvar').addEventListener('click', salvarMeta);
    document.getElementById('meta-btn-remover').addEventListener('click', removerMeta);
}

function closeMetaModal() { document.getElementById('modal-meta-overlay').classList.remove('open'); }

async function updateMetas() {
    const registros = await dbGetAll('registros');
    const now = new Date(); const mesAtual = now.getMonth(); const anoAtual = now.getFullYear();
    const orcConfig = await dbGet('config','orcamento-geral'); const orcamento = orcConfig?orcConfig.valor:0;
    if(orcamento>0) document.getElementById('input-orcamento-geral').value = Number(orcamento).toLocaleString('pt-BR',{minimumFractionDigits:2});

    let totalGastosMes=0; const gastosPorCat={};
    registros.forEach(r => { const[y,m]=r.data.split('-').map(Number); if(r.tipo==='gasto'&&y===anoAtual&&(m-1)===mesAtual) { totalGastosMes+=r.valor; gastosPorCat[r.categoria]=(gastosPorCat[r.categoria]||0)+r.valor; } });

    const statusEl = document.getElementById('orcamento-status');
    if(orcamento>0) { const pct=(totalGastosMes/orcamento)*100; const lv=pct>=100?'danger':pct>=75?'warning':'safe'; statusEl.innerHTML=renderProgress('Gasto do mês',totalGastosMes,orcamento,pct,lv); } else { statusEl.innerHTML=''; }

    const cats=['alimentacao','transporte','moradia','lazer','vestuario','saude','educacao','compras','servicos','outros'];
    const metasConfig = await dbGet('config','metas-categorias'); const metas=metasConfig?metasConfig.valor:{};

    document.getElementById('metas-categorias-list').innerHTML = cats.map(cat => {
        const info=getCategoriaInfo(cat); const meta=metas[cat]||0; const gasto=gastosPorCat[cat]||0; const hm=meta>0;
        return `<div class="meta-cat-item" data-cat="${cat}"><span class="meta-cat-icon">${info.icon}</span><div class="meta-cat-info"><div class="meta-cat-name">${info.label}</div><div class="meta-cat-status">${hm?`${formatMoney(gasto)} / ${formatMoney(meta)}`:'Sem meta definida'}</div></div>${hm?`<span class="meta-cat-valor">${Math.round((gasto/meta)*100)}%</span>`:''}<span class="meta-cat-arrow">→</span></div>`;
    }).join('');
    document.querySelectorAll('.meta-cat-item').forEach(i => i.addEventListener('click', () => openMetaModal(i.dataset.cat)));

    const resumoEl = document.getElementById('metas-resumo-list');
    const metasAtivas = cats.filter(c=>metas[c]>0);
    if(metasAtivas.length===0&&orcamento<=0) { resumoEl.innerHTML='<div class="empty-state"><span class="empty-icon">🎯</span><p>Defina metas para acompanhar</p></div>'; }
    else {
        let html='';
        if(orcamento>0){const pct=(totalGastosMes/orcamento)*100;const lv=pct>=100?'danger':pct>=75?'warning':'safe';html+=`<div class="meta-resumo-item">${renderProgress('💰 Orçamento Geral',totalGastosMes,orcamento,pct,lv)}</div>`;}
        metasAtivas.forEach(cat=>{const info=getCategoriaInfo(cat);const g=gastosPorCat[cat]||0;const mt=metas[cat];const pct=(g/mt)*100;const lv=pct>=100?'danger':pct>=75?'warning':'safe';html+=`<div class="meta-resumo-item">${renderProgress(info.icon+' '+info.label,g,mt,pct,lv)}</div>`;});
        resumoEl.innerHTML=html;
    }
}

function renderProgress(label,gasto,meta,pct,level) {
    const rest=meta-gasto; let alert='';
    if(pct>=100) alert=`<div class="progress-alert danger">🚨 Ultrapassado em ${formatMoney(Math.abs(rest))}</div>`;
    else if(pct>=75) alert=`<div class="progress-alert warning">⚠️ Restam ${formatMoney(rest)}</div>`;
    return `<div class="progress-container"><div class="progress-header"><span class="progress-label">${label}</span><span class="progress-values"><strong>${formatMoney(gasto)}</strong> / ${formatMoney(meta)}</span></div><div class="progress-bar"><div class="progress-fill ${level}" style="width:${Math.min(pct,100)}%"></div></div><div class="progress-percent ${level}">${pct.toFixed(0)}%</div>${alert}</div>`;
}

async function openMetaModal(cat) {
    currentMetaCategoria = cat; const info = getCategoriaInfo(cat);
    document.getElementById('modal-meta-title').textContent = `${info.icon} Meta: ${info.label}`;
    document.getElementById('meta-modal-desc').textContent = `Limite mensal para ${info.label}`;
    const mc = await dbGet('config','metas-categorias'); const metas = mc?mc.valor:{};
    const v = metas[cat]||0;
    document.getElementById('input-meta-valor').value = v>0?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2}):'';
    document.getElementById('modal-meta-overlay').classList.add('open');
}

async function salvarMeta() {
    const v=parseMoney(document.getElementById('input-meta-valor').value);
    const mc=await dbGet('config','metas-categorias'); const metas=mc?mc.valor:{};
    metas[currentMetaCategoria]=v;
    await dbPut('config',{chave:'metas-categorias',valor:metas});
    closeMetaModal(); showToast('✅ Meta salva!'); updateMetas();
}

async function removerMeta() {
    const mc=await dbGet('config','metas-categorias'); const metas=mc?mc.valor:{};
    delete metas[currentMetaCategoria];
    await dbPut('config',{chave:'metas-categorias',valor:metas});
    closeMetaModal(); showToast('🗑️ Meta removida'); updateMetas();
}

async function updateOrcamentoPreview(totalGastosMes) {
    const orcConfig=await dbGet('config','orcamento-geral'); const orcamento=orcConfig?orcConfig.valor:0;
    const metasConfig=await dbGet('config','metas-categorias'); const metas=metasConfig?metasConfig.valor:{}; const hasMetas=Object.values(metas).some(v=>v>0);
    const cardEl=document.getElementById('card-orcamento');
    if(orcamento<=0&&!hasMetas){cardEl.style.display='none';return;} cardEl.style.display='';
    if(orcamento>0){const pct=(totalGastosMes/orcamento)*100;const lv=pct>=100?'danger':pct>=75?'warning':'safe';document.getElementById('orcamento-geral').innerHTML=renderProgress('Orçamento Geral',totalGastosMes,orcamento,pct,lv);}else{document.getElementById('orcamento-geral').innerHTML='';}
    const previewEl=document.getElementById('metas-preview'); const registros=await dbGetAll('registros'); const now=new Date(); const gastosPorCat={};
    registros.forEach(r=>{const[y,m]=r.data.split('-').map(Number);if(r.tipo==='gasto'&&y===now.getFullYear()&&(m-1)===now.getMonth()) gastosPorCat[r.categoria]=(gastosPorCat[r.categoria]||0)+r.valor;});
    const metasAtivas=Object.entries(metas).filter(([_,v])=>v>0);
    if(metasAtivas.length===0){previewEl.innerHTML='';return;}
    previewEl.innerHTML=metasAtivas.slice(0,3).map(([cat,meta])=>{const info=getCategoriaInfo(cat);const g=gastosPorCat[cat]||0;const pct=Math.min((g/meta)*100,100);const lv=pct>=100?'danger':pct>=75?'warning':'safe';return `<div class="meta-preview-item"><span class="meta-preview-icon">${info.icon}</span><div class="meta-preview-info"><div class="meta-preview-name">${info.label}</div><div class="meta-preview-bar"><div class="meta-preview-fill ${lv}" style="width:${pct}%"></div></div></div><span class="meta-preview-valor">${formatMoney(g)}</span></div>`;}).join('');
}

// ===== FIXAS =====
let filtroFixaTipo='todos', editingFixaId=null, currentFixaDetalheId=null;

function initFixas() {
    applyMoneyMask(document.getElementById('input-fixa-valor'));
    document.querySelectorAll('[data-filtro-fixa]').forEach(c=>{c.addEventListener('click',()=>{document.querySelectorAll('[data-filtro-fixa]').forEach(x=>x.classList.remove('active'));c.classList.add('active');filtroFixaTipo=c.dataset.filtroFixa;updateFixas();});});
    document.querySelectorAll('#chips-fixa-tipo .chip').forEach(c=>{c.addEventListener('click',()=>{document.querySelectorAll('#chips-fixa-tipo .chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');const t=c.dataset.fixaTipo;document.getElementById('group-fixa-categoria').classList.toggle('hidden',t!=='gasto');document.getElementById('group-fixa-tipo-inv').classList.toggle('hidden',t!=='investimento');document.getElementById('group-fixa-metodo').classList.toggle('hidden',t==='investimento');});});
    const sel=document.getElementById('select-fixa-dia');for(let i=1;i<=31;i++){const o=document.createElement('option');o.value=i;o.textContent=`Dia ${i}`;sel.appendChild(o);}
    document.getElementById('btn-nova-fixa').addEventListener('click',()=>openFixaModal());
    document.getElementById('modal-fixa-close').addEventListener('click',closeFixaModal);
    document.getElementById('modal-fixa-overlay').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeFixaModal();});
    document.getElementById('fixa-btn-cancelar').addEventListener('click',closeFixaModal);
    document.getElementById('fixa-btn-salvar').addEventListener('click',salvarFixa);
    document.getElementById('modal-fixa-detalhe-close').addEventListener('click',closeFixaDetalhe);
    document.getElementById('modal-fixa-detalhe-overlay').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeFixaDetalhe();});
    document.getElementById('fixa-detalhe-btn-edit').addEventListener('click',editarFixa);
    document.getElementById('fixa-detalhe-btn-delete').addEventListener('click',excluirFixa);
    document.getElementById('btn-aplicar-todas')?.addEventListener('click',aplicarTodasFixas);
    document.getElementById('btn-aplicar-fixas-dash')?.addEventListener('click',async()=>{await aplicarTodasFixas();await updateDashboard();});
}

function openFixaModal(fixa) {
    editingFixaId = fixa?fixa.id:null;
    document.getElementById('modal-fixa-title').textContent = fixa?'Editar Fixa':'Nova Fixa';
    if(fixa){
        document.getElementById('input-fixa-desc').value=fixa.descricao;
        document.getElementById('input-fixa-valor').value=Number(fixa.valor).toLocaleString('pt-BR',{minimumFractionDigits:2});
        document.getElementById('select-fixa-dia').value=fixa.dia;
        document.querySelectorAll('#chips-fixa-tipo .chip').forEach(c=>c.classList.remove('active'));
        document.querySelector(`#chips-fixa-tipo .chip[data-fixa-tipo="${fixa.tipo}"]`)?.classList.add('active');
        if(fixa.categoria)document.getElementById('select-fixa-categoria').value=fixa.categoria;
        if(fixa.tipoInvestimento)document.getElementById('select-fixa-tipo-inv').value=fixa.tipoInvestimento;
        if(fixa.metodo)document.getElementById('select-fixa-metodo').value=fixa.metodo;
        document.getElementById('group-fixa-categoria').classList.toggle('hidden',fixa.tipo!=='gasto');
        document.getElementById('group-fixa-tipo-inv').classList.toggle('hidden',fixa.tipo!=='investimento');
        document.getElementById('group-fixa-metodo').classList.toggle('hidden',fixa.tipo==='investimento');
    } else {
        document.getElementById('input-fixa-desc').value='';document.getElementById('input-fixa-valor').value='';document.getElementById('select-fixa-dia').value='1';
        document.querySelectorAll('#chips-fixa-tipo .chip').forEach(c=>c.classList.remove('active'));
        document.querySelector('#chips-fixa-tipo .chip[data-fixa-tipo="receita"]').classList.add('active');
        document.getElementById('group-fixa-categoria').classList.add('hidden');
        document.getElementById('group-fixa-tipo-inv').classList.add('hidden');
        document.getElementById('group-fixa-metodo').classList.remove('hidden');
    }
    document.getElementById('modal-fixa-overlay').classList.add('open');
}

function closeFixaModal(){document.getElementById('modal-fixa-overlay').classList.remove('open');editingFixaId=null;}
function closeFixaDetalhe(){document.getElementById('modal-fixa-detalhe-overlay').classList.remove('open');currentFixaDetalheId=null;}

async function salvarFixa() {
    const desc=document.getElementById('input-fixa-desc').value.trim();const valor=parseMoney(document.getElementById('input-fixa-valor').value);
    if(!desc){showToast('⚠️ Informe a descrição');return;}if(valor<=0){showToast('⚠️ Informe um valor válido');return;}
    const ta=document.querySelector('#chips-fixa-tipo .chip.active');const tipo=ta?ta.dataset.fixaTipo:'receita';
    const fixa={id:editingFixaId||generateId(),tipo,descricao:desc,valor,dia:parseInt(document.getElementById('select-fixa-dia').value),ativa:true};
    if(tipo==='gasto'){fixa.categoria=document.getElementById('select-fixa-categoria').value;fixa.metodo=document.getElementById('select-fixa-metodo').value;}
    else if(tipo==='investimento'){fixa.tipoInvestimento=document.getElementById('select-fixa-tipo-inv').value;}
    else{fixa.metodo=document.getElementById('select-fixa-metodo').value;}
    await dbPut('fixas',fixa);closeFixaModal();showToast(editingFixaId?'✅ Fixa atualizada!':'✅ Fixa cadastrada!');updateFixas();
}

async function findRegistroByFixaId(fid){const regs=await dbGetAll('registros');const now=new Date();return regs.find(r=>{if(r.fixaId!==fid)return false;const[y,m]=r.data.split('-').map(Number);return y===now.getFullYear()&&(m-1)===now.getMonth();});}

async function aplicarFixaIndividual(fixa) {
    const now=new Date();const mesAtual=now.getMonth();const anoAtual=now.getFullYear();
    const dia=Math.min(fixa.dia,new Date(anoAtual,mesAtual+1,0).getDate());
    const ds=`${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const reg={id:generateId(),tipo:fixa.tipo,valor:fixa.valor,data:ds,descricao:fixa.descricao,fixaId:fixa.id,timestamp:Date.now()};
    if(fixa.tipo==='gasto'){reg.categoria=fixa.categoria;reg.metodo=fixa.metodo;}
    if(fixa.tipo==='receita'){reg.metodo=fixa.metodo;}
    if(fixa.tipo==='investimento'){reg.tipoInvestimento=fixa.tipoInvestimento;}
    await dbAdd('registros',reg);
}

async function reverterFixaIndividual(fid){const reg=await findRegistroByFixaId(fid);if(reg)await dbDelete('registros',reg.id);}

async function openFixaDetalhe(id) {
    const fixa=await dbGet('fixas',id);if(!fixa)return;currentFixaDetalheId=id;
    const isAp=!!(await findRegistroByFixaId(fixa.id));const now=new Date();const mesLabel=getMonthName(now.getMonth())+' '+now.getFullYear();
    const body=document.getElementById('modal-fixa-detalhe-body');
    let html=`<div class="detalhe-valor-destaque ${fixa.tipo}">${formatMoney(fixa.valor)}</div>`;
    html+=`<div class="detalhe-row"><span class="detalhe-label">Descrição</span><span class="detalhe-value">${fixa.descricao}</span></div>`;
    html+=`<div class="detalhe-row"><span class="detalhe-label">Tipo</span><span class="detalhe-value">${fixa.tipo.charAt(0).toUpperCase()+fixa.tipo.slice(1)}</span></div>`;
    html+=`<div class="detalhe-row"><span class="detalhe-label">Dia</span><span class="detalhe-value">Todo dia ${fixa.dia}</span></div>`;
    if(fixa.categoria) html+=`<div class="detalhe-row"><span class="detalhe-label">Categoria</span><span class="detalhe-value">${getCategoriaInfo(fixa.categoria).icon} ${getCategoriaInfo(fixa.categoria).label}</span></div>`;
    if(fixa.metodo) html+=`<div class="detalhe-row"><span class="detalhe-label">Método</span><span class="detalhe-value">${getMetodoInfo(fixa.metodo)}</span></div>`;
    if(fixa.tipoInvestimento) html+=`<div class="detalhe-row"><span class="detalhe-label">Investimento</span><span class="detalhe-value">${getInvestimentoInfo(fixa.tipoInvestimento).icon} ${getInvestimentoInfo(fixa.tipoInvestimento).label}</span></div>`;
    const badge=isAp?'<span class="fixa-status-badge aplicada">✅ Aplicada</span>':'<span class="fixa-status-badge pendente">⏳ Pendente</span>';
    html+=`<div class="detalhe-row"><span class="detalhe-label">Status (${mesLabel})</span><span class="detalhe-value">${badge}</span></div>`;
    if(isAp) html+=`<button class="btn-toggle-status btn-reverter" id="btn-toggle-fixa-status">↩️ Reverter</button>`;
    else html+=`<button class="btn-toggle-status btn-aplicar-individual" id="btn-toggle-fixa-status">✅ Aplicar</button>`;
    body.innerHTML=html;
    document.getElementById('modal-fixa-detalhe-title').textContent=fixa.descricao;
    document.getElementById('modal-fixa-detalhe-overlay').classList.add('open');
    document.getElementById('btn-toggle-fixa-status').addEventListener('click',async()=>{
        if(isAp){await reverterFixaIndividual(fixa.id);showToast(`↩️ "${fixa.descricao}" revertida`);}
        else{await aplicarFixaIndividual(fixa);showToast(`✅ "${fixa.descricao}" aplicada!`);}
        closeFixaDetalhe();await updateFixas();if(currentScreen==='screen-dashboard')await updateDashboard();
    });
}

async function editarFixa(){if(!currentFixaDetalheId)return;const f=await dbGet('fixas',currentFixaDetalheId);closeFixaDetalhe();if(f)openFixaModal(f);}
async function excluirFixa(){if(!currentFixaDetalheId)return;await dbDelete('fixas',currentFixaDetalheId);closeFixaDetalhe();showToast('🗑️ Fixa excluída');updateFixas();if(currentScreen==='screen-dashboard')await updateDashboard();}

async function updateFixas() {
    const fixas=await dbGetAll('fixas');const now=new Date();const mesAtual=now.getMonth();const anoAtual=now.getFullYear();const registros=await dbGetAll('registros');
    const aplicadas=new Set();registros.forEach(r=>{if(r.fixaId){const[y,m]=r.data.split('-').map(Number);if(y===anoAtual&&(m-1)===mesAtual)aplicadas.add(r.fixaId);}});
    let filtered=fixas.filter(f=>f.ativa!==false);if(filtroFixaTipo!=='todos')filtered=filtered.filter(f=>f.tipo===filtroFixaTipo);
    const listEl=document.getElementById('fixas-list');
    if(filtered.length===0) listEl.innerHTML='<div class="empty-state"><span class="empty-icon">🔁</span><p>Nenhuma fixa cadastrada.</p></div>';
    else {
        listEl.innerHTML=filtered.map(f=>{const isAp=aplicadas.has(f.id);const badge=isAp?'<span class="fixa-status-badge aplicada">✅</span>':'<span class="fixa-status-badge pendente">⏳</span>';return `<div class="fixa-item" data-id="${f.id}"><div class="fixa-icon ${f.tipo}">${f.tipo==='gasto'?getCategoriaInfo(f.categoria).icon:f.tipo==='investimento'?getInvestimentoInfo(f.tipoInvestimento).icon:'💵'}</div><div class="fixa-info"><div class="fixa-desc">${f.descricao}</div><div class="fixa-meta">Dia ${f.dia} · ${badge}</div></div><div class="fixa-valor ${f.tipo}">${formatMoney(f.valor)}</div></div>`;}).join('');
        listEl.querySelectorAll('.fixa-item').forEach(i=>i.addEventListener('click',()=>openFixaDetalhe(i.dataset.id)));
    }
    const todas=fixas.filter(f=>f.ativa!==false);
    const tR=todas.filter(f=>f.tipo==='receita').reduce((s,f)=>s+f.valor,0);
    const tG=todas.filter(f=>f.tipo==='gasto').reduce((s,f)=>s+f.valor,0);
    const tI=todas.filter(f=>f.tipo==='investimento').reduce((s,f)=>s+f.valor,0);
    document.getElementById('fixas-totais').innerHTML=`<div class="fixas-total-row"><span class="fixas-total-label">Receitas fixas</span><span class="fixas-total-valor receita">+ ${formatMoney(tR)}</span></div><div class="fixas-total-row"><span class="fixas-total-label">Gastos fixos</span><span class="fixas-total-valor gasto">- ${formatMoney(tG)}</span></div>${tI>0?`<div class="fixas-total-row"><span class="fixas-total-label">Invest. fixos</span><span class="fixas-total-valor investimento">→ ${formatMoney(tI)}</span></div>`:''}<div class="fixas-total-row"><span class="fixas-total-label"><strong>Saldo fixo</strong></span><span class="fixas-total-valor">${formatMoney(tR-tG-tI)}</span></div>`;
    const pends=todas.filter(f=>!aplicadas.has(f.id));const cardPF=document.getElementById('card-fixas-pend-full');
    if(pends.length>0){cardPF.style.display='';document.getElementById('fixas-pend-full-list').innerHTML=pends.map(f=>`<div class="fixa-pend-item" data-id="${f.id}"><span class="fixa-pend-icon">${f.tipo==='gasto'?getCategoriaInfo(f.categoria).icon:f.tipo==='investimento'?getInvestimentoInfo(f.tipoInvestimento).icon:'💵'}</span><span class="fixa-pend-desc">${f.descricao}</span><span class="fixa-pend-valor ${f.tipo}">${formatMoney(f.valor)}</span><span class="fixa-pend-aplicar">Aplicar →</span></div>`).join('');document.getElementById('fixas-pend-full-list').querySelectorAll('.fixa-pend-item').forEach(el=>{el.addEventListener('click',async()=>{const fid=el.dataset.id;const fx=fixas.find(f=>f.id===fid);if(fx){await aplicarFixaIndividual(fx);showToast(`✅ "${fx.descricao}" aplicada!`);await updateFixas();}});});}
    else cardPF.style.display='none';
}

async function updateFixasPendentes() {
    const fixas=await dbGetAll('fixas');const registros=await dbGetAll('registros');const now=new Date();const mesAtual=now.getMonth();const anoAtual=now.getFullYear();
    const aplicadas=new Set();registros.forEach(r=>{if(r.fixaId){const[y,m]=r.data.split('-').map(Number);if(y===anoAtual&&(m-1)===mesAtual)aplicadas.add(r.fixaId);}});
    const pends=fixas.filter(f=>f.ativa!==false&&!aplicadas.has(f.id));
    const cardEl=document.getElementById('card-fixas-pendentes');
    if(pends.length===0){cardEl.style.display='none';return;}
    cardEl.style.display='';
    document.getElementById('fixas-pendentes-list').innerHTML=pends.slice(0,4).map(f=>`<div class="fixa-pend-item" data-id="${f.id}"><span class="fixa-pend-icon">${f.tipo==='gasto'?getCategoriaInfo(f.categoria).icon:f.tipo==='investimento'?getInvestimentoInfo(f.tipoInvestimento).icon:'💵'}</span><span class="fixa-pend-desc">${f.descricao}</span><span class="fixa-pend-valor ${f.tipo}">${formatMoney(f.valor)}</span><span class="fixa-pend-aplicar">Aplicar →</span></div>`).join('');
    document.getElementById('fixas-pendentes-list').querySelectorAll('.fixa-pend-item').forEach(el=>{el.addEventListener('click',async()=>{const fid=el.dataset.id;const fx=fixas.find(f=>f.id===fid);if(fx){await aplicarFixaIndividual(fx);showToast(`✅ "${fx.descricao}" aplicada!`);await updateDashboard();}});});
}

async function aplicarTodasFixas() {
    const fixas=await dbGetAll('fixas');const registros=await dbGetAll('registros');const now=new Date();const mesAtual=now.getMonth();const anoAtual=now.getFullYear();
    const aplicadas=new Set();registros.forEach(r=>{if(r.fixaId){const[y,m]=r.data.split('-').map(Number);if(y===anoAtual&&(m-1)===mesAtual)aplicadas.add(r.fixaId);}});
    const pends=fixas.filter(f=>f.ativa!==false&&!aplicadas.has(f.id));let c=0;
    for(const f of pends){await aplicarFixaIndividual(f);c++;}
    showToast(`✅ ${c} fixa${c!==1?'s':''} aplicada${c!==1?'s':''}!`);
    if(currentScreen==='screen-fixas')updateFixas();
    if(currentScreen==='screen-dashboard')updateDashboard();
}

// ===== GRÁFICOS =====
let graficoMes=new Date().getMonth(),graficoAno=new Date().getFullYear();

function initGraficos() {
    document.getElementById('grafico-mes-prev').addEventListener('click',()=>{graficoMes--;if(graficoMes<0){graficoMes=11;graficoAno--;}updateGraficos();});
    document.getElementById('grafico-mes-next').addEventListener('click',()=>{graficoMes++;if(graficoMes>11){graficoMes=0;graficoAno++;}updateGraficos();});
}

async function updateGraficos() {
    const registros=await dbGetAll('registros');
    document.getElementById('grafico-mes-label').textContent=`${getMonthName(graficoMes)} ${graficoAno}`;
    const mf=registros.filter(r=>{const[y,m]=r.data.split('-').map(Number);return y===graficoAno&&(m-1)===graficoMes;});
    let rec=0,gas=0,inv=0;const gpc={};
    mf.forEach(r=>{if(r.tipo==='receita')rec+=r.valor;if(r.tipo==='gasto'){gas+=r.valor;gpc[r.categoria]=(gpc[r.categoria]||0)+r.valor;}if(r.tipo==='investimento')inv+=r.valor;});
    renderBalanco(rec,gas,inv);renderPizza(gpc,gas);renderBarras(registros);renderPatrimonio(registros);renderTopGastos(mf);await renderProjecao(registros);
}

function renderBalanco(rec,gas,inv) {
    const max=Math.max(rec,gas,inv,1);const saldo=rec-gas-inv;const sc=saldo>=0?'positivo':'negativo';
    document.getElementById('grafico-balanco').innerHTML=`<div class="balanco-row"><span class="balanco-icon">💵</span><div class="balanco-info"><span class="balanco-label">Receitas</span><div class="balanco-bar-bg"><div class="balanco-bar-fill receita" style="width:${(rec/max)*100}%"></div></div></div><span class="balanco-valor receita">${formatMoney(rec)}</span></div><div class="balanco-row"><span class="balanco-icon">💸</span><div class="balanco-info"><span class="balanco-label">Gastos</span><div class="balanco-bar-bg"><div class="balanco-bar-fill gasto" style="width:${(gas/max)*100}%"></div></div></div><span class="balanco-valor gasto">${formatMoney(gas)}</span></div><div class="balanco-row"><span class="balanco-icon">📈</span><div class="balanco-info"><span class="balanco-label">Investimentos</span><div class="balanco-bar-bg"><div class="balanco-bar-fill investimento" style="width:${(inv/max)*100}%"></div></div></div><span class="balanco-valor investimento">${formatMoney(inv)}</span></div><div class="balanco-saldo"><span class="balanco-saldo-label">Saldo do mês</span><span class="balanco-saldo-valor ${sc}">${formatMoney(saldo)}</span></div>`;
}

function renderPizza(gpc,total) {
    const ct=document.getElementById('grafico-pizza-container');
    if(total<=0){ct.innerHTML='<div class="empty-state"><span class="empty-icon">📊</span><p>Sem gastos neste mês</p></div>';return;}
    const entries=Object.entries(gpc).sort((a,b)=>b[1]-a[1]);const colors=['#4a9e68','#e07a7a','#5ba3c9','#d4b44a','#e0943a','#9678d3','#e07aaf','#7ac9c9','#c99e5b','#8a8a8a'];
    let angle=0;const r=60,cx=70,cy=70,circ=2*Math.PI*r;let svg='',leg='';
    entries.forEach(([cat,val],i)=>{const pct=val/total;const da=circ*pct;const doff=-angle*circ;const col=colors[i%colors.length];svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="24" stroke-dasharray="${da} ${circ-da}" stroke-dashoffset="${doff}" />`;angle+=pct;const info=getCategoriaInfo(cat);leg+=`<div class="pizza-legenda-item"><span class="pizza-legenda-dot" style="background:${col}"></span><span class="pizza-legenda-label">${info.icon} ${info.label}</span><span class="pizza-legenda-valor">${formatMoney(val)}</span><span class="pizza-legenda-pct">${(pct*100).toFixed(0)}%</span></div>`;});
    ct.innerHTML=`<div class="pizza-wrapper"><div class="pizza-svg-container"><svg viewBox="0 0 140 140">${svg}</svg></div><div class="pizza-legenda">${leg}</div></div>`;
}

function renderBarras(registros) {
    const ct=document.getElementById('grafico-barras-container');const meses=[];for(let i=5;i>=0;i--){let m=graficoMes-i;let y=graficoAno;while(m<0){m+=12;y--;}meses.push({mes:m,ano:y});}
    const dados=meses.map(({mes,ano})=>{let r=0,g=0,inv=0;registros.forEach(reg=>{const[ry,rm]=reg.data.split('-').map(Number);if(ry===ano&&(rm-1)===mes){if(reg.tipo==='receita')r+=reg.valor;if(reg.tipo==='gasto')g+=reg.valor;if(reg.tipo==='investimento')inv+=reg.valor;}});return{mes,r,g,inv};});
    const max=Math.max(...dados.flatMap(d=>[d.r,d.g,d.inv]),1);
    ct.innerHTML=dados.map(d=>{const hR=(d.r/max)*130;const hG=(d.g/max)*130;const hI=(d.inv/max)*130;return `<div class="barra-grupo"><div class="barra-conjunto"><div class="barra receita" style="height:${hR}px"></div><div class="barra gasto" style="height:${hG}px"></div><div class="barra investimento" style="height:${hI}px"></div></div><span class="barra-label">${getMonthShort(d.mes)}</span></div>`;}).join('');
}

function renderPatrimonio(registros) {
    const ct=document.getElementById('grafico-patrimonio-container');const meses=[];for(let i=5;i>=0;i--){let m=graficoMes-i;let y=graficoAno;while(m<0){m+=12;y--;}meses.push({mes:m,ano:y});}
    const pontos=meses.map(({mes,ano})=>{let s=0;registros.forEach(r=>{const[ry,rm]=r.data.split('-').map(Number);const rd=new Date(ry,rm-1);const ld=new Date(ano,mes+1);if(rd<ld){if(r.tipo==='receita')s+=r.valor;if(r.tipo==='gasto')s-=r.valor;}});return s;});
    const mn=Math.min(...pontos,0);const mx=Math.max(...pontos,1);const rng=mx-mn||1;const h=120,w=300,pd=10;
    const pts=pontos.map((v,i)=>({x:pd+(i/(pontos.length-1||1))*(w-2*pd),y:h-pd-((v-mn)/rng)*(h-2*pd),v}));
    const lp=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
    const ap=lp+` L${pts[pts.length-1].x},${h-pd} L${pts[0].x},${h-pd} Z`;
    const dots=pts.map(p=>`<circle class="patrimonio-dot" cx="${p.x}" cy="${p.y}" r="3" />`).join('');
    ct.innerHTML=`<div class="patrimonio-chart"><svg class="patrimonio-chart-svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="patrimonioGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--green-medium)"/><stop offset="100%" stop-color="var(--green-medium)" stop-opacity="0"/></linearGradient></defs><path class="patrimonio-area" d="${ap}"/><path class="patrimonio-line" d="${lp}"/>${dots}</svg></div><div class="patrimonio-labels">${meses.map((m,i)=>`<div><div class="patrimonio-label-item">${getMonthShort(m.mes)}</div><div class="patrimonio-valor-item">${pontos[i]>=1000?(pontos[i]/1000).toFixed(1)+'k':formatMoney(pontos[i])}</div></div>`).join('')}</div>`;
}

function renderTopGastos(regs) {
    const gastos=regs.filter(r=>r.tipo==='gasto').sort((a,b)=>b.valor-a.valor).slice(0,5);
    const ct=document.getElementById('grafico-top-list');
    if(gastos.length===0){ct.innerHTML='<div class="empty-state"><span class="empty-icon">📋</span><p>Sem gastos neste mês</p></div>';return;}
    const max=gastos[0].valor;
    ct.innerHTML=gastos.map((r,i)=>{const info=getCategoriaInfo(r.categoria);const desc=r.descricao||info.label;const pct=(r.valor/max)*100;return `<div class="top-item"><span class="top-rank">${i+1}º</span><span class="top-icon">${info.icon}</span><div class="top-info"><div class="top-desc">${desc}</div><div class="top-cat">${info.label} · ${formatDate(r.data)}</div><div class="top-bar-bg"><div class="top-bar-fill" style="width:${pct}%"></div></div></div><span class="top-valor">${formatMoney(r.valor)}</span></div>`;}).join('');
}

async function renderProjecao(registros) {
    const fixas=await dbGetAll('fixas');const fa=fixas.filter(f=>f.ativa!==false);
    const cc=document.getElementById('projecao-chart-container');const tc=document.getElementById('projecao-tabela');const ic=document.getElementById('projecao-info');
    let fR=0,fG=0,fI=0;fa.forEach(f=>{if(f.tipo==='receita')fR+=f.valor;else if(f.tipo==='gasto')fG+=f.valor;else if(f.tipo==='investimento')fI+=f.valor;});
    const sfm=fR-fG-fI;const now=new Date();const ma=now.getMonth();const aa=now.getFullYear();
    if(fa.length===0){cc.innerHTML='';tc.innerHTML='';ic.innerHTML='<div class="empty-state" style="padding:16px 0;"><span class="empty-icon">🔁</span><p>Cadastre fixas para ver a projeção</p></div>';return;}
    const mp=[];for(let i=5;i>=0;i--){let m=ma-i;let y=aa;while(m<0){m+=12;y--;}mp.push({mes:m,ano:y});}
    const pr=mp.map(({mes,ano})=>{let s=0;registros.forEach(r=>{const[ry,rm]=r.data.split('-').map(Number);const rd=new Date(ry,rm-1);const ld=new Date(ano,mes+1);if(rd<ld){if(r.tipo==='receita'||r.tipo==='resgate')s+=r.valor;if(r.tipo==='gasto'||r.tipo==='investimento')s-=r.valor;}});return s;});
    let pa=0;registros.forEach(r=>{if(r.tipo==='receita'||r.tipo==='resgate')pa+=r.valor;if(r.tipo==='gasto'||r.tipo==='investimento')pa-=r.valor;});
    const mf=[];const pf=[];let sp=pa;for(let i=1;i<=6;i++){let m=ma+i;let y=aa;while(m>11){m-=12;y++;}sp+=sfm;mf.push({mes:m,ano:y});pf.push(sp);}
    const tm=[...mp,{mes:ma,ano:aa},...mf];const tp=[...pr,pa,...pf];const idx=pr.length;
    const mn=Math.min(...tp,0);const mx=Math.max(...tp,1);const rng=mx-mn||1;const w=320,h=140,pd2=14;
    const pts=tp.map((v,i)=>({x:pd2+(i/(tp.length-1||1))*(w-2*pd2),y:h-pd2-((v-mn)/rng)*(h-2*pd2),v}));
    const rPts=pts.slice(0,idx+1);const rl=rPts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
    const pPts=pts.slice(idx);const pl=pPts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
    const pArea=pl+` L${pPts[pPts.length-1].x},${h-pd2} L${pPts[0].x},${h-pd2} Z`;
    const rd=rPts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--green-dark)"/>`).join('');
    const pd3=pPts.slice(1).map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--purple-medium)"/>`).join('');
    const zy=h-pd2-((0-mn)/rng)*(h-2*pd2);const zl=mn<0?`<line x1="${pd2}" y1="${zy}" x2="${w-pd2}" y2="${zy}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4,4"/>`:'';
    cc.innerHTML=`<div class="projecao-chart"><svg viewBox="0 0 ${w} ${h}" class="projecao-svg"><defs><linearGradient id="projGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--purple-medium)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--purple-medium)" stop-opacity="0"/></linearGradient></defs>${zl}<path d="${pArea}" fill="url(#projGrad)"/><path d="${rl}" fill="none" stroke="var(--green-medium)" stroke-width="2.5" stroke-linecap="round"/><path d="${pl}" fill="none" stroke="var(--purple-medium)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6,4"/>${rd}${pd3}</svg></div><div class="projecao-labels">${tm.map((m,i)=>`<div class="projecao-label-item ${i>idx?'futuro':''} ${i===idx?'atual':''}">${getMonthShort(m.mes)}</div>`).join('')}</div><div class="projecao-legenda"><span class="legenda-item"><span class="legenda-dot" style="background:var(--green-medium)"></span> Real</span><span class="legenda-item"><span class="legenda-dot" style="background:var(--purple-medium)"></span> Projetado</span></div>`;
    let th='<div class="projecao-table"><div class="projecao-table-header"><span>Mês</span><span>Tipo</span><span>Patrimônio</span></div>';
    tm.forEach((m,i)=>{const iF=i>idx;const iA=i===idx;const v=tp[i];const vc=v>=0?'positivo':'negativo';const tipo=iA?'📍 Atual':iF?'🔮 Projeção':'📊 Real';const rc=iA?'projecao-row-atual':iF?'projecao-row-futuro':'';th+=`<div class="projecao-table-row ${rc}"><span>${getMonthShort(m.mes)}/${m.ano}</span><span class="projecao-tipo-badge">${tipo}</span><span class="projecao-table-valor ${vc}">${formatMoney(v)}</span></div>`;});
    th+='</div>';tc.innerHTML=th;
    const e6=pf[pf.length-1];const diff=e6-pa;const dc=diff>=0?'positivo':'negativo';const dp=diff>=0?'+':'';
    ic.innerHTML=`<div class="projecao-resumo"><div class="projecao-resumo-item"><span class="projecao-resumo-label">Impacto fixo mensal</span><span class="projecao-resumo-valor ${sfm>=0?'positivo':'negativo'}">${sfm>=0?'+':''}${formatMoney(sfm)}</span></div><div class="projecao-resumo-item"><span class="projecao-resumo-label">Patrimônio atual</span><span class="projecao-resumo-valor">${formatMoney(pa)}</span></div><div class="projecao-resumo-item destaque"><span class="projecao-resumo-label">Em 6 meses</span><span class="projecao-resumo-valor ${e6>=0?'positivo':'negativo'}">${formatMoney(e6)}</span></div><div class="projecao-resumo-item"><span class="projecao-resumo-label">Diferença</span><span class="projecao-resumo-valor ${dc}">${dp}${formatMoney(diff)}</span></div></div><p class="projecao-aviso">⚠️ Projeção baseada nas fixas.</p>`;
}

// ===== DADOS =====
let csvMes=new Date().getMonth(),csvAno=new Date().getFullYear(),csvTodos=false,csvFormatoExcel=true,relatorioMes=new Date().getMonth(),relatorioAno=new Date().getFullYear();

function initDados() {
    document.getElementById('csv-mes-prev').addEventListener('click',()=>{csvTodos=false;csvMes--;if(csvMes<0){csvMes=11;csvAno--;}updateCsvLabel();});
    document.getElementById('csv-mes-next').addEventListener('click',()=>{csvTodos=false;csvMes++;if(csvMes>11){csvMes=0;csvAno++;}updateCsvLabel();});
    document.getElementById('csv-todos-meses').addEventListener('click',()=>{csvTodos=!csvTodos;updateCsvLabel();});
    document.getElementById('csv-formato-excel').addEventListener('click',()=>{csvFormatoExcel=true;document.getElementById('csv-formato-excel').classList.add('active');document.getElementById('csv-formato-sheets').classList.remove('active');});
    document.getElementById('csv-formato-sheets').addEventListener('click',()=>{csvFormatoExcel=false;document.getElementById('csv-formato-sheets').classList.add('active');document.getElementById('csv-formato-excel').classList.remove('active');});
    document.getElementById('relatorio-mes-prev').addEventListener('click',()=>{relatorioMes--;if(relatorioMes<0){relatorioMes=11;relatorioAno--;}updateRelatorioLabel();});
    document.getElementById('relatorio-mes-next').addEventListener('click',()=>{relatorioMes++;if(relatorioMes>11){relatorioMes=0;relatorioAno++;}updateRelatorioLabel();});
    document.getElementById('btn-exportar-json').addEventListener('click',exportarJSON);
    document.getElementById('input-importar-json').addEventListener('change',importarJSON);
    document.getElementById('btn-exportar-csv').addEventListener('click',exportarCSV);
    document.getElementById('btn-gerar-relatorio').addEventListener('click',gerarRelatorio);
    document.getElementById('btn-copiar-relatorio').addEventListener('click',copiarRelatorio);
    document.getElementById('btn-compartilhar-relatorio').addEventListener('click',compartilharRelatorio);
    document.getElementById('import-cancel').addEventListener('click',()=>document.getElementById('modal-import-overlay').classList.remove('open'));
    document.getElementById('modal-import-overlay').addEventListener('click',(e)=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('open');});
}

function updateCsvLabel(){document.getElementById('csv-mes-label').textContent=csvTodos?'Todos os meses':`${getMonthName(csvMes)} ${csvAno}`;document.getElementById('csv-todos-meses').classList.toggle('active',csvTodos);}
function updateRelatorioLabel(){document.getElementById('relatorio-mes-label').textContent=`${getMonthName(relatorioMes)} ${relatorioAno}`;}

async function updateDadosScreen() {
    const registros=await dbGetAll('registros');const fixas=await dbGetAll('fixas');
    document.getElementById('dados-stats').innerHTML=`<div style="display:flex;gap:12px;flex-wrap:wrap;"><div style="font-size:12px;color:var(--text-muted);">📊 <strong>${registros.length}</strong> transações</div><div style="font-size:12px;color:var(--text-muted);">🔁 <strong>${fixas.length}</strong> fixas</div></div>`;
    updateCsvLabel();updateRelatorioLabel();
}

async function exportarJSON() {
    const registros=await dbGetAll('registros');const fixas=await dbGetAll('fixas');const configs=await dbGetAll('config');
    const backup={app:'O Bolso do Fred',version:'2.0',exportedAt:new Date().toISOString(),data:{registros,fixas,configs:configs.filter(c=>c.chave!=='pin')}};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`bolso-fred-backup-${new Date().toISOString().split('T')[0]}.json`;a.click();URL.revokeObjectURL(url);showToast('✅ Backup exportado!');
}

let pendingImportData=null;
async function importarJSON(e) {
    const file=e.target.files[0];if(!file)return;
    try{const text=await file.text();const data=JSON.parse(text);if(!data.data||!data.data.registros){showToast('⚠️ Arquivo inválido');return;}
    pendingImportData=data;
    document.getElementById('import-confirm-text').textContent=`Restaurar backup de ${data.exportedAt?new Date(data.exportedAt).toLocaleDateString('pt-BR'):'data desconhecida'}?`;
    document.getElementById('import-preview').innerHTML=`<div>📊 ${data.data.registros.length} transações</div><div>🔁 ${(data.data.fixas||[]).length} fixas</div>`;
    document.getElementById('import-confirm').onclick=async()=>{await executarImport(pendingImportData);document.getElementById('modal-import-overlay').classList.remove('open');};
    document.getElementById('modal-import-overlay').classList.add('open');}catch(err){showToast('⚠️ Erro ao ler arquivo');}e.target.value='';
}

async function executarImport(data) {
    try{const pin=await dbGet('config','pin');await dbClear('registros');await dbClear('fixas');await dbClear('config');if(pin)await dbPut('config',pin);
    for(const r of data.data.registros)await dbPut('registros',r);for(const f of(data.data.fixas||[]))await dbPut('fixas',f);
    for(const c of(data.data.configs||[])){if(c.chave!=='pin')await dbPut('config',c);}
    showToast('✅ Backup restaurado!');updateDashboard();}catch(err){showToast('⚠️ Erro ao restaurar');}
}

async function exportarCSV() {
    const registros=await dbGetAll('registros');let filtered=registros;
    if(!csvTodos)filtered=filtered.filter(r=>{const[y,m]=r.data.split('-').map(Number);return y===csvAno&&(m-1)===csvMes;});
    filtered.sort((a,b)=>a.data.localeCompare(b.data));const sep=csvFormatoExcel?';':',';
    const lines=[`Data${sep}Tipo${sep}Descrição${sep}Categoria${sep}Método${sep}Valor`];
    filtered.forEach(r=>{const cat=r.categoria?getCategoriaInfo(r.categoria).label:(r.tipoInvestimento?getInvestimentoInfo(r.tipoInvestimento).label:'-');const met=r.metodo?getMetodoInfo(r.metodo).replace(/[^\w\s]/g,'').trim():'-';const desc=(r.descricao||'-').replace(/[;,]/g,' ');const val=csvFormatoExcel?r.valor.toFixed(2).replace('.',','):r.valor.toFixed(2);lines.push(`${formatDate(r.data)}${sep}${r.tipo}${sep}${desc}${sep}${cat}${sep}${met}${sep}${val}`);});
    const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`bolso-fred-${csvTodos?'completo':`${getMonthShort(csvMes)}-${csvAno}`}.csv`;a.click();URL.revokeObjectURL(url);showToast('✅ CSV exportado!');
}

async function gerarRelatorio() {
    const registros=await dbGetAll('registros');const mes=relatorioMes;const ano=relatorioAno;
    const dm=registros.filter(r=>{const[y,m]=r.data.split('-').map(Number);return y===ano&&(m-1)===mes;});
    let rec=0,gas=0,inv=0,res=0;const gpc={};
    dm.forEach(r=>{if(r.tipo==='receita')rec+=r.valor;if(r.tipo==='gasto'){gas+=r.valor;const cat=getCategoriaInfo(r.categoria).label;gpc[cat]=(gpc[cat]||0)+r.valor;}if(r.tipo==='investimento')inv+=r.valor;if(r.tipo==='resgate')res+=r.valor;});
    const saldo=rec-gas-inv+res;
    let t=`╔════════════════════════════════╗\n║   💰 O BOLSO DO FRED          ║\n║   Relatório ${getMonthName(mes)} ${ano}   ║\n╚════════════════════════════════╝\n\n📊 RESUMO\n─────────────────────────────────\n💵 Receitas:      ${formatMoney(rec)}\n💸 Gastos:        ${formatMoney(gas)}\n📈 Investimentos: ${formatMoney(inv)}\n`;
    if(res>0)t+=`🔄 Resgates:      ${formatMoney(res)}\n`;
    t+=`─────────────────────────────────\n💰 Saldo:         ${formatMoney(saldo)}\n\n`;
    if(Object.keys(gpc).length>0){t+=`🥧 GASTOS POR CATEGORIA\n─────────────────────────────────\n`;Object.entries(gpc).sort((a,b)=>b[1]-a[1]).forEach(([cat,val])=>{t+=`  ${cat}: ${formatMoney(val)} (${((val/gas)*100).toFixed(0)}%)\n`;});t+='\n';}
    t+=`📋 Total: ${dm.length} transações\n📅 Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
    document.getElementById('relatorio-texto').textContent=t;document.getElementById('relatorio-output').style.display='';
}

function copiarRelatorio(){navigator.clipboard.writeText(document.getElementById('relatorio-texto').textContent).then(()=>showToast('📋 Copiado!')).catch(()=>showToast('⚠️ Erro'));}
async function compartilharRelatorio(){const t=document.getElementById('relatorio-texto').textContent;if(navigator.share){try{await navigator.share({title:'Relatório',text:t});}catch(e){}}else{copiarRelatorio();}}

// ===== SETTINGS =====
function initSettings() {
    document.getElementById('btn-alterar-pin').addEventListener('click',()=>{
        createPinStep=1;createPinBuffer='';firstPin='';
        document.querySelectorAll('#create-pin-dots .dot').forEach(d=>d.classList.remove('filled','error'));
        document.getElementById('create-pin-subtitle').textContent='Crie um novo PIN de 4 dígitos';
        document.getElementById('create-pin-error').textContent='';
        navigateTo('screen-create-pin');
    });
    document.getElementById('btn-reset-dados').addEventListener('click',()=>{
        document.getElementById('confirm-text').textContent='⚠️ Apagar TODOS os dados? Esta ação é irreversível!';
        pendingDeleteId=null;
        document.getElementById('confirm-delete').onclick=async()=>{
            const pin=await dbGet('config','pin');
            await dbClear('registros');await dbClear('fixas');await dbClear('config');
            if(pin)await dbPut('config',pin);
            closeConfirmModal();showToast('🗑️ Dados apagados');updateDashboard();
        };
        document.getElementById('modal-confirm-overlay').classList.add('open');
    });
}

// ===== NOTIFICAÇÕES =====
let notifPermission='default';

function initNotificacoes() {
    document.getElementById('btn-ativar-notif').addEventListener('click',requestNotifPermission);
    ['toggle-alerta-fixas','toggle-alerta-metas','toggle-alerta-semanal'].forEach(id=>{
        document.getElementById(id).addEventListener('change',saveNotifPreferences);
    });
    document.getElementById('btn-salvar-horario').addEventListener('click',async()=>{await saveNotifPreferences();showToast('✅ Horário salvo!');});
    document.getElementById('btn-novo-lembrete').addEventListener('click',openLembreteModal);
    document.getElementById('modal-lembrete-close').addEventListener('click',closeLembreteModal);
    document.getElementById('modal-lembrete-overlay').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeLembreteModal();});
    document.getElementById('lembrete-btn-cancelar').addEventListener('click',closeLembreteModal);
    document.getElementById('lembrete-btn-salvar').addEventListener('click',salvarLembrete);
    document.getElementById('btn-limpar-notifs').addEventListener('click',async()=>{await dbPut('config',{chave:'notif-historico',valor:[]});updateNotifHistorico();showToast('🗑️ Limpo');});
    loadNotifState();
    startNotifChecker();
    if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('message',(e)=>{if(e.data.type==='NAVIGATE')navigateTo(e.data.screen);});}
}

async function loadNotifState() {
    if('Notification' in window) notifPermission=Notification.permission;
    updateNotifStatusUI();
    const prefs=await getNotifPrefs();
    document.getElementById('toggle-alerta-fixas').checked=prefs.alertaFixas!==false;
    document.getElementById('toggle-alerta-metas').checked=prefs.alertaMetas!==false;
    document.getElementById('toggle-alerta-semanal').checked=prefs.alertaSemanal!==false;
    document.getElementById('select-notif-hora').value=prefs.hora||8;
}

function updateNotifStatusUI() {
    const icon=document.getElementById('notif-status-icon');
    const text=document.getElementById('notif-status-text');
    const btn=document.getElementById('btn-ativar-notif');
    if(notifPermission==='granted'){icon.textContent='🔔';text.textContent='Notificações ativadas';text.style.color='var(--green-dark)';btn.textContent='✅ Ativas';btn.classList.add('ativo');btn.style.pointerEvents='none';}
    else if(notifPermission==='denied'){icon.textContent='🚫';text.textContent='Bloqueadas pelo navegador';text.style.color='var(--red-medium)';btn.textContent='⚠️ Bloqueado — Libere nas config. do navegador';btn.classList.add('ativo');}
    else{icon.textContent='🔕';text.textContent='Desativadas';text.style.color='';btn.textContent='🔔 Ativar Notificações';btn.classList.remove('ativo');btn.style.pointerEvents='';}
}

async function requestNotifPermission() {
    if(!('Notification' in window)){showToast('⚠️ Navegador não suporta');return;}
    const p=await Notification.requestPermission();notifPermission=p;updateNotifStatusUI();
    if(p==='granted'){showToast('🔔 Ativadas!');await logNotif('🔔 Notificações ativadas');sendNotification('💰 O Bolso do Fred','Notificações ativadas!','teste',{screen:'screen-dashboard'});registerPeriodicSync();}
    else if(p==='denied'){showToast('🚫 Negado');}
}

function sendNotification(title,body,tag,data) {
    if(notifPermission!=='granted') return;
    if('serviceWorker' in navigator&&navigator.serviceWorker.controller){navigator.serviceWorker.controller.postMessage({type:'SHOW_NOTIFICATION',payload:{title,body,tag,data}});}
    else{try{new Notification(title,{body,icon:'./icons/icon-192.png',tag});}catch(e){}}
}

async function getNotifPrefs(){const c=await dbGet('config','notif-prefs');return(c&&c.valor)?c.valor:{alertaFixas:true,alertaMetas:true,alertaSemanal:true,hora:8};}

async function saveNotifPreferences() {
    const prefs={alertaFixas:document.getElementById('toggle-alerta-fixas').checked,alertaMetas:document.getElementById('toggle-alerta-metas').checked,alertaSemanal:document.getElementById('toggle-alerta-semanal').checked,hora:parseInt(document.getElementById('select-notif-hora').value)};
    await dbPut('config',{chave:'notif-prefs',valor:prefs});
    if('serviceWorker' in navigator&&navigator.serviceWorker.controller){navigator.serviceWorker.controller.postMessage({type:'SCHEDULE_CHECK',payload:prefs});}
}

function openLembreteModal(){document.getElementById('input-lembrete-titulo').value='';document.getElementById('input-lembrete-data').valueAsDate=new Date();document.getElementById('select-lembrete-repetir').value='nao';document.getElementById('modal-lembrete-overlay').classList.add('open');}
function closeLembreteModal(){document.getElementById('modal-lembrete-overlay').classList.remove('open');}

async function salvarLembrete() {
    const titulo=document.getElementById('input-lembrete-titulo').value.trim();const data=document.getElementById('input-lembrete-data').value;const repetir=document.getElementById('select-lembrete-repetir').value;
    if(!titulo){showToast('⚠️ Informe o título');return;}if(!data){showToast('⚠️ Informe a data');return;}
    const config=await dbGet('config','lembretes');const lembretes=(config&&config.valor)?config.valor:[];
    lembretes.push({id:generateId(),titulo,data,repetir,ativo:true,criadoEm:Date.now()});
    await dbPut('config',{chave:'lembretes',valor:lembretes});closeLembreteModal();showToast('✅ Lembrete salvo!');updateLembretesList();
}

async function updateLembretesList() {
    const config=await dbGet('config','lembretes');const lembretes=(config&&config.valor)?config.valor:[];
    const ct=document.getElementById('lembretes-list');
    if(lembretes.length===0){ct.innerHTML='<div class="empty-state" style="padding:16px 0;"><span class="empty-icon">⏰</span><p>Nenhum lembrete</p></div>';return;}
    const rl={nao:'Único',diario:'Diário',semanal:'Semanal',mensal:'Mensal'};
    ct.innerHTML=lembretes.sort((a,b)=>a.data.localeCompare(b.data)).map(l=>`<div class="lembrete-item"><div class="lembrete-icon">⏰</div><div class="lembrete-info"><div class="lembrete-titulo">${l.titulo}</div><div class="lembrete-meta">${formatDate(l.data)} · ${rl[l.repetir]||'Único'}</div></div><button class="lembrete-delete" data-lembrete-id="${l.id}">🗑️</button></div>`).join('');
    ct.querySelectorAll('.lembrete-delete').forEach(btn=>{btn.addEventListener('click',async()=>{const id=btn.dataset.lembreteId;const cfg=await dbGet('config','lembretes');const ls=(cfg&&cfg.valor)?cfg.valor:[];await dbPut('config',{chave:'lembretes',valor:ls.filter(l=>l.id!==id)});showToast('🗑️ Excluído');updateLembretesList();});});
}

async function logNotif(text){const config=await dbGet('config','notif-historico');const h=(config&&config.valor)?config.valor:[];h.unshift({text,time:Date.now()});if(h.length>20)h.length=20;await dbPut('config',{chave:'notif-historico',valor:h});}

async function updateNotifHistorico() {
    const config=await dbGet('config','notif-historico');const h=(config&&config.valor)?config.valor:[];
    const ct=document.getElementById('notificacoes-historico-list');
    if(h.length===0){ct.innerHTML='<div class="empty-state" style="padding:16px 0;"><span class="empty-icon">📭</span><p>Nenhuma notificação ainda</p></div>';return;}
    ct.innerHTML=h.map(n=>{const d=new Date(n.time);return `<div class="notif-hist-item"><span class="notif-hist-icon">🔔</span><div class="notif-hist-info"><div class="notif-hist-text">${n.text}</div><div class="notif-hist-time">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div></div>`;}).join('');
}

let notifCheckerInterval=null;
function startNotifChecker(){checkNotifications();notifCheckerInterval=setInterval(checkNotifications,30*60*1000);}

async function checkNotifications() {
    if(notifPermission!=='granted')return;
    const prefs=await getNotifPrefs();const now=new Date();const hora=now.getHours();const hoje=now.toISOString().split('T')[0];
    const lc=await dbGet('config','last-notif-check');if(lc&&lc.valor===hoje)return;
    if(Math.abs(hora-prefs.hora)>0)return;
    await dbPut('config',{chave:'last-notif-check',valor:hoje});
    if(prefs.alertaFixas)await checkFixasPendentesNotif(now);
    if(prefs.alertaMetas)await checkMetasNotif(now);
    if(prefs.alertaSemanal&&now.getDay()===1)await checkResumoSemanal(now);
    await checkLembretes(hoje);
}

async function checkFixasPendentesNotif(now) {
    const fixas=await dbGetAll('fixas');const registros=await dbGetAll('registros');const ma=now.getMonth();const aa=now.getFullYear();const dh=now.getDate();
    const aplicadas=new Set();registros.forEach(r=>{if(r.fixaId){const[y,m]=r.data.split('-').map(Number);if(y===aa&&(m-1)===ma)aplicadas.add(r.fixaId);}});
    const pends=fixas.filter(f=>f.ativa!==false&&!aplicadas.has(f.id));
    const vh=pends.filter(f=>f.dia===dh);
    if(vh.length>0){const nomes=vh.map(f=>f.descricao).join(', ');sendNotification('📅 Conta vencendo hoje!',vh.length===1?`"${nomes}" - ${formatMoney(vh[0].valor)}`:`${vh.length} contas: ${nomes}`,'fixas-hoje',{screen:'screen-fixas'});await logNotif(`📅 ${vh.length} fixa(s) vencendo hoje`);}
}

async function checkMetasNotif(now) {
    const registros=await dbGetAll('registros');const ma=now.getMonth();const aa=now.getFullYear();
    const oc=await dbGet('config','orcamento-geral');const orc=oc?oc.valor:0;
    let tg=0;registros.forEach(r=>{const[y,m]=r.data.split('-').map(Number);if(r.tipo==='gasto'&&y===aa&&(m-1)===ma)tg+=r.valor;});
    if(orc>0){const pct=(tg/orc)*100;if(pct>=100){sendNotification('🚨 Orçamento estourado!',`${formatMoney(tg)} de ${formatMoney(orc)}`,'orc-100',{screen:'screen-metas'});await logNotif('🚨 Orçamento estourado');}else if(pct>=75){sendNotification('⚠️ Orçamento em alerta!',`${pct.toFixed(0)}% usado`,'orc-75',{screen:'screen-metas'});await logNotif(`⚠️ Orçamento ${pct.toFixed(0)}%`);}}
}

async function checkResumoSemanal(now) {
    const registros=await dbGetAll('registros');const sem=new Date(now.getTime()-7*24*60*60*1000).toISOString().split('T')[0];
    let gs=0,cs=0;registros.forEach(r=>{if(r.tipo==='gasto'&&r.data>=sem){gs+=r.valor;cs++;}});
    sendNotification('📊 Resumo Semanal',`${cs} gastos = ${formatMoney(gs)}`,'resumo-semanal',{screen:'screen-graficos'});
    await logNotif(`📊 Resumo: ${cs} gastos = ${formatMoney(gs)}`);
}

async function checkLembretes(hoje) {
    const config=await dbGet('config','lembretes');const lembretes=(config&&config.valor)?config.valor:[];let upd=false;
    for(const l of lembretes){if(!l.ativo)continue;if(l.data===hoje){sendNotification('⏰ Lembrete',l.titulo,`lemb-${l.id}`,{screen:'screen-notificacoes'});await logNotif(`⏰ ${l.titulo}`);if(l.repetir==='nao'){l.ativo=false;upd=true;}else{const d=new Date(l.data+'T12:00:00');if(l.repetir==='diario')d.setDate(d.getDate()+1);if(l.repetir==='semanal')d.setDate(d.getDate()+7);if(l.repetir==='mensal')d.setMonth(d.getMonth()+1);l.data=d.toISOString().split('T')[0];upd=true;}}}
    if(upd)await dbPut('config',{chave:'lembretes',valor:lembretes});
}

async function registerPeriodicSync(){if('serviceWorker' in navigator){try{const reg=await navigator.serviceWorker.ready;if('periodicSync' in reg){await reg.periodicSync.register('check-lembretes',{minInterval:60*60*1000});}}catch(e){}}}

async function updateNotificacoes(){await loadNotifState();await updateLembretesList();await updateNotifHistorico();}

// ===== AUTO-FILL VIA URL (Atalhos do iOS) =====
function checkURLParams() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const valor = params.get('valor');
    const tipo = params.get('tipo');
    const descricao = params.get('desc');
    const categoria = params.get('cat');
    const metodo = params.get('metodo');

    // Se não veio valor na URL, não faz nada
    if (!valor) return false;

    // Aguarda o usuário autenticar com PIN antes de preencher
    const waitForAuth = () => {
        if (!authenticated) {
            setTimeout(waitForAuth, 500);
            return;
        }

        // Define o tipo (gasto, receita, investimento, resgate)
        const tipoValido = ['gasto', 'receita', 'investimento', 'resgate'].includes(tipo) ? tipo : 'gasto';
        tipoRegistro = tipoValido;
        document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tipo-btn[data-tipo="${tipoValido}"]`)?.classList.add('active');

        // Preenche o valor
        const valorNum = parseFloat(valor);
        if (valorNum > 0) {
            document.getElementById('input-valor').value = valorNum.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        // Preenche descrição (se veio)
        if (descricao) {
            document.getElementById('input-descricao').value = decodeURIComponent(descricao);
        }

        // Preenche categoria (para gastos)
        if (categoria && tipoValido === 'gasto') {
            const catMap = {
                'alimentacao': 'alimentacao', 'food': 'alimentacao', 'comida': 'alimentacao',
                'transporte': 'transporte', 'uber': 'transporte', 'transport': 'transporte',
                'moradia': 'moradia', 'casa': 'moradia',
                'lazer': 'lazer', 'entertainment': 'lazer',
                'saude': 'saude', 'health': 'saude', 'farmacia': 'saude',
                'educacao': 'educacao', 'education': 'educacao',
                'compras': 'compras', 'shopping': 'compras',
                'servicos': 'servicos', 'services': 'servicos',
                'vestuario': 'vestuario', 'roupa': 'vestuario',
                'outros': 'outros'
            };
            const catKey = catMap[categoria.toLowerCase()] || 'outros';
            document.getElementById('select-categoria').value = catKey;
        }

        // Preenche método de pagamento
        if (metodo) {
            const metMap = {
                'credito': 'credito', 'credit': 'credito', 'crédito': 'credito',
                'debito': 'debito', 'debit': 'debito', 'débito': 'debito',
                'pix': 'pix',
                'boleto': 'boleto',
                'dinheiro': 'dinheiro', 'cash': 'dinheiro'
            };
            const metKey = metMap[metodo.toLowerCase()] || 'credito';
            metodoSelecionado = metKey;
            document.querySelectorAll('#chips-metodo .chip').forEach(c => c.classList.remove('active'));
            document.querySelector(`#chips-metodo .chip[data-metodo="${metKey}"]`)?.classList.add('active');
        }

        // Data = hoje
        document.getElementById('input-data').valueAsDate = new Date();

        // Atualiza visibilidade dos campos do form
        updateFormVisibility();

        // Navega direto para o formulário
        navigateTo('screen-novo-registro');

        // Toast informando que veio do atalho
        showToast('📲 Dados preenchidos via atalho!');

        // Limpa os parâmetros da URL sem recarregar a página
        window.history.replaceState({}, '', window.location.pathname);
    };

    waitForAuth();
    return true;
}

// ===== SERVICE WORKER =====
function registerSW(){if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW:',e));}

// ===== INIT =====
async function init() {
    await openDB();
    await applyThemeFromSaved();
    hideNav();
    initNavigation();
    initFormulario();
    initModals();
    initHistorico();
    await initMetas();
    initFixas();
    initGraficos();
    initDados();
    initSettings();
    initNotificacoes();
    await initPIN();
    registerSW();

    // Verifica se veio com dados via URL (Atalho do iOS)
    checkURLParams();
}

document.addEventListener('DOMContentLoaded', init);
