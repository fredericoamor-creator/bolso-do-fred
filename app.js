// =============================================
// O BOLSO DO FRED — APP v3.0
// Reescrita completa com melhorias UX
// =============================================

(function () {
    'use strict';

    // =============================================
    // CONSTANTES & CONFIGURAÇÕES
    // =============================================
    const APP_VERSION = '3.0';
    const DB_NAME = 'BolsoDoFredDB';
    const DB_VERSION = 2;
    const MAX_PIN_ATTEMPTS = 5;
    const PIN_LOCKOUT_MS = 60000; // 1 minuto
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const CATEGORIAS_PADRAO = [
        { id: 'alimentacao', icon: '🍔', nome: 'Alimentação' },
        { id: 'transporte', icon: '🚗', nome: 'Transporte' },
        { id: 'moradia', icon: '🏠', nome: 'Moradia' },
        { id: 'saude', icon: '💊', nome: 'Saúde' },
        { id: 'educacao', icon: '📚', nome: 'Educação' },
        { id: 'lazer', icon: '🎮', nome: 'Lazer' },
        { id: 'compras', icon: '🛒', nome: 'Compras' },
        { id: 'servicos', icon: '🔧', nome: 'Serviços' },
        { id: 'vestuario', icon: '👕', nome: 'Vestuário' },
        { id: 'pets', icon: '🐾', nome: 'Pets' },
        { id: 'assinaturas', icon: '📺', nome: 'Assinaturas' },
        { id: 'presentes', icon: '🎁', nome: 'Presentes' },
        { id: 'outros', icon: '📌', nome: 'Outros' }
    ];

    const TIPO_ICONS = {
        gasto: '💸',
        receita: '💵',
        investimento: '📈',
        resgate: '🔄'
    };

    const METODO_LABELS = {
        credito: '💳 Crédito',
        debito: '💰 Débito',
        pix: '📲 Pix',
        boleto: '📄 Boleto',
        dinheiro: '💵 Dinheiro'
    };

    const TIPO_INV_LABELS = {
        cdb: '🏦 CDB',
        tesouro: '🇧🇷 Tesouro',
        fundo: '📊 Fundo',
        acoes: '📈 Ações',
        fii: '🏢 FII',
        cripto: '₿ Cripto',
        poupanca: '🐷 Poupança',
        previdencia: '🔮 Previdência',
        outro: '📌 Outro'
    };

    const CHART_COLORS = [
        '#2d8659', '#d9534f', '#7c4dff', '#f9a825', '#2196F3',
        '#e91e63', '#00bcd4', '#ff9800', '#8bc34a', '#795548',
        '#607d8b', '#9c27b0', '#3f51b5'
    ];

    // =============================================
    // ESTADO DA APLICAÇÃO
    // =============================================
    const state = {
        db: null,
        currentScreen: 'pin',
        previousScreen: null,
        screenHistory: [],
        mesAtual: new Date().getMonth(),
        anoAtual: new Date().getFullYear(),
        filtroHistoricoMes: new Date().getMonth(),
        filtroHistoricoAno: new Date().getFullYear(),
        filtroHistoricoTipo: 'todos',
        filtroHistoricoTodosMeses: false,
        filtroFixaTipo: 'todos',
        graficoMes: new Date().getMonth(),
        graficoAno: new Date().getFullYear(),
        csvMes: new Date().getMonth(),
        csvAno: new Date().getFullYear(),
        csvTodos: false,
        relatorioMes: new Date().getMonth(),
        relatorioAno: new Date().getFullYear(),
        valuesHidden: false,
        pinAttempts: 0,
        pinLockUntil: 0,
        editingId: null,
        editingFixaId: null,
        editingCatId: null,
        formDirty: false,
        searchQuery: '',
        onboardingSlide: 0,
        createPinStep: 'create', // 'create' | 'confirm'
        createPinValue: '',
        currentPinValue: '',
        confirmCallback: null,
        confirmDeleteCallback: null,
        importData: null,
        metaEditCat: null,
        swRegistration: null,
        deferredPrompt: null
    };

    // =============================================
    // UTILITÁRIOS
    // =============================================
    const $ = (sel) => document.querySelector(sel);
    const $$
= (sel) => document.querySelectorAll(sel); const $id = (id) => document.getElementById(id); function formatMoney(val) { const num = parseFloat(val) || 0; return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } function parseMoney(str) { if (!str) return 0; return parseFloat(str.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0; } function formatDate(dateStr) { if (!dateStr) return ''; const parts = dateStr.split('-'); if (parts.length !== 3) return dateStr; return `${parts[2]}/${parts[1]}/${parts[0]}`; } function formatDateShort(dateStr) { if (!dateStr) return ''; const parts = dateStr.split('-'); if (parts.length !== 3) return dateStr; return `${parts[2]}/${parts[1]}`; } function getToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } function getYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } function getGreeting() { const h = new Date().getHours(); if (h < 12) return 'Bom dia, Fred ☀️'; if (h < 18) return 'Boa tarde, Fred 🌤️'; return 'Boa noite, Fred 🌙'; } function getMesAnoLabel(mes, ano) { return `${MESES[mes]} ${ano}`; } function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); } function vibrate(ms = 10) { if (navigator.vibrate) navigator.vibrate(ms); } function debounce(fn, delay = 300) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; } function clamp(val, min, max) { return Math.min(Math.max(val, min), max); } // ============================================= // TOAST // ============================================= let toastTimeout; function showToast(msg, duration = 2500) { const el = $id('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { el.classList.remove('show'); }, duration); } // ============================================= // INDEXEDDB // ============================================= function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains('registros')) { const store = db.createObjectStore('registros', { keyPath: 'id' }); store.createIndex('data', 'data', { unique: false }); store.createIndex('tipo', 'tipo', { unique: false }); store.createIndex('mesAno', 'mesAno', { unique: false }); } if (!db.objectStoreNames.contains('fixas')) { db.createObjectStore('fixas', { keyPath: 'id' }); } if (!db.objectStoreNames.contains('config')) { db.createObjectStore('config', { keyPath: 'key' }); } if (!db.objectStoreNames.contains('categorias')) { db.createObjectStore('categorias', { keyPath: 'id' }); } if (!db.objectStoreNames.contains('metas')) { db.createObjectStore('metas', { keyPath: 'id' }); } if (!db.objectStoreNames.contains('lembretes')) { db.createObjectStore('lembretes', { keyPath: 'id' }); } if (!db.objectStoreNames.contains('notificacoes')) { db.createObjectStore('notificacoes', { keyPath: 'id' }); } }; request.onsuccess = (e) => { state.db = e.target.result; resolve(state.db); }; request.onerror = (e) => { console.error('Erro ao abrir IndexedDB:', e); reject(e); }; }); } function dbTransaction(storeName, mode = 'readonly') { const tx = state.db.transaction(storeName, mode); return tx.objectStore(storeName); } function dbGetAll(storeName) { return new Promise((resolve, reject) => { const store = dbTransaction(storeName); const request = store.getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = (e) => reject(e); }); } function dbGet(storeName, key) { return new Promise((resolve, reject) => { const store = dbTransaction(storeName); const request = store.get(key); request.onsuccess = () => resolve(request.result); request.onerror = (e) => reject(e); }); } function dbPut(storeName, data) { return new Promise((resolve, reject) => { const store = dbTransaction(storeName, 'readwrite'); const request = store.put(data); request.onsuccess = () => resolve(request.result); request.onerror = (e) => reject(e); }); } function dbDelete(storeName, key) { return new Promise((resolve, reject) => { const store = dbTransaction(storeName, 'readwrite'); const request = store.delete(key); request.onsuccess = () => resolve(); request.onerror = (e) => reject(e); }); } function dbClear(storeName) { return new Promise((resolve, reject) => { const store = dbTransaction(storeName, 'readwrite'); const request = store.clear(); request.onsuccess = () => resolve(); request.onerror = (e) => reject(e); }); } // Config helpers async function getConfig(key, defaultValue = null) { try { const result = await dbGet('config', key); return result ? result.value : defaultValue; } catch { return defaultValue; } } async function setConfig(key, value) { return dbPut('config', { key, value }); } // ============================================= // CATEGORIAS // ============================================= async function getCategorias() { const custom = await dbGetAll('categorias'); if (custom.length === 0) { // Inicializar com padrão for (const cat of CATEGORIAS_PADRAO) { await dbPut('categorias', { ...cat, padrao: true }); } return CATEGORIAS_PADRAO.map(c => ({ ...c, padrao: true })); } return custom; } function getCategoriaIcon(categorias, catId) { const cat = categorias.find(c => c.id === catId); return cat ? cat.icon : '📌'; } function getCategoriaNome(categorias, catId) { const cat = categorias.find(c => c.id === catId); return cat ? cat.nome : catId || 'Outros'; } // ============================================= // MÁSCARA DE DINHEIRO // ============================================= function applyMoneyMask(input) { input.addEventListener('input', function () { let val = this.value.replace(/\D/g, ''); if (val === '') { this.value = ''; return; } val = parseInt(val, 10).toString(); if (val.length < 3) val = val.padStart(3, '0'); const intPart = val.slice(0, -2); const decPart = val.slice(-2); const formatted = parseInt(intPart, 10).toLocaleString('pt-BR') + ',' + decPart; this.value = formatted; }); } function initMoneyMasks() {
$$('.input-money').forEach(input => {
            applyMoneyMask(input);
        });
    }

    // =============================================
    // NAVEGAÇÃO ENTRE TELAS
    // =============================================
    function navigateTo(screenId, pushHistory = true) {
        const currentEl = $(`.screen.active`);
        const nextEl = $id(`screen-${screenId}`);
        if (!nextEl || (currentEl && currentEl.id === `screen-${screenId}`)) return;

        // Verificar form dirty
        if (state.formDirty && state.currentScreen === 'novo-registro') {
            showDiscardModal(() => {
                state.formDirty = false;
                navigateTo(screenId, pushHistory);
            });
            return;
        }

        if (pushHistory && state.currentScreen) {
            state.screenHistory.push(state.currentScreen);
        }

        state.previousScreen = state.currentScreen;
        state.currentScreen = screenId;

        // Atualizar telas
        $$
('.screen.active').forEach(s => s.classList.remove('active')); nextEl.classList.add('active'); // Atualizar nav
$$('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });
        const navBtn = $(`.nav-item[data-nav="${screenId}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
            navBtn.setAttribute('aria-current', 'page');
        }

        // Mostrar/esconder nav
        const screensWithNav = ['dashboard', 'historico', 'graficos', 'mais'];
        const nav = $id('bottom-nav');
        if (screensWithNav.includes(screenId)) {
            nav.style.display = 'flex';
        } else {
            nav.style.display = 'none';
        }

        // Atualizar conteúdo
        switch (screenId) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'historico':
                renderHistorico();
                break;
            case 'graficos':
                renderGraficos();
                break;
            case 'metas':
                renderMetas();
                break;
            case 'fixas':
                renderFixas();
                break;
            case 'categorias':
                renderCategorias();
                break;
            case 'dados':
                renderDados();
                break;
            case 'notificacoes':
                renderNotificacoes();
                break;
            case 'settings':
                renderSettings();
                break;
        }

        // Scroll to top
        const scroll = nextEl.querySelector('.content-scroll');
        if (scroll) scroll.scrollTop = 0;
    }

    function goBack() {
        if (state.screenHistory.length > 0) {
            const prev = state.screenHistory.pop();
            navigateTo(prev, false);
        } else {
            navigateTo('dashboard', false);
        }
    }

    // =============================================
    // MODAL HELPERS
    // =============================================
    let activeFocusTrap = null;

    function openModal(modalId) {
        const overlay = $id(modalId);
        if (!overlay) return;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Focus trap
        const focusable = overlay.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
            focusable[0].focus();
            activeFocusTrap = (e) => {
                if (e.key === 'Tab') {
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey) {
                        if (document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
                if (e.key === 'Escape') {
                    closeModal(modalId);
                }
            };
            document.addEventListener('keydown', activeFocusTrap);
        }
    }

    function closeModal(modalId) {
        const overlay = $id(modalId);
        if (!overlay) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        if (activeFocusTrap) {
            document.removeEventListener('keydown', activeFocusTrap);
            activeFocusTrap = null;
        }
    }

    function showDiscardModal(callback) {
        openModal('modal-discard-overlay');
        $id('discard-confirm').onclick = () => {
            closeModal('modal-discard-overlay');
            callback();
        };
        $id('discard-cancel').onclick = () => {
            closeModal('modal-discard-overlay');
        };
    }

    function showConfirmModal({ icon = '⚠️', text = 'Tem certeza?', desc = '', btnText = 'Excluir', requireInput = false, inputPlaceholder = '', onConfirm }) {
        $id('confirm-icon').textContent = icon;
        $id('confirm-text').textContent = text;
        $id('confirm-desc').textContent = desc;
        $id('confirm-delete').textContent = btnText;

        const inputWrapper = $id('confirm-input-wrapper');
        const input = $id('confirm-input');
        const btnConfirm = $id('confirm-delete');

        if (requireInput) {
            inputWrapper.style.display = 'block';
            input.placeholder = inputPlaceholder;
            input.value = '';
            btnConfirm.disabled = true;
            input.oninput = () => {
                btnConfirm.disabled = input.value.trim().toUpperCase() !== requireInput.toUpperCase();
            };
        } else {
            inputWrapper.style.display = 'none';
            btnConfirm.disabled = false;
        }

        openModal('modal-confirm-overlay');

        btnConfirm.onclick = () => {
            if (btnConfirm.disabled) return;
            closeModal('modal-confirm-overlay');
            if (onConfirm) onConfirm();
        };
        $id('confirm-cancel').onclick = () => {
            closeModal('modal-confirm-overlay');
        };
    }

    // =============================================
    // SERVICE WORKER & PWA
    // =============================================
    async function initServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            state.swRegistration = reg;

            // Verificar atualizações
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nova versão disponível
                        const banner = $id('update-banner');
                        banner.style.display = 'flex';
                        $id('btn-update').onclick = () => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            banner.style.display = 'none';
                            window.location.reload();
                        };
                    }
                });
            });

            // Refresh quando o SW toma controle
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // Não recarregar automaticamente, o banner já cuida disso
            });

        } catch (err) {
            console.error('Erro ao registrar SW:', err);
        }
    }

    // Offline/Online indicator
    function initNetworkStatus() {
        const bar = $id('offline-bar');
        const updateStatus = () => {
            if (navigator.onLine) {
                bar.style.display = 'none';
            } else {
                bar.style.display = 'flex';
            }
        };
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    }

    // =============================================
    // TEMA (DARK MODE)
    // =============================================
    function initTheme() {
        const autoTheme = localStorage.getItem('autoTheme') !== 'false';
        const savedDark = localStorage.getItem('darkMode') === 'true';

        if (autoTheme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (localStorage.getItem('autoTheme') !== 'false') {
                    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
                }
            });
        } else {
            document.documentElement.setAttribute('data-theme', savedDark ? 'dark' : 'light');
        }
    }

    function setTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('darkMode', dark);
    }

    // =============================================
    // PIN — LOGIN
    // =============================================
    function initPinScreen() {
        let pinValue = '';
        const dots = $id('pin-dots').querySelectorAll('.dot');
        const errorEl = $id('pin-error');
        const attemptsEl = $id('pin-attempts');
        const subtitleEl = $id('pin-subtitle');

        function updateDots() {
            dots.forEach((dot, i) => {
                dot.classList.toggle('filled', i < pinValue.length);
                dot.classList.remove('error');
            });
        }

        function showError(msg) {
            errorEl.textContent = msg;
            dots.forEach(d => d.classList.add('error'));
            vibrate(100);
            setTimeout(() => {
                pinValue = '';
                updateDots();
                errorEl.textContent = '';
            }, 1500);
        }

        function updateAttempts() {
            if (state.pinAttempts > 0) {
                const remaining = MAX_PIN_ATTEMPTS - state.pinAttempts;
                attemptsEl.textContent = `${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`;
            } else {
                attemptsEl.textContent = '';
            }
        }

        async function checkPin() {
            // Verificar lockout
            if (Date.now() < state.pinLockUntil) {
                const secs = Math.ceil((state.pinLockUntil - Date.now()) / 1000);
                showError(`Bloqueado. Tente em ${secs}s`);
                return;
            }

            const savedPin = await getConfig('pin');
            if (pinValue === savedPin) {
                state.pinAttempts = 0;
                vibrate(30);
                // Sucesso
                dots.forEach(d => d.classList.add('filled'));
                subtitleEl.textContent = 'Acesso liberado ✓';
                errorEl.textContent = '';
                attemptsEl.textContent = '';
                setTimeout(() => {
                    $id('screen-pin').style.display = 'none';
                    $id('screen-pin').classList.remove('active');
                    navigateTo('dashboard', false);
                    $id('bottom-nav').style.display = 'flex';
                    checkPendingFixas();
                    checkMetaAlerts();
                }, 400);
            } else {
                state.pinAttempts++;
                if (state.pinAttempts >= MAX_PIN_ATTEMPTS) {
                    state.pinLockUntil = Date.now() + PIN_LOCKOUT_MS;
                    showError('Muitas tentativas. Aguarde 1 minuto.');
                    state.pinAttempts = 0;
                } else {
                    showError('PIN incorreto');
                }
                updateAttempts();
            }
        }

        // Keypad
        $$
('#screen-pin .pin-key[data-key]').forEach(btn => { btn.addEventListener('click', () => { const key = btn.dataset.key; if (key === 'delete') { if (pinValue.length > 0) { pinValue = pinValue.slice(0, -1); vibrate(5); } } else { if (pinValue.length < 4) { pinValue += key; vibrate(10); } } updateDots(); if (pinValue.length === 4) { setTimeout(checkPin, 150); } }); }); // Forgot PIN $id('btn-forgot-pin').addEventListener('click', () => { openModal('modal-forgot-pin-overlay'); }); // Forgot PIN modal const forgotInput = $id('input-forgot-confirm'); const forgotBtn = $id('forgot-confirm'); forgotInput.addEventListener('input', () => { forgotBtn.disabled = forgotInput.value.trim().toUpperCase() !== 'RESETAR'; }); forgotBtn.addEventListener('click', async () => { // Reset total await dbClear('registros'); await dbClear('fixas'); await dbClear('config'); await dbClear('categorias'); await dbClear('metas'); await dbClear('lembretes'); await dbClear('notificacoes'); localStorage.clear(); closeModal('modal-forgot-pin-overlay'); window.location.reload(); }); $id('forgot-cancel').addEventListener('click', () => { closeModal('modal-forgot-pin-overlay'); forgotInput.value = ''; }); } // ============================================= // PIN — CRIAÇÃO // ============================================= function initCreatePinScreen() { let pinValue = ''; let firstPin = ''; const dots = $id('create-pin-dots').querySelectorAll('.dot'); const subtitleEl = $id('create-pin-subtitle'); const errorEl = $id('create-pin-error'); function updateDots() { dots.forEach((dot, i) => { dot.classList.toggle('filled', i < pinValue.length); dot.classList.remove('error'); }); } function showError(msg) { errorEl.textContent = msg; dots.forEach(d => d.classList.add('error')); vibrate(100); setTimeout(() => { pinValue = ''; updateDots(); errorEl.textContent = ''; }, 1500); } async function handleComplete() { if (state.createPinStep === 'create') { firstPin = pinValue; pinValue = ''; state.createPinStep = 'confirm'; subtitleEl.textContent = 'Confirme o PIN'; updateDots(); } else { if (pinValue === firstPin) { await setConfig('pin', pinValue); vibrate(30); subtitleEl.textContent = 'PIN criado ✓'; // Verificar se é primeiro acesso const onboarded = await getConfig('onboarded'); setTimeout(() => { $id('screen-create-pin').style.display = 'none'; $id('screen-create-pin').classList.remove('active'); if (!onboarded) { navigateTo('onboarding', false); } else { navigateTo('dashboard', false); $id('bottom-nav').style.display = 'flex'; } }, 400); } else { state.createPinStep = 'create'; firstPin = ''; subtitleEl.textContent = 'Crie um PIN de 4 dígitos'; showError('PINs não coincidem'); } } }
$$('#screen-create-pin .pin-key[data-create-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.createKey;
                if (key === 'delete') {
                    if (pinValue.length > 0) {
                        pinValue = pinValue.slice(0, -1);
                        vibrate(5);
                    }
                } else {
                    if (pinValue.length < 4) {
                        pinValue += key;
                        vibrate(10);
                    }
                }
                updateDots();
                if (pinValue.length === 4) {
                    setTimeout(handleComplete, 200);
                }
            });
        });
    }

    // =============================================
    // ONBOARDING
    // =============================================
    function initOnboarding() {
        const slides = $$
('.onboarding-slide'); const dotsContainer = $id('onboarding-dots'); const dots = dotsContainer.querySelectorAll('.onboarding-dot'); const btnNext = $id('btn-onboarding-next'); const btnSkip = $id('btn-onboarding-skip'); function goToSlide(index) { state.onboardingSlide = index; slides.forEach(s => s.classList.remove('active')); slides[index].classList.add('active'); dots.forEach(d => d.classList.remove('active')); dots[index].classList.add('active'); btnNext.textContent = index === slides.length - 1 ? 'Começar' : 'Próximo'; btnSkip.style.display = index === slides.length - 1 ? 'none' : 'block'; } btnNext.addEventListener('click', async () => { if (state.onboardingSlide < slides.length - 1) { goToSlide(state.onboardingSlide + 1); } else { // Salvar saldos iniciais const saldo = parseMoney($id('onboarding-saldo').value); const investido = parseMoney($id('onboarding-investido').value); await setConfig('saldoInicial', saldo); await setConfig('investidoInicial', investido); await setConfig('onboarded', true); // Inicializar categorias await getCategorias(); navigateTo('dashboard', false); $id('bottom-nav').style.display = 'flex'; showToast('Bem-vindo ao Bolso do Fred! 🎉'); } }); btnSkip.addEventListener('click', async () => { goToSlide(slides.length - 1); }); } // ============================================= // HIDE/SHOW VALUES // ============================================= function initToggleValues() { const btn = $id('btn-toggle-values'); const iconOpen = $id('icon-eye-open'); const iconClosed = $id('icon-eye-closed'); const saved = localStorage.getItem('valuesHidden') === 'true'; state.valuesHidden = saved; updateValuesVisibility(); btn.addEventListener('click', () => { state.valuesHidden = !state.valuesHidden; localStorage.setItem('valuesHidden', state.valuesHidden); updateValuesVisibility(); vibrate(10); }); function updateValuesVisibility() { if (state.valuesHidden) { document.body.classList.add('values-hidden'); iconOpen.style.display = 'none'; iconClosed.style.display = 'block'; } else { document.body.classList.remove('values-hidden'); iconOpen.style.display = 'block'; iconClosed.style.display = 'none'; } } } // ============================================= // SPLASH SCREEN // ============================================= function hideSplash() { const splash = $id('splash-screen'); if (splash) { splash.classList.add('hidden'); setTimeout(() => { splash.style.display = 'none'; }, 500); } } // ============================================= // INICIALIZAÇÃO DA NAV & EVENTOS GLOBAIS // ============================================= function initNavigation() { // Bottom nav
$$('.nav-item[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.nav;
                if (screen) navigateTo(screen);
            });
        });

        // Botão + (add)
        $id('btn-add').addEventListener('click', () => {
            state.editingId = null;
            state.formDirty = false;
            navigateTo('novo-registro');
            initFormRegistro();
        });

        // Back buttons
        $$
('.header-btn-back[data-back]').forEach(btn => { btn.addEventListener('click', () => { goBack(); }); }); // Settings button $id('btn-settings').addEventListener('click', () => { navigateTo('settings'); }); // Mais grid
$$('.mais-item[data-mais-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.maisNav;
                navigateTo(target);
            });
        });

        // Dashboard quick links
        $id('btn-ver-todas').addEventListener('click', () => navigateTo('historico'));
        $id('btn-ver-metas').addEventListener('click', () => navigateTo('metas'));
        $id('btn-ver-fixas-dash').addEventListener('click', () => navigateTo('fixas'));

        // Search toggle
        $id('btn-search-toggle').addEventListener('click', () => {
            const bar = $id('search-bar');
            if (bar.style.display === 'none') {
                bar.style.display = 'flex';
                $id('input-search').focus();
            } else {
                bar.style.display = 'none';
                $id('input-search').value = '';
                state.searchQuery = '';
                renderHistorico();
            }
        });

        // Search input
        $id('input-search').addEventListener('input', debounce((e) => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            const clearBtn = $id('btn-search-clear');
            clearBtn.style.display = state.searchQuery ? 'flex' : 'none';
            renderHistorico();
        }, 200));

        $id('btn-search-clear').addEventListener('click', () => {
            $id('input-search').value = '';
            state.searchQuery = '';
            $id('btn-search-clear').style.display = 'none';
            renderHistorico();
        });

        // Back do registro
        $id('btn-back-registro').addEventListener('click', () => {
            if (state.formDirty) {
                showDiscardModal(() => {
                    state.formDirty = false;
                    goBack();
                });
            } else {
                goBack();
            }
        });

        // Fechar modais no overlay click
        $$
('.modal-overlay').forEach(overlay => { overlay.addEventListener('click', (e) => { if (e.target === overlay) { closeModal(overlay.id); } }); }); // Modal close buttons
$$('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const overlay = btn.closest('.modal-overlay');
                if (overlay) closeModal(overlay.id);
            });
        });
    }

    // =============================================
    // GRÁFICOS TABS
    // =============================================
    function initGraficosTabs() {
        $$
('.graficos-tab').forEach(tab => { tab.addEventListener('click', () => {
$$('.graficos-tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-pressed', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-pressed', 'true');

                const tabId = tab.dataset.tab;
                $$
('.graficos-tab-content').forEach(c => c.classList.remove('active')); $id(`tab-${tabId}`).classList.add('active'); }); }); } // ============================================= // INICIALIZAÇÃO GERAL // ============================================= async function init() { try { // Tema initTheme(); // Abrir DB await openDB(); // Verificar se tem PIN const pin = await getConfig('pin'); if (!pin) { // Primeiro acesso — criar PIN hideSplash();
$$('.screen').forEach(s => s.classList.remove('active'));
                $id('screen-create-pin').classList.add('active');
                $id('screen-create-pin').style.display = 'flex';
                initCreatePinScreen();
            } else {
                // Tem PIN — tela de login
                hideSplash();
                $$
('.screen').forEach(s => s.classList.remove('active')); $id('screen-pin').classList.add('active'); $id('screen-pin').style.display = 'flex'; initPinScreen(); } // Onboarding initOnboarding(); // Money masks initMoneyMasks(); // Toggle values initToggleValues(); // Navigation initNavigation(); // Graficos tabs initGraficosTabs(); // Service Worker initServiceWorker(); // Network status initNetworkStatus(); // PWA install window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.deferredPrompt = e; }); } catch (error) { console.error('Erro na inicialização:', error); hideSplash(); showToast('Erro ao inicializar o app'); } } // Iniciar quando DOM estiver pronto if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); } // ============================================= // ============================================= // DASHBOARD // ============================================= // ============================================= async function renderDashboard() { const skeleton = $id('dashboard-skeleton'); const content = $id('dashboard-content'); skeleton.style.display = 'block'; content.style.display = 'none'; try { // Greeting $id('header-greeting').textContent = getGreeting(); const now = new Date(); const mes = now.getMonth(); const ano = now.getFullYear(); $id('mes-atual').textContent = getMesAnoLabel(mes, ano); const registros = await dbGetAll('registros'); const categorias = await getCategorias(); const saldoInicial = await getConfig('saldoInicial', 0); const investidoInicial = await getConfig('investidoInicial', 0); // Calcular patrimônio let totalReceitas = 0, totalGastos = 0, totalInvestido = 0, totalResgates = 0; let receitasMes = 0, gastosMes = 0, investidoMes = 0, resgatesMes = 0; let gastosMesAnterior = 0; const mesAnterior = mes === 0 ? 11 : mes - 1; const anoMesAnterior = mes === 0 ? ano - 1 : ano; registros.forEach(r => { const val = parseFloat(r.valor) || 0; const d = new Date(r.data + 'T00:00:00'); const rMes = d.getMonth(); const rAno = d.getFullYear(); switch (r.tipo) { case 'receita': totalReceitas += val; break; case 'gasto': totalGastos += val; break; case 'investimento': totalInvestido += val; break; case 'resgate': totalResgates += val; break; } if (rMes === mes && rAno === ano) { switch (r.tipo) { case 'receita': receitasMes += val; break; case 'gasto': gastosMes += val; break; case 'investimento': investidoMes += val; break; case 'resgate': resgatesMes += val; break; } } if (rMes === mesAnterior && rAno === anoMesAnterior && r.tipo === 'gasto') { gastosMesAnterior += val; } }); const saldoLivre = saldoInicial + totalReceitas - totalGastos - totalInvestido + totalResgates; const patrimonioInvestido = investidoInicial + totalInvestido - totalResgates; const patrimonioTotal = saldoLivre + patrimonioInvestido; // Patrimônio $id('patrimonio-total').textContent = formatMoney(patrimonioTotal); const saldoLivreEl = $id('saldo-livre'); saldoLivreEl.textContent = formatMoney(saldoLivre); if (saldoLivre < 0) { saldoLivreEl.classList.add('saldo-negativo'); } else { saldoLivreEl.classList.remove('saldo-negativo'); } $id('total-investido').textContent = formatMoney(patrimonioInvestido); // Resumo mês $id('total-receitas').textContent = `+ ${formatMoney(receitasMes)}`; $id('total-gastos').textContent = `- ${formatMoney(gastosMes)}`; $id('total-investido-mes').textContent = `→ ${formatMoney(investidoMes)}`; // Insight renderInsight(gastosMes, gastosMesAnterior, receitasMes); // Orçamento & metas preview await renderOrcamentoPreview(gastosMes, registros, categorias, mes, ano); // Fixas pendentes await renderFixasPendentes(); // Últimas movimentações renderUltimasMovimentacoes(registros, categorias, mes, ano); // Mostrar conteúdo skeleton.style.display = 'none'; content.style.display = 'block'; } catch (error) { console.error('Erro ao renderizar dashboard:', error); skeleton.style.display = 'none'; content.style.display = 'block'; } } function renderInsight(gastosMes, gastosMesAnterior, receitasMes) { const card = $id('card-insight'); const content = $id('insight-content'); if (gastosMesAnterior > 0) { const diff = ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100; const absDiff = Math.abs(diff).toFixed(0); let text, cls; if (diff > 10) { text = `<span class="insight-icon">📈</span> <span class="insight-text insight-negative">Você gastou <strong>${absDiff}%</strong> a mais que o mês passado. Atenção!</span>`; } else if (diff < -10) { text = `<span class="insight-icon">📉</span> <span class="insight-text insight-positive">Você gastou <strong>${absDiff}%</strong> a menos que o mês passado. Ótimo!</span>`; } else { text = `<span class="insight-icon">➡️</span> <span class="insight-text insight-neutral">Seus gastos estão no mesmo nível do mês passado.</span>`; } if (receitasMes > 0 && gastosMes > receitasMes * 0.8) { text += `<br><span class="insight-icon">⚠️</span> <span class="insight-text insight-negative">Gastos já atingiram ${((gastosMes / receitasMes) * 100).toFixed(0)}% das suas receitas.</span>`; } content.innerHTML = text; card.style.display = 'block'; } else if (gastosMes > 0 && receitasMes > 0) { const pct = ((gastosMes / receitasMes) * 100).toFixed(0); content.innerHTML = `<span class="insight-icon">💡</span> <span class="insight-text">Você já gastou <strong>${pct}%</strong> das suas receitas este mês.</span>`; card.style.display = 'block'; } else { card.style.display = 'none'; } } async function renderOrcamentoPreview(gastosMes, registros, categorias, mes, ano) { const card = $id('card-orcamento'); const geralDiv = $id('orcamento-geral'); const metasDiv = $id('metas-preview'); const orcamento = await getConfig('orcamentoGeral', 0); const metas = await dbGetAll('metas'); if (orcamento <= 0 && metas.length === 0) { card.style.display = 'none'; return; } card.style.display = 'block'; let html = ''; if (orcamento > 0) { const pct = Math.min((gastosMes / orcamento) * 100, 100); const statusClass = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe'; html += ` <div class="progress-container"> <div class="progress-header"> <span class="progress-label">Orçamento Geral</span> <span class="progress-values hide-value">${formatMoney(gastosMes)} / ${formatMoney(orcamento)}</span> </div> <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width:${pct}%"></div></div> <span class="progress-percent ${statusClass}">${pct.toFixed(0)}%</span> ${pct >= 100 ? '<div class="progress-alert danger">⚠️ Orçamento estourado!</div>' : pct >= 80 ? '<div class="progress-alert warning">⚡ Quase no limite</div>' : ''} </div> `; } geralDiv.innerHTML = html; // Metas por categoria let metasHtml = ''; const gastosPorCat = {}; registros.forEach(r => { if (r.tipo === 'gasto') { const d = new Date(r.data + 'T00:00:00'); if (d.getMonth() === mes && d.getFullYear() === ano) { const cat = r.categoria || 'outros'; gastosPorCat[cat] = (gastosPorCat[cat] || 0) + (parseFloat(r.valor) || 0); } } }); metas.forEach(meta => { const gasto = gastosPorCat[meta.id] || 0; const pct = meta.valor > 0 ? Math.min((gasto / meta.valor) * 100, 100) : 0; const statusClass = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe'; const icon = getCategoriaIcon(categorias, meta.id); metasHtml += ` <div class="meta-preview-item"> <span class="meta-preview-icon">${icon}</span> <div class="meta-preview-info"> <span class="meta-preview-name">${getCategoriaNome(categorias, meta.id)}</span> <div class="meta-preview-bar"><div class="meta-preview-fill ${statusClass}" style="width:${pct}%"></div></div> </div> <span class="meta-preview-valor hide-value">${pct.toFixed(0)}%</span> </div> `; }); metasDiv.innerHTML = metasHtml; } async function renderFixasPendentes() { const card = $id('card-fixas-pendentes'); const list = $id('fixas-pendentes-list'); const btnAplicar = $id('btn-aplicar-fixas-dash'); const fixas = await dbGetAll('fixas'); const now = new Date(); const mes = now.getMonth(); const ano = now.getFullYear(); const mesAnoKey = `${ano}-${String(mes + 1).padStart(2, '0')}`; const pendentes = fixas.filter(f => { if (f.status === 'pausada' || f.status === 'encerrada') return false; if (!f.aplicados) f.aplicados = []; return !f.aplicados.includes(mesAnoKey); }); if (pendentes.length === 0) { card.style.display = 'none'; return; } card.style.display = 'block'; let html = ''; pendentes.forEach(f => { const icon = TIPO_ICONS[f.tipo] || '📌'; html += ` <div class="fixa-pend-item"> <span class="fixa-pend-icon">${icon}</span> <span class="fixa-pend-desc">${f.descricao}</span> <span class="fixa-pend-valor ${f.tipo}">${formatMoney(f.valor)}</span> </div> `; }); list.innerHTML = html; // Botão aplicar todas btnAplicar.onclick = async () => { await aplicarFixasPendentes(pendentes, mesAnoKey); showToast(`${pendentes.length} fixa(s) aplicada(s) ✓`); renderDashboard(); }; } async function aplicarFixasPendentes(pendentes, mesAnoKey) { const [ano, mesStr] = mesAnoKey.split('-'); const mes = parseInt(mesStr, 10) - 1; for (const fixa of pendentes) { const dia = Math.min(fixa.dia || 1, new Date(parseInt(ano), mes + 1, 0).getDate()); const data = `${ano}-${mesStr}-${String(dia).padStart(2, '0')}`; const registro = { id: generateId(), tipo: fixa.tipo, valor: fixa.valor, descricao: fixa.descricao, data: data, mesAno: mesAnoKey, categoria: fixa.categoria || '', metodo: fixa.metodo || 'pix', tipoInvestimento: fixa.tipoInvestimento || '', nota: `Fixa: ${fixa.descricao}`, parcela: null, totalParcelas: null, fixaId: fixa.id, criadoEm: Date.now() }; await dbPut('registros', registro); // Marcar como aplicada if (!fixa.aplicados) fixa.aplicados = []; fixa.aplicados.push(mesAnoKey); // Verificar duração if (fixa.duracao && fixa.duracao > 0) { if (fixa.aplicados.length >= fixa.duracao) { fixa.status = 'encerrada'; } } await dbPut('fixas', fixa); } } function renderUltimasMovimentacoes(registros, categorias, mes, ano) { const list = $id('movimentacoes-list'); const mesFiltro = registros.filter(r => { const d = new Date(r.data + 'T00:00:00'); return d.getMonth() === mes && d.getFullYear() === ano; }); mesFiltro.sort((a, b) => { if (b.data !== a.data) return b.data.localeCompare(a.data); return (b.criadoEm || 0) - (a.criadoEm || 0); }); const ultimos = mesFiltro.slice(0, 5); if (ultimos.length === 0) { list.innerHTML = ` <div class="empty-state"> <span class="empty-icon">📝</span> <p>Nenhuma movimentação este mês</p> </div> `; return; } list.innerHTML = ultimos.map(r => renderMovItem(r, categorias)).join(''); // Click handlers list.querySelectorAll('.mov-item').forEach(item => { item.addEventListener('click', () => { const id = item.dataset.id; showMovDetail(id); }); }); } function renderMovItem(r, categorias) { const icon = r.tipo === 'gasto' ? getCategoriaIcon(categorias, r.categoria) : TIPO_ICONS[r.tipo] || '📌'; const desc = r.descricao || getCategoriaNome(categorias, r.categoria) || capitalize(r.tipo); const prefix = r.tipo === 'receita' || r.tipo === 'resgate' ? '+ ' : r.tipo === 'gasto' ? '- ' : '→ '; let meta = formatDate(r.data); if (r.metodo && r.tipo === 'gasto') { meta += ` \cdot  ${METODO_LABELS[r.metodo] || r.metodo}`; } let parcelaBadge = ''; if (r.parcela && r.totalParcelas && r.totalParcelas > 1) { parcelaBadge = `<span class="mov-parcela-badge">${r.parcela}/${r.totalParcelas}</span>`; } return ` <div class="mov-item" data-id="${r.id}" role="button" tabindex="0" aria-label="${desc} ${formatMoney(r.valor)}"> <div class="mov-icon ${r.tipo}">${icon}</div> <div class="mov-info"> <div class="mov-desc">${esc(desc)}${parcelaBadge}</div> <div class="mov-meta">${meta}</div> </div> <span class="mov-valor ${r.tipo} hide-value">${prefix}${formatMoney(r.valor)}</span> </div> `; } function capitalize(str) { if (!str) return ''; return str.charAt(0).toUpperCase() + str.slice(1); } function esc(str) { const el = document.createElement('span'); el.textContent = str || ''; return el.innerHTML; } // ============================================= // ============================================= // DETALHES DO REGISTRO (MODAL) // ============================================= // ============================================= async function showMovDetail(id) { const registro = await dbGet('registros', id); if (!registro) return; const categorias = await getCategorias(); const icon = registro.tipo === 'gasto' ? getCategoriaIcon(categorias, registro.categoria) : TIPO_ICONS[registro.tipo] || '📌'; $id('modal-title').textContent = capitalize(registro.tipo); let bodyHtml = ` <div class="detalhe-valor-destaque ${registro.tipo}"> ${registro.tipo === 'gasto' ? '- ' : registro.tipo === 'receita' || registro.tipo === 'resgate' ? '+ ' : '→ '}${formatMoney(registro.valor)} </div> <div class="detalhe-row"> <span class="detalhe-label">Descrição</span> <span class="detalhe-value">${esc(registro.descricao || '-')}</span> </div> <div class="detalhe-row"> <span class="detalhe-label">Data</span> <span class="detalhe-value">${formatDate(registro.data)}</span> </div> `; if (registro.tipo === 'gasto' && registro.categoria) { bodyHtml += ` <div class="detalhe-row"> <span class="detalhe-label">Categoria</span> <span class="detalhe-value">${icon} ${getCategoriaNome(categorias, registro.categoria)}</span> </div> `; } if (registro.metodo) { bodyHtml += ` <div class="detalhe-row"> <span class="detalhe-label">Método</span> <span class="detalhe-value">${METODO_LABELS[registro.metodo] || registro.metodo}</span> </div> `; } if (registro.parcela && registro.totalParcelas && registro.totalParcelas > 1) { bodyHtml += ` <div class="detalhe-row"> <span class="detalhe-label">Parcela</span> <span class="detalhe-value">${registro.parcela}/${registro.totalParcelas}</span> </div> `; } if (registro.tipo === 'investimento' || registro.tipo === 'resgate') { bodyHtml += ` <div class="detalhe-row"> <span class="detalhe-label">Tipo</span> <span class="detalhe-value">${TIPO_INV_LABELS[registro.tipoInvestimento] || registro.tipoInvestimento || '-'}</span> </div> `; } if (registro.nota) { bodyHtml += ` <div class="detalhe-row"> <span class="detalhe-label">Nota</span> <span class="detalhe-value">${esc(registro.nota)}</span> </div> `; } $id('modal-body').innerHTML = bodyHtml; // Botões $id('modal-btn-edit').onclick = () => { closeModal('modal-overlay'); state.editingId = id; navigateTo('novo-registro'); loadRegistroForEdit(registro, categorias); }; $id('modal-btn-delete').onclick = () => { closeModal('modal-overlay'); showConfirmModal({ icon: '🗑️', text: 'Excluir registro?', desc: `${esc(registro.descricao || capitalize(registro.tipo))} — ${formatMoney(registro.valor)}`, btnText: 'Excluir', onConfirm: async () => { await dbDelete('registros', id); showToast('Registro excluído ✓'); if (state.currentScreen === 'historico') renderHistorico(); else if (state.currentScreen === 'dashboard') renderDashboard(); } }); }; openModal('modal-overlay'); } // ============================================= // ============================================= // FORMULÁRIO — NOVO / EDITAR REGISTRO // ============================================= // ============================================= async function initFormRegistro() { const titleEl = $id('titulo-registro'); titleEl.textContent = state.editingId ? 'Editar Registro' : 'Novo Registro'; const categorias = await getCategorias(); // Categorias select const selectCat = $id('select-categoria'); selectCat.innerHTML = categorias.map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join(''); // Reset $id('form-registro').reset(); $id('input-valor').value = ''; $id('input-descricao').value = ''; $id('input-nota').value = ''; $id('input-parcelas').value = '1'; $id('parcelas-info').textContent = ''; // Tipo
$$('.tipo-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        const defaultTipo = $('.tipo-btn[data-tipo="gasto"]');
        defaultTipo.classList.add('active');
        defaultTipo.setAttribute('aria-pressed', 'true');
        updateFormForTipo('gasto');

        // Data = hoje
        $id('input-data').value = getToday();
        $$
('.chip-date').forEach(c => { c.classList.remove('active'); }); $('.chip-date[data-date="hoje"]').classList.add('active'); $id('input-data').classList.remove('visible'); // Método = crédito
$$('#chips-metodo .chip').forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-pressed', 'false');
        });
        const defaultMetodo = $('#chips-metodo .chip[data-metodo="credito"]');
        defaultMetodo.classList.add('active');
        defaultMetodo.setAttribute('aria-pressed', 'true');
        $id('group-parcelas').classList.remove('hidden');

        state.formDirty = false;
    }

    function updateFormForTipo(tipo) {
        const catGroup = $id('group-categoria');
        const metodoGroup = $id('group-metodo');
        const parcelasGroup = $id('group-parcelas');
        const tipoInvGroup = $id('group-tipo-investimento');

        catGroup.classList.toggle('hidden', tipo !== 'gasto');
        metodoGroup.classList.toggle('hidden', tipo === 'investimento' || tipo === 'resgate');
        tipoInvGroup.classList.toggle('hidden', tipo !== 'investimento' && tipo !== 'resgate');

        // Parcelas só aparecem quando método é crédito e tipo é gasto
        const metodoAtual = $('#chips-metodo .chip.active')?.dataset.metodo;
        parcelasGroup.classList.toggle('hidden', tipo !== 'gasto' || metodoAtual !== 'credito');
    }

    function loadRegistroForEdit(registro, categorias) {
        $id('titulo-registro').textContent = 'Editar Registro';

        // Tipo
        $$
('.tipo-btn').forEach(btn => { const active = btn.dataset.tipo === registro.tipo; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', active); }); updateFormForTipo(registro.tipo); // Valor if (registro.valor) { const val = parseFloat(registro.valor); $id('input-valor').value = val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); } // Descrição $id('input-descricao').value = registro.descricao || ''; // Data $id('input-data').value = registro.data || getToday();
$$('.chip-date').forEach(c => c.classList.remove('active'));
        if (registro.data === getToday()) {
            $('.chip-date[data-date="hoje"]').classList.add('active');
        } else if (registro.data === getYesterday()) {
            $('.chip-date[data-date="ontem"]').classList.add('active');
        } else {
            $('.chip-date[data-date="custom"]').classList.add('active');
            $id('input-data').classList.add('visible');
        }

        // Categoria
        if (registro.categoria) {
            $id('select-categoria').value = registro.categoria;
        }

        // Método
        if (registro.metodo) {
            $$
('#chips-metodo .chip').forEach(c => { const active = c.dataset.metodo === registro.metodo; c.classList.toggle('active', active); c.setAttribute('aria-pressed', active); }); } // Parcelas if (registro.totalParcelas && registro.totalParcelas > 1) { $id('input-parcelas').value = registro.totalParcelas; updateParcelasInfo(); } // Tipo investimento if (registro.tipoInvestimento) { $id('select-tipo-investimento').value = registro.tipoInvestimento; } // Nota if (registro.nota) { $id('input-nota').value = registro.nota; } state.formDirty = false; } function updateParcelasInfo() { const valor = parseMoney($id('input-valor').value); const parcelas = parseInt($id('input-parcelas').value, 10) || 1; const info = $id('parcelas-info'); if (parcelas > 1 && valor > 0) { const valParcela = valor / parcelas; info.textContent = `${parcelas}x de ${formatMoney(valParcela)}`; } else { info.textContent = ''; } } // Form event listeners function initFormEvents() { // Tipo buttons
$$('.tipo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$
('.tipo-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); }); btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); updateFormForTipo(btn.dataset.tipo); state.formDirty = true; }); }); // Date shortcuts
$$('.chip-date').forEach(chip => {
            chip.addEventListener('click', () => {
                $$
('.chip-date').forEach(c => c.classList.remove('active')); chip.classList.add('active'); const dateType = chip.dataset.date; const dateInput = $id('input-data'); if (dateType === 'hoje') { dateInput.value = getToday(); dateInput.classList.remove('visible'); } else if (dateType === 'ontem') { dateInput.value = getYesterday(); dateInput.classList.remove('visible'); } else { dateInput.classList.add('visible'); dateInput.focus(); } state.formDirty = true; }); }); // Método chips
$$('#chips-metodo .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                $$('#chips-metodo .chip').forEach(c => {
                    c.classList.remove('active');
                    c.setAttribute('aria-pressed', 'false');
                });
                chip.classList.add('active');
                chip.setAttribute('aria-pressed', 'true');

                // Mostrar/esconder parcelas
                const parcelasGroup = $id('group-parcelas');
                const tipoAtual = $('.tipo-btn.active')?.dataset.tipo;
                parcelasGroup.classList.toggle('hidden', tipoAtual !== 'gasto' || chip.dataset.metodo !== 'credito');
                state.formDirty = true;
            });
        });

        // Parcelas change
        $id('input-parcelas').addEventListener('change', updateParcelasInfo);
        $id('input-valor').addEventListener('input', () => {
            updateParcelasInfo();
            state.formDirty = true;
        });

        // Track dirty
        $id('input-descricao').addEventListener('input', () => state.formDirty = true);
        $id('select-categoria').addEventListener('change', () => state.formDirty = true);
        $id('input-nota').addEventListener('input', () => state.formDirty = true);
        $id('input-data').addEventListener('change', () => state.formDirty = true);

        // Submit
        $id('form-registro').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveRegistro();
        });
    }

    async function saveRegistro() {
        const tipo = $('.tipo-btn.active')?.dataset.tipo;
        const valor = parseMoney($id('input-valor').value);
        const descricao = $id('input-descricao').value.trim();
        const data = $id('input-data').value;
        const categoria = tipo === 'gasto' ? $id('select-categoria').value : '';
        const metodo = (tipo === 'gasto') ? ($('#chips-metodo .chip.active')?.dataset.metodo || 'pix') : '';
        const parcelas = (tipo === 'gasto' && metodo === 'credito') ? parseInt($id('input-parcelas').value, 10) || 1 : 1;
        const tipoInvestimento = (tipo === 'investimento' || tipo === 'resgate') ? $id('select-tipo-investimento').value : '';
        const nota = $id('input-nota').value.trim();

        // Validação
        if (!valor || valor <= 0) {
            showToast('Informe o valor');
            $id('input-valor').focus();
            return;
        }
        if (!data) {
            showToast('Selecione a data');
            return;
        }

        const d = new Date(data + 'T00:00:00');
        const mesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (state.editingId) {
            // Editar
            const registro = await dbGet('registros', state.editingId);
            if (registro) {
                registro.tipo = tipo;
                registro.valor = valor;
                registro.descricao = descricao;
                registro.data = data;
                registro.mesAno = mesAno;
                registro.categoria = categoria;
                registro.metodo = metodo;
                registro.tipoInvestimento = tipoInvestimento;
                registro.nota = nota;
                await dbPut('registros', registro);
                showToast('Registro atualizado ✓');
            }
        } else {
            // Criar
            if (parcelas > 1) {
                // Parcelamento
                const valorParcela = Math.round((valor / parcelas) * 100) / 100;
                for (let i = 0; i < parcelas; i++) {
                    const parcelaDate = new Date(d);
                    parcelaDate.setMonth(parcelaDate.getMonth() + i);
                    const pData = `${parcelaDate.getFullYear()}-${String(parcelaDate.getMonth() + 1).padStart(2, '0')}-${String(parcelaDate.getDate()).padStart(2, '0')}`;
                    const pMesAno = `${parcelaDate.getFullYear()}-${String(parcelaDate.getMonth() + 1).padStart(2, '0')}`;

                    const registro = {
                        id: generateId(),
                        tipo,
                        valor: valorParcela,
                        descricao: descricao || `Parcela ${i + 1}/${parcelas}`,
                        data: pData,
                        mesAno: pMesAno,
                        categoria,
                        metodo,
                        tipoInvestimento,
                        nota,
                        parcela: i + 1,
                        totalParcelas: parcelas,
                        parcelamentoId: generateId(),
                        criadoEm: Date.now()
                    };
                    await dbPut('registros', registro);
                }
                showToast(`${parcelas} parcelas criadas ✓`);
            } else {
                const registro = {
                    id: generateId(),
                    tipo,
                    valor,
                    descricao,
                    data,
                    mesAno,
                    categoria,
                    metodo,
                    tipoInvestimento,
                    nota,
                    parcela: null,
                    totalParcelas: null,
                    criadoEm: Date.now()
                };
                await dbPut('registros', registro);
                showToast('Registro salvo ✓');
            }
        }

        state.formDirty = false;
        state.editingId = null;

        // Verificar metas
        if (tipo === 'gasto') {
            await checkMetaAlertForCategory(categoria);
        }

        goBack();
    }

    async function checkMetaAlertForCategory(catId) {
        if (!catId) return;
        const metas = await dbGetAll('metas');
        const meta = metas.find(m => m.id === catId);
        if (!meta || !meta.valor) return;

        const now = new Date();
        const mes = now.getMonth();
        const ano = now.getFullYear();
        const registros = await dbGetAll('registros');
        const categorias = await getCategorias();

        let gastosCat = 0;
        registros.forEach(r => {
            if (r.tipo === 'gasto' && r.categoria === catId) {
                const d = new Date(r.data + 'T00:00:00');
                if (d.getMonth() === mes && d.getFullYear() === ano) {
                    gastosCat += parseFloat(r.valor) || 0;
                }
            }
        });

        const pct = (gastosCat / meta.valor) * 100;
        const catNome = getCategoriaNome(categorias, catId);

        if (pct >= 100) {
            showToast(`⚠️ Meta de ${catNome} estourada! (${pct.toFixed(0)}%)`);
        } else if (pct >= 80) {
            showToast(`⚡ ${catNome}: ${pct.toFixed(0)}% da meta`);
        }
    }

    async function checkMetaAlerts() {
        const orcamento = await getConfig('orcamentoGeral', 0);
        if (!orcamento) return;

        const now = new Date();
        const mes = now.getMonth();
        const ano = now.getFullYear();
        const registros = await dbGetAll('registros');

        let gastosMes = 0;
        registros.forEach(r => {
            if (r.tipo === 'gasto') {
                const d = new Date(r.data + 'T00:00:00');
                if (d.getMonth() === mes && d.getFullYear() === ano) {
                    gastosMes += parseFloat(r.valor) || 0;
                }
            }
        });

        const pct = (gastosMes / orcamento) * 100;
        if (pct >= 100) {
            showToast('⚠️ Orçamento do mês estourado!');
        } else if (pct >= 80) {
            showToast(`⚡ Orçamento em ${pct.toFixed(0)}%`);
        }
    }

    async function checkPendingFixas() {
        const fixas = await dbGetAll('fixas');
        const now = new Date();
        const mesAnoKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const pendentes = fixas.filter(f => {
            if (f.status === 'pausada' || f.status === 'encerrada') return false;
            if (!f.aplicados) f.aplicados = [];
            return !f.aplicados.includes(mesAnoKey);
        });

        if (pendentes.length > 0) {
            setTimeout(() => {
                showToast(`🔁 ${pendentes.length} fixa(s) pendente(s) este mês`);
            }, 1500);
        }
    }

    // Inicializar eventos do formulário
    initFormEvents();

    // =============================================
    // =============================================
    // HISTÓRICO
    // =============================================
    // =============================================
    function initHistoricoFiltros() {
        // Filtro tipo
        $$
('.filtro-chip[data-filtro-tipo]').forEach(chip => { chip.addEventListener('click', () => {
$$('.filtro-chip[data-filtro-tipo]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.filtroHistoricoTipo = chip.dataset.filtroTipo;
                renderHistorico();
            });
        });

        // Filtro mês
        $id('filtro-mes-prev').addEventListener('click', () => {
            state.filtroHistoricoMes--;
            if (state.filtroHistoricoMes < 0) {
                state.filtroHistoricoMes = 11;
                state.filtroHistoricoAno--;
            }
            state.filtroHistoricoTodosMeses = false;
            $id('filtro-todos-meses').classList.remove('active');
            $id('filtro-todos-meses').setAttribute('aria-pressed', 'false');
            renderHistorico();
        });

        $id('filtro-mes-next').addEventListener('click', () => {
            state.filtroHistoricoMes++;
            if (state.filtroHistoricoMes > 11) {
                state.filtroHistoricoMes = 0;
                state.filtroHistoricoAno++;
            }
            state.filtroHistoricoTodosMeses = false;
            $id('filtro-todos-meses').classList.remove('active');
            $id('filtro-todos-meses').setAttribute('aria-pressed', 'false');
            renderHistorico();
        });

        // Clique no label de mês abre datepicker conceitual (volta pro mês atual)
        $id('filtro-mes-label').addEventListener('click', () => {
            state.filtroHistoricoMes = new Date().getMonth();
            state.filtroHistoricoAno = new Date().getFullYear();
            state.filtroHistoricoTodosMeses = false;
            $id('filtro-todos-meses').classList.remove('active');
            $id('filtro-todos-meses').setAttribute('aria-pressed', 'false');
            renderHistorico();
        });

        // Todos os meses
        $id('filtro-todos-meses').addEventListener('click', () => {
            state.filtroHistoricoTodosMeses = !state.filtroHistoricoTodosMeses;
            $id('filtro-todos-meses').classList.toggle('active', state.filtroHistoricoTodosMeses);
            $id('filtro-todos-meses').setAttribute('aria-pressed', state.filtroHistoricoTodosMeses);
            renderHistorico();
        });
    }

    async function renderHistorico() {
        const list = $id('historico-list');
        const countEl = $id('historico-count');
        const somaEl = $id('historico-soma');

        // Update label
        $id('filtro-mes-label').textContent = getMesAnoLabel(state.filtroHistoricoMes, state.filtroHistoricoAno);

        const registros = await dbGetAll('registros');
        const categorias = await getCategorias();

        // Filtrar
        let filtered = registros;

        // Por mês
        if (!state.filtroHistoricoTodosMeses) {
            filtered = filtered.filter(r => {
                const d = new Date(r.data + 'T00:00:00');
                return d.getMonth() === state.filtroHistoricoMes && d.getFullYear() === state.filtroHistoricoAno;
            });
        }

        // Por tipo
        if (state.filtroHistoricoTipo !== 'todos') {
            filtered = filtered.filter(r => r.tipo === state.filtroHistoricoTipo);
        }

        // Busca
        if (state.searchQuery) {
            filtered = filtered.filter(r => {
                const desc = (r.descricao || '').toLowerCase();
                const cat = getCategoriaNome(categorias, r.categoria).toLowerCase();
                const nota = (r.nota || '').toLowerCase();
                return desc.includes(state.searchQuery) || cat.includes(state.searchQuery) || nota.includes(state.searchQuery);
            });
        }

        // Ordenar
        filtered.sort((a, b) => {
            if (b.data !== a.data) return b.data.localeCompare(a.data);
            return (b.criadoEm || 0) - (a.criadoEm || 0);
        });

        // Contagem e soma
        let somaReceitas = 0, somaGastos = 0, somaInvestimentos = 0, somaResgates = 0;
        filtered.forEach(r => {
            const val = parseFloat(r.valor) || 0;
            switch (r.tipo) {
                case 'receita': somaReceitas += val; break;
                case 'gasto': somaGastos += val; break;
                case 'investimento': somaInvestimentos += val; break;
                case 'resgate': somaResgates += val; break;
            }
        });
        const saldo = somaReceitas + somaResgates - somaGastos - somaInvestimentos;

        countEl.textContent = `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`;
        somaEl.innerHTML = `Saldo: <strong class="${saldo >= 0 ? '' : 'saldo-negativo'}">${formatMoney(saldo)}</strong>`;

        // Empty state
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>${state.searchQuery ? 'Nenhum resultado para a busca' : 'Nenhum registro encontrado'}</p>
                </div>
            `;
            return;
        }

        // Agrupar por dia
        const grupos = {};
        filtered.forEach(r => {
            const key = r.data;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(r);
        });

        let html = '';
        Object.keys(grupos).sort().reverse().forEach(dataKey => {
            const items = grupos[dataKey];
            const dataLabel = formatDateFull(dataKey);

            // Soma do dia
            let somaDia = 0;
            items.forEach(r => {
                const val = parseFloat(r.valor) || 0;
                if (r.tipo === 'receita' || r.tipo === 'resgate') somaDia += val;
                else somaDia -= val;
            });

            html += `
                <div class="historico-grupo">
                    <div class="historico-grupo-header">
                        <span>${dataLabel}</span>
                        <span class="historico-grupo-total ${somaDia >= 0 ? '' : 'saldo-negativo'}">${somaDia >= 0 ? '+' : ''}${formatMoney(somaDia)}</span>
                    </div>
            `;

            items.forEach(r => {
                html += renderMovItem(r, categorias);
            });

            html += `</div>`;
        });

        list.innerHTML = html;

        // Click handlers
        list.querySelectorAll('.mov-item').forEach(item => {
            item.addEventListener('click', () => {
                showMovDetail(item.dataset.id);
            });
            // Keyboard
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showMovDetail(item.dataset.id);
                }
            });
        });
    }

    function formatDateFull(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        const hoje = new Date();
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);

        if (d.toDateString() === hoje.toDateString()) return 'Hoje';
        if (d.toDateString() === ontem.toDateString()) return 'Ontem';

        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dia = d.getDate();
        const diaSemana = diasSemana[d.getDay()];
        const mes = MESES_CURTOS[d.getMonth()];

        return `${diaSemana}, ${dia} ${mes}`;
    }

    // Inicializar filtros do histórico
    initHistoricoFiltros();


    // =============================================
    // =============================================
    // GRÁFICOS
    // =============================================
    // =============================================
    function initGraficosFiltros() {
        $id('grafico-mes-prev').addEventListener('click', () => {
            state.graficoMes--;
            if (state.graficoMes < 0) {
                state.graficoMes = 11;
                state.graficoAno--;
            }
            renderGraficos();
        });

        $id('grafico-mes-next').addEventListener('click', () => {
            state.graficoMes++;
            if (state.graficoMes > 11) {
                state.graficoMes = 0;
                state.graficoAno++;
            }
            renderGraficos();
        });
    }

    async function renderGraficos() {
        $id('grafico-mes-label').textContent = getMesAnoLabel(state.graficoMes, state.graficoAno);

        const registros = await dbGetAll('registros');
        const categorias = await getCategorias();
        const mes = state.graficoMes;
        const ano = state.graficoAno;

        // Dados do mês
        let receitasMes = 0, gastosMes = 0, investidoMes = 0;
        const gastosPorCat = {};

        registros.forEach(r => {
            const d = new Date(r.data + 'T00:00:00');
            if (d.getMonth() === mes && d.getFullYear() === ano) {
                const val = parseFloat(r.valor) || 0;
                switch (r.tipo) {
                    case 'receita': receitasMes += val; break;
                    case 'gasto':
                        gastosMes += val;
                        const cat = r.categoria || 'outros';
                        gastosPorCat[cat] = (gastosPorCat[cat] || 0) + val;
                        break;
                    case 'investimento': investidoMes += val; break;
                }
            }
        });

        renderBalanco(receitasMes, gastosMes, investidoMes);
        renderTopGastos(registros, categorias, mes, ano);
        renderPizzaCategorias(gastosPorCat, categorias, gastosMes);
        renderBarrasEvolucao(registros, mes, ano);
        renderPatrimonioChart(registros);
        renderProjecao(registros);
    }

    function renderBalanco(receitas, gastos, investido) {
        const container = $id('grafico-balanco');
        const max = Math.max(receitas, gastos, investido, 1);
        const saldo = receitas - gastos - investido;

        container.innerHTML = `
            <div class="balanco-row">
                <span class="balanco-icon">💵</span>
                <div class="balanco-info">
                    <span class="balanco-label">Receitas</span>
                    <div class="balanco-bar-bg"><div class="balanco-bar-fill receita" style="width:${(receitas / max * 100)}%"></div></div>
                </div>
                <span class="balanco-valor receita hide-value">${formatMoney(receitas)}</span>
            </div>
            <div class="balanco-row">
                <span class="balanco-icon">💸</span>
                <div class="balanco-info">
                    <span class="balanco-label">Gastos</span>
                    <div class="balanco-bar-bg"><div class="balanco-bar-fill gasto" style="width:${(gastos / max * 100)}%"></div></div>
                </div>
                <span class="balanco-valor gasto hide-value">${formatMoney(gastos)}</span>
            </div>
            <div class="balanco-row">
                <span class="balanco-icon">📈</span>
                <div class="balanco-info">
                    <span class="balanco-label">Investido</span>
                    <div class="balanco-bar-bg"><div class="balanco-bar-fill investimento" style="width:${(investido / max * 100)}%"></div></div>
                </div>
                <span class="balanco-valor investimento hide-value">${formatMoney(investido)}</span>
            </div>
            <div class="balanco-saldo">
                <span class="balanco-saldo-label">Saldo do mês</span>
                <span class="balanco-saldo-valor ${saldo >= 0 ? 'positivo' : 'negativo'} hide-value">${formatMoney(saldo)}</span>
            </div>
        `;
    }

    function renderTopGastos(registros, categorias, mes, ano) {
        const container = $id('grafico-top-list');
        const gastos = registros.filter(r => {
            if (r.tipo !== 'gasto') return false;
            const d = new Date(r.data + 'T00:00:00');
            return d.getMonth() === mes && d.getFullYear() === ano;
        });

        gastos.sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0));
        const top5 = gastos.slice(0, 5);

        if (top5.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Sem gastos neste mês</p></div>';
            return;
        }

        const maxVal = parseFloat(top5[0].valor) || 1;
        container.innerHTML = top5.map((r, i) => {
            const val = parseFloat(r.valor) || 0;
            const pct = (val / maxVal) * 100;
            const icon = getCategoriaIcon(categorias, r.categoria);
            const catNome = getCategoriaNome(categorias, r.categoria);
            return `
                <div class="top-item">
                    <span class="top-rank">${i + 1}°</span>
                    <span class="top-icon">${icon}</span>
                    <div class="top-info">
                        <div class="top-desc">${esc(r.descricao || catNome)}</div>
                        <div class="top-cat">${catNome} · ${formatDate(r.data)}</div>
                        <div class="top-bar-bg"><div class="top-bar-fill" style="width:${pct}%"></div></div>
                    </div>
                    <span class="top-valor hide-value">${formatMoney(val)}</span>
                </div>
            `;
        }).join('');
    }

    function renderPizzaCategorias(gastosPorCat, categorias, totalGastos) {
        const container = $id('grafico-pizza-container');

        if (totalGastos <= 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">🥧</span><p>Sem gastos neste mês</p></div>';
            return;
        }

        // Ordenar
        const catEntries = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]);

        // Agrupar categorias pequenas (< 3%) em "Outros"
        const threshold = totalGastos * 0.03;
        const mainCats = [];
        let outrosTotal = 0;
        catEntries.forEach(([catId, val]) => {
            if (val >= threshold) {
                mainCats.push([catId, val]);
            } else {
                outrosTotal += val;
            }
        });
        if (outrosTotal > 0) {
            mainCats.push(['_outros_agrupado', outrosTotal]);
        }

        // SVG Pizza (Donut)
        let svgPaths = '';
        let offset = 0;
        const radius = 40;
        const circumference = 2 * Math.PI * radius;

        mainCats.forEach(([catId, val], i) => {
            const pct = val / totalGastos;
            const dashLength = pct * circumference;
            const dashOffset = -offset * circumference;
            const color = CHART_COLORS[i % CHART_COLORS.length];

            svgPaths += `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="${dashLength} ${circumference - dashLength}" stroke-dashoffset="${dashOffset}" />`;
            offset += pct;
        });

        // Legenda
        const legenda = mainCats.map(([catId, val], i) => {
            const pct = ((val / totalGastos) * 100).toFixed(1);
            const color = CHART_COLORS[i % CHART_COLORS.length];
            const icon = catId === '_outros_agrupado' ? '📌' : getCategoriaIcon(categorias, catId);
            const nome = catId === '_outros_agrupado' ? 'Outros' : getCategoriaNome(categorias, catId);

            return `
                <div class="pizza-legenda-item">
                    <span class="pizza-legenda-dot" style="background:${color}"></span>
                    <span class="pizza-legenda-label">${icon} ${nome}</span>
                    <span class="pizza-legenda-valor hide-value">${formatMoney(val)}</span>
                    <span class="pizza-legenda-pct">${pct}%</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="pizza-wrapper">
                <div class="pizza-svg-container">
                    <svg viewBox="0 0 100 100">
                        ${svgPaths}
                        <text x="50" y="48" text-anchor="middle" fill="var(--text-primary)" font-size="8" font-weight="800" class="hide-value">${formatMoney(totalGastos)}</text>
                        <text x="50" y="57" text-anchor="middle" fill="var(--text-muted)" font-size="4">Total</text>
                    </svg>
                </div>
                <div class="pizza-legenda">${legenda}</div>
            </div>
        `;
    }

    function renderBarrasEvolucao(registros, mesAtual, anoAtual) {
        const container = $id('grafico-barras-container');
        const meses = [];

        // Últimos 6 meses
        for (let i = 5; i >= 0; i--) {
            let m = mesAtual - i;
            let a = anoAtual;
            while (m < 0) { m += 12; a--; }
            meses.push({ mes: m, ano: a });
        }

        // Calcular valores
        const dados = meses.map(({ mes, ano }) => {
            let receitas = 0, gastos = 0, investimentos = 0;
            registros.forEach(r => {
                const d = new Date(r.data + 'T00:00:00');
                if (d.getMonth() === mes && d.getFullYear() === ano) {
                    const val = parseFloat(r.valor) || 0;
                    switch (r.tipo) {
                        case 'receita': receitas += val; break;
                        case 'gasto': gastos += val; break;
                        case 'investimento': investimentos += val; break;
                    }
                }
            });
            return { mes, ano, receitas, gastos, investimentos };
        });

        const maxVal = Math.max(...dados.flatMap(d => [d.receitas, d.gastos, d.investimentos]), 1);
        const maxHeight = 120;

        container.innerHTML = dados.map(d => {
            const hRec = Math.max((d.receitas / maxVal) * maxHeight, 2);
            const hGas = Math.max((d.gastos / maxVal) * maxHeight, 2);
            const hInv = Math.max((d.investimentos / maxVal) * maxHeight, 2);
            const label = MESES_CURTOS[d.mes];
            const isAtual = d.mes === mesAtual && d.ano === anoAtual;

            return `
                <div class="barra-grupo">
                    <div class="barra-conjunto">
                        <div class="barra receita" style="height:${hRec}px" title="${formatMoney(d.receitas)}"></div>
                        <div class="barra gasto" style="height:${hGas}px" title="${formatMoney(d.gastos)}"></div>
                        <div class="barra investimento" style="height:${hInv}px" title="${formatMoney(d.investimentos)}"></div>
                    </div>
                    <span class="barra-label" style="${isAtual ? 'color:var(--green-medium);font-weight:800;' : ''}">${label}</span>
                </div>
            `;
        }).join('');
    }

    async function renderPatrimonioChart(registros) {
        const container = $id('grafico-patrimonio-container');
        const saldoInicial = await getConfig('saldoInicial', 0);
        const investidoInicial = await getConfig('investidoInicial', 0);
        const patrimonioBase = saldoInicial + investidoInicial;

        const now = new Date();
        const meses = [];
        for (let i = 5; i >= 0; i--) {
            let m = now.getMonth() - i;
            let a = now.getFullYear();
            while (m < 0) { m += 12; a--; }
            meses.push({ mes: m, ano: a });
        }

        // Calcular patrimônio acumulado até cada mês
        const patrimonios = meses.map(({ mes, ano }) => {
            let total = patrimonioBase;
            registros.forEach(r => {
                const d = new Date(r.data + 'T00:00:00');
                const rMes = d.getMonth();
                const rAno = d.getFullYear();

                // Só contar registros até o final deste mês
                if (rAno < ano || (rAno === ano && rMes <= mes)) {
                    const val = parseFloat(r.valor) || 0;
                    switch (r.tipo) {
                        case 'receita': total += val; break;
                        case 'gasto': total -= val; break;
                        // Investimento e resgate não mudam patrimônio total
                    }
                }
            });
            return total;
        });

        const minVal = Math.min(...patrimonios);
        const maxVal = Math.max(...patrimonios);
        const range = maxVal - minVal || 1;
        const width = 300;
        const height = 120;
        const padding = 10;

        const points = patrimonios.map((val, i) => {
            const x = padding + (i / (patrimonios.length - 1 || 1)) * (width - 2 * padding);
            const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
            return { x, y, val };
        });

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const areaPath = linePath + ` L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;

        const dots = points.map(p => `<circle class="patrimonio-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" />`).join('');

        const labels = meses.map((m, i) => `
            <div class="patrimonio-label-item" style="flex:1;">
                <div>${MESES_CURTOS[m.mes]}</div>
                <div class="patrimonio-valor-item hide-value">${formatMoney(patrimonios[i])}</div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="patrimonio-chart">
                <svg class="patrimonio-chart-svg" viewBox="0 0 ${width} ${height}">
                    <defs>
                        <linearGradient id="patrimonioGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="var(--green-medium)" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="var(--green-medium)" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    <path class="patrimonio-area" d="${areaPath}" />
                    <path class="patrimonio-line" d="${linePath}" />
                    ${dots}
                </svg>
                <div class="patrimonio-labels">${labels}</div>
            </div>
        `;
    }

    async function renderProjecao(registros) {
        const container = $id('projecao-chart-container');
        const tabela = $id('projecao-tabela');
        const info = $id('projecao-info');

        const saldoInicial = await getConfig('saldoInicial', 0);
        const investidoInicial = await getConfig('investidoInicial', 0);
        const fixas = await dbGetAll('fixas');

        const now = new Date();
        const mesAtual = now.getMonth();
        const anoAtual = now.getFullYear();

        // Média dos últimos 3 meses
        let mediaReceitas = 0, mediaGastos = 0, mediaInvestimentos = 0;
        let mesesContados = 0;

        for (let i = 1; i <= 3; i++) {
            let m = mesAtual - i;
            let a = anoAtual;
            while (m < 0) { m += 12; a--; }

            let rec = 0, gas = 0, inv = 0;
            let temDados = false;
            registros.forEach(r => {
                const d = new Date(r.data + 'T00:00:00');
                if (d.getMonth() === m && d.getFullYear() === a) {
                    temDados = true;
                    const val = parseFloat(r.valor) || 0;
                    if (r.tipo === 'receita') rec += val;
                    else if (r.tipo === 'gasto') gas += val;
                    else if (r.tipo === 'investimento') inv += val;
                }
            });

            if (temDados) {
                mediaReceitas += rec;
                mediaGastos += gas;
                mediaInvestimentos += inv;
                mesesContados++;
            }
        }

        if (mesesContados === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Dados insuficientes para projeção</p></div>';
            tabela.innerHTML = '';
            info.innerHTML = '';
            return;
        }

        mediaReceitas /= mesesContados;
        mediaGastos /= mesesContados;
        mediaInvestimentos /= mesesContados;

        // Somar fixas ativas
        let fixasReceita = 0, fixasGasto = 0, fixasInvestimento = 0;
        fixas.forEach(f => {
            if (f.status === 'pausada' || f.status === 'encerrada') return;
            const val = parseFloat(f.valor) || 0;
            if (f.tipo === 'receita') fixasReceita += val;
            else if (f.tipo === 'gasto') fixasGasto += val;
            else if (f.tipo === 'investimento') fixasInvestimento += val;
        });

        // Usar maior entre média e fixas como base de projeção
        const projecaoReceita = Math.max(mediaReceitas, fixasReceita);
        const projecaoGasto = Math.max(mediaGastos, fixasGasto);
        const saldoMensal = projecaoReceita - projecaoGasto - Math.max(mediaInvestimentos, fixasInvestimento);

        // Patrimônio atual
        let patrimonioAtual = saldoInicial + investidoInicial;
        registros.forEach(r => {
            const val = parseFloat(r.valor) || 0;
            if (r.tipo === 'receita') patrimonioAtual += val;
            else if (r.tipo === 'gasto') patrimonioAtual -= val;
        });

        // Projetar 6 meses
        const projecaoMeses = [];
        for (let i = 0; i <= 6; i++) {
            let m = mesAtual + i;
            let a = anoAtual;
            while (m > 11) { m -= 12; a++; }

            if (i === 0) {
                projecaoMeses.push({ mes: m, ano: a, patrimonio: patrimonioAtual, atual: true });
            } else {
                const anterior = projecaoMeses[i - 1].patrimonio;
                projecaoMeses.push({ mes: m, ano: a, patrimonio: anterior + saldoMensal, atual: false });
            }
        }

        // Gráfico SVG
        const width = 300;
        const height = 120;
        const padding = 10;
        const vals = projecaoMeses.map(p => p.patrimonio);
        const minV = Math.min(...vals);
        const maxV = Math.max(...vals);
        const rangeV = maxV - minV || 1;

        const points = vals.map((val, i) => ({
            x: padding + (i / (vals.length - 1)) * (width - 2 * padding),
            y: height - padding - ((val - minV) / rangeV) * (height - 2 * padding),
            val
        }));

        const realLine = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
        const projLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

        const dots = points.map((p, i) => {
            const color = i === 0 ? 'var(--green-medium)' : 'var(--purple-medium)';
            const r = i === 0 ? 4 : 3;
            return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" />`;
        }).join('');

        container.innerHTML = `
            <div class="projecao-chart">
                <svg class="projecao-svg" viewBox="0 0 ${width} ${height}">
                    <defs>
                        <linearGradient id="projGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="var(--purple-medium)" stop-opacity="0.15"/>
                            <stop offset="100%" stop-color="var(--purple-medium)" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    <path d="${projLine} L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z" fill="url(#projGrad)" />
                    <path d="${projLine}" fill="none" stroke="var(--purple-medium)" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" />
                    <path d="${realLine}" fill="none" stroke="var(--green-medium)" stroke-width="2.5" stroke-linecap="round" />
                    ${dots}
                </svg>
                <div class="projecao-labels">
                    ${projecaoMeses.map((p, i) => `
                        <span class="projecao-label-item ${i === 0 ? 'atual' : 'futuro'}">${MESES_CURTOS[p.mes]}</span>
                    `).join('')}
                </div>
                <div class="projecao-legenda">
                    <span class="legenda-item"><span class="legenda-dot" style="background:var(--green-medium)"></span>Atual</span>
                    <span class="legenda-item"><span class="legenda-dot" style="background:var(--purple-medium)"></span>Projeção</span>
                </div>
            </div>
        `;

        // Tabela
        let tabelaHtml = `
            <div class="projecao-table">
                <div class="projecao-table-header">
                    <span>Mês</span>
                    <span style="text-align:right">Patrimônio</span>
                    <span style="text-align:right">Variação</span>
                </div>
        `;

        projecaoMeses.forEach((p, i) => {
            const variacao = i === 0 ? 0 : saldoMensal;
            const rowClass = p.atual ? 'projecao-row-atual' : 'projecao-row-futuro';
            tabelaHtml += `
                <div class="projecao-table-row ${rowClass}">
                    <span>${MESES_CURTOS[p.mes]}/${p.ano}</span>
                    <span class="projecao-table-valor hide-value ${p.patrimonio >= 0 ? 'positivo' : 'negativo'}">${formatMoney(p.patrimonio)}</span>
                    <span class="projecao-table-valor ${variacao >= 0 ? 'positivo' : 'negativo'}">${i === 0 ? '—' : (variacao >= 0 ? '+' : '') + formatMoney(variacao)}</span>
                </div>
            `;
        });

        tabelaHtml += '</div>';
        tabela.innerHTML = tabelaHtml;

        // Info
        const patrimonioEm6 = projecaoMeses[projecaoMeses.length - 1].patrimonio;
        const crescimento = patrimonioEm6 - patrimonioAtual;
        info.innerHTML = `
            <div class="projecao-resumo">
                <div class="projecao-resumo-item">
                    <span class="projecao-resumo-label">Saldo mensal estimado</span>
                    <span class="projecao-resumo-valor ${saldoMensal >= 0 ? 'positivo' : 'negativo'} hide-value">${formatMoney(saldoMensal)}</span>
                </div>
                <div class="projecao-resumo-item destaque">
                    <span class="projecao-resumo-label">Patrimônio em 6 meses</span>
                    <span class="projecao-resumo-valor ${patrimonioEm6 >= 0 ? 'positivo' : 'negativo'} hide-value">${formatMoney(patrimonioEm6)}</span>
                </div>
                <div class="projecao-resumo-item">
                    <span class="projecao-resumo-label">Crescimento estimado</span>
                    <span class="projecao-resumo-valor ${crescimento >= 0 ? 'positivo' : 'negativo'} hide-value">${crescimento >= 0 ? '+' : ''}${formatMoney(crescimento)}</span>
                </div>
            </div>
            <p class="projecao-aviso">⚠️ Projeção baseada na média dos últimos ${mesesContados} meses e despesas fixas</p>
        `;
    }

    // Inicializar filtros dos gráficos
    initGraficosFiltros();


    // =============================================
    // =============================================
    // METAS & ORÇAMENTO
    // =============================================
    // =============================================
    async function renderMetas() {
        const categorias = await getCategorias();
        const metas = await dbGetAll('metas');
        const registros = await dbGetAll('registros');
        const orcamento = await getConfig('orcamentoGeral', 0);
        const metaInv = await getConfig('metaInvestimento', 0);

        const now = new Date();
        const mes = now.getMonth();
        const ano = now.getFullYear();

        // Gastos do mês por categoria
        const gastosPorCat = {};
        let gastosTotalMes = 0;
        let investidoTotalMes = 0;

        registros.forEach(r => {
            const d = new Date(r.data + 'T00:00:00');
            if (d.getMonth() === mes && d.getFullYear() === ano) {
                const val = parseFloat(r.valor) || 0;
                if (r.tipo === 'gasto') {
                    gastosTotalMes += val;
                    const cat = r.categoria || 'outros';
                    gastosPorCat[cat] = (gastosPorCat[cat] || 0) + val;
                }
                if (r.tipo === 'investimento') {
                    investidoTotalMes += val;
                }
            }
        });

        // Orçamento geral
        $id('input-orcamento-geral').value = orcamento > 0 ? orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
        const orcamentoStatus = $id('orcamento-status');
        if (orcamento > 0) {
            const pct = Math.min((gastosTotalMes / orcamento) * 100, 100);
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe';
            orcamentoStatus.innerHTML = `
                <div class="progress-container">
                    <div class="progress-header">
                        <span class="progress-label">Este mês</span>
                        <span class="progress-values hide-value">${formatMoney(gastosTotalMes)} / ${formatMoney(orcamento)}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
                    <span class="progress-percent ${cls}">${pct.toFixed(0)}%</span>
                    ${pct >= 100 ? '<div class="progress-alert danger">⚠️ Orçamento estourado!</div>' : ''}
                </div>
            `;
        } else {
            orcamentoStatus.innerHTML = '';
        }

        // Hint
        if (orcamento > 0) {
            const restante = orcamento - gastosTotalMes;
            const diasRestantes = new Date(ano, mes + 1, 0).getDate() - now.getDate();
            if (restante > 0 && diasRestantes > 0) {
                const porDia = restante / diasRestantes;
                $id('orcamento-hint').textContent = `Restam ${formatMoney(restante)} — ${formatMoney(porDia)}/dia nos próximos ${diasRestantes} dias`;
            } else if (restante <= 0) {
                $id('orcamento-hint').textContent = `⚠️ Orçamento estourado em ${formatMoney(Math.abs(restante))}`;
            } else {
                $id('orcamento-hint').textContent = '';
            }
        } else {
            $id('orcamento-hint').textContent = '';
        }

        // Meta de investimento
        $id('input-meta-investimento').value = metaInv > 0 ? metaInv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
        const metaInvStatus = $id('meta-inv-status');
        if (metaInv > 0) {
            const pct = Math.min((investidoTotalMes / metaInv) * 100, 100);
            const cls = pct >= 100 ? 'safe' : pct >= 50 ? 'warning' : 'danger';
            metaInvStatus.innerHTML = `
                <div class="progress-container">
                    <div class="progress-header">
                        <span class="progress-label">Este mês</span>
                        <span class="progress-values hide-value">${formatMoney(investidoTotalMes)} / ${formatMoney(metaInv)}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
                    <span class="progress-percent ${cls}">${pct.toFixed(0)}%</span>
                    ${pct >= 100 ? '<div class="progress-alert" style="background:var(--green-light);color:var(--green-dark);">🎯 Meta atingida!</div>' : ''}
                </div>
            `;
        } else {
            metaInvStatus.innerHTML = '';
        }

        // Lista de categorias com metas
        const catList = $id('metas-categorias-list');
        let catHtml = '';

        categorias.forEach(cat => {
            const meta = metas.find(m => m.id === cat.id);
            const gasto = gastosPorCat[cat.id] || 0;
            let statusText = 'Sem meta';
            let valorText = '';

            if (meta && meta.valor > 0) {
                const pct = ((gasto / meta.valor) * 100).toFixed(0);
                statusText = `${formatMoney(gasto)} / ${formatMoney(meta.valor)} (${pct}%)`;
                valorText = formatMoney(meta.valor);
            } else if (gasto > 0) {
                statusText = `${formatMoney(gasto)} gasto`;
            }

            catHtml += `
                <div class="meta-cat-item" data-cat-id="${cat.id}" role="button" tabindex="0">
                    <span class="meta-cat-icon">${cat.icon}</span>
                    <div class="meta-cat-info">
                        <span class="meta-cat-name">${cat.nome}</span>
                        <span class="meta-cat-status">${statusText}</span>
                    </div>
                    ${valorText ? `<span class="meta-cat-valor hide-value">${valorText}</span>` : ''}
                    <span class="meta-cat-arrow">›</span>
                </div>
            `;
        });
        catList.innerHTML = catHtml;

        // Click em categoria
        catList.querySelectorAll('.meta-cat-item').forEach(item => {
            const handler = () => {
                const catId = item.dataset.catId;
                openMetaModal(catId, categorias, metas, gastosPorCat, registros);
            };
            item.addEventListener('click', handler);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler();
                }
            });
        });

        // Resumo de metas
        renderMetasResumo(metas, gastosPorCat, categorias);
    }

    function renderMetasResumo(metas, gastosPorCat, categorias) {
        const container = $id('metas-resumo-list');

        if (metas.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">🎯</span><p>Nenhuma meta definida</p></div>';
            return;
        }

        let html = '';
        metas.forEach(meta => {
            const gasto = gastosPorCat[meta.id] || 0;
            const pct = meta.valor > 0 ? Math.min((gasto / meta.valor) * 100, 100) : 0;
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe';
            const icon = getCategoriaIcon(categorias, meta.id);
            const nome = getCategoriaNome(categorias, meta.id);

            html += `
                <div class="meta-resumo-item">
                    <div class="progress-container">
                        <div class="progress-header">
                            <span class="progress-label">${icon} ${nome}</span>
                            <span class="progress-values hide-value">${formatMoney(gasto)} / ${formatMoney(meta.valor)}</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
                        <span class="progress-percent ${cls}">${pct.toFixed(0)}%</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    function openMetaModal(catId, categorias, metas, gastosPorCat, registros) {
        const cat = categorias.find(c => c.id === catId);
        const meta = metas.find(m => m.id === catId);
        const gasto = gastosPorCat[catId] || 0;

        $id('modal-meta-title').textContent = `${cat?.icon || '📌'} ${cat?.nome || catId}`;
        $id('meta-modal-desc').textContent = `Defina um limite mensal de gastos para ${cat?.nome || catId}`;

        // Histórico
        const now = new Date();
        let histHtml = '📊 Últimos 3 meses: ';
        for (let i = 1; i <= 3; i++) {
            let m = now.getMonth() - i;
            let a = now.getFullYear();
            while (m < 0) { m += 12; a--; }

            let total = 0;
            registros.forEach(r => {
                if (r.tipo === 'gasto' && r.categoria === catId) {
                    const d = new Date(r.data + 'T00:00:00');
                    if (d.getMonth() === m && d.getFullYear() === a) {
                        total += parseFloat(r.valor) || 0;
                    }
                }
            });
            histHtml += `${MESES_CURTOS[m]}: ${formatMoney(total)}`;
            if (i < 3) histHtml += ' · ';
        }
        $id('meta-modal-historico').innerHTML = histHtml;

        // Valor
        $id('input-meta-valor').value = meta ? meta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

        state.metaEditCat = catId;

        // Salvar
        $id('meta-btn-salvar').onclick = async () => {
            const valor = parseMoney($id('input-meta-valor').value);
            if (valor > 0) {
                await dbPut('metas', { id: catId, valor, atualizadoEm: Date.now() });
                closeModal('modal-meta-overlay');
                showToast(`Meta de ${cat?.nome || catId} salva ✓`);
                renderMetas();
            } else {
                showToast('Informe um valor');
            }
        };

        // Remover
        $id('meta-btn-remover').onclick = async () => {
            await dbDelete('metas', catId);
            closeModal('modal-meta-overlay');
            showToast(`Meta de ${cat?.nome || catId} removida`);
            renderMetas();
        };
        $id('meta-btn-remover').style.display = meta ? 'flex' : 'none';

        openModal('modal-meta-overlay');
    }

    // Salvar orçamento
    $id('btn-salvar-orcamento').addEventListener('click', async () => {
        const valor = parseMoney($id('input-orcamento-geral').value);
        await setConfig('orcamentoGeral', valor);
        showToast(valor > 0 ? 'Orçamento salvo ✓' : 'Orçamento removido');
        renderMetas();
    });

    // Salvar meta investimento
    $id('btn-salvar-meta-inv').addEventListener('click', async () => {
        const valor = parseMoney($id('input-meta-investimento').value);
        await setConfig('metaInvestimento', valor);
        showToast(valor > 0 ? 'Meta de investimento salva ✓' : 'Meta removida');
        renderMetas();
    });

    // =============================================
    // =============================================
    // DESPESAS/RECEITAS FIXAS
    // =============================================
    // =============================================
    function initFixasFiltros() {
        $$
('.filtro-chip[data-filtro-fixa]').forEach(chip => { chip.addEventListener('click', () => {
$$('.filtro-chip[data-filtro-fixa]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.filtroFixaTipo = chip.dataset.filtroFixa;
                renderFixas();
            });
        });
    }

    async function renderFixas() {
        const fixas = await dbGetAll('fixas');
        const categorias = await getCategorias();
        const list = $id('fixas-list');
        const totaisDiv = $id('fixas-totais');

        // Filtrar
        let filtered = fixas;
        if (state.filtroFixaTipo !== 'todos') {
            filtered = filtered.filter(f => f.tipo === state.filtroFixaTipo);
        }

        // Ordenar: ativas primeiro, depois pausadas, encerradas por último
        const statusOrder = { undefined: 0, ativa: 0, pausada: 1, encerrada: 2 };
        filtered.sort((a, b) => {
            const sA = statusOrder[a.status] || 0;
            const sB = statusOrder[b.status] || 0;
            if (sA !== sB) return sA - sB;
            return (a.descricao || '').localeCompare(b.descricao || '');
        });

        // Totais
        let totalReceita = 0, totalGasto = 0, totalInvestimento = 0;
        fixas.forEach(f => {
            if (f.status === 'pausada' || f.status === 'encerrada') return;
            const val = parseFloat(f.valor) || 0;
            switch (f.tipo) {
                case 'receita': totalReceita += val; break;
                case 'gasto': totalGasto += val; break;
                case 'investimento': totalInvestimento += val; break;
            }
        });

        totaisDiv.innerHTML = `
            <div class="fixas-total-row">
                <span class="fixas-total-label">💵 Receitas fixas</span>
                <span class="fixas-total-valor receita hide-value">${formatMoney(totalReceita)}</span>
            </div>
            <div class="fixas-total-row">
                <span class="fixas-total-label">💸 Gastos fixos</span>
                <span class="fixas-total-valor gasto hide-value">${formatMoney(totalGasto)}</span>
            </div>
            <div class="fixas-total-row">
                <span class="fixas-total-label">📈 Investimentos fixos</span>
                <span class="fixas-total-valor investimento hide-value">${formatMoney(totalInvestimento)}</span>
            </div>
            <div class="fixas-total-row" style="border-top:2px solid var(--border-color);padding-top:10px;margin-top:4px;">
                <span class="fixas-total-label" style="font-weight:700;">Saldo fixo mensal</span>
                <span class="fixas-total-valor ${totalReceita - totalGasto - totalInvestimento >= 0 ? 'receita' : 'gasto'} hide-value" style="font-weight:800;">
                    ${formatMoney(totalReceita - totalGasto - totalInvestimento)}
                </span>
            </div>
        `;

        // Lista
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🔁</span>
                    <p>Nenhuma ${state.filtroFixaTipo !== 'todos' ? state.filtroFixaTipo + ' fixa' : 'fixa'} cadastrada</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(f => {
            const icon = f.tipo === 'gasto'
                ? getCategoriaIcon(categorias, f.categoria)
                : TIPO_ICONS[f.tipo] || '📌';
            const status = f.status || 'ativa';
            const statusLabel = status === 'ativa' ? 'Ativa' : status === 'pausada' ? 'Pausada' : 'Encerrada';
            const diaLabel = f.dia ? `Dia ${f.dia}` : '';
            const duracaoLabel = f.duracao ? `${f.duracao} meses` : 'Contínua';
            let meta = [diaLabel, duracaoLabel].filter(Boolean).join(' · ');
            if (f.categoria && f.tipo === 'gasto') {
                meta += ` · ${getCategoriaNome(categorias, f.categoria)}`;
            }

            return `
                <div class="fixa-item" data-id="${f.id}" role="button" tabindex="0">
                    <div class="fixa-icon ${f.tipo}">${icon}</div>
                    <div class="fixa-info">
                        <div class="fixa-desc">${esc(f.descricao)}</div>
                        <div class="fixa-meta">${meta}</div>
                    </div>
                    <span class="fixa-status-badge ${status}">${statusLabel}</span>
                    <span class="fixa-valor ${f.tipo} hide-value">${formatMoney(f.valor)}</span>
                </div>
            `;
        }).join('');

        // Click handlers
        list.querySelectorAll('.fixa-item').forEach(item => {
            const handler = () => showFixaDetail(item.dataset.id);
            item.addEventListener('click', handler);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler();
                }
            });
        });
    }

    async function showFixaDetail(id) {
        const fixa = await dbGet('fixas', id);
        if (!fixa) return;
        const categorias = await getCategorias();

        $id('modal-fixa-title').textContent = fixa.descricao || 'Fixa';
        $id('modal-fixa-icon').textContent = fixa.tipo === 'gasto' ? getCategoriaIcon(categorias, fixa.categoria) : TIPO_ICONS[fixa.tipo] || '📌';

        const status = fixa.status || 'ativa';
        const aplicados = fixa.aplicados ? fixa.aplicados.length : 0;

        let bodyHtml = `
            <div class="detalhe-valor-destaque ${fixa.tipo}">${formatMoney(fixa.valor)}</div>
            <div class="detalhe-row">
                <span class="detalhe-label">Tipo</span>
                <span class="detalhe-value">${capitalize(fixa.tipo)}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">Dia do mês</span>
                <span class="detalhe-value">${fixa.dia || '—'}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">Status</span>
                <span class="detalhe-value"><span class="fixa-status-badge ${status}">${capitalize(status)}</span></span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">Duração</span>
                <span class="detalhe-value">${fixa.duracao ? `${fixa.duracao} meses` : 'Contínua'}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">Aplicações</span>
                <span class="detalhe-value">${aplicados} mês${aplicados !== 1 ? 'es' : ''}</span>
            </div>
        `;

        if (fixa.tipo === 'gasto' && fixa.categoria) {
            bodyHtml += `
                <div class="detalhe-row">
                    <span class="detalhe-label">Categoria</span>
                    <span class="detalhe-value">${getCategoriaIcon(categorias, fixa.categoria)} ${getCategoriaNome(categorias, fixa.categoria)}</span>
                </div>
            `;
        }

        if (fixa.metodo) {
            bodyHtml += `
                <div class="detalhe-row">
                    <span class="detalhe-label">Método</span>
                    <span class="detalhe-value">${METODO_LABELS[fixa.metodo] || fixa.metodo}</span>
                </div>
            `;
        }

        if (fixa.tipoInvestimento) {
            bodyHtml += `
                <div class="detalhe-row">
                    <span class="detalhe-label">Investimento</span>
                    <span class="detalhe-value">${TIPO_INV_LABELS[fixa.tipoInvestimento] || fixa.tipoInvestimento}</span>
                </div>
            `;
        }

        $id('modal-fixa-body').innerHTML = bodyHtml;

        // Botões de ação
        const actionsHtml = buildFixaActions(fixa);
        $id('modal-fixa-actions').innerHTML = actionsHtml;
        bindFixaActions(fixa, categorias);

        openModal('modal-fixa-overlay');
    }

    function buildFixaActions(fixa) {
        const status = fixa.status || 'ativa';
        let html = '<div class="modal-actions" style="flex-wrap:wrap;">';

        html += `<button class="btn-secundario" id="fixa-btn-edit" style="flex:1;">✏️ Editar</button>`;

        if (status === 'ativa') {
            html += `<button class="btn-secundario" id="fixa-btn-pause" style="flex:1;color:var(--yellow-medium);border-color:var(--yellow-medium);">⏸️ Pausar</button>`;
        } else if (status === 'pausada') {
            html += `<button class="btn-secundario" id="fixa-btn-resume" style="flex:1;color:var(--green-medium);border-color:var(--green-medium);">▶️ Retomar</button>`;
        }

        html += `<button class="btn-danger-sm" id="fixa-btn-delete" style="flex:1;">🗑️ Excluir</button>`;
        html += '</div>';

        return html;
    }

    function bindFixaActions(fixa, categorias) {
        // Edit
        $id('fixa-btn-edit')?.addEventListener('click', () => {
            closeModal('modal-fixa-overlay');
            state.editingFixaId = fixa.id;
            navigateTo('nova-fixa');
            loadFixaForEdit(fixa, categorias);
        });

        // Pause
        $id('fixa-btn-pause')?.addEventListener('click', async () => {
            fixa.status = 'pausada';
            await dbPut('fixas', fixa);
            closeModal('modal-fixa-overlay');
            showToast('Fixa pausada ⏸️');
            renderFixas();
        });

        // Resume
        $id('fixa-btn-resume')?.addEventListener('click', async () => {
            fixa.status = 'ativa';
            await dbPut('fixas', fixa);
            closeModal('modal-fixa-overlay');
            showToast('Fixa reativada ▶️');
            renderFixas();
        });

        // Delete
        $id('fixa-btn-delete')?.addEventListener('click', () => {
            closeModal('modal-fixa-overlay');
            showConfirmModal({
                icon: '🗑️',
                text: 'Excluir fixa?',
                desc: `${fixa.descricao} — ${formatMoney(fixa.valor)}`,
                btnText: 'Excluir',
                onConfirm: async () => {
                    await dbDelete('fixas', fixa.id);
                    showToast('Fixa excluída ✓');
                    renderFixas();
                }
            });
        });
    }

    // =============================================
    // FORMULÁRIO NOVA/EDITAR FIXA
    // =============================================
    async function initFormFixa() {
        const categorias = await getCategorias();
        const titleEl = $id('titulo-fixa');
        titleEl.textContent = state.editingFixaId ? 'Editar Fixa' : 'Nova Fixa';

        // Categorias
        const selectCat = $id('fixa-select-categoria');
        selectCat.innerHTML = categorias.map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join('');

        // Reset
        $id('form-fixa').reset();
        $id('fixa-input-valor').value = '';
        $id('fixa-input-descricao').value = '';
        $id('fixa-input-dia').value = '1';
        $id('fixa-input-duracao').value = '';

        // Tipo
        $$
('.tipo-fixa-btn').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }); const defaultTipo = $('.tipo-fixa-btn[data-tipo="gasto"]'); defaultTipo.classList.add('active'); defaultTipo.setAttribute('aria-pressed', 'true'); updateFixaFormForTipo('gasto'); } function updateFixaFormForTipo(tipo) { $id('fixa-group-categoria').classList.toggle('hidden', tipo !== 'gasto'); $id('fixa-group-metodo').classList.toggle('hidden', tipo === 'investimento' || tipo === 'resgate'); $id('fixa-group-tipo-investimento').classList.toggle('hidden', tipo !== 'investimento' && tipo !== 'resgate'); } function loadFixaForEdit(fixa, categorias) { $id('titulo-fixa').textContent = 'Editar Fixa'; // Tipo
$$('.tipo-fixa-btn').forEach(btn => {
            const active = btn.dataset.tipo === fixa.tipo;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active);
        });
        updateFixaFormForTipo(fixa.tipo);

        // Valores
        if (fixa.valor) {
            $id('fixa-input-valor').value = parseFloat(fixa.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
        $id('fixa-input-descricao').value = fixa.descricao || '';
        $id('fixa-input-dia').value = fixa.dia || 1;
        $id('fixa-input-duracao').value = fixa.duracao || '';

        if (fixa.categoria) $id('fixa-select-categoria').value = fixa.categoria;

        // Método
        if (fixa.metodo) {
            $$
('#fixa-chips-metodo .chip').forEach(c => { c.classList.toggle('active', c.dataset.metodo === fixa.metodo); }); } if (fixa.tipoInvestimento) { $id('fixa-select-tipo-investimento').value = fixa.tipoInvestimento; } } function initFormFixaEvents() { // Tipo
$$('.tipo-fixa-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$
('.tipo-fixa-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); }); btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); updateFixaFormForTipo(btn.dataset.tipo); }); }); // Método
$$('#fixa-chips-metodo .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                $$('#fixa-chips-metodo .chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });

        // Submit
        $id('form-fixa').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveFixa();
        });

        // Botão nova fixa
        $id('btn-nova-fixa').addEventListener('click', () => {
            state.editingFixaId = null;
            navigateTo('nova-fixa');
            initFormFixa();
        });
    }

    async function saveFixa() {
        const tipo = $('.tipo-fixa-btn.active')?.dataset.tipo;
        const valor = parseMoney($id('fixa-input-valor').value);
        const descricao = $id('fixa-input-descricao').value.trim();
        const dia = parseInt($id('fixa-input-dia').value, 10) || 1;
        const duracao = parseInt($id('fixa-input-duracao').value, 10) || 0;
        const categoria = tipo === 'gasto' ? $id('fixa-select-categoria').value : '';
        const metodo = (tipo === 'gasto') ? ($('#fixa-chips-metodo .chip.active')?.dataset.metodo || 'pix') : '';
        const tipoInvestimento = (tipo === 'investimento' || tipo === 'resgate') ? $id('fixa-select-tipo-investimento').value : '';

        if (!valor || valor <= 0) {
            showToast('Informe o valor');
            return;
        }
        if (!descricao) {
            showToast('Informe a descrição');
            return;
        }

        if (state.editingFixaId) {
            const fixa = await dbGet('fixas', state.editingFixaId);
            if (fixa) {
                fixa.tipo = tipo;
                fixa.valor = valor;
                fixa.descricao = descricao;
                fixa.dia = clamp(dia, 1, 31);
                fixa.duracao = duracao;
                fixa.categoria = categoria;
                fixa.metodo = metodo;
                fixa.tipoInvestimento = tipoInvestimento;
                await dbPut('fixas', fixa);
                showToast('Fixa atualizada ✓');
            }
        } else {
            const fixa = {
                id: generateId(),
                tipo,
                valor,
                descricao,
                dia: clamp(dia, 1, 31),
                duracao,
                categoria,
                metodo,
                tipoInvestimento,
                status: 'ativa',
                aplicados: [],
                criadoEm: Date.now()
            };
            await dbPut('fixas', fixa);
            showToast('Fixa criada ✓');
        }

        state.editingFixaId = null;
        goBack();
    }

    // Inicializar
    initFixasFiltros();
    initFormFixaEvents();


    // =============================================
    // =============================================
    // CATEGORIAS
    // =============================================
    // =============================================
    async function renderCategorias() {
        const categorias = await getCategorias();
        const registros = await dbGetAll('registros');
        const list = $id('categorias-list');

        // Contar uso
        const contagem = {};
        registros.forEach(r => {
            if (r.categoria) {
                contagem[r.categoria] = (contagem[r.categoria] || 0) + 1;
            }
        });

        list.innerHTML = categorias.map(cat => {
            const count = contagem[cat.id] || 0;
            return `
                <div class="cat-item">
                    <div class="cat-item-icon">${cat.icon}</div>
                    <span class="cat-item-label">${esc(cat.nome)}</span>
                    ${count > 0 ? `<span class="cat-item-badge">${count}</span>` : ''}
                    <div class="cat-item-actions">
                        <button class="cat-item-edit" data-id="${cat.id}" aria-label="Editar ${cat.nome}">✏️</button>
                        ${!cat.padrao ? `<button class="cat-item-delete" data-id="${cat.id}" aria-label="Excluir ${cat.nome}">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Edit handlers
        list.querySelectorAll('.cat-item-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const catId = btn.dataset.id;
                const cat = categorias.find(c => c.id === catId);
                if (cat) openEditCatModal(cat);
            });
        });

        // Delete handlers
        list.querySelectorAll('.cat-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const catId = btn.dataset.id;
                const cat = categorias.find(c => c.id === catId);
                if (cat) {
                    showConfirmModal({
                        icon: '🗑️',
                        text: `Excluir "${cat.nome}"?`,
                        desc: contagem[catId] > 0
                            ? `Esta categoria tem ${contagem[catId]} registro(s). Os registros não serão excluídos.`
                            : 'Esta ação não pode ser desfeita.',
                        btnText: 'Excluir',
                        onConfirm: async () => {
                            await dbDelete('categorias', catId);
                            // Remover meta associada
                            await dbDelete('metas', catId);
                            showToast('Categoria excluída ✓');
                            renderCategorias();
                        }
                    });
                }
            });
        });
    }

    function openEditCatModal(cat) {
        $id('modal-cat-title').textContent = cat ? 'Editar Categoria' : 'Nova Categoria';
        $id('input-cat-icon').value = cat ? cat.icon : '📌';
        $id('input-cat-nome').value = cat ? cat.nome : '';
        state.editingCatId = cat ? cat.id : null;

        $id('cat-btn-salvar').onclick = async () => {
            const icon = $id('input-cat-icon').value.trim() || '📌';
            const nome = $id('input-cat-nome').value.trim();
            if (!nome) {
                showToast('Informe o nome');
                return;
            }

            const id = state.editingCatId || nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

            await dbPut('categorias', {
                id,
                icon,
                nome,
                padrao: cat ? cat.padrao : false
            });

            closeModal('modal-cat-overlay');
            showToast(state.editingCatId ? 'Categoria atualizada ✓' : 'Categoria criada ✓');
            renderCategorias();
        };

        openModal('modal-cat-overlay');
    }

    // Botão nova categoria
    $id('btn-nova-cat').addEventListener('click', () => {
        openEditCatModal(null);
    });


    // =============================================
    // =============================================
    // NOTIFICAÇÕES / LEMBRETES
    // =============================================
    // =============================================
    async function renderNotificacoes() {
        // Status de notificação
        const permStatus = $id('notif-status-text');
        const permIcon = $id('notif-status-icon');
        const btnSolicitar = $id('btn-solicitar-notif');

        if (!('Notification' in window)) {
            permIcon.textContent = '🚫';
            permStatus.textContent = 'Navegador não suporta notificações';
            btnSolicitar.style.display = 'none';
        } else if (Notification.permission === 'granted') {
            permIcon.textContent = '🔔';
            permStatus.textContent = 'Notificações ativadas';
            btnSolicitar.style.display = 'none';
        } else if (Notification.permission === 'denied') {
            permIcon.textContent = '🔕';
            permStatus.textContent = 'Notificações bloqueadas (altere nas configurações do navegador)';
            btnSolicitar.style.display = 'none';
        } else {
            permIcon.textContent = '🔔';
            permStatus.textContent = 'Notificações não ativadas';
            btnSolicitar.style.display = 'flex';
        }

        // Lembretes
        const lembretes = await dbGetAll('lembretes');
        const list = $id('lembretes-list');

        lembretes.sort((a, b) => (a.dia || 0) - (b.dia || 0));

        if (lembretes.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⏰</span>
                    <p>Nenhum lembrete criado</p>
                </div>
            `;
        } else {
            list.innerHTML = lembretes.map(l => `
                <div class="lembrete-item">
                    <div class="lembrete-icon">🔔</div>
                    <div class="lembrete-info">
                        <div class="lembrete-titulo">${esc(l.titulo)}</div>
                        <div class="lembrete-meta">Dia ${l.dia} de cada mês${l.hora ? ` às ${l.hora}` : ''}</div>
                    </div>
                    <button class="lembrete-delete" data-id="${l.id}" aria-label="Excluir lembrete">🗑️</button>
                </div>
            `).join('');

            // Delete handlers
            list.querySelectorAll('.lembrete-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    await dbDelete('lembretes', id);
                    showToast('Lembrete excluído ✓');
                    renderNotificacoes();
                });
            });
        }

        // Histórico de notificações
        const notifHist = await dbGetAll('notificacoes');
        const histList = $id('notif-historico-list');

        if (notifHist.length === 0) {
            histList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>Nenhuma notificação enviada</p>
                </div>
            `;
        } else {
            notifHist.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            histList.innerHTML = notifHist.slice(0, 20).map(n => {
                const time = n.timestamp ? timeAgo(n.timestamp) : '';
                return `
                    <div class="notif-hist-item">
                        <span class="notif-hist-icon">${n.icon || '🔔'}</span>
                        <div class="notif-hist-info">
                            <div class="notif-hist-text">${esc(n.text)}</div>
                            <div class="notif-hist-time">${time}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    function timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Agora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} dia(s) atrás`;
        const d = new Date(timestamp);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }

    // Solicitar permissão
    $id('btn-solicitar-notif').addEventListener('click', async () => {
        try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                showToast('Notificações ativadas ✓');
                // Salvar notificação de teste
                await dbPut('notificacoes', {
                    id: generateId(),
                    icon: '✅',
                    text: 'Notificações ativadas com sucesso!',
                    timestamp: Date.now()
                });
            } else {
                showToast('Permissão negada');
            }
            renderNotificacoes();
        } catch (err) {
            showToast('Erro ao solicitar permissão');
        }
    });

    // Novo lembrete
    $id('btn-novo-lembrete').addEventListener('click', () => {
        $id('input-lembrete-titulo').value = '';
        $id('input-lembrete-dia').value = '1';
        $id('input-lembrete-hora').value = '09:00';
        openModal('modal-lembrete-overlay');
    });

    $id('lembrete-btn-salvar').addEventListener('click', async () => {
        const titulo = $id('input-lembrete-titulo').value.trim();
        const dia = parseInt($id('input-lembrete-dia').value, 10) || 1;
        const hora = $id('input-lembrete-hora').value || '09:00';

        if (!titulo) {
            showToast('Informe o título');
            return;
        }

        const lembrete = {
            id: generateId(),
            titulo,
            dia: clamp(dia, 1, 31),
            hora,
            criadoEm: Date.now()
        };

        await dbPut('lembretes', lembrete);
        closeModal('modal-lembrete-overlay');
        showToast('Lembrete criado ✓');
        renderNotificacoes();

        // Agendar notificação se possível
        scheduleNotification(lembrete);
    });

    function scheduleNotification(lembrete) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        // Calcular próxima ocorrência
        const now = new Date();
        let next = new Date(now.getFullYear(), now.getMonth(), lembrete.dia);
        const [h, m] = (lembrete.hora || '09:00').split(':').map(Number);
        next.setHours(h, m, 0, 0);

        if (next <= now) {
            next.setMonth(next.getMonth() + 1);
        }

        const delay = next.getTime() - now.getTime();
        if (delay > 0 && delay < 31 * 24 * 60 * 60 * 1000) {
            setTimeout(async () => {
                try {
                    new Notification('🔔 Bolso do Fred', {
                        body: lembrete.titulo,
                        icon: './icons/icon-192.png',
                        badge: './icons/icon-192.png'
                    });

                    await dbPut('notificacoes', {
                        id: generateId(),
                        icon: '🔔',
                        text: lembrete.titulo,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    console.error('Erro ao enviar notificação:', e);
                }
            }, delay);
        }
    }

    // Agendar todos os lembretes no init
    async function scheduleAllNotifications() {
        const lembretes = await dbGetAll('lembretes');
        lembretes.forEach(l => scheduleNotification(l));
    }


    // =============================================
    // =============================================
    // CONFIGURAÇÕES
    // =============================================
    // =============================================
    async function renderSettings() {
        // Dark mode toggle
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        $id('toggle-dark').checked = isDark;

        // Auto theme
        const autoTheme = localStorage.getItem('autoTheme') !== 'false';
        $id('toggle-auto-theme').checked = autoTheme;

        // Hide values
        $id('toggle-hide-values').checked = state.valuesHidden;

        // Saldo inicial
        const saldoInicial = await getConfig('saldoInicial', 0);
        const investidoInicial = await getConfig('investidoInicial', 0);
        $id('settings-saldo-inicial').value = saldoInicial > 0 ? saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
        $id('settings-investido-inicial').value = investidoInicial > 0 ? investidoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

        // Versão
        $id('app-version').textContent = `O Bolso do Fred v${APP_VERSION}`;
    }

    function initSettingsEvents() {
        // Dark mode
        $id('toggle-dark').addEventListener('change', (e) => {
            setTheme(e.target.checked);
            localStorage.setItem('autoTheme', 'false');
            $id('toggle-auto-theme').checked = false;
        });

        // Auto theme
        $id('toggle-auto-theme').addEventListener('change', (e) => {
            localStorage.setItem('autoTheme', e.target.checked);
            if (e.target.checked) {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(prefersDark);
                $id('toggle-dark').checked = prefersDark;
            }
        });

        // Hide values
        $id('toggle-hide-values').addEventListener('change', (e) => {
            state.valuesHidden = e.target.checked;
            localStorage.setItem('valuesHidden', state.valuesHidden);
            if (state.valuesHidden) {
                document.body.classList.add('values-hidden');
            } else {
                document.body.classList.remove('values-hidden');
            }
        });

        // Saldo inicial
        $id('btn-save-saldo-inicial').addEventListener('click', async () => {
            const saldo = parseMoney($id('settings-saldo-inicial').value);
            const investido = parseMoney($id('settings-investido-inicial').value);
            await setConfig('saldoInicial', saldo);
            await setConfig('investidoInicial', investido);
            showToast('Saldos iniciais salvos ✓');
        });

        // Alterar PIN
        $id('btn-alterar-pin').addEventListener('click', () => {
            openModal('modal-alterar-pin-overlay');
        });

        $id('alterar-pin-confirm').addEventListener('click', async () => {
            const pinAtual = $id('input-pin-atual').value.trim();
            const pinNovo = $id('input-pin-novo').value.trim();
            const pinConfirm = $id('input-pin-confirmar').value.trim();

            const savedPin = await getConfig('pin');
            if (pinAtual !== savedPin) {
                showToast('PIN atual incorreto');
                return;
            }
            if (pinNovo.length !== 4 || !/^\d{4}$/.test(pinNovo)) {
                showToast('Novo PIN deve ter 4 dígitos');
                return;
            }
            if (pinNovo !== pinConfirm) {
                showToast('PINs não coincidem');
                return;
            }

            await setConfig('pin', pinNovo);
            closeModal('modal-alterar-pin-overlay');
            showToast('PIN alterado com sucesso ✓');

            // Limpar inputs
            $id('input-pin-atual').value = '';
            $id('input-pin-novo').value = '';
            $id('input-pin-confirmar').value = '';
        });

        $id('alterar-pin-cancel').addEventListener('click', () => {
            closeModal('modal-alterar-pin-overlay');
        });

        // Limpar dados
        $id('btn-limpar-dados').addEventListener('click', () => {
            showConfirmModal({
                icon: '⚠️',
                text: 'Limpar TODOS os dados?',
                desc: 'Esta ação irá apagar todos os registros, fixas, metas e configurações. Não pode ser desfeita!',
                btnText: 'Limpar tudo',
                requireInput: 'LIMPAR',
                inputPlaceholder: 'Digite LIMPAR para confirmar',
                onConfirm: async () => {
                    await dbClear('registros');
                    await dbClear('fixas');
                    await dbClear('metas');
                    await dbClear('lembretes');
                    await dbClear('notificacoes');
                    // Manter config (PIN, saldo inicial)
                    showToast('Todos os dados foram limpos');
                    renderDashboard();
                }
            });
        });

        // Reset total
        $id('btn-reset-app').addEventListener('click', () => {
            showConfirmModal({
                icon: '💣',
                text: 'Resetar o aplicativo?',
                desc: 'Isso apagará ABSOLUTAMENTE TUDO, incluindo PIN e configurações. O app voltará ao estado inicial.',
                btnText: 'RESETAR TUDO',
                requireInput: 'RESETAR',
                inputPlaceholder: 'Digite RESETAR para confirmar',
                onConfirm: async () => {
                    await dbClear('registros');
                    await dbClear('fixas');
                    await dbClear('config');
                    await dbClear('categorias');
                    await dbClear('metas');
                    await dbClear('lembretes');
                    await dbClear('notificacoes');
                    localStorage.clear();
                    showToast('App resetado. Recarregando...');
                    setTimeout(() => window.location.reload(), 1500);
                }
            });
        });

        // Instalar PWA
        $id('btn-instalar-pwa').addEventListener('click', async () => {
            if (state.deferredPrompt) {
                state.deferredPrompt.prompt();
                const result = await state.deferredPrompt.userChoice;
                if (result.outcome === 'accepted') {
                    showToast('App instalado! 🎉');
                }
                state.deferredPrompt = null;
            } else {
                showToast('App já está instalado ou não é possível instalar no momento');
            }
        });
    }

    initSettingsEvents();


    // =============================================
    // =============================================
    // AJUDA / FAQ
    // =============================================
    // =============================================
    function initAjuda() {
        // FAQ já funciona com <details> puro
        // Mas podemos adicionar analytics ou algo depois

        // Contato / Feedback
        $id('btn-feedback')?.addEventListener('click', () => {
            showToast('Obrigado pelo interesse! 💚');
        });
    }

    initAjuda();

    // =============================================
    // =============================================
    // DADOS — BACKUP / RESTORE / CSV / RELATÓRIO
    // =============================================
    // =============================================
    async function renderDados() {
        // Estatísticas rápidas
        const registros = await dbGetAll('registros');
        const fixas = await dbGetAll('fixas');
        const categorias = await getCategorias();
        const metas = await dbGetAll('metas');
        const lembretes = await dbGetAll('lembretes');

        $id('dados-stats').innerHTML = `
            <div class="detalhe-row">
                <span class="detalhe-label">📊 Total de registros</span>
                <span class="detalhe-value">${registros.length}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">🔁 Contas fixas</span>
                <span class="detalhe-value">${fixas.length}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">📂 Categorias</span>
                <span class="detalhe-value">${categorias.length}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">🎯 Metas</span>
                <span class="detalhe-value">${metas.length}</span>
            </div>
            <div class="detalhe-row">
                <span class="detalhe-label">🔔 Lembretes</span>
                <span class="detalhe-value">${lembretes.length}</span>
            </div>
        `;

        // CSV mês label
        updateCSVMesLabel();

        // Relatório mês label
        updateRelatorioMesLabel();
    }

    // =============================================
    // BACKUP — EXPORTAR JSON
    // =============================================
    $id('btn-exportar-backup').addEventListener('click', async () => {
        try {
            const registros = await dbGetAll('registros');
            const fixas = await dbGetAll('fixas');
            const categorias = await dbGetAll('categorias');
            const metas = await dbGetAll('metas');
            const lembretes = await dbGetAll('lembretes');
            const notificacoes = await dbGetAll('notificacoes');

            // Configs
            const configKeys = ['saldoInicial', 'investidoInicial', 'orcamentoGeral', 'metaInvestimento', 'onboarded'];
            const config = {};
            for (const key of configKeys) {
                config[key] = await getConfig(key);
            }

            const backup = {
                app: 'BolsoDoFred',
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                data: {
                    registros,
                    fixas,
                    categorias,
                    metas,
                    lembretes,
                    notificacoes,
                    config
                }
            };

            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const date = new Date().toISOString().split('T')[0];
            const a = document.createElement('a');
            a.href = url;
            a.download = `bolso-do-fred-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('Backup exportado ✓');

            // Salvar notificação
            await dbPut('notificacoes', {
                id: generateId(),
                icon: '💾',
                text: `Backup exportado com ${registros.length} registros`,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Erro ao exportar backup:', error);
            showToast('Erro ao exportar backup');
        }
    });

    // =============================================
    // BACKUP — IMPORTAR JSON
    // =============================================
    $id('btn-importar-backup').addEventListener('click', () => {
        $id('input-file-backup').click();
    });

    $id('input-file-backup').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            // Validar
            if (!backup.app || backup.app !== 'BolsoDoFred' || !backup.data) {
                showToast('Arquivo de backup inválido');
                return;
            }

            state.importData = backup;

            // Mostrar preview
            const data = backup.data;
            const registrosCount = data.registros ? data.registros.length : 0;
            const fixasCount = data.fixas ? data.fixas.length : 0;
            const catsCount = data.categorias ? data.categorias.length : 0;

            showConfirmModal({
                icon: '📥',
                text: 'Importar backup?',
                desc: `Versão: ${backup.version || '?'}\nData: ${backup.exportedAt ? formatDate(backup.exportedAt.split('T')[0]) : '?'}\n\n${registrosCount} registros, ${fixasCount} fixas, ${catsCount} categorias\n\n⚠️ Os dados atuais serão SUBSTITUÍDOS pelos do backup.`,
                btnText: 'Importar',
                onConfirm: async () => {
                    await importBackup(state.importData);
                    state.importData = null;
                }
            });

        } catch (error) {
            console.error('Erro ao ler backup:', error);
            showToast('Erro ao ler arquivo de backup');
        }

        // Limpar input
        e.target.value = '';
    });

    async function importBackup(backup) {
        try {
            const data = backup.data;

            // Limpar dados atuais
            await dbClear('registros');
            await dbClear('fixas');
            await dbClear('categorias');
            await dbClear('metas');
            await dbClear('lembretes');
            await dbClear('notificacoes');

            // Importar registros
            if (data.registros && Array.isArray(data.registros)) {
                for (const r of data.registros) {
                    if (r.id) await dbPut('registros', r);
                }
            }

            // Importar fixas
            if (data.fixas && Array.isArray(data.fixas)) {
                for (const f of data.fixas) {
                    if (f.id) await dbPut('fixas', f);
                }
            }

            // Importar categorias
            if (data.categorias && Array.isArray(data.categorias)) {
                for (const c of data.categorias) {
                    if (c.id) await dbPut('categorias', c);
                }
            }

            // Importar metas
            if (data.metas && Array.isArray(data.metas)) {
                for (const m of data.metas) {
                    if (m.id) await dbPut('metas', m);
                }
            }

            // Importar lembretes
            if (data.lembretes && Array.isArray(data.lembretes)) {
                for (const l of data.lembretes) {
                    if (l.id) await dbPut('lembretes', l);
                }
            }

            // Importar notificações
            if (data.notificacoes && Array.isArray(data.notificacoes)) {
                for (const n of data.notificacoes) {
                    if (n.id) await dbPut('notificacoes', n);
                }
            }

            // Importar configs
            if (data.config && typeof data.config === 'object') {
                for (const [key, value] of Object.entries(data.config)) {
                    if (value !== undefined && value !== null) {
                        await setConfig(key, value);
                    }
                }
            }

            // Salvar notificação
            await dbPut('notificacoes', {
                id: generateId(),
                icon: '📥',
                text: `Backup importado: ${data.registros?.length || 0} registros`,
                timestamp: Date.now()
            });

            showToast('Backup importado com sucesso! ✓');

            // Re-agendar notificações
            await scheduleAllNotifications();

            // Atualizar tela
            renderDados();

        } catch (error) {
            console.error('Erro ao importar backup:', error);
            showToast('Erro ao importar backup');
        }
    }

    // =============================================
    // EXPORTAR CSV
    // =============================================
    function updateCSVMesLabel() {
        if (state.csvTodos) {
            $id('csv-mes-label').textContent = 'Todos os meses';
        } else {
            $id('csv-mes-label').textContent = getMesAnoLabel(state.csvMes, state.csvAno);
        }
    }

    $id('csv-mes-prev').addEventListener('click', () => {
        state.csvMes--;
        if (state.csvMes < 0) { state.csvMes = 11; state.csvAno--; }
        state.csvTodos = false;
        $id('csv-todos-meses').classList.remove('active');
        updateCSVMesLabel();
    });

    $id('csv-mes-next').addEventListener('click', () => {
        state.csvMes++;
        if (state.csvMes > 11) { state.csvMes = 0; state.csvAno++; }
        state.csvTodos = false;
        $id('csv-todos-meses').classList.remove('active');
        updateCSVMesLabel();
    });

    $id('csv-todos-meses').addEventListener('click', () => {
        state.csvTodos = !state.csvTodos;
        $id('csv-todos-meses').classList.toggle('active', state.csvTodos);
        updateCSVMesLabel();
    });

    $id('btn-exportar-csv').addEventListener('click', async () => {
        try {
            const registros = await dbGetAll('registros');
            const categorias = await getCategorias();

            let filtered = registros;
            if (!state.csvTodos) {
                filtered = filtered.filter(r => {
                    const d = new Date(r.data + 'T00:00:00');
                    return d.getMonth() === state.csvMes && d.getFullYear() === state.csvAno;
                });
            }

            if (filtered.length === 0) {
                showToast('Nenhum registro para exportar');
                return;
            }

            // Ordenar por data
            filtered.sort((a, b) => a.data.localeCompare(b.data));

            // BOM para Excel reconhecer UTF-8
            const BOM = '\uFEFF';

            // Header
            const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Método', 'Tipo Investimento', 'Parcela', 'Nota'];

            // Rows
            const rows = filtered.map(r => {
                const catNome = r.categoria ? getCategoriaNome(categorias, r.categoria) : '';
                const parcela = (r.parcela && r.totalParcelas) ? `${r.parcela}/${r.totalParcelas}` : '';
                return [
                    formatDate(r.data),
                    capitalize(r.tipo),
                    csvEscape(r.descricao || ''),
                    csvEscape(catNome),
                    (parseFloat(r.valor) || 0).toFixed(2).replace('.', ','),
                    METODO_LABELS[r.metodo]?.replace(/[^\w\s]/g, '').trim() || r.metodo || '',
                    TIPO_INV_LABELS[r.tipoInvestimento]?.replace(/[^\w\s]/g, '').trim() || r.tipoInvestimento || '',
                    parcela,
                    csvEscape(r.nota || '')
                ];
            });

            // Totais
            let totalReceitas = 0, totalGastos = 0, totalInvestimentos = 0, totalResgates = 0;
            filtered.forEach(r => {
                const val = parseFloat(r.valor) || 0;
                switch (r.tipo) {
                    case 'receita': totalReceitas += val; break;
                    case 'gasto': totalGastos += val; break;
                    case 'investimento': totalInvestimentos += val; break;
                    case 'resgate': totalResgates += val; break;
                }
            });

            rows.push([]); // Linha vazia
            rows.push(['', '', '', 'RESUMO', '', '', '', '', '']);
            rows.push(['', 'Receitas', '', '', totalReceitas.toFixed(2).replace('.', ','), '', '', '', '']);
            rows.push(['', 'Gastos', '', '', totalGastos.toFixed(2).replace('.', ','), '', '', '', '']);
            rows.push(['', 'Investimentos', '', '', totalInvestimentos.toFixed(2).replace('.', ','), '', '', '', '']);
            rows.push(['', 'Resgates', '', '', totalResgates.toFixed(2).replace('.', ','), '', '', '', '']);
            rows.push(['', 'SALDO', '', '', (totalReceitas + totalResgates - totalGastos - totalInvestimentos).toFixed(2).replace('.', ','), '', '', '', '']);

            const csvContent = BOM + [headers, ...rows].map(row =>
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const filename = state.csvTodos
                ? `bolso-do-fred-todos.csv`
                : `bolso-do-fred-${state.csvAno}-${String(state.csvMes + 1).padStart(2, '0')}.csv`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`CSV exportado (${filtered.length} registros) ✓`);

        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            showToast('Erro ao exportar CSV');
        }
    });

    function csvEscape(str) {
        return (str || '').replace(/"/g, '""');
    }

    // =============================================
    // RELATÓRIO MENSAL
    // =============================================
    function updateRelatorioMesLabel() {
        $id('relatorio-mes-label').textContent = getMesAnoLabel(state.relatorioMes, state.relatorioAno);
    }

    $id('relatorio-mes-prev').addEventListener('click', () => {
        state.relatorioMes--;
        if (state.relatorioMes < 0) { state.relatorioMes = 11; state.relatorioAno--; }
        updateRelatorioMesLabel();
    });

    $id('relatorio-mes-next').addEventListener('click', () => {
        state.relatorioMes++;
        if (state.relatorioMes > 11) { state.relatorioMes = 0; state.relatorioAno++; }
        updateRelatorioMesLabel();
    });

    $id('btn-gerar-relatorio').addEventListener('click', async () => {
        try {
            const registros = await dbGetAll('registros');
            const categorias = await getCategorias();
            const saldoInicial = await getConfig('saldoInicial', 0);
            const investidoInicial = await getConfig('investidoInicial', 0);
            const mes = state.relatorioMes;
            const ano = state.relatorioAno;

            const mesFiltro = registros.filter(r => {
                const d = new Date(r.data + 'T00:00:00');
                return d.getMonth() === mes && d.getFullYear() === ano;
            });

            // Cálculos
            let receitas = 0, gastos = 0, investido = 0, resgates = 0;
            const gastosPorCat = {};
            const gastosPorMetodo = {};
            const investPorTipo = {};

            mesFiltro.forEach(r => {
                const val = parseFloat(r.valor) || 0;
                switch (r.tipo) {
                    case 'receita':
                        receitas += val;
                        break;
                    case 'gasto':
                        gastos += val;
                        const cat = r.categoria || 'outros';
                        gastosPorCat[cat] = (gastosPorCat[cat] || 0) + val;
                        const met = r.metodo || 'outros';
                        gastosPorMetodo[met] = (gastosPorMetodo[met] || 0) + val;
                        break;
                    case 'investimento':
                        investido += val;
                        const tip = r.tipoInvestimento || 'outro';
                        investPorTipo[tip] = (investPorTipo[tip] || 0) + val;
                        break;
                    case 'resgate':
                        resgates += val;
                        break;
                }
            });

            const saldo = receitas + resgates - gastos - investido;

            // Patrimônio até o fim do mês
            let patrimonioLivre = saldoInicial;
            let patrimonioInvestido = investidoInicial;
            registros.forEach(r => {
                const d = new Date(r.data + 'T00:00:00');
                if (d.getFullYear() < ano || (d.getFullYear() === ano && d.getMonth() <= mes)) {
                    const val = parseFloat(r.valor) || 0;
                    switch (r.tipo) {
                        case 'receita': patrimonioLivre += val; break;
                        case 'gasto': patrimonioLivre -= val; break;
                        case 'investimento': patrimonioLivre -= val; patrimonioInvestido += val; break;
                        case 'resgate': patrimonioLivre += val; patrimonioInvestido -= val; break;
                    }
                }
            });

            // Montar relatório
            const divider = '─'.repeat(40);
            let rel = '';
            rel += `╔══════════════════════════════════════╗\n`;
            rel += `║     O BOLSO DO FRED — RELATÓRIO      ║\n`;
            rel += `╚══════════════════════════════════════╝\n\n`;
            rel += `📅 ${getMesAnoLabel(mes, ano)}\n`;
            rel += `📊 ${mesFiltro.length} movimentações\n`;
            rel += `${divider}\n\n`;

            rel += `💰 RESUMO FINANCEIRO\n`;
            rel += `${divider}\n`;
            rel += `  💵 Receitas:       ${padLeft(formatMoney(receitas), 16)}\n`;
            rel += `  💸 Gastos:         ${padLeft(formatMoney(gastos), 16)}\n`;
            rel += `  📈 Investido:      ${padLeft(formatMoney(investido), 16)}\n`;
            rel += `  🔄 Resgates:       ${padLeft(formatMoney(resgates), 16)}\n`;
            rel += `${divider}\n`;
            rel += `  📊 Saldo do mês:   ${padLeft(formatMoney(saldo), 16)}\n\n`;

            rel += `🏦 PATRIMÔNIO (fim do mês)\n`;
            rel += `${divider}\n`;
            rel += `  💵 Saldo livre:    ${padLeft(formatMoney(patrimonioLivre), 16)}\n`;
            rel += `  📈 Investido:      ${padLeft(formatMoney(patrimonioInvestido), 16)}\n`;
            rel += `  🏦 Total:          ${padLeft(formatMoney(patrimonioLivre + patrimonioInvestido), 16)}\n\n`;

            // Gastos por categoria
            if (Object.keys(gastosPorCat).length > 0) {
                rel += `📂 GASTOS POR CATEGORIA\n`;
                rel += `${divider}\n`;
                const catEntries = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]);
                catEntries.forEach(([catId, val]) => {
                    const icon = getCategoriaIcon(categorias, catId);
                    const nome = getCategoriaNome(categorias, catId);
                    const pct = gastos > 0 ? ((val / gastos) * 100).toFixed(1) : '0.0';
                    rel += `  ${icon} ${padRight(nome, 16)} ${padLeft(formatMoney(val), 14)} (${padLeft(pct + '%', 6)})\n`;
                });
                rel += `\n`;
            }

            // Gastos por método
            if (Object.keys(gastosPorMetodo).length > 0) {
                rel += `💳 GASTOS POR MÉTODO\n`;
                rel += `${divider}\n`;
                Object.entries(gastosPorMetodo).sort((a, b) => b[1] - a[1]).forEach(([met, val]) => {
                    const label = METODO_LABELS[met]?.replace(/[^\w\sáéíóúãõâêôç]/gi, '').trim() || capitalize(met);
                    rel += `  ${padRight(label, 18)} ${padLeft(formatMoney(val), 14)}\n`;
                });
                rel += `\n`;
            }

            // Investimentos por tipo
            if (Object.keys(investPorTipo).length > 0) {
                rel += `📈 INVESTIMENTOS POR TIPO\n`;
                rel += `${divider}\n`;
                Object.entries(investPorTipo).sort((a, b) => b[1] - a[1]).forEach(([tip, val]) => {
                    const label = TIPO_INV_LABELS[tip]?.replace(/[^\w\sáéíóúãõâêôç]/gi, '').trim() || capitalize(tip);
                    rel += `  ${padRight(label, 18)} ${padLeft(formatMoney(val), 14)}\n`;
                });
                rel += `\n`;
            }

            // Top 5 gastos
            const topGastos = mesFiltro
                .filter(r => r.tipo === 'gasto')
                .sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0))
                .slice(0, 5);

            if (topGastos.length > 0) {
                rel += `🏆 TOP 5 MAIORES GASTOS\n`;
                rel += `${divider}\n`;
                topGastos.forEach((r, i) => {
                    const icon = getCategoriaIcon(categorias, r.categoria);
                    const desc = r.descricao || getCategoriaNome(categorias, r.categoria);
                    rel += `  ${i + 1}. ${icon} ${padRight(desc.substring(0, 20), 20)} ${padLeft(formatMoney(r.valor), 14)}\n`;
                });
                rel += `\n`;
            }

            // Indicadores
            rel += `📊 INDICADORES\n`;
            rel += `${divider}\n`;
            if (receitas > 0) {
                rel += `  Taxa de poupança:  ${padLeft(((receitas - gastos) / receitas * 100).toFixed(1) + '%', 8)}\n`;
                rel += `  Gastos/Receita:    ${padLeft((gastos / receitas * 100).toFixed(1) + '%', 8)}\n`;
            }
            if (mesFiltro.filter(r => r.tipo === 'gasto').length > 0) {
                const mediaGasto = gastos / mesFiltro.filter(r => r.tipo === 'gasto').length;
                rel += `  Média por gasto:   ${padLeft(formatMoney(mediaGasto), 14)}\n`;
            }
            const diasNoMes = new Date(ano, mes + 1, 0).getDate();
            rel += `  Média diária:      ${padLeft(formatMoney(gastos / diasNoMes), 14)}\n`;

            rel += `\n${divider}\n`;
            rel += `Gerado em ${new Date().toLocaleString('pt-BR')}\n`;
            rel += `O Bolso do Fred v${APP_VERSION}\n`;

            // Mostrar
            $id('relatorio-output').textContent = rel;
            $id('relatorio-container').style.display = 'block';

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showToast('Erro ao gerar relatório');
        }
    });

    function padLeft(str, len) {
        str = String(str);
        while (str.length < len) str = ' ' + str;
        return str;
    }

    function padRight(str, len) {
        str = String(str);
        while (str.length < len) str += ' ';
        return str.substring(0, len);
    }

    // Copiar relatório
    $id('btn-copiar-relatorio').addEventListener('click', async () => {
        const text = $id('relatorio-output').textContent;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Relatório copiado ✓');
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('Relatório copiado ✓');
            } catch {
                showToast('Erro ao copiar');
            }
            document.body.removeChild(textarea);
        }
    });

    // Compartilhar relatório
    $id('btn-compartilhar-relatorio').addEventListener('click', async () => {
        const text = $id('relatorio-output').textContent;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Relatório — O Bolso do Fred`,
                    text: text
                });
            } catch (e) {
                if (e.name !== 'AbortError') {
                    showToast('Erro ao compartilhar');
                }
            }
        } else {
            // Fallback: copiar
            try {
                await navigator.clipboard.writeText(text);
                showToast('Relatório copiado para compartilhar');
            } catch {
                showToast('Compartilhamento não suportado');
            }
        }
    });


    // =============================================
    // =============================================
    // KEYBOARD SHORTCUTS (Desktop)
    // =============================================
    // =============================================
    document.addEventListener('keydown', (e) => {
        // Não capturar em inputs
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        // Só funciona após login
        if (state.currentScreen === 'pin' || state.currentScreen === 'create-pin' || state.currentScreen === 'onboarding') return;

        switch (e.key) {
            case '1':
                navigateTo('dashboard');
                break;
            case '2':
                navigateTo('historico');
                break;
            case '3':
                navigateTo('graficos');
                break;
            case '4':
                navigateTo('mais');
                break;
            case 'n':
            case 'N':
                if (!e.ctrlKey && !e.metaKey) {
                    state.editingId = null;
                    state.formDirty = false;
                    navigateTo('novo-registro');
                    initFormRegistro();
                }
                break;
            case 'Escape':
                if (state.currentScreen !== 'dashboard') {
                    goBack();
                }
                break;
            case 'h':
            case 'H':
                if (!e.ctrlKey && !e.metaKey) {
                    state.valuesHidden = !state.valuesHidden;
                    localStorage.setItem('valuesHidden', state.valuesHidden);
                    if (state.valuesHidden) {
                        document.body.classList.add('values-hidden');
                    } else {
                        document.body.classList.remove('values-hidden');
                    }
                    vibrate(10);
                }
                break;
        }
    });


    // =============================================
    // =============================================
    // PERFORMANCE — CLEANUP & LIFECYCLE
    // =============================================
    // =============================================

    // Cleanup de notificações antigas (> 30 dias)
    async function cleanupOldNotifications() {
        try {
            const notifs = await dbGetAll('notificacoes');
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const toDelete = notifs.filter(n => n.timestamp && n.timestamp < thirtyDaysAgo);
            for (const n of toDelete) {
                await dbDelete('notificacoes', n.id);
            }
        } catch (e) {
            console.error('Erro no cleanup:', e);
        }
    }

    // Visibilidade — pausa/retoma atividades
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Atualizar greeting quando volta
            if (state.currentScreen === 'dashboard') {
                $id('header-greeting').textContent = getGreeting();
                const now = new Date();
                $id('mes-atual').textContent = getMesAnoLabel(now.getMonth(), now.getFullYear());
            }
        }
    });

    // Executar cleanup e agendamentos após init
    setTimeout(async () => {
        await cleanupOldNotifications();
        await scheduleAllNotifications();
    }, 3000);


    // =============================================
    // =============================================
    // LOG DE INICIALIZAÇÃO
    // =============================================
    // =============================================
    console.log(
        `%c💰 O Bolso do Fred v${APP_VERSION}%c\nApp inicializado com sucesso!`,
        'color: #2d8659; font-size: 16px; font-weight: bold;',
        'color: inherit; font-size: 12px;'
    );

})(); // Fim do IIFE
