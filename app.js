// =======================================
// O BOLSO DO FRED — App v2.5 (com Feedback Tátil)
// =======================================

// ===== BANCO DE DADOS =====
const DB_NAME = 'bolso-do-fred';
const DB_VERSION = 3;
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

function dbAdd(store, data) { return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).add(data); tx.oncomplete = () => resolve(); tx.onerror = (e) => reject(e.target.error); }); }
function dbPut(store, data) { return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(data); tx.oncomplete = () => resolve(); tx.onerror = (e) => reject(e.target.error); }); }
function dbDelete(store, id) { return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(id); tx.oncomplete = () => resolve(); tx.onerror = (e) => reject(e.target.error); }); }
function dbGetAll(store) { return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readonly'); const request = tx.objectStore(store).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = (e) => reject(e.target.error); }); }
function dbGet(store, key) { return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readonly'); const request = tx.objectStore(store).get(key); request.onsuccess = () => resolve(request.result); request.onerror = (e) => reject(e.target.error); }); }
function dbClear(store) { return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); tx.oncomplete = () => resolve(); tx.onerror = (e) => reject(e.target.error); }); }

// ===== UTILITÁRIOS =====
function formatMoney(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function parseMoney(s) { if (!s) return 0; return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0; }
function formatDate(ds) { const [y, m, d] = ds.split('-'); return `${d}/${m}/${y}`; }
function getMonthName(m) { return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]; }
function getMonthShort(m) { return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m]; }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
function getHojeString() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }

let toastTimer = null;
function showToast(msg) { const t = document.getElementById('toast'); if (toastTimer) clearTimeout(toastTimer); t.classList.remove('show'); void t.offsetWidth; t.textContent = msg; t.classList.add('show'); toastTimer = setTimeout(() => { t.classList.remove('show'); toastTimer = null; }, 2500); }

// ===== FEEDBACK TÁTIL E SONORO (PIN) =====
const PinFeedback = (() => {
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playClick(frequency, duration, volume) {
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) { }
    }

    function playError() {
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(300, ctx.currentTime);
            oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
        } catch (e) { }
    }

    function playSuccess() {
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0.07, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1320, now + 0.1);
            gain2.gain.setValueAtTime(0.07, now + 0.1);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.1);
            osc2.stop(now + 0.25);
        } catch (e) { }
    }

    function vibrate(pattern) {
        try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { }
    }

    return {
        tapKey() { vibrate(30); playClick(1800, 0.03, 0.08); },
        tapDelete() { vibrate(20); playClick(1200, 0.025, 0.05); },
        success() { vibrate([40, 60, 40]); playSuccess(); },
        error() { vibrate(200); playError(); }
    };
})();

// ===== CATEGORIAS DINÂMICAS =====
const DEFAULT_CATEGORIAS = [
    { id: 'alimentacao', icon: '🍔', label: 'Alimentação', builtin: true },
    { id: 'transporte', icon: '🚗', label: 'Transporte', builtin: true },
    { id: 'moradia', icon: '🏠', label: 'Moradia', builtin: true },
    { id: 'lazer', icon: '🎮', label: 'Lazer', builtin: true },
    { id: 'vestuario', icon: '👕', label: 'Vestuário', builtin: true },
    { id: 'saude', icon: '💊', label: 'Saúde', builtin: true },
    { id: 'educacao', icon: '📚', label: 'Educação', builtin: true },
    { id: 'compras', icon: '🛒', label: 'Compras', builtin: true },
    { id: 'servicos', icon: '🔧', label: 'Serviços', builtin: true },
    { id: 'outros', icon: '📦', label: 'Outros', builtin: true }
];

let categoriasCache = [];

async function loadCategorias() {
    const custom = await dbGet('config', 'categorias-custom');
    const customs = custom ? custom.valor : [];
    categoriasCache = [...DEFAULT_CATEGORIAS, ...customs];
    return categoriasCache;
}

function getCategoriaInfo(cat) {
    const found = categoriasCache.find(c => c.id === cat);
    if (found) return { icon: found.icon, label: found.label };
    return { icon: '📦', label: cat || 'Outros' };
}

async function populateCategoriaSelects() {
    await loadCategorias();
    const selects = [document.getElementById('select-categoria'), document.getElementById('select-fixa-categoria')];
    selects.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        categoriasCache.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id;
            o.textContent = `${c.icon} ${c.label}`;
            sel.appendChild(o);
        });
    });
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
    if (authenticated && screenId !== 'screen-pin' && screenId !== 'screen-create-pin') showNav(); else hideNav();
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
    if (screenId === 'screen-settings') initSettingsScreen();
    if (screenId === 'screen-categorias') updateCategoriasScreen();
    window.scrollTo(0, 0);
}

function initNavigation() {
    document.querySelectorAll('.nav-item[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('screen-' + btn.dataset.nav));
    });
    const addBtn = document.getElementById('btn-add');
    if (addBtn) addBtn.addEventListener('click', () => {
        if (currentScreen === 'screen-fixas') openFixaModal();
        else openNovoRegistro();
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
    if (!config) navigateTo('screen-create-pin'); else navigateTo('screen-pin');
    document.querySelectorAll('#screen-pin .pin-key[data-key]').forEach(key => {
        key.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handlePinKey(key.dataset.key); });
    });
    document.querySelectorAll('#screen-create-pin .pin-key[data-create-key]').forEach(key => {
        key.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleCreatePinKey(key.dataset.createKey); });
    });
}

function handlePinKey(key) {
    const dots = document.querySelectorAll('#pin-dots .dot');
    const errorEl = document.getElementById('pin-error');
    if (key === 'delete') {
        if (pinBuffer.length > 0) {
            pinBuffer = pinBuffer.slice(0, -1);
            dots[pinBuffer.length].classList.remove('filled');
            PinFeedback.tapDelete();
        }
        return;
    }
    if (pinBuffer.length >= 4) return;
    PinFeedback.tapKey();
    pinBuffer += key;
    dots[pinBuffer.length - 1].classList.add('filled');
    if (pinBuffer.length === 4) {
        setTimeout(async () => {
            const config = await dbGet('config', 'pin');
            if (config && config.valor === pinBuffer) {
                PinFeedback.success();
                errorEl.textContent = ''; authenticated = true; navigateTo('screen-dashboard');
                pinBuffer = ''; dots.forEach(d => d.classList.remove('filled', 'error'));
            } else {
                PinFeedback.error();
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
        if (createPinBuffer.length > 0) {
            createPinBuffer = createPinBuffer.slice(0, -1);
            dots[createPinBuffer.length].classList.remove('filled');
            PinFeedback.tapDelete();
        }
        return;
    }
    if (createPinBuffer.length >= 4) return;
    PinFeedback.tapKey();
    createPinBuffer += key;
    dots[createPinBuffer.length - 1].classList.add('filled');
    if (createPinBuffer.length === 4) {
        setTimeout(async () => {
            if (createPinStep === 1) {
                PinFeedback.success();
                firstPin = createPinBuffer; createPinBuffer = ''; createPinStep = 2;
                dots.forEach(d => d.classList.remove('filled'));
                subtitle.textContent = 'Confirme seu PIN';
            } else {
                if (createPinBuffer === firstPin) {
                    PinFeedback.success();
                    await dbPut('config', { chave: 'pin', valor: firstPin });
                    showToast('✅ PIN criado com sucesso!'); authenticated = true;
                    createPinBuffer = ''; createPinStep = 1; firstPin = '';
                    dots.forEach(d => d.classList.remove('filled'));
                    subtitle.textContent = 'Crie um PIN de 4 dígitos';
                    navigateTo('screen-dashboard');
                } else {
                    PinFeedback.error();
                    errorEl.textContent = 'PINs não coincidem. Tente novamente.';
                    dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
                    setTimeout(() => { dots.forEach(d => d.classList.remove('error')); createPinBuffer = ''; createPinStep = 1; firstPin = ''; errorEl.textContent = ''; subtitle.textContent = 'Crie um PIN de 4 dígitos'; }, 600);
                }
            }
        }, 200);
    }
}

// ===== SALDO INICIAL =====
async function getSaldoInicial() {
    const s = await dbGet('config', 'saldo-inicial');
    return s ? s.valor : { conta: 0, investido: 0 };
}

function initSaldoInicial() {
    applyMoneyMask(document.getElementById('input-saldo-inicial'));
    applyMoneyMask(document.getElementById('input-investido-inicial'));
    document.getElementById('btn-salvar-saldo-inicial').addEventListener('click', async () => {
        const conta = parseMoney(document.getElementById('input-saldo-inicial').value);
        const investido = parseMoney(document.getElementById('input-investido-inicial').value);
        await dbPut('config', { chave: 'saldo-inicial', valor: { conta, investido } });
        showToast('✅ Saldo inicial salvo!');
        updateSaldoInicialStatus(conta, investido);
        if (currentScreen === 'screen-dashboard') updateDashboard();
    });
}

async function initSettingsScreen() {
    initTheme();
    const si = await getSaldoInicial();
    if (si.conta > 0) document.getElementById('input-saldo-inicial').value = Number(si.conta).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (si.investido > 0) document.getElementById('input-investido-inicial').value = Number(si.investido).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    updateSaldoInicialStatus(si.conta, si.investido);
}

function updateSaldoInicialStatus(conta, investido) {
    const el = document.getElementById('saldo-inicial-status');
    if (conta > 0 || investido > 0) {
        el.innerHTML = `<div style="padding:8px;background:var(--bg-card-alt,#f0f7f3);border-radius:8px;font-size:13px;">
            <div>✅ Saldo em conta: <strong>${formatMoney(conta)}</strong></div>
            <div>✅ Investido: <strong>${formatMoney(investido)}</strong></div>
            <div style="margin-top:4px;opacity:0.7;">Esses valores são somados ao patrimônio sem gerar movimentações.</div>
        </div>`;
    } else {
        el.innerHTML = '<p style="font-size:12px;opacity:0.6;">Nenhum saldo inicial definido.</p>';
    }
}

// ===== DASHBOARD =====
async function updateDashboard() {
    const registros = await dbGetAll('registros');
    const saldoInicial = await getSaldoInicial();
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const hoje = getHojeString();
    document.getElementById('mes-atual').textContent = getMonthName(mesAtual);

    let tRec = 0, tGas = 0, tInv = 0, tRes = 0;
    let tRecAll = 0, tGasAll = 0, tInvAll = 0, tResAll = 0;

    registros.forEach(r => {
        const [y, m] = r.data.split('-').map(Number);
        if (r.data <= hoje) {
            if (r.tipo === 'receita') tRecAll += r.valor;
            if (r.tipo === 'gasto') tGasAll += r.valor;
            if (r.tipo === 'investimento') tInvAll += r.valor;
            if (r.tipo === 'resgate') tResAll += r.valor;
        }
        if (y === anoAtual && (m - 1) === mesAtual) {
            if (r.tipo === 'receita') tRec += r.valor;
            if (r.tipo === 'gasto') tGas += r.valor;
            if (r.tipo === 'investimento') tInv += r.valor;
            if (r.tipo === 'resgate') tRes += r.valor;
        }
    });

    const saldoLivre = saldoInicial.conta + tRecAll - tGasAll + tResAll;
    const totalInvestido = saldoInicial.investido + tInvAll - tResAll;
    const patrimonio = saldoLivre + totalInvestido;

    document.getElementById('patrimonio-total').textContent = formatMoney(patrimonio);
    document.getElementById('saldo-livre').textContent = formatMoney(saldoLivre);
    document.getElementById('total-investido').textContent = formatMoney(totalInvestido);
    document.getElementById('total-receitas').textContent = '+ ' + formatMoney(tRec);
    document.getElementById('total-gastos').textContent = '- ' + formatMoney(tGas);
    document.getElementById('total-investido-mes').textContent = '→ ' + formatMoney(tInv);

    const ultimas = [...registros].sort((a, b) => {
        if (b.data !== a.data) return b.data.localeCompare(a.data);
        return (b.timestamp || 0) - (a.timestamp || 0);
    }).slice(0, 5);
    const listEl = document.getElementById('movimentacoes-list');
    if (ultimas.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>Nenhuma movimentação ainda.</p><p style="font-size:12px;">Toque no <strong>+</strong> para começar!</p></div>';
    } else {
        listEl.innerHTML = ultimas.map(r => renderMovItem(r)).join('');
        listEl.querySelectorAll('.mov-item').forEach(i => i.addEventListener('click', () => openDetalhe(i.dataset.id)));
    }
    await updateFixasPendentes();
    await updateOrcamentoPreview(tGas);
}

function renderMovItem(r) {
    const icon = getTipoIcon(r);
    let desc = r.descricao || '';
    if (!desc) {
        if (r.tipo === 'gasto') desc = getCategoriaInfo(r.categoria).label;
        else if (r.tipo === 'receita') desc = 'Receita';
        else if (r.tipo === 'investimento') desc = getInvestimentoInfo(r.tipoInvestimento).label;
        else if (r.tipo === 'resgate') desc = 'Resgate';
    }
    const meta = r.tipo === 'gasto' ? `${getCategoriaInfo(r.categoria).label} · ${formatDate(r.data)}` : r.tipo === 'investimento' ? `${getInvestimentoInfo(r.tipoInvestimento).label} · ${formatDate(r.data)}` : formatDate(r.data);
    const prefix = r.tipo === 'gasto' ? '- ' : r.tipo === 'receita' ? '+ ' : r.tipo === 'investimento' ? '→ ' : '← ';
    const futuroTag = (r.fixaRecorrente && r.data > getHojeString()) ? ' <span style="font-size:10px;opacity:0.6;">🔁</span>' : '';
    return `<div class="mov-item" data-id="${r.id}"><div class="mov-icon ${r.tipo}">${icon}</div><div class="mov-info"><div class="mov-desc">${desc}${futuroTag}</div><div class="mov-meta">${meta}</div></div><div class="mov-valor ${r.tipo}">${prefix}${formatMoney(r.valor)}</div></div>`;
}

// ===== FORMULÁRIO =====
let tipoRegistro = 'gasto';
let metodoSelecionado = 'credito';
let editingId = null;

function initFormulario() {
    document.querySelectorAll('.tipo-btn[data-tipo]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); tipoRegistro = btn.dataset.tipo; updateFormVisibility();
        });
    });
    document.querySelectorAll('#chips-metodo .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#chips-metodo .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active'); metodoSelecionado = chip.dataset.metodo;
        });
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
    const isG = tipoRegistro === 'gasto', isI = tipoRegistro === 'investimento', isR = tipoRegistro === 'resgate';
    document.getElementById('group-metodo').classList.toggle('hidden', isI || isR);
    document.getElementById('group-tipo-investimento').classList.toggle('hidden', !isI && !isR);
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
    if (tipo) {
        tipoRegistro = tipo;
        document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tipo-btn[data-tipo="${tipo}"]`)?.classList.add('active');
    }
    updateFormVisibility();
    navigateTo('screen-novo-registro');
}

async function salvarRegistro() {
    const valor = parseMoney(document.getElementById('input-valor').value);
    if (valor <= 0) { showToast('⚠️ Informe um valor válido'); return; }
    const data = document.getElementById('input-data').value;
    if (!data) { showToast('⚠️ Informe a data'); return; }
    const reg = { id: editingId || generateId(), tipo: tipoRegistro, valor, data, descricao: document.getElementById('input-descricao').value.trim(), nota: document.getElementById('input-nota').value.trim(), timestamp: Date.now() };
    if (tipoRegistro === 'gasto') { reg.categoria = document.getElementById('select-categoria').value; reg.metodo = metodoSelecionado; }
    else if (tipoRegistro === 'receita') { reg.metodo = metodoSelecionado; }
    else if (tipoRegistro === 'investimento' || tipoRegistro === 'resgate') { reg.tipoInvestimento = document.getElementById('select-tipo-investimento').value; }
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
    document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.getElementById('modal-btn-edit').addEventListener('click', editarRegistro);
    document.getElementById('modal-btn-delete').addEventListener('click', confirmarExclusao);
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-delete').addEventListener('click', excluirRegistro);
    document.getElementById('modal-confirm-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeConfirmModal(); });
}

async function openDetalhe(id) {
    const reg = await dbGet('registros', id); if (!reg) return; currentDetalheId = id;
    const body = document.getElementById('modal-body'); const icon = getTipoIcon(reg);
    const tipoLabel = reg.tipo.charAt(0).toUpperCase() + reg.tipo.slice(1);
    const prefix = reg.tipo === 'gasto' ? '- ' : reg.tipo === 'receita' ? '+ ' : reg.tipo === 'investimento' ? '→ ' : '← ';
    let html = `<div class="detalhe-valor-destaque ${reg.tipo}">${prefix}${formatMoney(reg.valor)}</div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Tipo</span><span class="detalhe-value">${icon} ${tipoLabel}</span></div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Data</span><span class="detalhe-value">${formatDate(reg.data)}</span></div>`;
    if (reg.descricao) html += `<div class="detalhe-row"><span class="detalhe-label">Descrição</span><span class="detalhe-value">${reg.descricao}</span></div>`;
    if (reg.categoria) html += `<div class="detalhe-row"><span class="detalhe-label">Categoria</span><span class="detalhe-value">${getCategoriaInfo(reg.categoria).icon} ${getCategoriaInfo(reg.categoria).label}</span></div>`;
    if (reg.metodo) html += `<div class="detalhe-row"><span class="detalhe-label">Método</span><span class="detalhe-value">${getMetodoInfo(reg.metodo)}</span></div>`;
    if (reg.tipoInvestimento) html += `<div class="detalhe-row"><span class="detalhe-label">Investimento</span><span class="detalhe-value">${getInvestimentoInfo(reg.tipoInvestimento).icon} ${getInvestimentoInfo(reg.tipoInvestimento).label}</span></div>`;
    if (reg.nota) html += `<div class="detalhe-row"><span class="detalhe-label">Nota</span><span class="detalhe-value">${reg.nota}</span></div>`;
    if (reg.fixaRecorrente) html += `<div class="detalhe-row"><span class="detalhe-label">Origem</span><span class="detalhe-value">🔁 Fixa recorrente</span></div>`;
    body.innerHTML = html;
    document.getElementById('modal-title').textContent = 'Detalhes';
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

async function editarRegistro() {
    if (!currentDetalheId) return; const reg = await dbGet('registros', currentDetalheId); if (!reg) return;
    closeModal(); editingId = reg.id; tipoRegistro = reg.tipo;
    document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tipo-btn[data-tipo="${reg.tipo}"]`)?.classList.add('active');
    document.getElementById('input-valor').value = Number(reg.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('input-descricao').value = reg.descricao || '';
    document.getElementById('input-data').value = reg.data;
    document.getElementById('input-nota').value = reg.nota || '';
    if (reg.categoria) document.getElementById('select-categoria').value = reg.categoria;
    if (reg.metodo) { metodoSelecionado = reg.metodo; document.querySelectorAll('#chips-metodo .chip').forEach(c => c.classList.remove('active')); document.querySelector(`#chips-metodo .chip[data-metodo="${reg.metodo}"]`)?.classList.add('active'); }
    if (reg.tipoInvestimento) document.getElementById('select-tipo-investimento').value = reg.tipoInvestimento;
    updateFormVisibility();
    document.getElementById('titulo-registro').textContent = 'Editar Registro';
    document.getElementById('btn-salvar').textContent = '💾 Atualizar';
    navigateTo('screen-novo-registro');
}

function confirmarExclusao() {
    pendingDeleteId = currentDetalheId; closeModal();
    document.getElementById('confirm-text').textContent = 'Excluir este registro?';
    document.getElementById('confirm-delete').onclick = excluirRegistro;
    document.getElementById('modal-confirm-overlay').classList.add('open');
}

function closeConfirmModal() { document.getElementById('modal-confirm-overlay').classList.remove('open'); pendingDeleteId = null; }

async function excluirRegistro() {
    if (!pendingDeleteId) return;
    await dbDelete('registros', pendingDeleteId);
    closeConfirmModal(); showToast('🗑️ Registro excluído');
    currentDetalheId = null; pendingDeleteId = null;
    updateDashboard();
    if (currentScreen === 'screen-historico') updateHistorico();
}

// ===== HISTÓRICO =====
let filtroTipo = 'todos', filtroMes = new Date().getMonth(), filtroAno = new Date().getFullYear(), filtroTodosMeses = false;

function initHistorico() {
    document.querySelectorAll('.filtro-chip[data-filtro-tipo]').forEach(c => {
        c.addEventListener('click', () => {
            document.querySelectorAll('.filtro-chip[data-filtro-tipo]').forEach(x => x.classList.remove('active'));
            c.classList.add('active'); filtroTipo = c.dataset.filtroTipo; updateHistorico();
        });
    });
    document.getElementById('filtro-mes-prev').addEventListener('click', () => { filtroTodosMeses = false; filtroMes--; if (filtroMes < 0) { filtroMes = 11; filtroAno--; } updateHistorico(); });
    document.getElementById('filtro-mes-next').addEventListener('click', () => { filtroTodosMeses = false; filtroMes++; if (filtroMes > 11) { filtroMes = 0; filtroAno++; } updateHistorico(); });
    document.getElementById('filtro-todos-meses').addEventListener('click', () => { filtroTodosMeses = !filtroTodosMeses; updateHistorico(); });
}

async function updateHistorico() {
    const registros = await dbGetAll('registros');
    document.getElementById('filtro-mes-label').textContent = `${getMonthName(filtroMes)} ${filtroAno}`;
    document.getElementById('filtro-todos-meses').classList.toggle('active', filtroTodosMeses);
    let filtered = registros;
    if (!filtroTodosMeses) filtered = filtered.filter(r => { const [y, m] = r.data.split('-').map(Number); return y === filtroAno && (m - 1) === filtroMes; });
    if (filtroTipo !== 'todos') filtered = filtered.filter(r => r.tipo === filtroTipo);
    filtered.sort((a, b) => { if (b.data !== a.data) return b.data.localeCompare(a.data); return (b.timestamp || 0) - (a.timestamp || 0); });
    let soma = 0; filtered.forEach(r => { if (r.tipo === 'receita' || r.tipo === 'resgate') soma += r.valor; else soma -= r.valor; });
    document.getElementById('historico-count').textContent = `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`;
    document.getElementById('historico-soma').textContent = `Saldo: ${formatMoney(soma)}`;
    const listEl = document.getElementById('historico-list');
    if (filtered.length === 0) { listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>Nenhuma movimentação encontrada.</p></div>'; return; }
    const groups = {}; filtered.forEach(r => { if (!groups[r.data]) groups[r.data] = []; groups[r.data].push(r); });
    let html = ''; Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => { html += `<div class="historico-grupo"><div class="historico-grupo-header">${formatDate(date)}</div>${groups[date].map(r => renderMovItem(r)).join('')}</div>`; });
    listEl.innerHTML = html;
    listEl.querySelectorAll('.mov-item').forEach(i => i.addEventListener('click', () => openDetalhe(i.dataset.id)));
}

// ===== TEMA =====
function initTheme() {
    const toggleDark = document.getElementById('toggle-dark-mode');
    const toggleAuto = document.getElementById('toggle-auto-theme');
    const autoDesc = document.getElementById('theme-auto-desc');
    if (!toggleDark || !toggleAuto) return;
    loadThemePreference().then(prefs => {
        const isAuto = prefs.auto !== false;
        toggleAuto.checked = isAuto;
        if (isAuto) { const sd = window.matchMedia('(prefers-color-scheme: dark)').matches; toggleDark.checked = sd; toggleDark.disabled = true; if (autoDesc) autoDesc.textContent = 'Acompanha o sistema'; applyTheme(sd); }
        else { toggleDark.checked = prefs.dark === true; toggleDark.disabled = false; if (autoDesc) autoDesc.textContent = 'Manual'; applyTheme(prefs.dark === true); }
    });
    toggleDark.addEventListener('change', () => { if (toggleDark.disabled) return; applyTheme(toggleDark.checked); saveThemePreference({ auto: false, dark: toggleDark.checked }); });
    toggleAuto.addEventListener('change', () => {
        const isAuto = toggleAuto.checked;
        if (isAuto) { const sd = window.matchMedia('(prefers-color-scheme: dark)').matches; toggleDark.checked = sd; toggleDark.disabled = true; if (autoDesc) autoDesc.textContent = 'Acompanha o sistema'; applyTheme(sd); saveThemePreference({ auto: true, dark: sd }); }
        else { toggleDark.disabled = false; if (autoDesc) autoDesc.textContent = 'Manual'; saveThemePreference({ auto: false, dark: toggleDark.checked }); }
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => { if (toggleAuto && toggleAuto.checked) { toggleDark.checked = e.matches; applyTheme(e.matches); saveThemePreference({ auto: true, dark: e.matches }); } });
}
function applyTheme(dark) { if (dark) { document.documentElement.setAttribute('data-theme', 'dark'); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#121a16'); } else { document.documentElement.removeAttribute('data-theme'); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#2d8659'); } }
async function applyThemeFromSaved() { const p = await loadThemePreference(); if (p.auto !== false) applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches); else applyTheme(p.dark === true); }
async function loadThemePreference() { try { const c = await dbGet('config', 'theme'); if (c && c.valor) return c.valor; } catch (e) { } return { auto: true, dark: false }; }
async function saveThemePreference(p) { try { await dbPut('config', { chave: 'theme', valor: p }); } catch (e) { } }

// ===== METAS =====
let currentMetaCategoria = null;

async function initMetas() {
    applyMoneyMask(document.getElementById('input-orcamento-geral'));
    applyMoneyMask(document.getElementById('input-meta-valor'));
    document.getElementById('btn-salvar-orcamento').addEventListener('click', async () => {
        const v = parseMoney(document.getElementById('input-orcamento-geral').value);
        await dbPut('config', { chave: 'orcamento-geral', valor: v }); showToast('✅ Orçamento salvo!'); updateMetas();
    });
    document.getElementById('modal-meta-close').addEventListener('click', closeMetaModal);
    document.getElementById('modal-meta-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeMetaModal(); });
    document.getElementById('meta-btn-salvar').addEventListener('click', salvarMeta);
    document.getElementById('meta-btn-remover').addEventListener('click', removerMeta);
}
function closeMetaModal() { document.getElementById('modal-meta-overlay').classList.remove('open'); }

async function updateMetas() {
    const registros = await dbGetAll('registros');
    const now = new Date(); const mesAtual = now.getMonth(); const anoAtual = now.getFullYear();
    const orcConfig = await dbGet('config', 'orcamento-geral'); const orcamento = orcConfig ? orcConfig.valor : 0;
    if (orcamento > 0) document.getElementById('input-orcamento-geral').value = Number(orcamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    let totalGastosMes = 0; const gastosPorCat = {};
    registros.forEach(r => { const [y, m] = r.data.split('-').map(Number); if (r.tipo === 'gasto' && y === anoAtual && (m - 1) === mesAtual) { totalGastosMes += r.valor; gastosPorCat[r.categoria] = (gastosPorCat[r.categoria] || 0) + r.valor; } });
    const statusEl = document.getElementById('orcamento-status');
    if (orcamento > 0) { const pct = (totalGastosMes / orcamento) * 100; const lv = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'safe'; statusEl.innerHTML = renderProgress('Gasto do mês', totalGastosMes, orcamento, pct, lv); } else statusEl.innerHTML = '';
    const cats = categoriasCache.map(c => c.id);
    const metasConfig = await dbGet('config', 'metas-categorias'); const metas = metasConfig ? metasConfig.valor : {};
    document.getElementById('metas-categorias-list').innerHTML = cats.map(cat => { const info = getCategoriaInfo(cat); const meta = metas[cat] || 0; const gasto = gastosPorCat[cat] || 0; const hm = meta > 0; return `<div class="meta-cat-item" data-cat="${cat}"><span class="meta-cat-icon">${info.icon}</span><div class="meta-cat-info"><div class="meta-cat-name">${info.label}</div><div class="meta-cat-status">${hm ? `${formatMoney(gasto)} / ${formatMoney(meta)}` : 'Sem meta definida'}</div></div>${hm ? `<span class="meta-cat-valor">${Math.round((gasto / meta) * 100)}%</span>` : ''}<span class="meta-cat-arrow">→</span></div>`; }).join('');
    document.querySelectorAll('.meta-cat-item').forEach(i => i.addEventListener('click', () => openMetaModal(i.dataset.cat)));
    const resumoEl = document.getElementById('metas-resumo-list');
    const metasAtivas = cats.filter(c => metas[c] > 0);
    if (metasAtivas.length === 0 && orcamento <= 0) { resumoEl.innerHTML = '<div class="empty-state"><span class="empty-icon">🎯</span><p>Defina metas para acompanhar</p></div>'; }
    else {
        let html = '';
        if (orcamento > 0) { const pct = (totalGastosMes / orcamento) * 100; const lv = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'safe'; html += `<div class="meta-resumo-item">${renderProgress('💰 Orçamento Geral', totalGastosMes, orcamento, pct, lv)}</div>`; }
        metasAtivas.forEach(cat => { const info = getCategoriaInfo(cat); const g = gastosPorCat[cat] || 0; const mt = metas[cat]; const pct = (g / mt) * 100; const lv = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'safe'; html += `<div class="meta-resumo-item">${renderProgress(info.icon + ' ' + info.label, g, mt, pct, lv)}</div>`; });
        resumoEl.innerHTML = html;
    }
}
function renderProgress(label, gasto, meta, pct, level) { const rest = meta - gasto; let alert = ''; if (pct >= 100) alert = `<div class="progress-alert danger">🚨 Ultrapassado em ${formatMoney(Math.abs(rest))}</div>`; else if (pct >= 75) alert = `<div class="progress-alert warning">⚠️ Restam ${formatMoney(rest)}</div>`; return `<div class="progress-container"><div class="progress-header"><span class="progress-label">${label}</span><span class="progress-values"><strong>${formatMoney(gasto)}</strong> / ${formatMoney(meta)}</span></div><div class="progress-bar"><div class="progress-fill ${level}" style="width:${Math.min(pct, 100)}%"></div></div><div class="progress-percent ${level}">${pct.toFixed(0)}%</div>${alert}</div>`; }

async function openMetaModal(cat) {
    currentMetaCategoria = cat; const info = getCategoriaInfo(cat);
    document.getElementById('modal-meta-title').textContent = `${info.icon} Meta: ${info.label}`;
    document.getElementById('meta-modal-desc').textContent = `Limite mensal para ${info.label}`;
    const mc = await dbGet('config', 'metas-categorias'); const metas = mc ? mc.valor : {};
    const v = metas[cat] || 0;
    document.getElementById('input-meta-valor').value = v > 0 ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
    document.getElementById('modal-meta-overlay').classList.add('open');
}
async function salvarMeta() { const v = parseMoney(document.getElementById('input-meta-valor').value); const mc = await dbGet('config', 'metas-categorias'); const metas = mc ? mc.valor : {}; metas[currentMetaCategoria] = v; await dbPut('config', { chave: 'metas-categorias', valor: metas }); closeMetaModal(); showToast('✅ Meta salva!'); updateMetas(); }
async function removerMeta() { const mc = await dbGet('config', 'metas-categorias'); const metas = mc ? mc.valor : {}; delete metas[currentMetaCategoria]; await dbPut('config', { chave: 'metas-categorias', valor: metas }); closeMetaModal(); showToast('🗑️ Meta removida'); updateMetas(); }

async function updateOrcamentoPreview(totalGastosMes) {
    const orcConfig = await dbGet('config', 'orcamento-geral'); const orcamento = orcConfig ? orcConfig.valor : 0;
    const metasConfig = await dbGet('config', 'metas-categorias'); const metas = metasConfig ? metasConfig.valor : {}; const hasMetas = Object.values(metas).some(v => v > 0);
    const cardEl = document.getElementById('card-orcamento');
    if (orcamento <= 0 && !hasMetas) { cardEl.style.display = 'none'; return; } cardEl.style.display = '';
    if (orcamento > 0) { const pct = (totalGastosMes / orcamento) * 100; const lv = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'safe'; document.getElementById('orcamento-geral').innerHTML = renderProgress('Orçamento Geral', totalGastosMes, orcamento, pct, lv); } else document.getElementById('orcamento-geral').innerHTML = '';
    const previewEl = document.getElementById('metas-preview'); const registros = await dbGetAll('registros'); const now = new Date(); const gastosPorCat = {};
    registros.forEach(r => { const [y, m] = r.data.split('-').map(Number); if (r.tipo === 'gasto' && y === now.getFullYear() && (m - 1) === now.getMonth()) gastosPorCat[r.categoria] = (gastosPorCat[r.categoria] || 0) + r.valor; });
    const metasAtivas = Object.entries(metas).filter(([_, v]) => v > 0);
    if (metasAtivas.length === 0) { previewEl.innerHTML = ''; return; }
    previewEl.innerHTML = metasAtivas.slice(0, 3).map(([cat, meta]) => { const info = getCategoriaInfo(cat); const g = gastosPorCat[cat] || 0; const pct = Math.min((g / meta) * 100, 100); const lv = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'safe'; return `<div class="meta-preview-item"><span class="meta-preview-icon">${info.icon}</span><div class="meta-preview-info"><div class="meta-preview-name">${info.label}</div><div class="meta-preview-bar"><div class="meta-preview-fill ${lv}" style="width:${pct}%"></div></div></div><span class="meta-preview-valor">${formatMoney(g)}</span></div>`; }).join('');
}

// ===== FIXAS =====
let filtroFixaTipo = 'todos', editingFixaId = null, currentFixaDetalheId = null;

function initFixas() {
    applyMoneyMask(document.getElementById('input-fixa-valor'));
    document.querySelectorAll('[data-filtro-fixa]').forEach(c => { c.addEventListener('click', () => { document.querySelectorAll('[data-filtro-fixa]').forEach(x => x.classList.remove('active')); c.classList.add('active'); filtroFixaTipo = c.dataset.filtroFixa; updateFixas(); }); });
    document.querySelectorAll('#chips-fixa-tipo .chip').forEach(c => { c.addEventListener('click', () => { document.querySelectorAll('#chips-fixa-tipo .chip').forEach(x => x.classList.remove('active')); c.classList.add('active'); const t = c.dataset.fixaTipo; document.getElementById('group-fixa-categoria').classList.toggle('hidden', t !== 'gasto'); document.getElementById('group-fixa-tipo-inv').classList.toggle('hidden', t !== 'investimento'); document.getElementById('group-fixa-metodo').classList.toggle('hidden', t === 'investimento'); }); });
    const sel = document.getElementById('select-fixa-dia'); for (let i = 1; i <= 31; i++) { const o = document.createElement('option'); o.value = i; o.textContent = `Dia ${i}`; sel.appendChild(o); }
    document.getElementById('btn-nova-fixa').addEventListener('click', () => openFixaModal());
    document.getElementById('modal-fixa-close').addEventListener('click', closeFixaModal);
    document.getElementById('modal-fixa-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFixaModal(); });
    document.getElementById('fixa-btn-cancelar').addEventListener('click', closeFixaModal);
    document.getElementById('fixa-btn-salvar').addEventListener('click', salvarFixa);
    document.getElementById('modal-fixa-detalhe-close').addEventListener('click', closeFixaDetalhe);
    document.getElementById('modal-fixa-detalhe-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFixaDetalhe(); });
    document.getElementById('fixa-detalhe-btn-edit').addEventListener('click', editarFixa);
    document.getElementById('fixa-detalhe-btn-delete').addEventListener('click', excluirFixa);
    document.getElementById('btn-aplicar-todas')?.addEventListener('click', aplicarTodasFixas);
    document.getElementById('btn-aplicar-fixas-dash')?.addEventListener('click', async () => { await aplicarTodasFixas(); await updateDashboard(); });
}

function openFixaModal(fixa) {
    editingFixaId = fixa ? fixa.id : null;
    document.getElementById('modal-fixa-title').textContent = fixa ? 'Editar Fixa' : 'Nova Fixa';
    if (fixa) {
        document.getElementById('input-fixa-desc').value = fixa.descricao;
        document.getElementById('input-fixa-valor').value = Number(fixa.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.getElementById('select-fixa-dia').value = fixa.dia;
        document.querySelectorAll('#chips-fixa-tipo .chip').forEach(c => c.classList.remove('active'));
        document.querySelector(`#chips-fixa-tipo .chip[data-fixa-tipo="${fixa.tipo}"]`)?.classList.add('active');
        if (fixa.categoria) document.getElementById('select-fixa-categoria').value = fixa.categoria;
        if (fixa.tipoInvestimento) document.getElementById('select-fixa-tipo-inv').value = fixa.tipoInvestimento;
        if (fixa.metodo) document.getElementById('select-fixa-metodo').value = fixa.metodo;
        document.getElementById('group-fixa-categoria').classList.toggle('hidden', fixa.tipo !== 'gasto');
        document.getElementById('group-fixa-tipo-inv').classList.toggle('hidden', fixa.tipo !== 'investimento');
        document.getElementById('group-fixa-metodo').classList.toggle('hidden', fixa.tipo === 'investimento');
    } else {
        document.getElementById('input-fixa-desc').value = ''; document.getElementById('input-fixa-valor').value = ''; document.getElementById('select-fixa-dia').value = '1';
        document.querySelectorAll('#chips-fixa-tipo .chip').forEach(c => c.classList.remove('active'));
        document.querySelector('#chips-fixa-tipo .chip[data-fixa-tipo="receita"]').classList.add('active');
        document.getElementById('group-fixa-categoria').classList.add('hidden');
        document.getElementById('group-fixa-tipo-inv').classList.add('hidden');
        document.getElementById('group-fixa-metodo').classList.remove('hidden');
    }
    document.getElementById('modal-fixa-overlay').classList.add('open');
}
function closeFixaModal() { document.getElementById('modal-fixa-overlay').classList.remove('open'); editingFixaId = null; }
function closeFixaDetalhe() { document.getElementById('modal-fixa-detalhe-overlay').classList.remove('open'); currentFixaDetalheId = null; }

async function salvarFixa() {
    const desc = document.getElementById('input-fixa-desc').value.trim();
    const valor = parseMoney(document.getElementById('input-fixa-valor').value);
    if (!desc) { showToast('⚠️ Informe a descrição'); return; }
    if (valor <= 0) { showToast('⚠️ Informe um valor válido'); return; }
    const ta = document.querySelector('#chips-fixa-tipo .chip.active');
    const tipo = ta ? ta.dataset.fixaTipo : 'receita';
    const fixa = { id: editingFixaId || generateId(), tipo, descricao: desc, valor, dia: parseInt(document.getElementById('select-fixa-dia').value), ativa: true };
    if (tipo === 'gasto') { fixa.categoria = document.getElementById('select-fixa-categoria').value; fixa.metodo = document.getElementById('select-fixa-metodo').value; }
    else if (tipo === 'investimento') { fixa.tipoInvestimento = document.getElementById('select-fixa-tipo-inv').value; }
    else { fixa.metodo = document.getElementById('select-fixa-metodo').value; }
    if (editingFixaId) await removerRegistrosFuturosFixa(editingFixaId);
    await dbPut('fixas', fixa);
    await gerarRegistrosRecorrentes(fixa);
    closeFixaModal();
    showToast(editingFixaId ? '✅ Fixa atualizada!' : '✅ Fixa cadastrada com recorrência!');
    await updateFixas();
    if (currentScreen === 'screen-dashboard') await updateDashboard();
}

async function gerarRegistrosRecorrentes(fixa, meses = 12) {
    const now = new Date(); const registros = await dbGetAll('registros');
    for (let i = 0; i < meses; i++) {
        const mes = (now.getMonth() + i) % 12;
        const ano = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const dia = Math.min(fixa.dia, diasNoMes);
        const ds = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const jaExiste = registros.some(r => { if (r.fixaId !== fixa.id) return false; const [ry, rm] = r.data.split('-').map(Number); return ry === ano && (rm - 1) === mes; });
        if (jaExiste) continue;
        const reg = { id: generateId(), tipo: fixa.tipo, valor: fixa.valor, data: ds, descricao: fixa.descricao, fixaId: fixa.id, fixaRecorrente: true, timestamp: Date.now() };
        if (fixa.tipo === 'gasto') { reg.categoria = fixa.categoria; reg.metodo = fixa.metodo; }
        if (fixa.tipo === 'receita') { reg.metodo = fixa.metodo; }
        if (fixa.tipo === 'investimento') { reg.tipoInvestimento = fixa.tipoInvestimento; }
        await dbAdd('registros', reg);
    }
}

async function removerRegistrosFuturosFixa(fixaId) { const registros = await dbGetAll('registros'); const hoje = getHojeString(); for (const r of registros) { if (r.fixaId === fixaId && r.fixaRecorrente && r.data > hoje) await dbDelete('registros', r.id); } }
async function findRegistroByFixaId(fid) { const regs = await dbGetAll('registros'); const now = new Date(); return regs.find(r => { if (r.fixaId !== fid) return false; const [y, m] = r.data.split('-').map(Number); return y === now.getFullYear() && (m - 1) === now.getMonth(); }); }
async function aplicarFixaIndividual(fixa) { await gerarRegistrosRecorrentes(fixa, 12); }
async function reverterFixaIndividual(fid) { const registros = await dbGetAll('registros'); for (const r of registros) { if (r.fixaId === fid && r.fixaRecorrente) await dbDelete('registros', r.id); } }

async function aplicarTodasFixas() {
    const fixas = await dbGetAll('fixas');
    for (const fixa of fixas.filter(f => f.ativa !== false)) await gerarRegistrosRecorrentes(fixa, 12);
    showToast('✅ Todas as fixas aplicadas!');
    await updateFixas();
    if (currentScreen === 'screen-dashboard') await updateDashboard();
}

async function openFixaDetalhe(id) {
    const fixa = await dbGet('fixas', id); if (!fixa) return; currentFixaDetalheId = id;
    const isAp = !!(await findRegistroByFixaId(fixa.id));
    const now = new Date(); const mesLabel = getMonthName(now.getMonth()) + ' ' + now.getFullYear();
    const body = document.getElementById('modal-fixa-detalhe-body');
    let html = `<div class="detalhe-valor-destaque ${fixa.tipo}">${formatMoney(fixa.valor)}</div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Descrição</span><span class="detalhe-value">${fixa.descricao}</span></div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Tipo</span><span class="detalhe-value">${fixa.tipo.charAt(0).toUpperCase() + fixa.tipo.slice(1)}</span></div>`;
    html += `<div class="detalhe-row"><span class="detalhe-label">Dia</span><span class="detalhe-value">Todo dia ${fixa.dia}</span></div>`;
    if (fixa.categoria) html += `<div class="detalhe-row"><span class="detalhe-label">Categoria</span><span class="detalhe-value">${getCategoriaInfo(fixa.categoria).icon} ${getCategoriaInfo(fixa.categoria).label}</span></div>`;
    if (fixa.metodo) html += `<div class="detalhe-row"><span class="detalhe-label">Método</span><span class="detalhe-value">${getMetodoInfo(fixa.metodo)}</span></div>`;
    if (fixa.tipoInvestimento) html += `<div class="detalhe-row"><span class="detalhe-label">Investimento</span><span class="detalhe-value">${getInvestimentoInfo(fixa.tipoInvestimento).icon} ${getInvestimentoInfo(fixa.tipoInvestimento).label}</span></div>`;
    const badge = isAp ? '<span class="fixa-status-badge aplicada">✅ Aplicada</span>' : '<span class="fixa-status-badge pendente">⏳ Pendente</span>';
    html += `<div class="detalhe-row"><span class="detalhe-label">Status (${mesLabel})</span><span class="detalhe-value">${badge}</span></div>`;
    if (isAp) html += `<button class="btn-toggle-status btn-reverter" id="btn-toggle-fixa-status">↩️ Reverter (remover todos)</button>`;
    else html += `<button class="btn-toggle-status btn-aplicar-individual" id="btn-toggle-fixa-status">✅ Aplicar (12 meses)</button>`;
    body.innerHTML = html;
    document.getElementById('modal-fixa-detalhe-title').textContent = fixa.descricao;
    document.getElementById('modal-fixa-detalhe-overlay').classList.add('open');
    document.getElementById('btn-toggle-fixa-status').addEventListener('click', async () => {
        if (isAp) { await reverterFixaIndividual(fixa.id); showToast(`↩️ "${fixa.descricao}" revertida`); }
        else { await aplicarFixaIndividual(fixa); showToast(`✅ "${fixa.descricao}" aplicada!`); }
        closeFixaDetalhe(); await updateFixas(); if (currentScreen === 'screen-dashboard') await updateDashboard();
    });
}

async function editarFixa() { if (!currentFixaDetalheId) return; const f = await dbGet('fixas', currentFixaDetalheId); closeFixaDetalhe(); if (f) openFixaModal(f); }
async function excluirFixa() {
    if (!currentFixaDetalheId) return;
    await removerRegistrosFuturosFixa(currentFixaDetalheId);
    const registros = await dbGetAll('registros');
    for (const r of registros) { if (r.fixaId === currentFixaDetalheId && r.fixaRecorrente) await dbDelete('registros', r.id); }
    await dbDelete('fixas', currentFixaDetalheId);
    closeFixaDetalhe(); showToast('🗑️ Fixa excluída'); updateFixas();
    if (currentScreen === 'screen-dashboard') await updateDashboard();
}

async function updateFixas() {
    const fixas = await dbGetAll('fixas'); const now = new Date(); const mesAtual = now.getMonth(); const anoAtual = now.getFullYear();
    const registros = await dbGetAll('registros');
    const aplicadas = new Set(); registros.forEach(r => { if (r.fixaId) { const [y, m] = r.data.split('-').map(Number); if (y === anoAtual && (m - 1) === mesAtual) aplicadas.add(r.fixaId); } });
    let filtered = fixas.filter(f => f.ativa !== false); if (filtroFixaTipo !== 'todos') filtered = filtered.filter(f => f.tipo === filtroFixaTipo);
    const listEl = document.getElementById('fixas-list');
    if (filtered.length === 0) listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">🔁</span><p>Nenhuma fixa cadastrada.</p></div>';
    else {
        listEl.innerHTML = filtered.map(f => { const isAp = aplicadas.has(f.id); const badge = isAp ? '<span class="fixa-status-badge aplicada">✅</span>' : '<span class="fixa-status-badge pendente">⏳</span>'; return `<div class="fixa-item" data-id="${f.id}"><div class="fixa-icon ${f.tipo}">${f.tipo === 'gasto' ? getCategoriaInfo(f.categoria).icon : f.tipo === 'investimento' ? getInvestimentoInfo(f.tipoInvestimento).icon : '💵'}</div><div class="fixa-info"><div class="fixa-desc">${f.descricao}</div><div class="fixa-meta">Dia ${f.dia} · ${badge}</div></div><div class="fixa-valor ${f.tipo}">${formatMoney(f.valor)}</div></div>`; }).join('');
        listEl.querySelectorAll('.fixa-item').forEach(i => i.addEventListener('click', () => openFixaDetalhe(i.dataset.id)));
    }
    const todas = fixas.filter(f => f.ativa !== false);
    const tR = todas.filter(f => f.tipo === 'receita').reduce((s, f) => s + f.valor, 0);
    const tG = todas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.valor, 0);
    const tI = todas.filter(f => f.tipo === 'investimento').reduce((s, f) => s + f.valor, 0);
    document.getElementById('fixas-totais').innerHTML = `<div class="fixas-total-row"><span class="fixas-total-label">Receitas fixas</span><span class="fixas-total-valor receita">+ ${formatMoney(tR)}</span></div><div class="fixas-total-row"><span class="fixas-total-label">Gastos fixos</span><span class="fixas-total-valor gasto">- ${formatMoney(tG)}</span></div>${tI > 0 ? `<div class="fixas-total-row"><span class="fixas-total-label">Invest. fixos</span><span class="fixas-total-valor investimento">→ ${formatMoney(tI)}</span></div>` : ''}<div class="fixas-total-row"><span class="fixas-total-label"><strong>Saldo fixo</strong></span><span class="fixas-total-valor">${formatMoney(tR - tG - tI)}</span></div>`;
    const pends = todas.filter(f => !aplicadas.has(f.id));
    const cardPF = document.getElementById('card-fixas-pend-full');
    if (pends.length > 0) {
        cardPF.style.display = '';
        document.getElementById('fixas-pend-full-list').innerHTML = pends.map(f => `<div class="fixa-pend-item" data-id="${f.id}"><span class="fixa-pend-icon">${f.tipo === 'gasto' ? getCategoriaInfo(f.categoria).icon : f.tipo === 'investimento' ? getInvestimentoInfo(f.tipoInvestimento).icon : '💵'}</span><span class="fixa-pend-desc">${f.descricao}</span><span class="fixa-pend-valor ${f.tipo}">${formatMoney(f.valor)}</span><span class="fixa-pend-aplicar">Aplicar →</span></div>`).join('');
        document.getElementById('fixas-pend-full-list').querySelectorAll('.fixa-pend-item').forEach(el => { el.addEventListener('click', async () => { const fx = fixas.find(f => f.id === el.dataset.id); if (fx) { await aplicarFixaIndividual(fx); showToast(`✅ "${fx.descricao}" aplicada!`); await updateFixas(); } }); });
    } else cardPF.style.display = 'none';
}

async function updateFixasPendentes() {
    const fixas = await dbGetAll('fixas'); const registros = await dbGetAll('registros'); const now = new Date();
    const aplicadas = new Set(); registros.forEach(r => { if (r.fixaId) { const [y, m] = r.data.split('-').map(Number); if (y === now.getFullYear() && (m - 1) === now.getMonth()) aplicadas.add(r.fixaId); } });
    const pends = fixas.filter(f => f.ativa !== false && !aplicadas.has(f.id));
    const cardEl = document.getElementById('card-fixas-pendentes');
    if (pends.length === 0) { cardEl.style.display = 'none'; return; }
    cardEl.style.display = '';
    document.getElementById('fixas-pendentes-list').innerHTML = pends.slice(0, 4).map(f => `<div class="fixa-pend-item" data-id="${f.id}"><span class="fixa-pend-icon">${f.tipo === 'gasto' ? getCategoriaInfo(f.categoria).icon : f.tipo === 'investimento' ? getInvestimentoInfo(f.tipoInvestimento).icon : '💵'}</span><span class="fixa-pend-desc">${f.descricao}</span><span class="fixa-pend-valor ${f.tipo}">${formatMoney(f.valor)}</span><span class="fixa-pend-aplicar">Aplicar →</span></div>`).join('');
    document.getElementById('fixas-pendentes-list').querySelectorAll('.fixa-pend-item').forEach(el => { el.addEventListener('click', async () => { const fx = fixas.find(f => f.id === el.dataset.id); if (fx) { await aplicarFixaIndividual(fx); showToast(`✅ "${fx.descricao}" aplicada!`); await updateFixasPendentes(); await updateDashboard(); } }); });
}

// ===== GRÁFICOS =====
let graficoMes = new Date().getMonth(), graficoAno = new Date().getFullYear();

function initGraficos() {
    document.getElementById('grafico-mes-prev').addEventListener('click', () => { graficoMes--; if (graficoMes < 0) { graficoMes = 11; graficoAno--; } updateGraficos(); });
    document.getElementById('grafico-mes-next').addEventListener('click', () => { graficoMes++; if (graficoMes > 11) { graficoMes = 0; graficoAno++; } updateGraficos(); });
}

async function updateGraficos() {
    const registros = await dbGetAll('registros');
    document.getElementById('grafico-mes-label').textContent = `${getMonthName(graficoMes)} ${graficoAno}`;
    const doMes = registros.filter(r => { const [y, m] = r.data.split('-').map(Number); return y === graficoAno && (m - 1) === graficoMes; });
    let tRec = 0, tGas = 0, tInv = 0;
    doMes.forEach(r => { if (r.tipo === 'receita') tRec += r.valor; if (r.tipo === 'gasto') tGas += r.valor; if (r.tipo === 'investimento') tInv += r.valor; });

    const maxVal = Math.max(tRec, tGas, tInv, 1);
    const saldo = tRec - tGas - tInv;
    document.getElementById('grafico-balanco').innerHTML = `<div class="balanco-row"><span class="balanco-icon">💵</span><div class="balanco-info"><span class="balanco-label">Receitas</span><div class="balanco-bar-bg"><div class="balanco-bar-fill receita" style="width:${(tRec / maxVal) * 100}%"></div></div></div><span class="balanco-valor receita">${formatMoney(tRec)}</span></div><div class="balanco-row"><span class="balanco-icon">💸</span><div class="balanco-info"><span class="balanco-label">Gastos</span><div class="balanco-bar-bg"><div class="balanco-bar-fill gasto" style="width:${(tGas / maxVal) * 100}%"></div></div></div><span class="balanco-valor gasto">${formatMoney(tGas)}</span></div><div class="balanco-row"><span class="balanco-icon">📈</span><div class="balanco-info"><span class="balanco-label">Investido</span><div class="balanco-bar-bg"><div class="balanco-bar-fill investimento" style="width:${(tInv / maxVal) * 100}%"></div></div></div><span class="balanco-valor investimento">${formatMoney(tInv)}</span></div><div class="balanco-saldo"><span class="balanco-saldo-label">Saldo do Mês</span><span class="balanco-saldo-valor ${saldo >= 0 ? 'positivo' : 'negativo'}">${formatMoney(saldo)}</span></div>`;

    const gastosPorCat = {};
    doMes.filter(r => r.tipo === 'gasto').forEach(r => { gastosPorCat[r.categoria] = (gastosPorCat[r.categoria] || 0) + r.valor; });
    const pizzaContainer = document.getElementById('grafico-pizza-container');
    const catEntries = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]);
    if (catEntries.length === 0) pizzaContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🥧</span><p>Sem gastos neste mês</p></div>';
    else {
        const colors = ['#2d8659', '#d9534f', '#7c4dff', '#f9a825', '#00bcd4', '#e91e63', '#4caf50', '#ff9800', '#607d8b', '#9c27b0'];
        let cumPct = 0;
        const slices = catEntries.map(([cat, val], i) => { const pct = (val / tGas) * 100; const start = cumPct; cumPct += pct; return { cat, val, pct, start, color: colors[i % colors.length] }; });
        let svgSlices = ''; slices.forEach(s => { svgSlices += `<circle cx="50" cy="50" r="40" fill="none" stroke="${s.color}" stroke-width="20" stroke-dasharray="${s.pct} ${100 - s.pct}" stroke-dashoffset="${25 - s.start}"/>`; });
        const legendaHtml = slices.map(s => { const info = getCategoriaInfo(s.cat); return `<div class="pizza-legenda-item"><span class="pizza-legenda-dot" style="background:${s.color}"></span><span class="pizza-legenda-label">${info.icon} ${info.label}</span><span class="pizza-legenda-valor">${formatMoney(s.val)}</span><span class="pizza-legenda-pct">${s.pct.toFixed(0)}%</span></div>`; }).join('');
        pizzaContainer.innerHTML = `<div class="pizza-wrapper"><div class="pizza-svg-container"><svg viewBox="0 0 100 100">${svgSlices}</svg></div><div class="pizza-legenda">${legendaHtml}</div></div>`;
    }

    const barrasContainer = document.getElementById('grafico-barras-container');
    const meses6 = [];
    for (let i = 5; i >= 0; i--) { let mm = graficoMes - i, yy = graficoAno; if (mm < 0) { mm += 12; yy--; } let rec = 0, gas = 0, inv = 0; registros.forEach(r => { const [ry, rm] = r.data.split('-').map(Number); if (ry === yy && (rm - 1) === mm) { if (r.tipo === 'receita') rec += r.valor; if (r.tipo === 'gasto') gas += r.valor; if (r.tipo === 'investimento') inv += r.valor; } }); meses6.push({ label: getMonthShort(mm), rec, gas, inv }); }
    const maxBarra = Math.max(...meses6.flatMap(m => [m.rec, m.gas, m.inv]), 1);
    barrasContainer.innerHTML = meses6.map(m => { const hR = Math.max((m.rec / maxBarra) * 120, 2); const hG = Math.max((m.gas / maxBarra) * 120, 2); const hI = Math.max((m.inv / maxBarra) * 120, 2); return `<div class="barra-grupo"><div class="barra-conjunto"><div class="barra receita" style="height:${hR}px"></div><div class="barra gasto" style="height:${hG}px"></div><div class="barra investimento" style="height:${hI}px"></div></div><span class="barra-label">${m.label}</span></div>`; }).join('');

    await updateGraficoPatrimonio(registros);

    const topGastos = doMes.filter(r => r.tipo === 'gasto').sort((a, b) => b.valor - a.valor).slice(0, 5);
    const topList = document.getElementById('grafico-top-list');
    if (topGastos.length === 0) topList.innerHTML = '<div class="empty-state"><span class="empty-icon">🏆</span><p>Sem gastos neste mês</p></div>';
    else { const topMax = topGastos[0].valor; topList.innerHTML = topGastos.map((r, i) => { const info = getCategoriaInfo(r.categoria); const pct = (r.valor / topMax) * 100; return `<div class="top-item"><span class="top-rank">${i + 1}º</span><span class="top-icon">${info.icon}</span><div class="top-info"><div class="top-desc">${r.descricao || info.label}</div><div class="top-cat">${info.label} · ${formatDate(r.data)}</div><div class="top-bar-bg"><div class="top-bar-fill" style="width:${pct}%"></div></div></div><span class="top-valor">${formatMoney(r.valor)}</span></div>`; }).join(''); }

    await updateProjecao(registros);
}

async function updateGraficoPatrimonio(registros) {
    const hoje = getHojeString();
    const saldoInicial = await getSaldoInicial();
    const pontos = [];
    for (let i = 5; i >= 0; i--) {
        let mm = graficoMes - i, yy = graficoAno; if (mm < 0) { mm += 12; yy--; }
        const ultimoDia = new Date(yy, mm + 1, 0).getDate();
        const dataLimite = `${yy}-${String(mm + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
        const dataEfetiva = dataLimite <= hoje ? dataLimite : hoje;
        let recT = 0, gasT = 0, invT = 0, resT = 0;
        registros.forEach(r => {
            if (r.data <= dataEfetiva) {
                if (r.tipo === 'receita') recT += r.valor;
                if (r.tipo === 'gasto') gasT += r.valor;
                if (r.tipo === 'investimento') invT += r.valor;
                if (r.tipo === 'resgate') resT += r.valor;
            }
        });
        const pat = saldoInicial.conta + saldoInicial.investido + (recT - gasT + resT) + (invT - resT);
        pontos.push({ label: getMonthShort(mm), valor: pat });
    }
    const container = document.getElementById('grafico-patrimonio-container');
    const minVal = Math.min(...pontos.map(p => p.valor));
    const maxVal = Math.max(...pontos.map(p => p.valor));
    const range = maxVal - minVal || 1;
    const w = 300, h = 120, padX = 10, padY = 10;
    const pts = pontos.map((p, i) => ({ x: padX + (i / (pontos.length - 1)) * (w - 2 * padX), y: padY + (1 - (p.valor - minVal) / range) * (h - 2 * padY) }));
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = linePath + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
    const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" class="patrimonio-dot"/>`).join('');
    container.innerHTML = `<div class="patrimonio-chart"><svg class="patrimonio-chart-svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="patrimonioGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--green-medium)" stop-opacity="0.4"/><stop offset="100%" stop-color="var(--green-medium)" stop-opacity="0"/></linearGradient></defs><path class="patrimonio-area" d="${areaPath}"/><path class="patrimonio-line" d="${linePath}"/>${dots}</svg></div><div class="patrimonio-labels">${pontos.map(p => `<div><div class="patrimonio-label-item">${p.label}</div><div class="patrimonio-valor-item">${formatMoney(p.valor)}</div></div>`).join('')}</div>`;
}

async function updateProjecao(registros) {
    const fixas = await dbGetAll('fixas');
    const fixasAtivas = fixas.filter(f => f.ativa !== false);
    const hoje = getHojeString();
    const now = new Date();
    const saldoInicial = await getSaldoInicial();

    const container = document.getElementById('projecao-chart-container');
    const tabelaEl = document.getElementById('projecao-tabela');
    const infoEl = document.getElementById('projecao-info');

    if (fixasAtivas.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Cadastre fixas para ver a projeção</p></div>';
        tabelaEl.innerHTML = ''; infoEl.innerHTML = '';
        return;
    }

    let recT = 0, gasT = 0, invT = 0, resT = 0;
    registros.forEach(r => {
        if (r.data <= hoje) {
            if (r.tipo === 'receita') recT += r.valor;
            if (r.tipo === 'gasto') gasT += r.valor;
            if (r.tipo === 'investimento') invT += r.valor;
            if (r.tipo === 'resgate') resT += r.valor;
        }
    });
    const patrimonioAtual = saldoInicial.conta + saldoInicial.investido + (recT - gasT + resT) + (invT - resT);

    let recFixas = 0, gasFixas = 0, invFixas = 0;
    fixasAtivas.forEach(f => { if (f.tipo === 'receita') recFixas += f.valor; if (f.tipo === 'gasto') gasFixas += f.valor; if (f.tipo === 'investimento') invFixas += f.valor; });
    const saldoFixoMensal = recFixas - gasFixas;

    const projecao = [];
    let patrimonioProjetado = patrimonioAtual;
    for (let i = 0; i <= 6; i++) {
        const mes = (now.getMonth() + i) % 12;
        const ano = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
        if (i === 0) projecao.push({ label: getMonthShort(mes), valor: patrimonioAtual, tipo: 'atual', mes, ano });
        else { patrimonioProjetado += saldoFixoMensal; projecao.push({ label: getMonthShort(mes), valor: patrimonioProjetado, tipo: 'futuro', mes, ano }); }
    }

    const minVal = Math.min(...projecao.map(p => p.valor));
    const maxVal = Math.max(...projecao.map(p => p.valor));
    const range = maxVal - minVal || 1;
    const w = 300, h = 120, padX = 10, padY = 10;
    const pts = projecao.map((p, i) => ({ x: padX + (i / (projecao.length - 1)) * (w - 2 * padX), y: padY + (1 - (p.valor - minVal) / range) * (h - 2 * padY), tipo: p.tipo }));
    const solidPath = `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
    const dashedPath = pts.slice(1).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${p.tipo === 'atual' ? 'var(--green-medium)' : 'var(--purple-medium)'}"/>`).join('');
    container.innerHTML = `<div class="projecao-chart"><svg class="projecao-svg" viewBox="0 0 ${w} ${h}"><path d="${solidPath}" fill="none" stroke="var(--green-medium)" stroke-width="2.5" stroke-linecap="round"/><path d="${dashedPath}" fill="none" stroke="var(--purple-medium)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6,4"/>${dots}</svg></div><div class="projecao-labels">${projecao.map(p => `<div class="projecao-label-item ${p.tipo}">${p.label}</div>`).join('')}</div><div class="projecao-legenda"><span class="legenda-item"><span class="legenda-dot" style="background:var(--green-medium)"></span>Atual</span><span class="legenda-item"><span class="legenda-dot" style="background:var(--purple-medium)"></span>Projeção</span></div>`;

    let tabelaHtml = '<div class="projecao-table"><div class="projecao-table-header"><span>Mês</span><span>Tipo</span><span style="text-align:right">Patrimônio</span></div>';
    projecao.forEach(p => { const rowClass = p.tipo === 'atual' ? 'projecao-row-atual' : 'projecao-row-futuro'; const badge = p.tipo === 'atual' ? '<span class="projecao-tipo-badge">📍 Atual</span>' : '<span class="projecao-tipo-badge">📊 Projeção</span>'; const vc = p.valor >= 0 ? 'positivo' : 'negativo'; tabelaHtml += `<div class="projecao-table-row ${rowClass}"><span>${p.label}/${p.ano}</span>${badge}<span class="projecao-table-valor ${vc}">${formatMoney(p.valor)}</span></div>`; });
    tabelaHtml += '</div>'; tabelaEl.innerHTML = tabelaHtml;

    const ultimaProj = projecao[projecao.length - 1];
    const diff = ultimaProj.valor - patrimonioAtual;
    infoEl.innerHTML = `<div class="projecao-resumo"><div class="projecao-resumo-item"><span class="projecao-resumo-label">Patrimônio Atual</span><span class="projecao-resumo-valor">${formatMoney(patrimonioAtual)}</span></div><div class="projecao-resumo-item"><span class="projecao-resumo-label">Receitas Fixas/mês</span><span class="projecao-resumo-valor positivo">+ ${formatMoney(recFixas)}</span></div><div class="projecao-resumo-item"><span class="projecao-resumo-label">Gastos Fixos/mês</span><span class="projecao-resumo-valor negativo">- ${formatMoney(gasFixas)}</span></div>${invFixas > 0 ? `<div class="projecao-resumo-item"><span class="projecao-resumo-label">Invest. Fixos/mês</span><span class="projecao-resumo-valor">→ ${formatMoney(invFixas)}</span></div>` : ''}<div class="projecao-resumo-item"><span class="projecao-resumo-label">Saldo Fixo/mês</span><span class="projecao-resumo-valor ${saldoFixoMensal >= 0 ? 'positivo' : 'negativo'}">${formatMoney(saldoFixoMensal)}</span></div><div class="projecao-resumo-item destaque"><span class="projecao-resumo-label"><strong>Projeção em 6 meses</strong></span><span class="projecao-resumo-valor ${ultimaProj.valor >= 0 ? 'positivo' : 'negativo'}"><strong>${formatMoney(ultimaProj.valor)}</strong></span></div><div class="projecao-resumo-item"><span class="projecao-resumo-label">Variação total</span><span class="projecao-resumo-valor ${diff >= 0 ? 'positivo' : 'negativo'}">${diff >= 0 ? '+' : ''}${formatMoney(diff)}</span></div></div><p class="projecao-aviso">⚠️ Projeção baseada nas fixas cadastradas. Gastos variáveis não incluídos.</p>`;
}

// ===== CATEGORIAS TELA =====
let editingCatId = null;

function initCategorias() {
    document.getElementById('btn-nova-categoria').addEventListener('click', () => openCategoriaModal());
    document.getElementById('modal-categoria-close').addEventListener('click', closeCategoriaModal);
    document.getElementById('modal-categoria-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCategoriaModal(); });
    document.getElementById('cat-btn-cancelar').addEventListener('click', closeCategoriaModal);
    document.getElementById('cat-btn-salvar').addEventListener('click', salvarCategoria);
}

function openCategoriaModal(cat) {
    editingCatId = cat ? cat.id : null;
    document.getElementById('modal-categoria-title').textContent = cat ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('input-cat-icon').value = cat ? cat.icon : '';
    document.getElementById('input-cat-nome').value = cat ? cat.label : '';
    document.getElementById('modal-categoria-overlay').classList.add('open');
}

function closeCategoriaModal() { document.getElementById('modal-categoria-overlay').classList.remove('open'); editingCatId = null; }

async function salvarCategoria() {
    const icon = document.getElementById('input-cat-icon').value.trim() || '📦';
    const nome = document.getElementById('input-cat-nome').value.trim();
    if (!nome) { showToast('⚠️ Informe o nome'); return; }
    const custom = await dbGet('config', 'categorias-custom');
    const customs = custom ? custom.valor : [];
    if (editingCatId) {
        const idx = customs.findIndex(c => c.id === editingCatId);
        if (idx >= 0) { customs[idx].icon = icon; customs[idx].label = nome; }
    } else {
        const id = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        if (categoriasCache.some(c => c.id === id)) { showToast('⚠️ Categoria já existe'); return; }
        customs.push({ id, icon, label: nome });
    }
    await dbPut('config', { chave: 'categorias-custom', valor: customs });
    await populateCategoriaSelects();
    closeCategoriaModal();
    showToast(editingCatId ? '✅ Categoria atualizada!' : '✅ Categoria criada!');
    updateCategoriasScreen();
}

async function excluirCategoria(id) {
    const custom = await dbGet('config', 'categorias-custom');
    const customs = custom ? custom.valor : [];
    const nova = customs.filter(c => c.id !== id);
    await dbPut('config', { chave: 'categorias-custom', valor: nova });
    await populateCategoriaSelects();
    showToast('🗑️ Categoria excluída');
    updateCategoriasScreen();
}

async function updateCategoriasScreen() {
    await loadCategorias();
    const listEl = document.getElementById('categorias-list');
    listEl.innerHTML = categoriasCache.map(c => {
        const isBuiltin = c.builtin === true;
        return `<div class="cat-item">
            <span class="cat-item-icon">${c.icon}</span>
            <span class="cat-item-label">${c.label}</span>
            ${isBuiltin ? '<span class="cat-item-badge">Padrão</span>' : `<div class="cat-item-actions"><button class="cat-item-edit" data-cat-id="${c.id}">✏️</button><button class="cat-item-delete" data-cat-id="${c.id}">🗑️</button></div>`}
        </div>`;
    }).join('');
    listEl.querySelectorAll('.cat-item-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
            const custom = await dbGet('config', 'categorias-custom');
            const cat = (custom ? custom.valor : []).find(c => c.id === btn.dataset.catId);
            if (cat) openCategoriaModal(cat);
        });
    });
    listEl.querySelectorAll('.cat-item-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDeleteId = btn.dataset.catId;
            document.getElementById('confirm-text').textContent = 'Excluir esta categoria?';
            document.getElementById('confirm-delete').onclick = async () => { await excluirCategoria(pendingDeleteId); closeConfirmModal(); };
            document.getElementById('modal-confirm-overlay').classList.add('open');
        });
    });
}

// ===== DADOS =====
let csvMes = new Date().getMonth(), csvAno = new Date().getFullYear(), csvTodosMeses = false, csvFormato = 'excel';
let relatorioMes = new Date().getMonth(), relatorioAno = new Date().getFullYear();

function initDados() {
    document.getElementById('btn-exportar-json').addEventListener('click', exportarJSON);
    document.getElementById('input-importar-json').addEventListener('change', importarJSON);
    document.getElementById('csv-mes-prev').addEventListener('click', () => { csvTodosMeses = false; csvMes--; if (csvMes < 0) { csvMes = 11; csvAno--; } updateDadosScreen(); });
    document.getElementById('csv-mes-next').addEventListener('click', () => { csvTodosMeses = false; csvMes++; if (csvMes > 11) { csvMes = 0; csvAno++; } updateDadosScreen(); });
    document.getElementById('csv-todos-meses').addEventListener('click', () => { csvTodosMeses = !csvTodosMeses; updateDadosScreen(); });
    document.getElementById('csv-formato-excel').addEventListener('click', () => { csvFormato = 'excel'; document.getElementById('csv-formato-excel').classList.add('active'); document.getElementById('csv-formato-sheets').classList.remove('active'); });
    document.getElementById('csv-formato-sheets').addEventListener('click', () => { csvFormato = 'sheets'; document.getElementById('csv-formato-sheets').classList.add('active'); document.getElementById('csv-formato-excel').classList.remove('active'); });
    document.getElementById('btn-exportar-csv').addEventListener('click', exportarCSV);
    document.getElementById('relatorio-mes-prev').addEventListener('click', () => { relatorioMes--; if (relatorioMes < 0) { relatorioMes = 11; relatorioAno--; } updateDadosScreen(); });
    document.getElementById('relatorio-mes-next').addEventListener('click', () => { relatorioMes++; if (relatorioMes > 11) { relatorioMes = 0; relatorioAno++; } updateDadosScreen(); });
    document.getElementById('btn-gerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('btn-copiar-relatorio').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('relatorio-texto').textContent); showToast('📋 Copiado!'); });
    document.getElementById('btn-compartilhar-relatorio').addEventListener('click', () => { if (navigator.share) navigator.share({ title: 'Relatório - Bolso do Fred', text: document.getElementById('relatorio-texto').textContent }); else { navigator.clipboard.writeText(document.getElementById('relatorio-texto').textContent); showToast('📋 Copiado!'); } });
    document.getElementById('import-cancel').addEventListener('click', () => document.getElementById('modal-import-overlay').classList.remove('open'));
}

async function updateDadosScreen() {
    const registros = await dbGetAll('registros'); const fixas = await dbGetAll('fixas');
    document.getElementById('csv-mes-label').textContent = `${getMonthName(csvMes)} ${csvAno}`;
    document.getElementById('csv-todos-meses').classList.toggle('active', csvTodosMeses);
    document.getElementById('relatorio-mes-label').textContent = `${getMonthName(relatorioMes)} ${relatorioAno}`;
    let totalGasto = 0, totalReceita = 0;
    registros.forEach(r => { if (r.tipo === 'gasto') totalGasto += r.valor; if (r.tipo === 'receita') totalReceita += r.valor; });
    document.getElementById('dados-stats').innerHTML = `<div class="detalhe-row"><span class="detalhe-label">Total de registros</span><span class="detalhe-value">${registros.length}</span></div><div class="detalhe-row"><span class="detalhe-label">Fixas cadastradas</span><span class="detalhe-value">${fixas.length}</span></div><div class="detalhe-row"><span class="detalhe-label">Total em receitas</span><span class="detalhe-value" style="color:var(--green-medium)">${formatMoney(totalReceita)}</span></div><div class="detalhe-row"><span class="detalhe-label">Total em gastos</span><span class="detalhe-value" style="color:var(--red-medium)">${formatMoney(totalGasto)}</span></div>`;
}

async function exportarJSON() {
    const registros = await dbGetAll('registros'); const fixas = await dbGetAll('fixas'); const configs = {};
    try { for (const k of ['pin', 'orcamento-geral', 'metas-categorias', 'theme', 'saldo-inicial', 'categorias-custom']) { const c = await dbGet('config', k); if (c) configs[k] = c; } } catch (e) { }
    const backup = { version: '2.5', date: new Date().toISOString(), registros, fixas, configs };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `bolso-fred-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
    showToast('📤 Backup exportado!');
}

async function importarJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    try {
        const data = JSON.parse(text);
        document.getElementById('import-preview').innerHTML = `<p>📊 <strong>${data.registros ? data.registros.length : 0}</strong> registros</p><p>🔁 <strong>${data.fixas ? data.fixas.length : 0}</strong> fixas</p><p style="color:var(--red-medium);margin-top:8px;">⚠️ Isso substituirá todos os dados atuais!</p>`;
        document.getElementById('modal-import-overlay').classList.add('open');
        document.getElementById('import-confirm').onclick = async () => {
            if (data.registros) { await dbClear('registros'); for (const r of data.registros) await dbPut('registros', r); }
            if (data.fixas) { await dbClear('fixas'); for (const f of data.fixas) await dbPut('fixas', f); }
            if (data.configs) { for (const [k, v] of Object.entries(data.configs)) await dbPut('config', v); }
            document.getElementById('modal-import-overlay').classList.remove('open');
            showToast('📥 Backup restaurado!'); await populateCategoriaSelects(); updateDadosScreen(); updateDashboard();
        };
    } catch (err) { showToast('❌ Arquivo inválido'); }
    e.target.value = '';
}

async function exportarCSV() {
    const registros = await dbGetAll('registros'); const sep = csvFormato === 'excel' ? ';' : ',';
    let filtered = registros; if (!csvTodosMeses) filtered = filtered.filter(r => { const [y, m] = r.data.split('-').map(Number); return y === csvAno && (m - 1) === csvMes; });
    filtered.sort((a, b) => a.data.localeCompare(b.data));
    let csv = `Data${sep}Tipo${sep}Descrição${sep}Valor${sep}Categoria${sep}Método${sep}Investimento${sep}Nota\n`;
    filtered.forEach(r => { csv += `${formatDate(r.data)}${sep}${r.tipo}${sep}${r.descricao || ''}${sep}${r.valor.toFixed(2).replace('.', ',')}${sep}${r.categoria ? getCategoriaInfo(r.categoria).label : ''}${sep}${r.metodo ? getMetodoInfo(r.metodo) : ''}${sep}${r.tipoInvestimento ? getInvestimentoInfo(r.tipoInvestimento).label : ''}${sep}${r.nota || ''}\n`; });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `bolso-fred-${csvTodosMeses ? 'tudo' : `${csvMes + 1}-${csvAno}`}.csv`; a.click(); URL.revokeObjectURL(url);
    showToast('📊 CSV exportado!');
}

async function gerarRelatorio() {
    const registros = await dbGetAll('registros');
    const doMes = registros.filter(r => { const [y, m] = r.data.split('-').map(Number); return y === relatorioAno && (m - 1) === relatorioMes; });
    let tRec = 0, tGas = 0, tInv = 0, tRes = 0; const gastosPorCat = {};
    doMes.forEach(r => { if (r.tipo === 'receita') tRec += r.valor; if (r.tipo === 'gasto') { tGas += r.valor; gastosPorCat[r.categoria] = (gastosPorCat[r.categoria] || 0) + r.valor; } if (r.tipo === 'investimento') tInv += r.valor; if (r.tipo === 'resgate') tRes += r.valor; });
    let txt = `═══════════════════════════════════\n  💰 O BOLSO DO FRED — RELATÓRIO\n  ${getMonthName(relatorioMes)} ${relatorioAno}\n═══════════════════════════════════\n\n📊 RESUMO DO MÊS\n─────────────────────────────\n  💵 Receitas:      ${formatMoney(tRec)}\n  💸 Gastos:        ${formatMoney(tGas)}\n  📈 Investido:     ${formatMoney(tInv)}\n  🔄 Resgates:      ${formatMoney(tRes)}\n─────────────────────────────\n  💰 Saldo:         ${formatMoney(tRec - tGas - tInv + tRes)}\n\n`;
    if (Object.keys(gastosPorCat).length > 0) { txt += `🥧 GASTOS POR CATEGORIA\n─────────────────────────────\n`; Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => { const info = getCategoriaInfo(cat); txt += `  ${info.icon} ${info.label.padEnd(14)} ${formatMoney(val).padStart(12)}  (${((val / tGas) * 100).toFixed(0)}%)\n`; }); txt += `\n`; }
    txt += `📝 ${doMes.length} movimentações no mês\n═══════════════════════════════════\n`;
    document.getElementById('relatorio-texto').textContent = txt;
    document.getElementById('relatorio-output').style.display = '';
}

// ===== NOTIFICAÇÕES =====
function initNotificacoes() {
    document.getElementById('btn-ativar-notif').addEventListener('click', ativarNotificacoes);
    document.getElementById('btn-salvar-horario').addEventListener('click', salvarHorarioNotif);
    document.getElementById('btn-novo-lembrete').addEventListener('click', () => openLembreteModal());
    document.getElementById('modal-lembrete-close').addEventListener('click', closeLembreteModal);
    document.getElementById('modal-lembrete-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLembreteModal(); });
    document.getElementById('lembrete-btn-cancelar').addEventListener('click', closeLembreteModal);
    document.getElementById('lembrete-btn-salvar').addEventListener('click', salvarLembrete);
    document.getElementById('btn-limpar-notifs').addEventListener('click', limparHistoricoNotifs);
    document.getElementById('toggle-alerta-fixas').addEventListener('change', salvarPrefsNotif);
    document.getElementById('toggle-alerta-metas').addEventListener('change', salvarPrefsNotif);
    document.getElementById('toggle-alerta-semanal').addEventListener('change', salvarPrefsNotif);
}

async function ativarNotificacoes() { if (!('Notification' in window)) { showToast('❌ Navegador não suporta'); return; } const perm = await Notification.requestPermission(); if (perm === 'granted') { showToast('🔔 Notificações ativadas!'); await dbPut('config', { chave: 'notif-ativo', valor: true }); updateNotificacoes(); } else showToast('❌ Permissão negada'); }
async function updateNotificacoes() {
    const notifAtivo = await dbGet('config', 'notif-ativo');
    const isAtivo = notifAtivo && notifAtivo.valor && Notification.permission === 'granted';
    document.getElementById('notif-status-icon').textContent = isAtivo ? '🔔' : '🔕';
    document.getElementById('notif-status-text').textContent = isAtivo ? 'Notificações ativadas' : 'Notificações desativadas';
    const btn = document.getElementById('btn-ativar-notif');
    if (isAtivo) { btn.textContent = '✅ Ativadas'; btn.classList.add('ativo'); } else { btn.textContent = '🔔 Ativar Notificações'; btn.classList.remove('ativo'); }
    const prefs = await dbGet('config', 'notif-prefs');
    if (prefs && prefs.valor) { document.getElementById('toggle-alerta-fixas').checked = prefs.valor.fixas !== false; document.getElementById('toggle-alerta-metas').checked = prefs.valor.metas !== false; document.getElementById('toggle-alerta-semanal').checked = prefs.valor.semanal !== false; }
    const horario = await dbGet('config', 'notif-horario'); if (horario) document.getElementById('select-notif-hora').value = horario.valor;
    await updateLembretes(); await updateHistoricoNotifs();
}
async function salvarPrefsNotif() { await dbPut('config', { chave: 'notif-prefs', valor: { fixas: document.getElementById('toggle-alerta-fixas').checked, metas: document.getElementById('toggle-alerta-metas').checked, semanal: document.getElementById('toggle-alerta-semanal').checked } }); showToast('✅ Preferências salvas!'); }
async function salvarHorarioNotif() { await dbPut('config', { chave: 'notif-horario', valor: document.getElementById('select-notif-hora').value }); showToast('✅ Horário salvo!'); }
function openLembreteModal() { document.getElementById('input-lembrete-titulo').value = ''; document.getElementById('input-lembrete-data').valueAsDate = new Date(); document.getElementById('select-lembrete-repetir').value = 'nao'; document.getElementById('modal-lembrete-overlay').classList.add('open'); }
function closeLembreteModal() { document.getElementById('modal-lembrete-overlay').classList.remove('open'); }
async function salvarLembrete() { const titulo = document.getElementById('input-lembrete-titulo').value.trim(); if (!titulo) { showToast('⚠️ Informe o título'); return; } const lembretes = await dbGet('config', 'lembretes'); const lista = lembretes ? lembretes.valor : []; lista.push({ id: generateId(), titulo, data: document.getElementById('input-lembrete-data').value, repetir: document.getElementById('select-lembrete-repetir').value, ativo: true }); await dbPut('config', { chave: 'lembretes', valor: lista }); closeLembreteModal(); showToast('✅ Lembrete salvo!'); updateLembretes(); }
async function updateLembretes() { const lembretes = await dbGet('config', 'lembretes'); const lista = lembretes ? lembretes.valor : []; const listEl = document.getElementById('lembretes-list'); if (lista.length === 0) { listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>Nenhum lembrete</p></div>'; return; } const rm = { nao: 'Uma vez', diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }; listEl.innerHTML = lista.map(l => `<div class="lembrete-item"><span class="lembrete-icon">📌</span><div class="lembrete-info"><div class="lembrete-titulo">${l.titulo}</div><div class="lembrete-meta">${formatDate(l.data)} · ${rm[l.repetir] || 'Uma vez'}</div></div><button class="lembrete-delete" data-lembrete-id="${l.id}">✕</button></div>`).join(''); listEl.querySelectorAll('.lembrete-delete').forEach(btn => { btn.addEventListener('click', async () => { const lem = await dbGet('config', 'lembretes'); const nova = (lem ? lem.valor : []).filter(l => l.id !== btn.dataset.lembreteId); await dbPut('config', { chave: 'lembretes', valor: nova }); showToast('🗑️ Lembrete removido'); updateLembretes(); }); }); }
async function updateHistoricoNotifs() { const hist = await dbGet('config', 'notif-historico'); const lista = hist ? hist.valor : []; const listEl = document.getElementById('notificacoes-historico-list'); if (lista.length === 0) { listEl.innerHTML = '<div class="empty-state"><span class="empty-icon">🔕</span><p>Nenhuma notificação enviada</p></div>'; return; } listEl.innerHTML = lista.slice(-10).reverse().map(n => `<div class="notif-hist-item"><span class="notif-hist-icon">${n.icon || '🔔'}</span><div class="notif-hist-info"><div class="notif-hist-text">${n.texto}</div><div class="notif-hist-time">${n.data || ''}</div></div></div>`).join(''); }
async function limparHistoricoNotifs() { await dbPut('config', { chave: 'notif-historico', valor: [] }); showToast('🗑️ Histórico limpo'); updateHistoricoNotifs(); }
async function checkNotifications() { const notifAtivo = await dbGet('config', 'notif-ativo'); if (!notifAtivo || !notifAtivo.valor || Notification.permission !== 'granted') return; const prefs = await dbGet('config', 'notif-prefs'); const p = prefs ? prefs.valor : { fixas: true, metas: true }; const now = new Date(); if (p.fixas !== false) { const fixas = await dbGetAll('fixas'); const registros = await dbGetAll('registros'); const aplicadas = new Set(); registros.forEach(r => { if (r.fixaId) { const [y, m] = r.data.split('-').map(Number); if (y === now.getFullYear() && (m - 1) === now.getMonth()) aplicadas.add(r.fixaId); } }); const pendentes = fixas.filter(f => f.ativa !== false && !aplicadas.has(f.id) && f.dia === now.getDate()); if (pendentes.length > 0) sendNotification('📅 Fixas Pendentes', `${pendentes.length} fixa(s) vencem hoje!`, 'fixas'); } if (p.metas !== false) { const orcConfig = await dbGet('config', 'orcamento-geral'); if (orcConfig && orcConfig.valor > 0) { const registros = await dbGetAll('registros'); let tg = 0; registros.forEach(r => { const [y, m] = r.data.split('-').map(Number); if (r.tipo === 'gasto' && y === now.getFullYear() && (m - 1) === now.getMonth()) tg += r.valor; }); const pct = (tg / orcConfig.valor) * 100; if (pct >= 100) sendNotification('🚨 Orçamento Estourado', `Ultrapassou em ${formatMoney(tg - orcConfig.valor)}!`, 'orc-100'); else if (pct >= 75) sendNotification('⚠️ Alerta', `Já usou ${pct.toFixed(0)}% do orçamento.`, 'orc-75'); } } }
async function sendNotification(title, body, tag) { if ('serviceWorker' in navigator && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', payload: { title, body, tag } }); else new Notification(title, { body, icon: './icons/icon-192.png' }); const hist = await dbGet('config', 'notif-historico'); const lista = hist ? hist.valor : []; lista.push({ texto: `${title}: ${body}`, icon: '🔔', data: new Date().toLocaleString('pt-BR') }); await dbPut('config', { chave: 'notif-historico', valor: lista }); }

// ===== SETTINGS =====
function initSettings() {
    document.getElementById('btn-alterar-pin').addEventListener('click', () => {
        createPinStep = 1; firstPin = ''; createPinBuffer = '';
        document.querySelectorAll('#create-pin-dots .dot').forEach(d => d.classList.remove('filled'));
        document.getElementById('create-pin-subtitle').textContent = 'Crie um novo PIN';
        navigateTo('screen-create-pin');
    });
    document.getElementById('btn-reset-dados').addEventListener('click', () => {
        pendingDeleteId = 'RESET';
        document.getElementById('confirm-text').textContent = '⚠️ Apagar TODOS os dados? Esta ação não pode ser desfeita!';
        document.getElementById('confirm-delete').onclick = async () => { await dbClear('registros'); await dbClear('fixas'); await dbClear('config'); closeConfirmModal(); showToast('🗑️ Dados apagados'); authenticated = false; navigateTo('screen-create-pin'); };
        document.getElementById('modal-confirm-overlay').classList.add('open');
    });
}

// ===== URL PARAMS =====
function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('valor')) {
        const valor = parseFloat(params.get('valor')) || 0; const tipo = params.get('tipo') || 'gasto'; const desc = params.get('desc') || ''; const cat = params.get('cat') || 'outros';
        setTimeout(() => {
            tipoRegistro = tipo; document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active')); document.querySelector(`.tipo-btn[data-tipo="${tipo}"]`)?.classList.add('active');
            document.getElementById('input-valor').value = Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            document.getElementById('input-descricao').value = desc; document.getElementById('input-data').valueAsDate = new Date();
            if (cat) document.getElementById('select-categoria').value = cat; updateFormVisibility(); navigateTo('screen-novo-registro');
        }, 500);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function initServiceWorkerMessages() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'NAVIGATE') navigateTo(event.data.screen);
            if (event.data.type === 'CHECK_NOTIFICATIONS') checkNotifications();
        });
    }
}

// ===== INIT =====
async function init() {
    await openDB();
    await applyThemeFromSaved();
    await populateCategoriaSelects();
    initNavigation(); initFormulario(); initModals(); initHistorico(); initGraficos();
    initMetas(); initFixas(); initDados(); initNotificacoes(); initSettings();
    initSaldoInicial(); initCategorias();
    initServiceWorkerMessages();
    await initPIN();
    handleURLParams();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            reg.update();
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') window.location.reload();
                });
            });
        }).catch(err => console.log('SW Error:', err));
    }

    setInterval(checkNotifications, 30 * 60 * 1000);
    setTimeout(checkNotifications, 5000);
}

init();
