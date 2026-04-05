// =======================================
// O BOLSO DO FRED — App v2.5
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
    if (key === 'delete') { if (pinBuffer.length > 0) { pinBuffer = pinBuffer.slice(0, -1); dots[pinBuffer.length].classList.remove('filled'); } return; }
    if (pinBuffer.length >= 4) return;
    pinBuffer += key;
    dots[pinBuffer.length - 1].classList.add('filled');
    if (pinBuffer.length === 4) {
        setTimeout(async () => {
            const config = await dbGet('config', 'pin');
            if (config && config.valor === pinBuffer) {
                errorEl.textContent = ''; authenticated = true; navigateTo('screen-dashboard');
                pinBuffer = ''; dots.forEach(d => d.classList.remove('filled', 'error'));
                // Checa onboarding após PIN correto
                checkOnboarding();
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
    if (key === 'delete') { if (createPinBuffer.length > 0) { createPinBuffer = createPinBuffer.slice(0, -1); dots[createPinBuffer.length].classList.remove('filled'); } return; }
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
                    showToast('✅ PIN criado com sucesso!'); authenticated = true;
                    createPinBuffer = ''; createPinStep = 1; firstPin = '';
                    dots.forEach(d => d.classList.remove('filled'));
                    subtitle.textContent = 'Crie um PIN de 4 dígitos';
                    navigateTo('screen-dashboard');
                    // Checa onboarding após criar PIN (primeira vez)
                    checkOnboarding();
                } else {
                    errorEl.textContent = 'PINs não coincidem. Tente novamente.';
                    dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
                    setTimeout(() => { dots.forEach(d => d.classList.remove('error')); createPinBuffer = ''; createPinStep = 1; firstPin = ''; errorEl.textContent = ''; subtitle.textContent = 'Crie um PIN de 4 dígitos'; }, 600);
                }
            }
        }, 200);
    }
}

// =============================================
// ONBOARDING — Configuração inicial
// =============================================

async function checkOnboarding() {
    const onboardingConfig = await dbGet('config', 'onboarding-done');
    const onboardingDone = onboardingConfig ? onboardingConfig.valor : false;
    const registros = await dbGetAll('registros');
    const temMovimentacoes = registros.length > 0;

    // Mostra onboarding se nunca foi feito E não tem movimentações
    if (!onboardingDone && !temMovimentacoes) {
        setTimeout(() => openOnboarding(), 400);
    }
}

function openOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.add('open');
        showOnboardingStep(1);
        setupOnboardingInputs();
    }
}

function closeOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.remove('open');
    }
}

function showOnboardingStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(el => {
        el.classList.remove('active');
    });

    const stepEl = document.getElementById(`onboarding-step-${step}`);
    if (stepEl) {
        // Força reflow para reiniciar a animação
        void stepEl.offsetWidth;
        stepEl.classList.add('active');
    }

    document.querySelectorAll('.onboarding-dot').forEach(dot => {
        const dotStep = parseInt(dot.getAttribute('data-step'));
        dot.classList.toggle('active', dotStep === step);
    });
}

function onboardingNext(step) {
    if (step === 4) {
        updateOnboardingResumo();
    }
    showOnboardingStep(step);
}

function onboardingBack(step) {
    showOnboardingStep(step);
}

function updateOnboardingResumo() {
    const saldoConta = parseOnboardingValor('onboarding-saldo-conta');
    const saldoInvest = parseOnboardingValor('onboarding-saldo-invest');
    const total = saldoConta + saldoInvest;

    document.getElementById('onboarding-confirm-conta').textContent = formatMoney(saldoConta);
    document.getElementById('onboarding-confirm-invest').textContent = formatMoney(saldoInvest);
    document.getElementById('onboarding-confirm-total').textContent = formatMoney(total);
}

function parseOnboardingValor(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.value) return 0;
    return parseMoney(input.value);
}

async function onboardingFinish() {
    const saldoConta = parseOnboardingValor('onboarding-saldo-conta');
    const saldoInvest = parseOnboardingValor('onboarding-saldo-invest');

    // Salva saldos iniciais
    await dbPut('config', { chave: 'saldo-inicial', valor: { conta: saldoConta, investido: saldoInvest } });

    // Marca onboarding como feito
    await dbPut('config', { chave: 'onboarding-done', valor: true });

    // Fecha o onboarding
    closeOnboarding();

    // Atualiza o dashboard
    updateDashboard();

    // Toast de boas-vindas
    showToast('🎉 Tudo pronto! Bom controle financeiro!');
}

function setupOnboardingInputs() {
    const inputs = [
        document.getElementById('onboarding-saldo-conta'),
        document.getElementById('onboarding-saldo-invest')
    ];

    inputs.forEach(input => {
        if (!input) return;

        // Remove listeners anteriores clonando o elemento
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('input', function () {
            formatarInputMoedaOnboarding(this);
        });

        newInput.addEventListener('focus', function () {
            if (this.value === 'R$ 0,00' || this.value === '') {
                this.value = '';
            }
        });

        newInput.addEventListener('blur', function () {
            if (this.value === '' || this.value === 'R$' || this.value === 'R$ ') {
                this.value = 'R$ 0,00';
            }
        });
    });
}

function formatarInputMoedaOnboarding(input) {
    let digits = input.value.replace(/\D/g, '');
    if (!digits) { input.value = ''; return; }
    let valor = parseInt(digits, 10) / 100;
    input.value = valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
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
    const now = new Date(); const mesLabel =
