/**
 * IKABOT BRASIL - CONTROLADOR FRONTEND (JAVASCRIPT)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado da aplicação
    let appState = {
        connected: false,
        cities: [],
        tasks: [],
        selectedCityId: null,
        freeTransports: 0,
        totalTransports: 0,
    };

    // Elementos DOM
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const playerServer = document.getElementById('player-server');
    const totalGold = document.getElementById('total-gold');
    const goldIncome = document.getElementById('gold-income');
    const totalShips = document.getElementById('total-ships');
    const btnRefresh = document.getElementById('btn-refresh');
    const citiesContainer = document.getElementById('cities-container');
    const tasksTableBody = document.getElementById('tasks-tbody');
    const runningTasksCount = document.getElementById('running-tasks-count');
    const terminalBody = document.getElementById('terminal-body');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const toastContainer = document.getElementById('toast-container');

    // Selects
    const globalCitySelect = document.getElementById('global-city-select');
    const constructionCitySelect = document.getElementById('construction-city-select');
    const buildingsListContainer = document.getElementById('buildings-list-container');
    const cityQueueSection = document.getElementById('city-queue-section');
    const cityQueueBadge = document.getElementById('city-queue-badge');
    const cityQueueContainer = document.getElementById('city-queue-container');
    const btnRefreshCityQueue = document.getElementById('btn-refresh-city-queue');
    const workersCitySelect = document.getElementById('workers-city-select');
    const transportOrigin = document.getElementById('transport-origin');
    const transportDest = document.getElementById('transport-dest');
    const barbarianCitySelect = document.getElementById('barbarian-city-select');
    const donationCitySelect = document.getElementById('donation-city-select');

    // Trabalhadores & População
    const workersLoadingIndicator = document.getElementById('workers-loading-indicator');
    const workersLoadingText = document.getElementById('workers-loading-text');
    const workersEmptyHint = document.getElementById('workers-empty-hint');
    const workersForm = document.getElementById('workers-form');
    const workersCityInfo = document.getElementById('workers-city-info');
    const infoFreeCitizens = document.getElementById('info-free-citizens');
    const sliderWood = document.getElementById('slider-wood-workers');
    const valWood = document.getElementById('val-wood-workers');
    const maxWoodWorkers = document.getElementById('max-wood-workers');
    const pctWoodWorkers = document.getElementById('pct-wood-workers');
    const trackWoodFill = document.getElementById('track-wood-fill');
    const limitWoodWorkers = document.getElementById('limit-wood-workers');
    const iconLuxuryWorkers = document.getElementById('icon-luxury-workers');
    const descLuxuryWorkers = document.getElementById('desc-luxury-workers');
    const labelLuxury = document.getElementById('label-luxury-workers');
    const sliderLuxury = document.getElementById('slider-luxury-workers');
    const valLuxury = document.getElementById('val-luxury-workers');
    const maxLuxuryWorkers = document.getElementById('max-luxury-workers');
    const pctLuxuryWorkers = document.getElementById('pct-luxury-workers');
    const trackLuxuryFill = document.getElementById('track-luxury-fill');
    const limitLuxuryWorkers = document.getElementById('limit-luxury-workers');
    const groupScientists = document.getElementById('group-scientists');
    const sliderScientists = document.getElementById('slider-scientists');
    const valScientists = document.getElementById('val-scientists');
    const maxScientists = document.getElementById('max-scientists');
    const pctScientists = document.getElementById('pct-scientists');
    const trackScientistsFill = document.getElementById('track-scientists-fill');
    const limitScientists = document.getElementById('limit-scientists');
    const btnSaveWorkers = document.getElementById('btn-save-workers');

    // Doações da Ilha
    const donationIslandContainer = document.getElementById('donation-island-container');
    const sawmillLvlBadge = document.getElementById('sawmill-lvl-badge');
    const sawmillDonatedText = document.getElementById('sawmill-donated-text');
    const sawmillPctText = document.getElementById('sawmill-pct-text');
    const sawmillProgressBar = document.getElementById('sawmill-progress-bar');
    const inputDonateSawmill = document.getElementById('input-donate-sawmill');
    const btnDonateSawmill = document.getElementById('btn-donate-sawmill');
    const luxuryMineTitle = document.getElementById('luxury-mine-title');
    const luxuryLvlBadge = document.getElementById('luxury-lvl-badge');
    const luxuryDonatedText = document.getElementById('luxury-donated-text');
    const luxuryPctText = document.getElementById('luxury-pct-text');
    const luxuryProgressBar = document.getElementById('luxury-progress-bar');
    const inputDonateLuxury = document.getElementById('input-donate-luxury');
    const btnDonateLuxury = document.getElementById('btn-donate-luxury');

    // Pesquisas na Academia
    const btnRefreshResearch = document.getElementById('btn-refresh-research');
    const researchListContainer = document.getElementById('research-list-container');

    // Pirataria
    const pirateMissionSelect = document.getElementById('pirate-mission-select');
    const btnStartPirate = document.getElementById('btn-start-pirate');

    // Alertas & Defesa
    const btnAlertAttacks = document.getElementById('btn-alert-attacks');
    const btnAlertWine = document.getElementById('btn-alert-wine');

    // Botões de Ação
    const btnSendResources = document.getElementById('btn-send-resources');
    const btnAttackBarbarians = document.getElementById('btn-attack-barbarians');

    // Modal de Login e Seleção de Mundo
    const loginModalOverlay = document.getElementById('login-modal-overlay');
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const authAlert = document.getElementById('auth-alert');
    const authStepCredentials = document.getElementById('auth-step-credentials');
    const authStepServers = document.getElementById('auth-step-servers');
    const authLoading = document.getElementById('auth-loading');
    const authLoadingText = document.getElementById('auth-loading-text');
    const savedAccountsSection = document.getElementById('saved-accounts-section');
    const savedAccountsList = document.getElementById('saved-accounts-list');
    const formLogin = document.getElementById('form-login');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const btnSubmitLobby = document.getElementById('btn-submit-lobby');
    const serversGrid = document.getElementById('servers-grid');
    const btnBackToLogin = document.getElementById('btn-back-to-login');

    // Tela de Carregamento Global ao Entrar no Mundo
    const globalLoadingScreen = document.getElementById('global-loading-screen');
    const globalLoadingTitle = document.getElementById('global-loading-title');
    const globalLoadingSubtitle = document.getElementById('global-loading-subtitle');
    const globalLoadingBar = document.getElementById('global-loading-bar');
    const stepAuth = document.getElementById('step-auth');
    const stepSession = document.getElementById('step-session');
    const stepCities = document.getElementById('step-cities');

    let currentAuthId = null;
    let initialLoginCheckDone = false;

    // ==========================================
    // SISTEMA DE NOTIFICAÇÕES (TOASTS)
    // ==========================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ==========================================
    // NAVEGAÇÃO POR ABAS
    // ==========================================
    const tabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');

            // Atualiza o breadcrumb do cabeçalho
            const breadcrumbActive = document.getElementById('breadcrumb-current-tab');
            if (breadcrumbActive) {
                const icon = tab.querySelector('.tab-icon')?.innerText || '';
                const text = tab.querySelector('.tab-text')?.innerText || tab.innerText;
                breadcrumbActive.innerText = `${icon} ${text}`.trim();
            }

            // Carregamento automático ao entrar nas abas
            if (targetId === 'tab-research') {
                loadResearches();
            } else if (targetId === 'tab-donations') {
                if (appState.selectedCityId) {
                    loadDonationsForCity(appState.selectedCityId);
                }
            } else if (targetId === 'tab-workers') {
                if (appState.selectedCityId) {
                    loadWorkersForCity(appState.selectedCityId);
                }
            } else if (targetId === 'tab-construction') {
                if (appState.selectedCityId) {
                    loadBuildingsForCity(appState.selectedCityId);
                    loadCityConstructionQueue(appState.selectedCityId);
                }
            } else if (targetId === 'tab-transport') {
                if (appState.selectedCityId && transportOrigin) {
                    transportOrigin.value = appState.selectedCityId;
                }
                updateTransportView();
            } else if (targetId === 'tab-barbarians') {
                if (appState.selectedCityId && barbarianCitySelect) {
                    barbarianCitySelect.value = appState.selectedCityId;
                }
            } else if (targetId === 'tab-military') {
                populateMilitarySelects();
                loadMilitaryArmy();
                loadMilitaryMovements();
            } else if (targetId === 'tab-market') {
                populateMarketSelects();
            } else if (targetId === 'tab-logistics') {
                populateLogisticsCities();
            } else if (targetId === 'tab-miracles') {
                loadMiracles();
            } else if (targetId === 'tab-settings') {
                loadSettings();
            }
        });
    });

    function switchTab(tabId) {
        const targetTabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (targetTabBtn) targetTabBtn.click();
    }

    // Formatação de números (ex: 12.345)
    function formatNumber(num) {
        if (typeof num === 'string') {
            const cleaned = num.replace(/[^\d.-]/g, '');
            num = parseFloat(cleaned);
        }
        if (isNaN(num) || num === null || num === undefined) {
            return '0';
        }
        return new Intl.NumberFormat('pt-BR').format(num);
    }

    // ==========================================
    // CONSUMO DE APIS
    // ==========================================

    // 1. Status Geral da Conta
    async function fetchStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            appState.connected = data.connected;

            if (data.connected) {
                statusDot.className = 'status-dot connected';
                statusText.innerText = 'Conectado';
                const srvDisplay = data.world ? `${data.player_name} (${data.world})` : `${data.player_name} (${data.server})`;
                playerServer.innerText = srvDisplay;
                totalGold.innerText = formatNumber(data.gold);
                if (goldIncome && data.gold_income !== undefined) {
                    const sign = data.gold_income >= 0 ? '+' : '';
                    goldIncome.innerText = `(${sign}${formatNumber(data.gold_income)}/h)`;
                    goldIncome.className = data.gold_income >= 0 ? 'stat-sub' : 'stat-sub negative';
                }
                appState.freeTransports = data.free_transports !== undefined ? data.free_transports : 0;
                appState.totalTransports = data.total_transports !== undefined ? data.total_transports : 0;
                totalShips.innerText = `${appState.freeTransports} / ${appState.totalTransports}`;
                calculateTransportTotals();

                if (btnOpenLogin) {
                    btnOpenLogin.innerHTML = `👑 ${data.player_name}`;
                    btnOpenLogin.title = `Conectado como ${data.player_name} no mundo ${data.world || data.server}. Clique para trocar de conta.`;
                }
                closeLoginModal();
            } else {
                statusDot.className = 'status-dot disconnected';
                statusText.innerText = 'Aguardando Login';
                playerServer.innerText = 'Desconectado';

                if (btnOpenLogin) {
                    btnOpenLogin.innerHTML = '🔑 Conectar Conta';
                    btnOpenLogin.title = 'Conectar ao Ikariam com sua conta Gameforge';
                }

                if (!initialLoginCheckDone) {
                    initialLoginCheckDone = true;
                    openLoginModal();
                }
            }
        } catch (err) {
            statusDot.className = 'status-dot disconnected';
            statusText.innerText = 'Offline';
        }
    }

    // 2. Cidades e Recursos
    async function fetchCities(force = false) {
        if (!appState.cities || appState.cities.length === 0) {
            citiesContainer.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Sincronizando cidades e recursos do império...</p>
                </div>
            `;
        }
        try {
            const url = force ? '/api/cities?force=1' : '/api/cities';
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            appState.cities = data.cities || [];

            renderCities(appState.cities);
            populateCitySelects(appState.cities);
        } catch (err) {
            console.error('Erro ao buscar cidades:', err);
        }
    }

    function renderCities(cities) {
        if (!cities || cities.length === 0) {
            citiesContainer.innerHTML = '<p class="empty-hint">Nenhuma cidade encontrada na conta ativa.</p>';
            return;
        }

        citiesContainer.innerHTML = cities.map(city => {
            const res = city.resources;
            const isWarning = city.usage_pct > 80 ? 'warning' : '';

            return `
                <div class="city-card" data-city-id="${city.id}">
                    <div class="city-card-header">
                        <div class="city-title">
                            <h3>${city.name} ${city.is_capital ? '<span class="capital-badge">CAPITAL</span>' : ''}</h3>
                            <div class="city-coords">Ilha: ${city.island_name || 'Desconhecida'} [${city.x}:${city.y}]</div>
                        </div>
                        <div class="luxury-badge">
                            <span>${city.luxury_icon}</span>
                            <span>${city.luxury_name}</span>
                        </div>
                    </div>

                    <div class="city-resources-grid">
                        <div class="res-item">
                            <span class="res-icon">🪵</span>
                            <span class="res-name">Madeira</span>
                            <span class="res-val">${formatNumber(res.wood.amount)}</span>
                        </div>
                        <div class="res-item">
                            <span class="res-icon">🍷</span>
                            <span class="res-name">Vinho</span>
                            <span class="res-val">${formatNumber(res.wine.amount)}</span>
                        </div>
                        <div class="res-item">
                            <span class="res-icon">🏛️</span>
                            <span class="res-name">Mármore</span>
                            <span class="res-val">${formatNumber(res.marble.amount)}</span>
                        </div>
                        <div class="res-item">
                            <span class="res-icon">💎</span>
                            <span class="res-name">Cristal</span>
                            <span class="res-val">${formatNumber(res.crystal.amount)}</span>
                        </div>
                        <div class="res-item">
                            <span class="res-icon">🔥</span>
                            <span class="res-name">Enxofre</span>
                            <span class="res-val">${formatNumber(res.sulfur.amount)}</span>
                        </div>
                    </div>

                    <div class="city-production-row">
                        <span class="prod-chip highlight">🪵 +${formatNumber(city.wood_production)}/h</span>
                        <span class="prod-chip highlight">${city.luxury_icon} +${formatNumber(city.luxury_production)}/h</span>
                        ${city.has_academy ? '<span class="prod-chip">📜 Academia</span>' : ''}
                        ${city.has_tavern ? '<span class="prod-chip">🍷 Taverna</span>' : ''}
                    </div>

                    <div class="storage-meter">
                        <div class="storage-labels">
                            <span>Armazém: ${city.usage_pct}% ocupado</span>
                            <span>Capacidade: ${formatNumber(city.storage_capacity)}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${isWarning}" style="width: ${city.usage_pct}%;"></div>
                        </div>
                    </div>

                    <div class="city-stats-row">
                        <span>👥 Cidadãos Livres: <b>${city.free_citizens}</b></span>
                        <span>🍷 Consumo/h: <b>${city.wine_consumption}</b></span>
                    </div>

                    <div class="city-actions-footer" style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-ghost btn-quick-upgrade" data-city-id="${city.id}">🔨 Construções</button>
                        <button class="btn btn-sm btn-ghost btn-quick-workers" data-city-id="${city.id}">👥 Trabalhadores</button>
                        <button class="btn btn-sm btn-ghost btn-quick-donate" data-city-id="${city.id}">🪙 Doar</button>
                        <button class="btn btn-sm btn-ghost btn-quick-transport" data-city-id="${city.id}">🚢 Transportar</button>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos dos botões rápidos nos cards
        document.querySelectorAll('.btn-quick-upgrade').forEach(btn => {
            btn.addEventListener('click', () => {
                const cid = btn.getAttribute('data-city-id');
                setActiveCity(cid, true);
                switchTab('tab-construction');
            });
        });

        document.querySelectorAll('.btn-quick-workers').forEach(btn => {
            btn.addEventListener('click', () => {
                const cid = btn.getAttribute('data-city-id');
                setActiveCity(cid, true);
                switchTab('tab-workers');
            });
        });

        document.querySelectorAll('.btn-quick-donate').forEach(btn => {
            btn.addEventListener('click', () => {
                const cid = btn.getAttribute('data-city-id');
                setActiveCity(cid, true);
                switchTab('tab-donations');
            });
        });

        document.querySelectorAll('.btn-quick-transport').forEach(btn => {
            btn.addEventListener('click', () => {
                const cid = btn.getAttribute('data-city-id');
                setActiveCity(cid, false);
                if (transportOrigin) transportOrigin.value = cid;
                updateTransportView();
                switchTab('tab-transport');
            });
        });
    }

    function setActiveCity(cityId, triggerLoads = true) {
        if (!cityId) return;
        const cidStr = String(cityId);
        appState.selectedCityId = cidStr;

        if (globalCitySelect) globalCitySelect.value = cidStr;
        if (constructionCitySelect) constructionCitySelect.value = cidStr;
        if (workersCitySelect) workersCitySelect.value = cidStr;
        if (donationCitySelect) donationCitySelect.value = cidStr;
        if (transportOrigin) {
            transportOrigin.value = cidStr;
            updateTransportView();
        }
        if (barbarianCitySelect) barbarianCitySelect.value = cidStr;

        const selectTrainCity = document.getElementById('select-train-city');
        const selectStationOrigin = document.getElementById('select-station-origin');
        const selectMarketBuyCity = document.getElementById('select-market-buy-city');
        const selectMarketSellCity = document.getElementById('select-market-sell-city');
        if (selectTrainCity) selectTrainCity.value = cidStr;
        if (selectStationOrigin) {
            selectStationOrigin.value = cidStr;
            loadStationAvailableUnits(cidStr);
        }
        if (selectMarketBuyCity) selectMarketBuyCity.value = cidStr;
        if (selectMarketSellCity) selectMarketSellCity.value = cidStr;

        const foundCity = appState.cities.find(c => String(c.id) === cidStr);
        const displayTargets = document.querySelectorAll('.active-city-display-target');
        if (foundCity) {
            const capitalBadge = foundCity.is_capital ? ' <span class="capital-badge">CAPITAL</span>' : '';
            const html = `${foundCity.name} [${foundCity.x}:${foundCity.y}] (${foundCity.luxury_icon} ${foundCity.luxury_name})${capitalBadge}`;
            displayTargets.forEach(el => el.innerHTML = html);
        } else {
            displayTargets.forEach(el => el.innerText = 'Nenhuma cidade selecionada');
        }

        if (triggerLoads) {
            const activeTabEl = document.querySelector('.tab-content.active');
            const activeTabId = activeTabEl ? activeTabEl.id : null;
            if (activeTabId === 'tab-construction') {
                loadBuildingsForCity(cidStr);
                loadCityConstructionQueue(cidStr);
            } else if (activeTabId === 'tab-workers') {
                loadWorkersForCity(cidStr);
            } else if (activeTabId === 'tab-donations') {
                loadDonationsForCity(cidStr);
            }
        }
    }

    if (globalCitySelect) {
        globalCitySelect.addEventListener('change', (e) => {
            const cid = e.target.value;
            if (cid) {
                setActiveCity(cid, true);
                const city = appState.cities.find(c => String(c.id) === String(cid));
                const cityName = city ? city.name : 'cidade';
                showToast(`Cidade ativa alterada para: ${cityName}!`, 'info');
            }
        });
    }

    function populateCitySelects(cities) {
        if (!cities || cities.length === 0) return;

        const optionsHtml = '<option value="">Selecione uma cidade...</option>' +
            cities.map(c => `<option value="${c.id}">${c.name} [${c.x}:${c.y}] - ${c.luxury_name}${c.is_capital ? ' (Capital)' : ''}</option>`).join('');

        if (globalCitySelect) globalCitySelect.innerHTML = optionsHtml;
        if (constructionCitySelect) constructionCitySelect.innerHTML = optionsHtml;
        if (workersCitySelect) workersCitySelect.innerHTML = optionsHtml;
        if (transportOrigin) transportOrigin.innerHTML = optionsHtml;
        if (transportDest) transportDest.innerHTML = optionsHtml;
        if (barbarianCitySelect) barbarianCitySelect.innerHTML = optionsHtml;
        if (donationCitySelect) donationCitySelect.innerHTML = optionsHtml;

        const selectTrainCity = document.getElementById('select-train-city');
        const selectStationOrigin = document.getElementById('select-station-origin');
        const selectStationDest = document.getElementById('select-station-destination');
        const selectMarketBuyCity = document.getElementById('select-market-buy-city');
        const selectMarketSellCity = document.getElementById('select-market-sell-city');
        const selectConsolidateTarget = document.getElementById('select-consolidate-target');

        if (selectTrainCity) selectTrainCity.innerHTML = optionsHtml;
        if (selectStationOrigin) selectStationOrigin.innerHTML = optionsHtml;
        if (selectStationDest) selectStationDest.innerHTML = optionsHtml;
        if (selectMarketBuyCity) selectMarketBuyCity.innerHTML = optionsHtml;
        if (selectMarketSellCity) selectMarketSellCity.innerHTML = optionsHtml;
        if (selectConsolidateTarget) selectConsolidateTarget.innerHTML = optionsHtml;

        if (typeof populateLogisticsCities === 'function') {
            populateLogisticsCities();
        }

        // Se ainda não selecionou cidade ativa, escolhe a capital (ou a primeira)
        if (!appState.selectedCityId) {
            const defaultCity = cities.find(c => c.is_capital) || cities[0];
            setActiveCity(defaultCity.id, false);
        } else {
            setActiveCity(appState.selectedCityId, false);
        }

        // Sugere destino diferente da origem no transporte se houver mais de uma cidade
        if (transportDest && cities.length > 1 && (!transportDest.value || transportDest.value === transportOrigin?.value)) {
            const secondCity = cities.find(c => String(c.id) !== String(appState.selectedCityId)) || cities[1];
            if (secondCity) transportDest.value = secondCity.id;
        }
        updateTransportView();
    }

    // 3. Fila de Construção & Obras Ativas
    function formatTimeRemaining(seconds) {
        if (!seconds || seconds <= 0) return 'Quase concluído...';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    let currentCityBuildings = [];
    let currentCityQueue = { inGame: null, botQueue: [] };
    let activeBuildingCategoryFilter = 'all';
    let buildingSearchQuery = '';

    function getBuildingCategory(buildingId) {
        if (['townHall', 'palace', 'palaceColony', 'embassy'].includes(buildingId)) return 'governo';
        if (['warehouse', 'dump'].includes(buildingId)) return 'estoque';
        if (['barracks', 'shipyard', 'wall', 'safehouse'].includes(buildingId)) return 'militar';
        if (['academy', 'museum', 'tavern', 'temple', 'shrine', 'workshop'].includes(buildingId)) return 'ciencia';
        return 'economia';
    }

    function getBuildingEmote(buildingId) {
        const map = {
            townHall: '🏛️', academy: '📜', port: '⚓', shipyard: '🚢', barracks: '🛡️',
            warehouse: '📦', dump: '🏰', wall: '🧱', tavern: '🍷', museum: '🎨',
            palace: '👑', palaceColony: '🏛️', embassy: '🤝', branchOffice: '⚖️',
            safehouse: '🕵️', carpentering: '🪚', architect: '📐', optician: '🔬',
            vineyard: '🍇', fireworker: '🎆', forester: '🌲', stonemason: '⛏️',
            glassblowing: '🧪', winegrower: '🍷', alchemist: '⚗️', temple: '⛩️',
            pirateFortress: '🏴‍☠️', workshop: '⚙️', shrine: '🌟'
        };
        return map[buildingId] || '🏛️';
    }

    async function loadCityConstructionQueue(cityId) {
        if (!cityQueueSection || !cityQueueContainer) return;
        if (!cityId) {
            cityQueueSection.style.display = 'none';
            return;
        }

        cityQueueSection.style.display = 'block';
        cityQueueContainer.innerHTML = '<div class="spinner" style="margin: 12px auto;"></div>';

        try {
            const res = await fetch(`/api/city/${cityId}/queue`);
            if (!res.ok) {
                cityQueueContainer.innerHTML = '<p class="empty-hint">Não foi possível carregar a fila desta cidade.</p>';
                return;
            }
            const data = await res.json();
            if (!data.success) {
                cityQueueContainer.innerHTML = '<p class="empty-hint">Erro ao carregar a fila desta cidade.</p>';
                return;
            }

            const inGame = data.in_game_construction;
            const botQueue = data.bot_queue || [];
            currentCityQueue = { inGame, botQueue };
            const totalItems = (inGame ? 1 : 0) + botQueue.length;

            if (cityQueueBadge) {
                if (totalItems === 0) {
                    cityQueueBadge.innerText = 'Nenhuma obra';
                    cityQueueBadge.className = 'badge badge-secondary';
                } else if (totalItems === 1) {
                    cityQueueBadge.innerText = '1 obra ativa';
                    cityQueueBadge.className = 'badge badge-warning';
                } else {
                    cityQueueBadge.innerText = `${totalItems} obras ativas/na fila`;
                    cityQueueBadge.className = 'badge badge-warning';
                }
            }

            if (totalItems === 0) {
                cityQueueContainer.innerHTML = `
                    <div style="padding: 14px; color: var(--text-muted); font-size: 0.88rem; text-align: center; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.06);">
                        🏛️ Nenhuma obra em andamento no jogo e nenhuma evolução agendada no robô para esta cidade.
                    </div>
                `;
            } else {
                let html = '';

                // 1. Obra nativa do jogo em andamento
                if (inGame) {
                    const rawName = inGame.building_raw || '';
                    const emote = getBuildingEmote(rawName);
                    html += `
                        <div class="queue-item-card in-game">
                            <div class="queue-item-header">
                                <span class="queue-building-name">${emote} ${inGame.building_name} <small style="color: var(--text-muted); font-weight: normal;">(Obra do Jogo)</small></span>
                                <span class="queue-status-badge in-progress">⚡ Em Construção</span>
                            </div>
                            <div class="queue-item-details">
                                <span>Evoluindo: <b>Nível ${inGame.current_level}</b> ➔ <b>Nível ${inGame.next_level}</b></span>
                                <span>Término: <b>${inGame.end_time || '--:--'}</b> (em ${formatTimeRemaining(inGame.remaining_seconds)})</span>
                                <span class="queue-meta-tag">#Pos ${inGame.position}</span>
                            </div>
                        </div>
                    `;
                }

                // 2. Fila do Robô Ikabot
                if (botQueue.length > 0) {
                    botQueue.forEach(item => {
                        let badgeClass = 'waiting';
                        let statusTxt = item.status || 'Agendado';
                        const lower = statusTxt.toLowerCase();
                        if (lower.includes('construindo') || lower.includes('evoluindo') || lower.includes('iniciando')) {
                            badgeClass = 'in-progress';
                        }

                        html += `
                            <div class="queue-item-card bot-task">
                                <div class="queue-item-header">
                                    <span class="queue-building-name">🤖 ${item.building_name} <small style="color: var(--text-muted); font-weight: normal;">(Fila do Robô)</small></span>
                                    <span class="queue-status-badge ${badgeClass}">⏳ ${statusTxt}</span>
                                </div>
                                <div class="queue-item-details">
                                    <span>Alvo: <b>Nível ${item.current_level || '?'}</b> ➔ <b>Nível ${item.target_level}</b></span>
                                    <span>Agendado em: <b>${item.date || 'Hoje'}</b></span>
                                    <span class="queue-meta-tag">#Pos ${item.building_pos}</span>
                                    <span class="queue-meta-tag">PID: ${item.pid}</span>
                                </div>
                                <div class="queue-actions">
                                    <button type="button" class="btn btn-sm btn-danger btn-kill-city-queue" data-pid="${item.pid}" title="Cancelar esta fila do robô">
                                        🛑 Cancelar Fila
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                }

                cityQueueContainer.innerHTML = html;

                cityQueueContainer.querySelectorAll('.btn-kill-city-queue').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const pid = btn.getAttribute('data-pid');
                        if (!confirm(`Deseja cancelar esta tarefa de construção agendada (PID ${pid})?`)) return;

                        btn.disabled = true;
                        btn.innerText = 'Cancelando...';

                        try {
                            const res = await fetch('/api/tasks/kill', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pid: pid })
                            });
                            const resData = await res.json();
                            if (resData.success) {
                                showToast('Fila cancelada com sucesso!', 'success');
                                await loadCityConstructionQueue(cityId);
                                if (currentCityBuildings.length > 0) {
                                    renderModernBuildingsGrid(currentCityBuildings, cityId);
                                }
                                fetchTasks();
                            } else {
                                showToast(resData.error || 'Erro ao cancelar fila', 'error');
                                btn.disabled = false;
                                btn.innerText = '🛑 Cancelar Fila';
                            }
                        } catch (err) {
                            showToast('Erro ao comunicar com o servidor', 'error');
                            btn.disabled = false;
                            btn.innerText = '🛑 Cancelar Fila';
                        }
                    });
                });
            }

            // Atualiza grid de edifícios se já carregado
            if (currentCityBuildings && currentCityBuildings.length > 0) {
                renderModernBuildingsGrid(currentCityBuildings, cityId);
            }

        } catch (err) {
            console.error('Erro ao carregar fila da cidade:', err);
            cityQueueContainer.innerHTML = '<p class="empty-hint error">Erro de conexão ao carregar fila da cidade.</p>';
        }
    }

    if (btnRefreshCityQueue) {
        btnRefreshCityQueue.addEventListener('click', () => {
            if (appState.selectedCityId) {
                loadCityConstructionQueue(appState.selectedCityId);
            }
        });
    }

    const buildingCostDebounceTimers = {};

    function renderBuildingRequirementsHtml(pos, upgradeCost) {
        if (!upgradeCost || !upgradeCost.relevant_materials || upgradeCost.relevant_materials.length === 0) {
            return `
                <div class="b-requirements-panel" id="req-panel-${pos}">
                    <div class="b-req-empty">
                        <span>ℹ️ Requisitos calculados ao selecionar o nível alvo.</span>
                    </div>
                </div>
            `;
        }

        const itemsHtml = upgradeCost.relevant_materials.map(m => {
            const isOk = m.sufficient;
            const diffStr = !isOk && m.missing > 0 ? `<span class="res-missing-tag">(-${formatNumber(m.missing)})</span>` : '';
            return `
                <div class="res-cost-chip ${isOk ? 'sufficient' : 'insufficient'}" title="${m.name}: Necessário ${formatNumber(m.cost)} | Em estoque: ${formatNumber(m.available)} ${!isOk ? `(Faltam ${formatNumber(m.missing)})` : ''}">
                    <span class="res-icon">${m.icon}</span>
                    <span class="res-cost-val">${formatNumber(m.cost)}</span>
                    ${diffStr}
                </div>
            `;
        }).join('');

        const statusTag = upgradeCost.has_enough 
            ? `<span class="b-req-status ready">✓ Recursos em estoque</span>` 
            : `<span class="b-req-status lack">⚠️ Faltam recursos</span>`;

        return `
            <div class="b-requirements-panel" id="req-panel-${pos}">
                <div class="b-req-header">
                    <span class="b-req-title">Materiais para Nv ${upgradeCost.target_level}:</span>
                    ${statusTag}
                </div>
                <div class="b-req-materials">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    function updateBuildingCostForTarget(cityId, pos, targetLvl) {
        const panel = document.getElementById(`req-panel-${pos}`);
        if (!panel) return;

        if (buildingCostDebounceTimers[pos]) {
            clearTimeout(buildingCostDebounceTimers[pos]);
        }

        panel.classList.add('loading');

        buildingCostDebounceTimers[pos] = setTimeout(async () => {
            try {
                const res = await fetch(`/api/city/${cityId}/building/${pos}/cost?target_level=${targetLvl}`);
                if (!res.ok) return;
                const costData = await res.json();
                if (costData.success) {
                    const newHtml = renderBuildingRequirementsHtml(pos, costData);
                    const currentPanel = document.getElementById(`req-panel-${pos}`);
                    if (currentPanel) {
                        currentPanel.outerHTML = newHtml;
                    }
                }
            } catch (err) {
                console.error(`Erro ao atualizar custo da pos ${pos}:`, err);
            }
        }, 220);
    }

    function renderModernBuildingsGrid(buildings, cityId) {
        if (!buildingsListContainer) return;

        const inGame = currentCityQueue.inGame;
        const botQueue = currentCityQueue.botQueue || [];

        // Filtra por categoria e busca
        const filtered = buildings.filter(b => {
            if (b.is_empty) return false;
            const category = getBuildingCategory(b.building_id);
            if (activeBuildingCategoryFilter !== 'all' && category !== activeBuildingCategoryFilter) {
                return false;
            }
            if (buildingSearchQuery) {
                const q = buildingSearchQuery.toLowerCase();
                const nameMatch = (b.name_pt || '').toLowerCase().includes(q);
                const rawMatch = (b.building_id || '').toLowerCase().includes(q);
                if (!nameMatch && !rawMatch) return false;
            }
            return true;
        });

        const countDisp = document.getElementById('buildings-count-disp');
        if (countDisp) {
            countDisp.innerText = String(filtered.length);
        }

        if (filtered.length === 0) {
            buildingsListContainer.innerHTML = `
                <div class="empty-hint" style="grid-column: 1 / -1; padding: 24px;">
                    Nenhum edifício encontrado com os filtros selecionados.
                </div>
            `;
            return;
        }

        buildingsListContainer.innerHTML = filtered.map(b => {
            const emote = getBuildingEmote(b.building_id);
            const pos = b.position;
            const currentLvl = b.level || 0;

            const isInGame = inGame && String(inGame.position) === String(pos);
            const queuedTask = botQueue.find(t => String(t.building_pos) === String(pos));

            let statusBadgeHtml = '';
            let noticeBannerHtml = '';
            let minTarget = currentLvl + 1;
            let initialTarget = currentLvl + 1;
            let cardExtraClass = '';

            if (isInGame) {
                cardExtraClass = 'under-construction';
                const nextLvl = inGame.next_level || (currentLvl + 1);
                statusBadgeHtml = `<span class="b-active-pulse">⚡ Nv ${nextLvl} no jogo</span>`;
                noticeBannerHtml = `
                    <div class="b-construction-banner">
                        <span>⏳ Em obra: <b>Nv ${nextLvl}</b> (${inGame.end_time ? inGame.end_time + ' - ' : ''}${formatTimeRemaining(inGame.remaining_seconds)})</span>
                    </div>
                `;
                minTarget = nextLvl + 1;
                initialTarget = nextLvl + 1;
            } else if (queuedTask) {
                cardExtraClass = 'in-bot-queue';
                const qTarget = queuedTask.target_level || (currentLvl + 1);
                statusBadgeHtml = `<span class="b-active-pulse" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border-color: rgba(6, 182, 212, 0.3);">⏳ Fila Nv ${qTarget}</span>`;
                noticeBannerHtml = `
                    <div class="b-construction-banner" style="color: var(--color-cyan); border-color: rgba(6, 182, 212, 0.3); background: rgba(6, 182, 212, 0.05);">
                        <span>🤖 Robô agendado até <b>Nível ${qTarget}</b></span>
                    </div>
                `;
                minTarget = qTarget + 1;
                initialTarget = qTarget + 1;
            } else {
                if (b.can_upgrade) {
                    statusBadgeHtml = `<span class="b-readiness-badge ready">🟢 Pronto para Evoluir</span>`;
                } else {
                    statusBadgeHtml = `<span class="b-readiness-badge lack">🔴 Faltam Recursos</span>`;
                }
            }

            const cleanName = (b.name_pt || '').replace(/^[^\w\sÀ-ÿ]+\s*/, '');

            return `
                <div class="building-card-modern ${cardExtraClass}" data-pos="${pos}">
                    <div class="b-card-top">
                        <div class="b-emblem-wrap">
                            <span>${emote}</span>
                        </div>
                        <div class="b-title-area">
                            <div class="b-name-row">
                                <h4 class="b-name" title="${cleanName}">${cleanName}</h4>
                                <span class="b-pos-chip">#Pos ${pos}</span>
                            </div>
                            <div class="b-badges-row">
                                <span class="b-level-badge">⭐ Nível ${currentLvl}</span>
                                ${statusBadgeHtml}
                            </div>
                        </div>
                    </div>

                    ${noticeBannerHtml}

                    ${renderBuildingRequirementsHtml(pos, b.upgrade_cost)}

                    <div class="b-card-footer">
                        <div class="b-stepper-row">
                            <span class="b-route-label">
                                Alvo: <strong class="b-target-disp" id="disp-target-${pos}">Nível ${initialTarget}</strong>
                            </span>
                            <div class="b-stepper-ctrls">
                                <button type="button" class="b-step-btn btn-step-sub" data-pos="${pos}" data-min="${minTarget}">-</button>
                                <input type="number" class="b-step-input" id="target-lvl-${pos}" min="${minTarget}" value="${initialTarget}" readonly>
                                <button type="button" class="b-step-btn btn-step-add" data-pos="${pos}">+</button>
                            </div>
                        </div>

                        <div class="b-quick-chips">
                            <button type="button" class="b-quick-chip" data-pos="${pos}" data-add="1" data-base="${minTarget}">+1 Nv</button>
                            <button type="button" class="b-quick-chip" data-pos="${pos}" data-add="3" data-base="${minTarget}">+3 Nv</button>
                            <button type="button" class="b-quick-chip" data-pos="${pos}" data-add="5" data-base="${minTarget}">+5 Nv</button>
                        </div>

                        <button class="btn btn-primary b-sched-btn btn-schedule-building" data-city-id="${cityId}" data-pos="${pos}" id="btn-sched-${pos}">
                            ⬆️ Agendar Fila (Nv ${initialTarget})
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Listeners para stepper [-] e [+]
        buildingsListContainer.querySelectorAll('.btn-step-sub').forEach(btn => {
            btn.addEventListener('click', () => {
                const pos = btn.getAttribute('data-pos');
                const min = parseInt(btn.getAttribute('data-min'), 10) || 1;
                const input = document.getElementById(`target-lvl-${pos}`);
                const disp = document.getElementById(`disp-target-${pos}`);
                const schedBtn = document.getElementById(`btn-sched-${pos}`);
                if (!input) return;
                let cur = parseInt(input.value, 10) || min;
                if (cur > min) {
                    cur--;
                    input.value = cur;
                    if (disp) disp.innerText = `Nível ${cur}`;
                    if (schedBtn) schedBtn.innerText = `⬆️ Agendar Fila (Nv ${cur})`;
                    updateBuildingCostForTarget(cityId, pos, cur);
                }
            });
        });

        buildingsListContainer.querySelectorAll('.btn-step-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const pos = btn.getAttribute('data-pos');
                const input = document.getElementById(`target-lvl-${pos}`);
                const disp = document.getElementById(`disp-target-${pos}`);
                const schedBtn = document.getElementById(`btn-sched-${pos}`);
                if (!input) return;
                let cur = parseInt(input.value, 10) || 1;
                cur++;
                input.value = cur;
                if (disp) disp.innerText = `Nível ${cur}`;
                if (schedBtn) schedBtn.innerText = `⬆️ Agendar Fila (Nv ${cur})`;
                updateBuildingCostForTarget(cityId, pos, cur);
            });
        });

        // Listeners para atalhos rápidos (+1, +3, +5)
        buildingsListContainer.querySelectorAll('.b-quick-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const pos = btn.getAttribute('data-pos');
                const add = parseInt(btn.getAttribute('data-add'), 10) || 1;
                const base = parseInt(btn.getAttribute('data-base'), 10) || 1;
                const input = document.getElementById(`target-lvl-${pos}`);
                const disp = document.getElementById(`disp-target-${pos}`);
                const schedBtn = document.getElementById(`btn-sched-${pos}`);
                if (!input) return;
                const target = base + (add - 1);
                input.value = target;
                if (disp) disp.innerText = `Nível ${target}`;
                if (schedBtn) schedBtn.innerText = `⬆️ Agendar Fila (Nv ${target})`;
                updateBuildingCostForTarget(cityId, pos, target);
            });
        });

        // Listeners para agendar evolução
        buildingsListContainer.querySelectorAll('.btn-schedule-building').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cid = btn.getAttribute('data-city-id');
                const pos = btn.getAttribute('data-pos');
                const targetLvl = document.getElementById(`target-lvl-${pos}`)?.value;

                btn.disabled = true;
                btn.innerText = 'Agendando...';

                try {
                    const response = await fetch('/api/action/construction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            city_id: cid,
                            position: parseInt(pos),
                            target_level: parseInt(targetLvl)
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        showToast(result.message, 'success');
                        await loadCityConstructionQueue(cid);
                        loadBuildingsForCity(cid);
                        fetchTasks();
                    } else {
                        showToast(result.error || 'Erro ao agendar', 'error');
                        btn.disabled = false;
                        btn.innerText = `⬆️ Agendar Fila (Nv ${targetLvl})`;
                    }
                } catch (e) {
                    showToast('Erro de comunicação com o servidor', 'error');
                    btn.disabled = false;
                    btn.innerText = `⬆️ Agendar Fila (Nv ${targetLvl})`;
                }
            });
        });
    }

    // Configura eventos da barra de busca e filtros de edifícios
    const searchBuildingInput = document.getElementById('input-search-building');
    if (searchBuildingInput && !searchBuildingInput.dataset.hasListener) {
        searchBuildingInput.dataset.hasListener = 'true';
        searchBuildingInput.addEventListener('input', (e) => {
            buildingSearchQuery = e.target.value.trim();
            if (currentCityBuildings.length > 0) {
                renderModernBuildingsGrid(currentCityBuildings, appState.selectedCityId);
            }
        });
    }

    const buildingFilterChips = document.getElementById('buildings-filter-chips');
    if (buildingFilterChips && !buildingFilterChips.dataset.hasListener) {
        buildingFilterChips.dataset.hasListener = 'true';
        buildingFilterChips.querySelectorAll('.b-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                buildingFilterChips.querySelectorAll('.b-filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeBuildingCategoryFilter = chip.getAttribute('data-cat') || 'all';
                if (currentCityBuildings.length > 0) {
                    renderModernBuildingsGrid(currentCityBuildings, appState.selectedCityId);
                }
            });
        });
    }

    async function loadBuildingsForCity(cityId) {
        buildingsListContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const res = await fetch(`/api/city/${cityId}/buildings`);
            const data = await res.json();
            currentCityBuildings = data.buildings || [];

            if (currentCityBuildings.length === 0) {
                buildingsListContainer.innerHTML = '<p class="empty-hint">Nenhum edifício encontrado.</p>';
                return;
            }

            renderModernBuildingsGrid(currentCityBuildings, cityId);

        } catch (err) {
            buildingsListContainer.innerHTML = '<p class="empty-hint error">Erro ao carregar edifícios da cidade.</p>';
        }
    }

    // 4. Trabalhadores & População
    let workerState = {
        cityId: null,
        totalPopulation: 0,
        wood: { workers: 0, normalMax: 0, totalMax: 0 },
        luxury: { workers: 0, normalMax: 0, totalMax: 0 },
        scientists: { workers: 0, max: 0, hasAcademy: false }
    };

    function getLuxuryDescription(type) {
        switch (parseInt(type)) {
            case 1: return "Extrai Vinho para abastecer as tavernas e manter os cidadãos felizes.";
            case 2: return "Extrai Mármore, o material indispensável para elevar o nível da maioria dos edifícios.";
            case 3: return "Extrai Cristal para acelerar pesquisas na academia e produzir médicos e submarinos.";
            case 4: return "Extrai Enxofre para recrutar tropas militares e equipar navios de combate.";
            default: return "Extrai o recurso especial da ilha para sustento e avanço do império.";
        }
    }

    function updateWorkerRatio(type, currentVal, normalMax, totalMax) {
        const valElem = document.getElementById(`val-${type}-workers`) || document.getElementById(`val-${type}`);
        const maxElem = document.getElementById(`max-${type}-workers`) || document.getElementById(`max-${type}`);
        const pctElem = document.getElementById(`pct-${type}-workers`) || document.getElementById(`pct-${type}`);
        const trackFill = document.getElementById(`track-${type}-fill`);
        const badge = document.getElementById(`badge-${type}-ratio`);

        currentVal = parseInt(currentVal) || 0;
        totalMax = parseInt(totalMax) || 0;
        normalMax = parseInt(normalMax) || totalMax;

        const pct = totalMax > 0 ? Math.round((currentVal / totalMax) * 100) : 0;

        if (valElem) valElem.innerText = formatNumber(currentVal);
        if (maxElem) maxElem.innerText = formatNumber(totalMax);
        if (pctElem) {
            if (currentVal > normalMax) {
                pctElem.innerText = `(${pct}% - Sobrecarga!)`;
            } else {
                pctElem.innerText = `(${pct}%)`;
            }
        }
        if (trackFill) {
            trackFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
        }
        if (badge) {
            if (currentVal > normalMax) {
                badge.className = 'worker-ratio-badge overload';
            } else if (currentVal === normalMax && normalMax > 0) {
                badge.className = 'worker-ratio-badge full';
            } else {
                badge.className = 'worker-ratio-badge';
            }
        }
    }

    function recalculateFreeCitizens() {
        if (!infoFreeCitizens) return;
        const woodVal = sliderWood ? parseInt(sliderWood.value) || 0 : 0;
        const luxVal = sliderLuxury ? parseInt(sliderLuxury.value) || 0 : 0;
        const sciVal = (groupScientists && groupScientists.style.display !== 'none' && sliderScientists)
            ? parseInt(sliderScientists.value) || 0
            : 0;

        const totalAllocated = woodVal + luxVal + sciVal;
        const remainingFree = workerState.totalPopulation - totalAllocated;

        if (remainingFree >= 0) {
            infoFreeCitizens.innerText = formatNumber(remainingFree);
            infoFreeCitizens.className = 'metric-val highlight';
        } else {
            infoFreeCitizens.innerText = `${formatNumber(remainingFree)} (Faltam ${Math.abs(remainingFree)} cidadãos livres!)`;
            infoFreeCitizens.className = 'metric-val negative';
        }
    }

    workersCitySelect.addEventListener('change', (e) => {
        const cid = e.target.value;
        if (cid) {
            loadWorkersForCity(cid);
        } else {
            if (workersLoadingIndicator) workersLoadingIndicator.style.display = 'none';
            if (workersCityInfo) workersCityInfo.style.display = 'none';
            if (workersForm) workersForm.style.display = 'none';
            if (workersEmptyHint) workersEmptyHint.style.display = 'block';
        }
    });

    async function loadWorkersForCity(cityId) {
        if (!cityId) {
            if (workersLoadingIndicator) workersLoadingIndicator.style.display = 'none';
            if (workersCityInfo) workersCityInfo.style.display = 'none';
            if (workersForm) workersForm.style.display = 'none';
            if (workersEmptyHint) workersEmptyHint.style.display = 'block';
            return;
        }

        // Estado visual de carregamento
        if (workersEmptyHint) workersEmptyHint.style.display = 'none';
        if (workersCityInfo) workersCityInfo.style.display = 'none';
        if (workersForm) workersForm.style.display = 'none';
        if (workersLoadingIndicator) {
            workersLoadingIndicator.style.display = 'block';
            const found = appState.cities.find(c => String(c.id) === String(cityId));
            const cityName = found ? `${found.name} [${found.x}:${found.y}]` : 'cidade selecionada';
            if (workersLoadingText) {
                workersLoadingText.innerHTML = `🔄 Consultando trabalhadores e capacidade em <b>${cityName}</b>...`;
            }
        }

        try {
            const res = await fetch(`/api/city/${cityId}/production`);
            if (!res.ok) throw new Error('Falha ao comunicar com o servidor');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Erro ao carregar dados');

            workerState.cityId = cityId;
            const woodWorkers = data.wood ? data.wood.workers || 0 : 0;
            const luxWorkers = data.luxury ? data.luxury.workers || 0 : 0;
            const sciWorkers = (data.scientists && data.scientists.has_academy) ? data.scientists.workers || 0 : 0;
            const freeCit = data.free_citizens || 0;

            workerState.totalPopulation = freeCit + woodWorkers + luxWorkers + sciWorkers;
            workerState.wood = {
                workers: woodWorkers,
                normalMax: data.wood.max || 0,
                totalMax: data.wood.total_max || data.wood.max || 100
            };
            workerState.luxury = {
                workers: luxWorkers,
                normalMax: data.luxury.max || 0,
                totalMax: data.luxury.total_max || data.luxury.max || 100
            };
            workerState.scientists = {
                workers: sciWorkers,
                max: (data.scientists && data.scientists.max) || 0,
                hasAcademy: !!(data.scientists && data.scientists.has_academy)
            };

            // Configura Serraria
            if (sliderWood) {
                sliderWood.min = 0;
                sliderWood.max = workerState.wood.totalMax;
                sliderWood.value = woodWorkers;
            }
            updateWorkerRatio('wood', woodWorkers, workerState.wood.normalMax, workerState.wood.totalMax);
            if (limitWoodWorkers) {
                limitWoodWorkers.innerHTML = `Capacidade normal: <b>${formatNumber(workerState.wood.normalMax)}</b> | Sobrecarga máx: até <b>${formatNumber(workerState.wood.totalMax)}</b>`;
            }

            // Configura Jazida de Luxo
            if (labelLuxury && data.luxury) {
                labelLuxury.innerText = `${data.luxury.icon} ${data.luxury.name} da Ilha`;
            }
            if (iconLuxuryWorkers && data.luxury) {
                iconLuxuryWorkers.innerText = data.luxury.icon || '💎';
            }
            if (descLuxuryWorkers && data.luxury) {
                descLuxuryWorkers.innerText = getLuxuryDescription(data.luxury.type);
            }
            if (sliderLuxury) {
                sliderLuxury.min = 0;
                sliderLuxury.max = workerState.luxury.totalMax;
                sliderLuxury.value = luxWorkers;
            }
            updateWorkerRatio('luxury', luxWorkers, workerState.luxury.normalMax, workerState.luxury.totalMax);
            if (limitLuxuryWorkers) {
                limitLuxuryWorkers.innerHTML = `Capacidade normal: <b>${formatNumber(workerState.luxury.normalMax)}</b> | Sobrecarga máx: até <b>${formatNumber(workerState.luxury.totalMax)}</b>`;
            }

            // Configura Academia
            if (workerState.scientists.hasAcademy && groupScientists) {
                groupScientists.style.display = 'flex';
                if (sliderScientists) {
                    sliderScientists.min = 0;
                    sliderScientists.max = workerState.scientists.max;
                    sliderScientists.value = sciWorkers;
                }
                updateWorkerRatio('scientists', sciWorkers, workerState.scientists.max, workerState.scientists.max);
                if (limitScientists) {
                    limitScientists.innerHTML = `Capacidade da Academia: até <b>${formatNumber(workerState.scientists.max)}</b> cientistas`;
                }
            } else if (groupScientists) {
                groupScientists.style.display = 'none';
            }

            // Exibe a interface com os dados carregados
            if (workersLoadingIndicator) workersLoadingIndicator.style.display = 'none';
            if (workersCityInfo) workersCityInfo.style.display = 'block';
            if (workersForm) workersForm.style.display = 'flex';

            recalculateFreeCitizens();

        } catch (err) {
            console.error('Erro ao carregar trabalhadores:', err);
            if (workersLoadingIndicator) workersLoadingIndicator.style.display = 'none';
            showToast('Erro ao carregar trabalhadores da cidade.', 'error');
            if (workersEmptyHint) {
                workersEmptyHint.innerHTML = '<p class="empty-hint error">Não foi possível carregar os dados de produção desta cidade.</p>';
                workersEmptyHint.style.display = 'block';
            }
        }
    }

    if (sliderWood) {
        sliderWood.addEventListener('input', (e) => {
            updateWorkerRatio('wood', e.target.value, workerState.wood.normalMax, workerState.wood.totalMax);
            recalculateFreeCitizens();
        });
    }

    if (sliderLuxury) {
        sliderLuxury.addEventListener('input', (e) => {
            updateWorkerRatio('luxury', e.target.value, workerState.luxury.normalMax, workerState.luxury.totalMax);
            recalculateFreeCitizens();
        });
    }

    if (sliderScientists) {
        sliderScientists.addEventListener('input', (e) => {
            updateWorkerRatio('scientists', e.target.value, workerState.scientists.max, workerState.scientists.max);
            recalculateFreeCitizens();
        });
    }

    // Botões de Preset (Mín, Normal, Máx)
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            const valType = btn.getAttribute('data-val');

            let slider = null;
            let normalVal = 0;
            let maxVal = 0;

            if (target === 'wood') {
                slider = sliderWood;
                normalVal = workerState.wood.normalMax;
                maxVal = workerState.wood.totalMax;
            } else if (target === 'luxury') {
                slider = sliderLuxury;
                normalVal = workerState.luxury.normalMax;
                maxVal = workerState.luxury.totalMax;
            } else if (target === 'scientists') {
                slider = sliderScientists;
                normalVal = workerState.scientists.max;
                maxVal = workerState.scientists.max;
            }

            if (!slider) return;

            if (valType === '0') {
                slider.value = 0;
            } else if (valType === 'normal') {
                slider.value = normalVal;
            } else if (valType === 'max') {
                slider.value = maxVal;
            }

            slider.dispatchEvent(new Event('input'));
        });
    });

    btnSaveWorkers.addEventListener('click', async () => {
        const cid = appState.selectedCityId || (workersCitySelect ? workersCitySelect.value : null);
        if (!cid) {
            showToast('Por favor, selecione uma cidade primeiro!', 'error');
            return;
        }

        const woodVal = parseInt(sliderWood.value || 0);
        const luxVal = parseInt(sliderLuxury.value || 0);
        const sciVal = (groupScientists && groupScientists.style.display !== 'none' && sliderScientists)
            ? parseInt(sliderScientists.value || 0)
            : 0;

        const remainingFree = workerState.totalPopulation - (woodVal + luxVal + sciVal);
        if (remainingFree < 0) {
            if (!confirm(`Atenção: A sua cidade não possui cidadãos livres suficientes (déficit de ${Math.abs(remainingFree)}). Deseja tentar salvar mesmo assim?`)) {
                return;
            }
        }

        btnSaveWorkers.disabled = true;
        btnSaveWorkers.innerText = 'Salvando...';

        const payload = {
            city_id: cid,
            wood_workers: woodVal,
            luxury_workers: luxVal
        };

        if (groupScientists && groupScientists.style.display !== 'none' && sliderScientists) {
            payload.scientists = sciVal;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const res = await fetch('/api/action/workers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
                fetchCities();
                loadWorkersForCity(cid);
            } else {
                showToast(data.error || 'Erro ao atualizar trabalhadores', 'error');
            }
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                showToast('Tempo limite excedido ao salvar trabalhadores no servidor.', 'error');
            } else {
                showToast('Falha na requisição ao servidor', 'error');
            }
        } finally {
            btnSaveWorkers.disabled = false;
            btnSaveWorkers.innerText = '💾 Salvar Alocação de Trabalhadores';
        }
    });

    // ==========================================
    // 4.1. DOAÇÕES DA ILHA
    // ==========================================
    if (donationCitySelect) {
        donationCitySelect.addEventListener('change', (e) => {
            const cid = e.target.value;
            if (cid) loadDonationsForCity(cid);
        });
    }

    async function loadDonationsForCity(cityId) {
        if (!cityId || !donationIslandContainer) return;
        try {
            const res = await fetch(`/api/island/donation/${cityId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success) return;

            donationIslandContainer.style.display = 'grid';

            // Serraria
            if (sawmillLvlBadge) sawmillLvlBadge.innerText = `Nível ${data.sawmill.level}${data.sawmill.upgrading ? ' (Evoluindo...)' : ''}`;
            if (sawmillDonatedText) sawmillDonatedText.innerText = `${formatNumber(data.sawmill.donated)} / ${formatNumber(data.sawmill.needed)} Madeira`;
            if (sawmillPctText) sawmillPctText.innerText = `${data.sawmill.pct}%`;
            if (sawmillProgressBar) sawmillProgressBar.style.width = `${Math.min(100, data.sawmill.pct)}%`;

            // Jazida de Luxo
            if (luxuryMineTitle) luxuryMineTitle.innerText = `${data.luxury.icon} ${data.luxury.name}`;
            if (luxuryLvlBadge) luxuryLvlBadge.innerText = `Nível ${data.luxury.level}${data.luxury.upgrading ? ' (Evoluindo...)' : ''}`;
            if (luxuryDonatedText) luxuryDonatedText.innerText = `${formatNumber(data.luxury.donated)} / ${formatNumber(data.luxury.needed)} Madeira`;
            if (luxuryPctText) luxuryPctText.innerText = `${data.luxury.pct}%`;
            if (luxuryProgressBar) luxuryProgressBar.style.width = `${Math.min(100, data.luxury.pct)}%`;
        } catch (err) {
            console.error('Erro ao carregar doações da ilha:', err);
        }
    }

    if (btnDonateSawmill) {
        btnDonateSawmill.addEventListener('click', async () => {
            const cid = appState.selectedCityId || (donationCitySelect ? donationCitySelect.value : null);
            const amount = parseInt(inputDonateSawmill.value);
            if (!cid || !amount || amount <= 0) {
                showToast('Informe uma quantidade válida de madeira para doar!', 'error');
                return;
            }
            await executeDonation(cid, 'resource', amount);
        });
    }

    if (btnDonateLuxury) {
        btnDonateLuxury.addEventListener('click', async () => {
            const cid = appState.selectedCityId || (donationCitySelect ? donationCitySelect.value : null);
            const amount = parseInt(inputDonateLuxury.value);
            if (!cid || !amount || amount <= 0) {
                showToast('Informe uma quantidade válida de madeira para doar!', 'error');
                return;
            }
            await executeDonation(cid, 'tradegood', amount);
        });
    }

    async function executeDonation(cityId, target, amount) {
        try {
            const res = await fetch('/api/action/donate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city_id: cityId, target, amount })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
                loadDonationsForCity(cityId);
                fetchCities();
            } else {
                showToast(data.error || 'Erro ao realizar doação', 'error');
            }
        } catch (err) {
            showToast('Falha na comunicação com o servidor', 'error');
        }
    }

    // ==========================================
    // 4.2. PESQUISAS NA ACADEMIA
    // ==========================================
    if (btnRefreshResearch) {
        btnRefreshResearch.addEventListener('click', () => loadResearches());
    }

    async function loadResearches() {
        if (!researchListContainer) return;
        researchListContainer.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; padding: 30px;">
                <div class="spinner"></div>
                <p>Consultando conselheiro de pesquisas do império...</p>
            </div>
        `;
        try {
            const res = await fetch('/api/research/status');
            if (!res.ok) return;
            const data = await res.json();

            // Atualiza resumo global no banner superior
            let currentPoints = 0;
            if (data.summary) {
                const ptsVal = document.getElementById('research-points-val');
                const sciVal = document.getElementById('research-scientists-val');
                const focVal = document.getElementById('research-focus-val');

                currentPoints = parseInt(String(data.summary.points || '0').replace(/\D/g, ''), 10) || 0;
                if (ptsVal) ptsVal.innerText = `${formatNumber(currentPoints)} pts`;

                if (sciVal) {
                    const sciCount = parseInt(String(data.summary.scientists || '0').replace(/\D/g, ''), 10) || 0;
                    const prodRaw = data.summary.production_per_hour !== undefined && data.summary.production_per_hour !== null 
                        ? data.summary.production_per_hour 
                        : sciCount;
                    const prodCount = parseInt(String(prodRaw).replace(/[^\d]/g, ''), 10) || 0;
                    const finalProd = prodCount > 0 ? prodCount : sciCount;
                    const prodStr = finalProd > 0 ? ` (+${formatNumber(finalProd)} pts/h)` : '';
                    sciVal.innerText = `${formatNumber(sciCount)} cientistas${prodStr}`;
                }

                if (focVal) {
                    const focusName = data.summary.current_focus || 'Nenhum';
                    const timeRem = data.summary.time_remaining && String(data.summary.time_remaining).trim() !== '-' 
                        ? ` (${String(data.summary.time_remaining).trim()})` 
                        : '';
                    focVal.innerText = `${focusName}${timeRem}`;
                }
            }

            // Renderiza pesquisas agendadas persistentes
            const schedContainer = document.getElementById('scheduled-research-container');
            const schedCount = document.getElementById('scheduled-research-count');
            const schedList = document.getElementById('scheduled-research-list');

            const scheduledItems = data.scheduled_researches || [];
            if (schedContainer && schedList) {
                if (scheduledItems.length > 0) {
                    schedContainer.style.display = 'block';
                    if (schedCount) schedCount.innerText = `${scheduledItems.length} agendada${scheduledItems.length > 1 ? 's' : ''}`;
                    schedList.innerHTML = scheduledItems.map(item => `
                        <div class="scheduled-res-card">
                            <div class="scheduled-res-info">
                                <h4>🔬 ${item.name}</h4>
                                <p>Meta: <b>${formatNumber(item.required_points)} pts</b> • Status: <span style="color: #38bdf8;">${item.status}</span> ${item.date ? `• Criada em: ${item.date}` : ''}</p>
                            </div>
                            <button type="button" class="btn btn-sm btn-danger btn-cancel-scheduled-research" data-task-id="${item.task_id}" data-pid="${item.pid || ''}">
                                Cancelar
                            </button>
                        </div>
                    `).join('');

                    schedList.querySelectorAll('.btn-cancel-scheduled-research').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const taskId = btn.getAttribute('data-task-id');
                            const pid = btn.getAttribute('data-pid');
                            btn.disabled = true;
                            btn.innerText = 'Cancelando...';
                            try {
                                const resp = await fetch('/api/tasks/kill', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ task_id: taskId, pid: pid })
                                });
                                const rData = await resp.json();
                                if (rData.success) {
                                    showToast(rData.message, 'success');
                                    loadResearches();
                                    fetchTasks();
                                } else {
                                    showToast(rData.error || 'Erro ao cancelar agendamento', 'error');
                                    btn.disabled = false;
                                    btn.innerText = 'Cancelar';
                                }
                            } catch (e) {
                                showToast('Erro de comunicação com o servidor', 'error');
                                btn.disabled = false;
                                btn.innerText = 'Cancelar';
                            }
                        });
                    });
                } else {
                    schedContainer.style.display = 'none';
                    schedList.innerHTML = '';
                }
            }

            if (!data.success || !data.researches || data.researches.length === 0) {
                researchListContainer.innerHTML = '<p class="empty-hint" style="grid-column: 1 / -1;">Nenhuma pesquisa disponível no momento ou requisitos não atendidos.</p>';
                return;
            }

            researchListContainer.innerHTML = data.researches.map(r => {
                const isActive = r.is_active;
                const costNum = r.cost_num !== undefined ? r.cost_num : (parseInt(String(r.cost || '0').replace(/\D/g, '')) || 0);
                const isScheduled = scheduledItems.some(si => String(si.study_index) === String(r.index) || si.name === r.name);
                const hasEnoughPoints = r.has_enough_points !== undefined ? r.has_enough_points : (currentPoints >= costNum);
                const diff = r.points_diff !== undefined ? r.points_diff : Math.max(0, costNum - currentPoints);
                const progPct = r.progress_pct !== undefined ? r.progress_pct : (costNum > 0 ? Math.min(100, Math.round((currentPoints / costNum) * 100)) : 100);
                const estTime = r.estimated_time_str || '';

                const activeCardClass = isActive ? 'research-card-active' : (isScheduled ? 'research-card-scheduled' : '');
                
                let badgeActive = '';
                if (isActive) {
                    badgeActive = '<span class="badge-research-active">✨ Em Investigação</span>';
                } else if (isScheduled) {
                    badgeActive = '<span class="badge-research-active" style="background: rgba(14, 165, 233, 0.2); border-color: rgba(14, 165, 233, 0.4); color: #38bdf8;">⏳ Agendada na Fila</span>';
                } else if (hasEnoughPoints) {
                    badgeActive = '<span class="badge-research-ready">🟢 Pronto para Pesquisar</span>';
                } else {
                    badgeActive = `<span class="badge-research-lack">🔴 Faltam ${formatNumber(diff)} pts</span>`;
                }

                let actionBtnHtml = '';
                if (isActive) {
                    actionBtnHtml = `<button class="btn btn-ghost btn-sm" disabled>⚡ Em Investigação</button>`;
                } else if (isScheduled) {
                    actionBtnHtml = `<button class="btn btn-outline btn-sm" disabled>⏳ Agendada na Fila</button>`;
                } else if (hasEnoughPoints) {
                    actionBtnHtml = `<button class="btn btn-primary btn-sm btn-start-research" data-index="${r.index}" data-name="${r.name}" data-cost="${costNum}">🔬 Investigar Agora</button>`;
                } else {
                    actionBtnHtml = `
                        <button class="btn btn-secondary btn-sm btn-schedule-research" data-index="${r.index}" data-name="${r.name}" data-cost="${costNum}" title="Faltam ${formatNumber(diff)} pontos. Agende para pesquisar automaticamente assim que acumular!">
                            ⏳ Agendar Pesquisa (faltam ${formatNumber(diff)} pts)
                        </button>
                    `;
                }

                return `
                    <div class="research-card ${activeCardClass}">
                        <div class="research-card-header">
                            <span class="research-branch-badge">${r.icon || '🔬'} ${r.branch || 'Tecnologia'}</span>
                            ${badgeActive}
                        </div>

                        <div class="research-card-body">
                            <h4 class="research-title">${r.name}</h4>
                            <p class="research-desc">${r.description || 'Pesquisa disponível para avanço do seu império.'}</p>
                            
                            <div class="research-progress-section">
                                <div class="research-progress-header">
                                    <span class="progress-label">Progresso do Conhecimento:</span>
                                    <span class="progress-pct-val">${progPct}%</span>
                                </div>
                                <div class="research-progress-track">
                                    <div class="research-progress-fill ${hasEnoughPoints ? 'complete' : ''}" style="width: ${progPct}%;"></div>
                                </div>
                                <div class="research-points-detail">
                                    <span>Acumulado: <b>${formatNumber(currentPoints)}</b> / <b>${formatNumber(costNum)} pts</b></span>
                                    ${!hasEnoughPoints && estTime ? `<span class="research-estimate-tag" title="Tempo estimado para atingir os pontos com os cientistas atuais">⏱️ ${estTime}</span>` : (hasEnoughPoints ? `<span class="research-surplus-tag">✓ Saldo restante: +${formatNumber(currentPoints - costNum)} pts</span>` : '')}
                                </div>
                            </div>
                        </div>

                        ${actionBtnHtml}
                    </div>
                `;
            }).join('');

            // Listeners para iniciar pesquisa imediata
            document.querySelectorAll('.btn-start-research').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const idx = btn.getAttribute('data-index');
                    const rName = btn.getAttribute('data-name');
                    const rCost = parseInt(btn.getAttribute('data-cost') || 0);

                    btn.disabled = true;
                    btn.innerText = 'Iniciando...';
                    try {
                        const resp = await fetch('/api/action/research', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ study_index: parseInt(idx) })
                        });
                        const resData = await resp.json();
                        if (resData.success) {
                            showToast(resData.message, 'success');
                            loadResearches();
                            fetchStatus();
                        } else {
                            if (resData.can_schedule) {
                                const confirmSched = confirm(
                                    `Você não tem pontos suficientes para pesquisar "${rName}" agora.\n\n` +
                                    `Pontos atuais: ${formatNumber(resData.current_points)}\n` +
                                    `Custo: ${formatNumber(resData.required_points)}\n` +
                                    `Faltam: ${formatNumber(resData.points_diff)} pts\n\n` +
                                    `Deseja agendar esta pesquisa para ser realizada automaticamente quando você acumular os pontos necessários?`
                                );
                                if (confirmSched) {
                                    scheduleResearchDirect(idx, rName, rCost);
                                    return;
                                }
                            }
                            showToast(resData.error || 'Erro ao iniciar pesquisa', 'error');
                            btn.disabled = false;
                            btn.innerText = 'Investigar Agora';
                        }
                    } catch (e) {
                        showToast('Erro de conexão ao iniciar pesquisa', 'error');
                        btn.disabled = false;
                        btn.innerText = 'Investigar Agora';
                    }
                });
            });

            // Listeners para agendar pesquisa diretamente
            document.querySelectorAll('.btn-schedule-research').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-index');
                    const rName = btn.getAttribute('data-name');
                    const rCost = parseInt(btn.getAttribute('data-cost') || 0);
                    scheduleResearchDirect(idx, rName, rCost, btn);
                });
            });

        } catch (err) {
            console.error('Erro ao carregar pesquisas:', err);
            researchListContainer.innerHTML = '<p class="empty-hint error" style="grid-column: 1 / -1;">Erro ao carregar pesquisas do servidor.</p>';
        }
    }

    async function scheduleResearchDirect(idx, name, cost, btnEl = null) {
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.innerText = 'Agendando...';
        }
        try {
            const resp = await fetch('/api/action/research/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    study_index: parseInt(idx),
                    research_name: name,
                    required_points: cost,
                })
            });
            const data = await resp.json();
            if (data.success) {
                showToast(data.message, 'success');
                loadResearches();
                fetchTasks();
            } else {
                showToast(data.error || 'Erro ao agendar pesquisa', 'error');
                if (btnEl) {
                    btnEl.disabled = false;
                    btnEl.innerText = 'Agendar Pesquisa';
                }
            }
        } catch (e) {
            showToast('Erro de conexão ao agendar pesquisa', 'error');
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerText = 'Agendar Pesquisa';
            }
        }
    }

    // ==========================================
    // 4.3. AUTO-PIRATARIA
    // ==========================================
    if (btnStartPirate) {
        btnStartPirate.addEventListener('click', async () => {
            const mission = pirateMissionSelect ? pirateMissionSelect.value : 1;
            btnStartPirate.disabled = true;
            btnStartPirate.innerText = 'Iniciando Bot de Pirataria...';
            try {
                const res = await fetch('/api/action/pirate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mission: parseInt(mission) })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    switchTab('tab-tasks');
                    fetchTasks();
                } else {
                    showToast(data.error || 'Erro ao iniciar bot de pirataria', 'error');
                }
            } catch (e) {
                showToast('Erro ao iniciar auto-pirataria', 'error');
            } finally {
                btnStartPirate.disabled = false;
                btnStartPirate.innerText = '🏴‍☠️ Iniciar Bot de Auto-Pirataria';
            }
        });
    }

    // ==========================================
    // 4.4. ALERTAS & DEFESA
    // ==========================================
    if (btnAlertAttacks) {
        btnAlertAttacks.addEventListener('click', async () => {
            btnAlertAttacks.disabled = true;
            try {
                const res = await fetch('/api/action/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'attacks' })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    fetchTasks();
                } else {
                    showToast(data.error || 'Erro ao ativar alerta', 'error');
                }
            } catch (e) {
                showToast('Erro ao ativar alerta', 'error');
            } finally {
                btnAlertAttacks.disabled = false;
            }
        });
    }

    if (btnAlertWine) {
        btnAlertWine.addEventListener('click', async () => {
            btnAlertWine.disabled = true;
            try {
                const res = await fetch('/api/action/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'wine' })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    fetchTasks();
                } else {
                    showToast(data.error || 'Erro ao ativar alerta', 'error');
                }
            } catch (e) {
                showToast('Erro ao ativar alerta', 'error');
            } finally {
                btnAlertWine.disabled = false;
            }
        });
    }

    // 5. Transporte de Cargas Interativo
    function updateTransportView() {
        const originId = transportOrigin ? transportOrigin.value : null;
        const destId = transportDest ? transportDest.value : null;

        const originCity = appState.cities.find(c => String(c.id) === String(originId));
        const destCity = appState.cities.find(c => String(c.id) === String(destId));

        const originCoordEl = document.getElementById('trans-origin-coord');
        const destCoordEl = document.getElementById('trans-dest-coord');

        if (originCoordEl) {
            originCoordEl.innerText = originCity ? `[${originCity.x}:${originCity.y}]` : '';
        }
        if (destCoordEl) {
            destCoordEl.innerText = destCity ? `[${destCity.x}:${destCity.y}]` : '';
        }

        // Atualiza estoque disponível da cidade de origem
        const stockWood = document.getElementById('stock-wood');
        const stockWine = document.getElementById('stock-wine');
        const stockMarble = document.getElementById('stock-marble');
        const stockCrystal = document.getElementById('stock-crystal');
        const stockSulfur = document.getElementById('stock-sulfur');

        if (originCity && originCity.resources) {
            const r = originCity.resources;
            if (stockWood) stockWood.innerText = `Disp: ${formatNumber(r.wood?.amount || 0)}`;
            if (stockWine) stockWine.innerText = `Disp: ${formatNumber(r.wine?.amount || 0)}`;
            if (stockMarble) stockMarble.innerText = `Disp: ${formatNumber(r.marble?.amount || 0)}`;
            if (stockCrystal) stockCrystal.innerText = `Disp: ${formatNumber(r.crystal?.amount || 0)}`;
            if (stockSulfur) stockSulfur.innerText = `Disp: ${formatNumber(r.sulfur?.amount || 0)}`;
        } else {
            if (stockWood) stockWood.innerText = 'Disp: 0';
            if (stockWine) stockWine.innerText = 'Disp: 0';
            if (stockMarble) stockMarble.innerText = 'Disp: 0';
            if (stockCrystal) stockCrystal.innerText = 'Disp: 0';
            if (stockSulfur) stockSulfur.innerText = 'Disp: 0';
        }

        calculateTransportTotals();
    }

    function calculateTransportTotals() {
        const wood = parseInt(document.getElementById('trans-wood')?.value || 0) || 0;
        const wine = parseInt(document.getElementById('trans-wine')?.value || 0) || 0;
        const marble = parseInt(document.getElementById('trans-marble')?.value || 0) || 0;
        const crystal = parseInt(document.getElementById('trans-crystal')?.value || 0) || 0;
        const sulfur = parseInt(document.getElementById('trans-sulfur')?.value || 0) || 0;

        const totalCargo = wood + wine + marble + crystal + sulfur;
        const shipsNeeded = totalCargo > 0 ? Math.ceil(totalCargo / 500) : 0;

        const freeShips = appState.freeTransports !== undefined ? appState.freeTransports : 0;
        const maxCapacity = freeShips * 500;

        const totalCargoEl = document.getElementById('trans-total-cargo');
        const shipsNeededEl = document.getElementById('trans-ships-needed');
        const capacityBar = document.getElementById('trans-capacity-bar');
        const capacityText = document.getElementById('trans-capacity-text');

        if (totalCargoEl) {
            totalCargoEl.innerText = `${formatNumber(totalCargo)} unidades`;
        }

        if (shipsNeededEl) {
            shipsNeededEl.innerText = `${shipsNeeded} / ${freeShips} disponíveis`;
            if (shipsNeeded > freeShips) {
                shipsNeededEl.style.color = '#ef4444';
                shipsNeededEl.style.fontWeight = '700';
            } else {
                shipsNeededEl.style.color = '#10b981';
                shipsNeededEl.style.fontWeight = '600';
            }
        }

        if (capacityBar && capacityText) {
            if (totalCargo === 0) {
                capacityBar.style.width = '0%';
                capacityBar.style.backgroundColor = '#10b981';
                capacityText.innerText = 'Nenhuma mercadoria carregada';
                capacityText.style.color = 'var(--text-muted)';
            } else {
                let pct = maxCapacity > 0 ? Math.min(100, Math.round((totalCargo / maxCapacity) * 100)) : 100;
                capacityBar.style.width = `${pct}%`;

                if (shipsNeeded > freeShips) {
                    capacityBar.style.backgroundColor = '#ef4444';
                    capacityText.innerText = `Atenção: Barcos insuficientes (${shipsNeeded} necessários vs ${freeShips} livres)!`;
                    capacityText.style.color = '#ef4444';
                } else {
                    capacityBar.style.backgroundColor = '#10b981';
                    capacityText.innerText = `Capacidade utilizada: ${pct}% (${formatNumber(totalCargo)} / ${formatNumber(maxCapacity)} unidades)`;
                    capacityText.style.color = '#34d399';
                }
            }
        }
    }

    // Listeners de inputs de recursos de transporte
    ['trans-wood', 'trans-wine', 'trans-marble', 'trans-crystal', 'trans-sulfur'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) {
            inp.addEventListener('input', calculateTransportTotals);
        }
    });

    // Botões rápidos de Zerar e Máx
    document.querySelectorAll('.btn-res-zero').forEach(btn => {
        btn.addEventListener('click', () => {
            const resType = btn.getAttribute('data-res');
            const inp = document.getElementById(`trans-${resType}`);
            if (inp) {
                inp.value = 0;
                calculateTransportTotals();
            }
        });
    });

    document.querySelectorAll('.btn-res-max').forEach(btn => {
        btn.addEventListener('click', () => {
            const resType = btn.getAttribute('data-res');
            const inp = document.getElementById(`trans-${resType}`);
            const originId = transportOrigin ? transportOrigin.value : null;
            const originCity = appState.cities.find(c => String(c.id) === String(originId));
            if (inp && originCity && originCity.resources && originCity.resources[resType]) {
                inp.value = originCity.resources[resType].amount || 0;
                calculateTransportTotals();
            }
        });
    });

    // Botão Limpar Tudo
    const btnClearAllTransport = document.getElementById('btn-trans-clear-all');
    if (btnClearAllTransport) {
        btnClearAllTransport.addEventListener('click', () => {
            ['trans-wood', 'trans-wine', 'trans-marble', 'trans-crystal', 'trans-sulfur'].forEach(id => {
                const inp = document.getElementById(id);
                if (inp) inp.value = 0;
            });
            calculateTransportTotals();
            showToast('Campos de transporte zerados.', 'info');
        });
    }

    if (transportOrigin) {
        transportOrigin.addEventListener('change', updateTransportView);
    }
    if (transportDest) {
        transportDest.addEventListener('change', updateTransportView);
    }

    if (btnSendResources) {
        btnSendResources.addEventListener('click', async () => {
            const originId = transportOrigin.value;
            const destId = transportDest.value;

            if (!originId || !destId) {
                showToast('Selecione as cidades de origem e destino!', 'error');
                return;
            }
            if (originId === destId) {
                showToast('A cidade de origem e destino não podem ser a mesma!', 'error');
                return;
            }

            const payload = {
                origin_id: originId,
                dest_id: destId,
                wood: parseInt(document.getElementById('trans-wood').value || 0),
                wine: parseInt(document.getElementById('trans-wine').value || 0),
                marble: parseInt(document.getElementById('trans-marble').value || 0),
                crystal: parseInt(document.getElementById('trans-crystal').value || 0),
                sulfur: parseInt(document.getElementById('trans-sulfur').value || 0),
            };

            const total = payload.wood + payload.wine + payload.marble + payload.crystal + payload.sulfur;
            if (total <= 0) {
                showToast('Informe ao menos um recurso para transportar!', 'error');
                return;
            }

            btnSendResources.disabled = true;
            btnSendResources.innerText = 'Despachando...';

            try {
                const res = await fetch('/api/action/send_resources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    ['trans-wood', 'trans-wine', 'trans-marble', 'trans-crystal', 'trans-sulfur'].forEach(id => {
                        const inp = document.getElementById(id);
                        if (inp) inp.value = 0;
                    });
                    fetchCities();
                    fetchStatus();
                    calculateTransportTotals();
                } else {
                    showToast(data.error || 'Erro ao despachar barcos', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão ao despachar recursos', 'error');
            } finally {
                btnSendResources.disabled = false;
                btnSendResources.innerText = 'Despachar Barcos Mercantes';
            }
        });
    }

    // 6. Bárbaros
    btnAttackBarbarians.addEventListener('click', async () => {
        const cid = appState.selectedCityId || (barbarianCitySelect ? barbarianCitySelect.value : null);
        if (!cid) {
            showToast('Selecione a cidade de onde partirá o ataque!', 'error');
            return;
        }

        btnAttackBarbarians.disabled = true;
        btnAttackBarbarians.innerText = 'Iniciando ataque...';

        try {
            const res = await fetch('/api/action/barbarians', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city_id: cid })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
                switchTab('tab-tasks');
                fetchTasks();
            } else {
                showToast(data.error || 'Erro ao iniciar ataque', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão ao atacar bárbaros', 'error');
        } finally {
            btnAttackBarbarians.disabled = false;
            btnAttackBarbarians.innerText = '⚔️ Iniciar Ataque aos Bárbaros';
        }
    });

    // 7. Tarefas Ativas
    async function fetchTasks() {
        try {
            const res = await fetch('/api/tasks');
            if (!res.ok) return;
            const data = await res.json();
            const tasks = data.tasks || [];
            appState.tasks = tasks;

            runningTasksCount.innerText = tasks.length;

            if (tasks.length === 0) {
                tasksTableBody.innerHTML = '<tr><td colspan="5" class="empty-hint">Nenhuma tarefa rodando em segundo plano no momento.</td></tr>';
                return;
            }

            tasksTableBody.innerHTML = tasks.map(t => {
                let statusIcon = '⚡';
                const lowerStatus = (t.status || '').toLowerCase();
                if (lowerStatus.includes('waiting') || lowerStatus.includes('aguardando') || lowerStatus.includes('cooldown')) {
                    statusIcon = '⏳';
                } else if (lowerStatus.includes('done') || lowerStatus.includes('conclu') || lowerStatus.includes('sucess')) {
                    statusIcon = '✅';
                } else if (lowerStatus.includes('error') || lowerStatus.includes('falha') || lowerStatus.includes('kill')) {
                    statusIcon = '🛑';
                }

                return `
                    <tr>
                        <td><b>#${t.pid}</b></td>
                        <td>${t.action_pt}</td>
                        <td>🕒 ${t.date}</td>
                        <td><span class="badge-status">${statusIcon} ${t.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-danger btn-kill-task" data-pid="${t.pid}">
                                🛑 Encerrar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Eventos do botão Kill
            document.querySelectorAll('.btn-kill-task').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const pid = btn.getAttribute('data-pid');
                    if (!confirm(`Deseja realmente encerrar a tarefa PID ${pid}?`)) return;

                    btn.disabled = true;
                    btn.innerText = 'Parando...';

                    try {
                        const res = await fetch('/api/tasks/kill', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pid: pid })
                        });
                        const result = await res.json();
                        if (result.success) {
                            showToast(result.message, 'success');
                            fetchTasks();
                        } else {
                            showToast(result.error || 'Erro ao parar tarefa', 'error');
                        }
                    } catch (e) {
                        showToast('Erro ao comunicar com o servidor', 'error');
                    }
                });
            });

        } catch (err) {
            console.error('Erro ao buscar tarefas:', err);
        }
    }

    // 8. Terminal de Logs ao Vivo
    let lastLogCount = 0;
    async function fetchLogs() {
        try {
            const res = await fetch('/api/logs');
            if (!res.ok) return;
            const data = await res.json();
            const logs = data.logs || [];

            if (logs.length !== lastLogCount) {
                lastLogCount = logs.length;
                terminalBody.innerHTML = logs.map(l => {
                    const lvlClass = (l.level || 'info').toLowerCase();
                    return `<div class="log-line ${lvlClass}">[${l.timestamp}] ${l.message}</div>`;
                }).join('');

                terminalBody.scrollTop = terminalBody.scrollHeight;
            }
        } catch (err) {
            // Silencioso em caso de log poll error
        }
    }

    btnClearLogs.addEventListener('click', () => {
        terminalBody.innerHTML = '<div class="log-line info">Terminal limpo pelo usuário.</div>';
    });

    btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('loading');
        fetchStatus();
        fetchCities(true);
        fetchTasks();
        fetchLogs();
        if (appState.selectedCityId) {
            setActiveCity(appState.selectedCityId, true);
        }
        setTimeout(() => btnRefresh.classList.remove('loading'), 600);
        showToast('Atualizando dados do império...', 'info');
    });

    // Auto-refresh a cada 10 minutos (600.000 ms)
    const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
    setInterval(() => {
        if (appState.connected && btnRefresh) {
            console.log('[Ikabot] Disparando auto-refresh de 10 minutos...');
            btnRefresh.click();
        }
    }, AUTO_REFRESH_INTERVAL_MS);

    // ==========================================
    // TELA DE CARREGAMENTO GLOBAL AO ENTRAR NO MUNDO
    // ==========================================
    function showGlobalLoading(title = 'Entrando no Mundo...', subtitle = 'Carregando seu império e sincronizando cidades...') {
        if (!globalLoadingScreen) return;
        if (globalLoadingTitle) globalLoadingTitle.innerText = title;
        if (globalLoadingSubtitle) globalLoadingSubtitle.innerText = subtitle;
        setGlobalLoadingProgress(20);
        resetLoadingSteps();
        updateGlobalLoadingStep('step-auth', 'active');
        globalLoadingScreen.classList.remove('hidden');
    }

    function hideGlobalLoading() {
        if (!globalLoadingScreen) return;
        globalLoadingScreen.classList.add('hidden');
    }

    function setGlobalLoadingProgress(percent) {
        if (globalLoadingBar) {
            globalLoadingBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
    }

    function setGlobalLoadingSubtitle(text) {
        if (globalLoadingSubtitle) {
            globalLoadingSubtitle.innerText = text;
        }
    }

    function resetLoadingSteps() {
        [stepAuth, stepSession, stepCities].forEach(step => {
            if (step) {
                step.className = 'loading-step-item';
            }
        });
    }

    function updateGlobalLoadingStep(stepId, state) {
        const el = document.getElementById(stepId);
        if (!el) return;
        if (state === 'active') {
            el.className = 'loading-step-item active';
        } else if (state === 'done') {
            el.className = 'loading-step-item done';
        } else {
            el.className = 'loading-step-item';
        }
    }

    // ==========================================
    // MODAL DE LOGIN E SELEÇÃO DE MUNDO
    // ==========================================
    function openLoginModal() {
        if (!loginModalOverlay) return;
        loginModalOverlay.classList.remove('hidden');
        clearAuthAlert();
        showAuthStep('credentials');
        loadSavedAccounts();
    }

    function closeLoginModal() {
        if (!loginModalOverlay) return;
        loginModalOverlay.classList.add('hidden');
        clearAuthAlert();
    }

    function showAuthAlert(message, type = 'error') {
        if (!authAlert) return;
        authAlert.className = `auth-alert ${type}`;
        let icon = '❌';
        if (type === 'info') icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        authAlert.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        authAlert.classList.remove('hidden');
    }

    function clearAuthAlert() {
        if (!authAlert) return;
        authAlert.classList.add('hidden');
        authAlert.innerHTML = '';
    }

    function showAuthStep(step) {
        if (!authStepCredentials || !authStepServers || !authLoading) return;
        authStepCredentials.classList.add('hidden');
        authStepServers.classList.add('hidden');
        authLoading.classList.add('hidden');

        if (step === 'credentials') {
            authStepCredentials.classList.remove('hidden');
        } else if (step === 'servers') {
            authStepServers.classList.remove('hidden');
        } else if (step === 'loading') {
            authLoading.classList.remove('hidden');
        }
    }

    async function loadSavedAccounts() {
        try {
            const res = await fetch('/api/auth/saved_accounts');
            if (!res.ok) return;
            const data = await res.json();
            const accounts = data.saved_accounts || [];

            if (accounts.length > 0 && savedAccountsSection && savedAccountsList) {
                savedAccountsSection.classList.remove('hidden');
                savedAccountsList.innerHTML = accounts.map(email => `
                    <div class="saved-account-card" data-email="${email}">
                        <div class="saved-account-info">
                            <span>👤</span>
                            <span>${email}</span>
                        </div>
                        <span class="saved-account-badge">💾 Usar esta conta</span>
                    </div>
                `).join('');

                savedAccountsList.querySelectorAll('.saved-account-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const email = card.getAttribute('data-email');
                        if (loginEmail) loginEmail.value = email;
                        if (loginPassword) loginPassword.value = '';
                        submitLobby(email, '');
                    });
                });
            } else if (savedAccountsSection) {
                savedAccountsSection.classList.add('hidden');
            }
        } catch (e) {
            console.error('Erro ao carregar contas salvas:', e);
        }
    }

    async function submitLobby(email, password) {
        if (!email) {
            showAuthAlert('Por favor, informe seu e-mail da Gameforge.');
            return;
        }

        clearAuthAlert();
        showAuthStep('loading');
        if (authLoadingText) {
            authLoadingText.innerHTML = '🔄 Autenticando no Gameforge Lobby e localizando seus mundos...';
        }

        try {
            const res = await fetch('/api/auth/lobby', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                showAuthStep('credentials');
                showAuthAlert(data.error || 'Erro ao conectar ao lobby Gameforge.');
                return;
            }

            if (data.status === 'connected') {
                closeLoginModal();
                showGlobalLoading(`Entrando no Mundo ${data.world || ''}...`, `Conectado como ${data.player}. Sincronizando cidades e produções...`);
                updateGlobalLoadingStep('step-auth', 'done');
                updateGlobalLoadingStep('step-session', 'done');
                updateGlobalLoadingStep('step-cities', 'active');
                setGlobalLoadingProgress(65);

                await Promise.all([
                    fetchStatus(),
                    fetchCities(),
                    fetchTasks(),
                    fetchLogs()
                ]);

                updateGlobalLoadingStep('step-cities', 'done');
                setGlobalLoadingProgress(100);
                setGlobalLoadingSubtitle('Império pronto! Abrindo painel de comando...');

                setTimeout(() => {
                    hideGlobalLoading();
                    showToast(`🎉 Conectado com sucesso como ${data.player} no mundo ${data.world}!`, 'success');
                }, 450);

            } else if (data.status === 'needs_selection') {
                currentAuthId = data.auth_id;
                renderServersList(data.accounts || []);
                showAuthStep('servers');
            }
        } catch (e) {
            showAuthStep('credentials');
            showAuthAlert('Erro de comunicação com o servidor web: ' + e.message);
        }
    }

    function renderServersList(accounts) {
        if (!serversGrid) return;
        if (!accounts || accounts.length === 0) {
            serversGrid.innerHTML = '<p class="empty-hint">Nenhum mundo disponível encontrado para este login.</p>';
            return;
        }

        serversGrid.innerHTML = accounts.map(acc => `
            <div class="server-card" data-index="${acc.index}">
                <div class="server-main-info">
                    <div class="server-world-icon">🏛️</div>
                    <div class="server-details">
                        <div class="server-world-name">${acc.world} (${acc.server_lang}${acc.number})</div>
                        <div class="server-player-name">👑 Jogador: <strong>${acc.name}</strong></div>
                        <div class="server-meta">🕒 Último login: ${acc.last_login}</div>
                    </div>
                </div>
                <button type="button" class="server-action-btn">Entrar neste Mundo ➔</button>
            </div>
        `).join('');

        serversGrid.querySelectorAll('.server-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = card.getAttribute('data-index');
                selectServer(index);
            });
        });
    }

    async function selectServer(serverIndex) {
        clearAuthAlert();

        const clickedCard = serversGrid ? serversGrid.querySelector(`.server-card[data-index="${serverIndex}"]`) : null;
        if (clickedCard) {
            clickedCard.classList.add('loading');
            const btn = clickedCard.querySelector('.server-action-btn');
            if (btn) btn.innerHTML = '⏳ Entrando...';
        }

        // Desabilita cliques para evitar envio duplo
        if (serversGrid) {
            serversGrid.querySelectorAll('.server-card').forEach(c => {
                c.style.pointerEvents = 'none';
            });
        }

        const worldName = clickedCard ? (clickedCard.querySelector('.server-world-name')?.innerText || 'Ikariam') : 'Ikariam';

        // Dispara a tela de carregamento visual completa imediatamente!
        closeLoginModal();
        showGlobalLoading(`Entrando em ${worldName}...`, 'Estabelecendo conexão e autenticando sessão de jogo...');
        setGlobalLoadingProgress(25);
        updateGlobalLoadingStep('step-auth', 'active');

        try {
            const res = await fetch('/api/auth/select_server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_id: currentAuthId, server_index: serverIndex }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                hideGlobalLoading();
                openLoginModal();
                showAuthStep('servers');
                showAuthAlert(data.error || 'Erro ao entrar no mundo selecionado.');
                if (serversGrid) {
                    serversGrid.querySelectorAll('.server-card').forEach(c => {
                        c.style.pointerEvents = 'auto';
                        c.classList.remove('loading');
                        const btn = c.querySelector('.server-action-btn');
                        if (btn) btn.innerHTML = 'Entrar neste Mundo ➔';
                    });
                }
                return;
            }

            // Sessão do mundo autenticada com sucesso!
            updateGlobalLoadingStep('step-auth', 'done');
            updateGlobalLoadingStep('step-session', 'done');
            updateGlobalLoadingStep('step-cities', 'done');
            setGlobalLoadingProgress(100);
            setGlobalLoadingSubtitle(`🎉 Conectado como ${data.player} no mundo ${data.world}! Abrindo painel de comando...`);

            // Transição instantânea para o painel de comando (idêntico à agilidade do CLI)
            setTimeout(() => {
                hideGlobalLoading();
                showToast(`🎉 Conectado com sucesso como ${data.player} no mundo ${data.world}!`, 'success');

                // Carrega status, tarefas e logs de imediato, e cidades em segundo plano
                fetchStatus();
                fetchTasks();
                fetchLogs();
                fetchCities();
            }, 300);

        } catch (e) {
            hideGlobalLoading();
            openLoginModal();
            showAuthStep('servers');
            showAuthAlert('Erro de rede ao conectar: ' + e.message);
            if (serversGrid) {
                serversGrid.querySelectorAll('.server-card').forEach(c => {
                    c.style.pointerEvents = 'auto';
                    c.classList.remove('loading');
                    const btn = c.querySelector('.server-action-btn');
                    if (btn) btn.innerHTML = 'Entrar neste Mundo ➔';
                });
            }
        }
    }

    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const password = loginPassword.value;
            submitLobby(email, password);
        });
    }

    if (btnBackToLogin) {
        btnBackToLogin.addEventListener('click', () => {
            clearAuthAlert();
            showAuthStep('credentials');
        });
    }

    if (btnOpenLogin) {
        btnOpenLogin.addEventListener('click', () => {
            openLoginModal();
        });
    }

    if (btnCloseLogin) {
        btnCloseLogin.addEventListener('click', () => {
            closeLoginModal();
        });
    }

    if (loginModalOverlay) {
        loginModalOverlay.addEventListener('click', (e) => {
            if (e.target === loginModalOverlay && appState.connected) {
                closeLoginModal();
            }
        });
    }

    // ==========================================
    // SUB-ABAS GLOBAIS (SUBNAV PILLS)
    // ==========================================
    document.querySelectorAll('.subnav-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.tab-content');
            if (!container) return;
            const targetSubtab = btn.getAttribute('data-subtab');
            container.querySelectorAll('.subnav-pill').forEach(p => p.classList.remove('active'));
            container.querySelectorAll('.subtab-pane').forEach(pane => pane.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(targetSubtab);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // ==========================================
    // 1. MÓDULO MILITAR & FROTAS
    // ==========================================
    let militaryArmyData = null;

    async function loadMilitaryArmy() {
        const container = document.getElementById('military-army-container');
        if (!container) return;
        container.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        try {
            const res = await fetch('/api/military/army');
            if (!res.ok) throw new Error('Falha ao consultar exército');
            const data = await res.json();
            militaryArmyData = data;

            if (!data.cities || data.cities.length === 0) {
                container.innerHTML = '<p class="empty-hint">Nenhuma força militar encontrada nas suas cidades.</p>';
                return;
            }

            container.innerHTML = data.cities.map(c => {
                const groundList = Object.entries(c.ground || {}).map(([uName, count]) => `
                    <div class="unit-badge">
                        <span>${uName}:</span> <span class="unit-count">${formatNumber(count)}</span>
                    </div>
                `).join('');

                const shipsList = Object.entries(c.ships || {}).map(([sName, count]) => `
                    <div class="unit-badge">
                        <span>${sName}:</span> <span class="unit-count">${formatNumber(count)}</span>
                    </div>
                `).join('');

                return `
                    <div class="city-army-card">
                        <div class="city-army-header">
                            <h4>${c.name} [${c.coords}]</h4>
                        </div>
                        <div class="army-section-title">Infantaria & Artilharia</div>
                        <div class="units-badge-list">
                            ${groundList || '<span class="empty-hint" style="font-size: 0.8rem;">Sem tropas terrestres</span>'}
                        </div>
                        <div class="army-section-title" style="margin-top: 12px;">Frota Naval</div>
                        <div class="units-badge-list">
                            ${shipsList || '<span class="empty-hint" style="font-size: 0.8rem;">Sem navios de guerra</span>'}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            container.innerHTML = `<p class="empty-hint" style="color: var(--color-rose);">Erro ao carregar guarnições: ${e.message}</p>`;
        }
    }

    async function loadMilitaryMovements() {
        const container = document.getElementById('military-movements-container');
        if (!container) return;
        container.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        try {
            const res = await fetch('/api/military/movements');
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao consultar movimentos');
            }

            if (!data.movements || data.movements.length === 0) {
                container.innerHTML = '<p class="empty-hint">Nenhuma frota ou exército em trânsito no momento.</p>';
                return;
            }

            container.innerHTML = `<div class="movements-container">` + data.movements.map(m => {
                let cardClass = '';
                if (m.is_hostile) cardClass = 'hostile';
                else if (m.returning) cardClass = 'returning';

                const arrowIcon = m.returning ? '⬅' : '➔';
                const tagMission = m.mission || (m.returning ? 'Retornando' : 'Em deslocamento');

                return `
                    <div class="movement-card ${cardClass}">
                        <div>
                            <div class="movement-route">
                                <span>${m.origin}</span>
                                <span class="movement-arrow">${arrowIcon}</span>
                                <span>${m.target}</span>
                            </div>
                            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 5px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                <span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; color: var(--text-primary); font-weight: 500;">
                                    ${tagMission}
                                </span>
                                ${m.returning ? '<b style="color: var(--color-gold);">Retornando à base</b>' : ''}
                                ${m.is_hostile ? '<b style="color: var(--color-rose);">🚨 Movimento Hostil</b>' : ''}
                                ${m.is_own ? '<span style="color: var(--color-cyan);">🛡️ Força Própria</span>' : ''}
                            </div>
                        </div>
                        <div class="movement-timer">
                            ⏱️ ${m.time_left_str || formatTimeRemaining(m.time_left)}
                        </div>
                    </div>
                `;
            }).join('') + `</div>`;
        } catch (e) {
            container.innerHTML = `<p class="empty-hint" style="color: var(--color-rose);">Erro ao carregar movimentos: ${e.message}</p>`;
        }
    }

    // CATÁLOGO TÁTICO MILITAR (15 tropas terrestres + 11 navios)
    const MILITARY_UNITS_CATALOG = [
        // Exército Terrestre (Quartel)
        { id: '301', name: 'Fundibulário', category: 'barracks', icon: '🗡️', role: 'Flanco Leve', classBadge: 'Flanco', desc: 'Atirador de projéteis rápido e econômico para as alas do exército.' },
        { id: '302', name: 'Lanceiro', category: 'barracks', icon: '🍢', role: 'Infantaria Básica', classBadge: 'Básica', desc: 'Guerreiro de infantaria leve para preenchimento de fileiras.' },
        { id: '303', name: 'Espadachim', category: 'barracks', icon: '⚔️', role: 'Flanco Ágil', classBadge: 'Flanco', desc: 'Infantaria rápida especialista em eliminar as alas inimigas.' },
        { id: '304', name: 'Hoplita', category: 'barracks', icon: '🛡️', role: 'Linha de Frente', classBadge: 'Frente', desc: 'Infantaria pesada com grande resistência para o combate principal.' },
        { id: '305', name: 'Fuzileiro', category: 'barracks', icon: '🔫', role: 'Linha de Tiro', classBadge: 'Tiro', desc: 'Atirador de precisão letal com alto poder de fogo à distância.' },
        { id: '306', name: 'Arqueiro', category: 'barracks', icon: '🏹', role: 'Linha de Tiro', classBadge: 'Tiro', desc: 'Atirador de longo alcance para bombardeio constante.' },
        { id: '307', name: 'Aríete', category: 'barracks', icon: '🐏', role: 'Cerco Inicial', classBadge: 'Cerco', desc: 'Arma de impacto para abrir brechas em muralhas.' },
        { id: '308', name: 'Catapulta', category: 'barracks', icon: '🎯', role: 'Artilharia de Cerco', classBadge: 'Artilharia', desc: 'Artilharia intermediária para destruir fortificações e muralhas.' },
        { id: '309', name: 'Morteiro', category: 'barracks', icon: '💥', role: 'Artilharia Pesada', classBadge: 'Artilharia', desc: 'Poderosa artilharia terrestre para pulverizar muralhas avançadas.' },
        { id: '310', name: 'Girocóptero', category: 'barracks', icon: '🚁', role: 'Aviação Antiaérea', classBadge: 'Aéreo', desc: 'Unidade aérea para interceptar bombardeiros e caçar artilharia.' },
        { id: '311', name: 'Balão Bombardeiro', category: 'barracks', icon: '🎈', role: 'Bombardeiro Aéreo', classBadge: 'Aéreo', desc: 'Lança bombas devastadoras sobre a artilharia e infantaria inimiga.' },
        { id: '312', name: 'Cozinheiro', category: 'barracks', icon: '🍳', role: 'Apoio de Moral', classBadge: 'Suporte', desc: 'Mantém o ânimo e vigor das tropas durante rodadas longas de combate.' },
        { id: '313', name: 'Médico', category: 'barracks', icon: '🩺', role: 'Apoio Hospitalar', classBadge: 'Suporte', desc: 'Trata soldados feridos, reduzindo drasticamente as baixas de guerra.' },
        { id: '315', name: 'Gigante a Vapor', category: 'barracks', icon: '🗿', role: 'Titã de Linha de Frente', classBadge: 'Titã', desc: 'Monstro blindado com armadura colossal para aniquilar defesas.' },
        { id: '316', name: 'Espartano', category: 'barracks', icon: '🛡️', role: 'Elite Lendária', classBadge: 'Elite', desc: 'Guerreiro de bravura suprema em combate corpo a corpo.' },

        // Frota Marítima (Estaleiro)
        { id: '317', name: 'Barco Lança-chamas', category: 'shipyard', icon: '🔥', role: 'Linha de Frente Naval', classBadge: 'Frente', desc: 'Navio incendiário veloz com altíssimo dano corpo a corpo.' },
        { id: '318', name: 'Barco Esporão', category: 'shipyard', icon: '⛵', role: 'Navio de Impacto', classBadge: 'Frente', desc: 'Embarcação com aríete de proa para abalroar navios inimigos.' },
        { id: '319', name: 'Barco Catapulta', category: 'shipyard', icon: '🏹', role: 'Artilharia Naval', classBadge: 'Artilharia', desc: 'Navio artilheiro para fogo de cobertura e bombardeio de longo alcance.' },
        { id: '320', name: 'Barco Balista', category: 'shipyard', icon: '🏹', role: 'Linha de Tiro', classBadge: 'Tiro', desc: 'Navio leve com arpões para disparos rápidos à distância.' },
        { id: '321', name: 'Barco Morteiro', category: 'shipyard', icon: '💥', role: 'Bombardeiro Naval', classBadge: 'Artilharia', desc: 'Artilharia naval pesada com projéteis parabólicos de grande alcance.' },
        { id: '322', name: 'Submarino', category: 'shipyard', icon: '🤿', role: 'Ataque Furtivo', classBadge: 'Furtivo', desc: 'Embarcação submersível com torpedos que caçam frotas blindadas.' },
        { id: '323', name: 'Barco a Vapor', category: 'shipyard', icon: '⚡', role: 'Acouraçado de Linha', classBadge: 'Blindado', desc: 'Navio couraçado movido a vapor com casco maciço de combate.' },
        { id: '324', name: 'Barco Lança-mísseis', category: 'shipyard', icon: '🚀', role: 'Artilharia Avançada', classBadge: 'Mísseis', desc: 'Plataforma marítima de foguetes de devastação massiva.' },
        { id: '325', name: 'Barco Auxiliar (Tender)', category: 'shipyard', icon: '🚢', role: 'Reparo e Suporte', classBadge: 'Suporte', desc: 'Repara embarcações danificadas e garante a moral da frota no mar.' },
        { id: '326', name: 'Porta-balões', category: 'shipyard', icon: '🎈', role: 'Controle Aéreo Naval', classBadge: 'Aeronave', desc: 'Navio-mãe que lança balões de observação e bombardeio marítimo.' },
        { id: '327', name: 'Esporão com Lança-chamas', category: 'shipyard', icon: '🔥', role: 'Vanguarda Naval', classBadge: 'Vanguarda', desc: 'Híbrido de impacto e fogo para dominar a primeira linha.' }
    ];

    let currentRecruitCategory = 'barracks';
    let selectedRecruitUnitId = '301';
    let currentCityMilitaryAvail = null;

    async function loadRecruitCityStatus(cityId) {
        if (!cityId) return;
        const chipBarracks = document.getElementById('chip-barracks-status');
        const chipShipyard = document.getElementById('chip-shipyard-status');
        const chipCitizens = document.getElementById('chip-citizens-status');

        try {
            const res = await fetch(`/api/military/units_available/${cityId}`);
            if (res.ok) {
                const data = await res.json();
                currentCityMilitaryAvail = data;

                if (chipBarracks) {
                    if (data.has_barracks) {
                        chipBarracks.innerText = `🛡️ Quartel: Nv ${data.barracks_level || 'Ativo'}`;
                        chipBarracks.className = 'status-chip active';
                    } else {
                        chipBarracks.innerText = '🛡️ Sem Quartel';
                        chipBarracks.className = 'status-chip';
                    }
                }
                if (chipShipyard) {
                    if (data.has_shipyard) {
                        chipShipyard.innerText = `⚓ Estaleiro: Nv ${data.shipyard_level || 'Ativo'}`;
                        chipShipyard.className = 'status-chip active';
                    } else {
                        chipShipyard.innerText = '⚓ Sem Estaleiro';
                        chipShipyard.className = 'status-chip';
                    }
                }
                if (chipCitizens) {
                    chipCitizens.innerText = `👥 Cidadãos: ${formatNumber(data.free_citizens || 0)}`;
                }
            }
        } catch (e) {
            console.error('Erro ao consultar instalações militares da cidade:', e);
        }

        if (!militaryArmyData) {
            try {
                const resArmy = await fetch('/api/military/army');
                if (resArmy.ok) {
                    militaryArmyData = await resArmy.json();
                }
            } catch (e) {}
        }

        renderRecruitUnitsCatalog();
    }

    function renderRecruitUnitsCatalog() {
        const container = document.getElementById('recruit-units-container');
        if (!container) return;

        const units = MILITARY_UNITS_CATALOG.filter(u => u.category === currentRecruitCategory);
        const cityId = document.getElementById('select-train-city')?.value || appState.selectedCityId;
        const cityArmy = militaryArmyData?.cities?.find(c => String(c.id) === String(cityId));

        if (!units.some(u => u.id === selectedRecruitUnitId)) {
            selectedRecruitUnitId = units[0]?.id || '301';
        }

        container.innerHTML = units.map(u => {
            const isSelected = u.id === selectedRecruitUnitId;
            let currentCount = 0;
            if (cityArmy) {
                const dict = u.category === 'barracks' ? cityArmy.ground : cityArmy.ships;
                if (dict) {
                    for (const [k, v] of Object.entries(dict)) {
                        if (k.toLowerCase().includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(k.toLowerCase())) {
                            currentCount = v;
                            break;
                        }
                    }
                }
            }

            return `
                <div class="unit-card-selectable ${isSelected ? 'selected' : ''}" data-unit-id="${u.id}">
                    <div class="unit-emblem-wrap">
                        <div class="unit-emblem">${u.icon}</div>
                        <div class="unit-name-role">
                            <div class="unit-name">${u.name}</div>
                            <span class="unit-role-tag">${u.classBadge}</span>
                        </div>
                    </div>
                    <div class="unit-garrison-info">
                        <span>Na cidade:</span>
                        <b>${formatNumber(currentCount)}</b>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.unit-card-selectable').forEach(card => {
            card.addEventListener('click', () => {
                const uid = card.getAttribute('data-unit-id');
                selectedRecruitUnitId = uid;
                container.querySelectorAll('.unit-card-selectable').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                updateRecruitActionDock();
            });
        });

        updateRecruitActionDock();
    }

    function updateRecruitActionDock() {
        const unit = MILITARY_UNITS_CATALOG.find(u => u.id === selectedRecruitUnitId);
        const dockUnitName = document.getElementById('dock-unit-name');
        const dockUnitRole = document.getElementById('dock-unit-role');
        const dockGarrisonRow = document.getElementById('dock-garrison-row');
        const dockGarrisonVal = document.getElementById('dock-garrison-val');
        const btnSubmit = document.getElementById('btn-submit-train');
        const inputAmount = document.getElementById('input-train-amount');

        if (!unit) {
            if (dockUnitName) dockUnitName.innerText = 'Selecione uma unidade';
            if (dockUnitRole) dockUnitRole.innerText = 'Clique em qualquer unidade militar no catálogo.';
            if (dockGarrisonRow) dockGarrisonRow.style.display = 'none';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = '🪖 Selecione uma Unidade';
            }
            return;
        }

        const cityId = document.getElementById('select-train-city')?.value || appState.selectedCityId;
        const cityArmy = militaryArmyData?.cities?.find(c => String(c.id) === String(cityId));
        let count = 0;
        if (cityArmy) {
            const dict = unit.category === 'barracks' ? cityArmy.ground : cityArmy.ships;
            if (dict) {
                for (const [k, v] of Object.entries(dict)) {
                    if (k.toLowerCase().includes(unit.name.toLowerCase()) || unit.name.toLowerCase().includes(k.toLowerCase())) {
                        count = v;
                        break;
                    }
                }
            }
        }

        if (dockUnitName) dockUnitName.innerHTML = `${unit.icon} ${unit.name}`;
        if (dockUnitRole) dockUnitRole.innerText = `${unit.role} • ${unit.desc}`;
        if (dockGarrisonRow) {
            dockGarrisonRow.style.display = 'flex';
            if (dockGarrisonVal) dockGarrisonVal.innerText = `${formatNumber(count)} unidades`;
        }

        const amt = parseInt(inputAmount?.value, 10) || 10;
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = `🪖 Recrutar ${formatNumber(amt)} ${unit.name}`;
        }
    }

    function populateMilitarySelects() {
        const selTrainCity = document.getElementById('select-train-city');
        const selStationOrigin = document.getElementById('select-station-origin');
        const selStationDest = document.getElementById('select-station-destination');
        if (!appState.cities || appState.cities.length === 0) return;

        const optionsHtml = appState.cities.map(c => `<option value="${c.id}">${c.name} [${c.x}:${c.y}]</option>`).join('');
        if (selTrainCity && !selTrainCity.innerHTML) {
            selTrainCity.innerHTML = optionsHtml;
            if (appState.selectedCityId) selTrainCity.value = appState.selectedCityId;
        }
        if (selStationOrigin && !selStationOrigin.innerHTML) selStationOrigin.innerHTML = optionsHtml;
        if (selStationDest && !selStationDest.innerHTML) selStationDest.innerHTML = optionsHtml;

        if (selTrainCity && !selTrainCity.dataset.hasListener) {
            selTrainCity.dataset.hasListener = 'true';
            selTrainCity.addEventListener('change', (e) => {
                loadRecruitCityStatus(e.target.value);
            });
            if (selTrainCity.value) {
                loadRecruitCityStatus(selTrainCity.value);
            }
        }

        if (selStationOrigin && !selStationOrigin.dataset.hasListener) {
            selStationOrigin.dataset.hasListener = 'true';
            selStationOrigin.addEventListener('change', (e) => {
                loadStationAvailableUnits(e.target.value);
            });
            if (selStationOrigin.value) {
                loadStationAvailableUnits(selStationOrigin.value);
            }
        }
    }

    // Configura botões de controle de recrutamento (stepper, presets, toggle)
    const recruitCatToggle = document.getElementById('recruit-cat-toggle');
    if (recruitCatToggle && !recruitCatToggle.dataset.hasListener) {
        recruitCatToggle.dataset.hasListener = 'true';
        recruitCatToggle.querySelectorAll('.recruit-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                recruitCatToggle.querySelectorAll('.recruit-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRecruitCategory = btn.getAttribute('data-cat') || 'barracks';
                renderRecruitUnitsCatalog();
            });
        });
    }

    const btnQtyMinus = document.getElementById('btn-qty-minus');
    const btnQtyPlus = document.getElementById('btn-qty-plus');
    const inputTrainAmount = document.getElementById('input-train-amount');

    if (btnQtyMinus && !btnQtyMinus.dataset.hasListener) {
        btnQtyMinus.dataset.hasListener = 'true';
        btnQtyMinus.addEventListener('click', () => {
            if (!inputTrainAmount) return;
            let val = parseInt(inputTrainAmount.value, 10) || 10;
            if (val > 1) {
                val = Math.max(1, val - 5);
                inputTrainAmount.value = val;
                updateRecruitActionDock();
            }
        });
    }

    if (btnQtyPlus && !btnQtyPlus.dataset.hasListener) {
        btnQtyPlus.dataset.hasListener = 'true';
        btnQtyPlus.addEventListener('click', () => {
            if (!inputTrainAmount) return;
            let val = parseInt(inputTrainAmount.value, 10) || 10;
            val += 5;
            inputTrainAmount.value = val;
            updateRecruitActionDock();
        });
    }

    if (inputTrainAmount && !inputTrainAmount.dataset.hasListener) {
        inputTrainAmount.dataset.hasListener = 'true';
        inputTrainAmount.addEventListener('input', () => {
            updateRecruitActionDock();
        });
    }

    document.querySelectorAll('.dock-presets .btn-preset-chip').forEach(chip => {
        if (!chip.dataset.hasListener) {
            chip.dataset.hasListener = 'true';
            chip.addEventListener('click', () => {
                if (chip.id === 'btn-preset-max') {
                    const freeCit = currentCityMilitaryAvail?.free_citizens || 50;
                    if (inputTrainAmount) inputTrainAmount.value = Math.max(1, freeCit);
                } else {
                    const amt = parseInt(chip.getAttribute('data-amt'), 10);
                    if (inputTrainAmount && !isNaN(amt)) {
                        inputTrainAmount.value = amt;
                    }
                }
                updateRecruitActionDock();
            });
        }
    });

    async function loadStationAvailableUnits(cityId) {
        const container = document.getElementById('station-units-inputs');
        if (!container || !cityId) return;

        if (!militaryArmyData) {
            try {
                const res = await fetch('/api/military/army');
                militaryArmyData = await res.json();
            } catch (e) {
                container.innerHTML = '<p class="empty-hint">Erro ao obter unidades disponíveis.</p>';
                return;
            }
        }

        const cityData = militaryArmyData?.cities?.find(c => String(c.id) === String(cityId));
        if (!cityData || (!Object.keys(cityData.ground || {}).length && !Object.keys(cityData.ships || {}).length)) {
            container.innerHTML = '<p class="empty-hint">Nenhuma unidade disponível nesta cidade para deslocamento.</p>';
            return;
        }

        let html = '';
        if (cityData.ground) {
            Object.entries(cityData.ground).forEach(([uName, count]) => {
                if (count > 0) {
                    html += `
                        <div class="station-unit-item">
                            <div class="station-unit-label">
                                <span>${uName}</span>
                                <b>(${formatNumber(count)})</b>
                            </div>
                            <input type="number" class="form-control station-unit-input" data-unit-name="${uName}" data-type="army" min="0" max="${count}" value="0">
                        </div>
                    `;
                }
            });
        }
        if (cityData.ships) {
            Object.entries(cityData.ships).forEach(([sName, count]) => {
                if (count > 0) {
                    html += `
                        <div class="station-unit-item">
                            <div class="station-unit-label">
                                <span>${sName}</span>
                                <b>(${formatNumber(count)})</b>
                            </div>
                            <input type="number" class="form-control station-unit-input" data-unit-name="${sName}" data-type="fleet" min="0" max="${count}" value="0">
                        </div>
                    `;
                }
            });
        }
        container.innerHTML = html || '<p class="empty-hint">Nenhuma unidade disponível para deslocamento.</p>';
    }

    const btnRefreshArmy = document.getElementById('btn-refresh-army');
    if (btnRefreshArmy) {
        btnRefreshArmy.addEventListener('click', () => {
            loadMilitaryArmy();
            showToast('Guarnições atualizadas!', 'info');
        });
    }

    const btnRefreshMovements = document.getElementById('btn-refresh-movements');
    if (btnRefreshMovements) {
        btnRefreshMovements.addEventListener('click', () => {
            loadMilitaryMovements();
            showToast('Movimentos atualizados!', 'info');
        });
    }

    const btnSubmitTrain = document.getElementById('btn-submit-train');
    if (btnSubmitTrain) {
        btnSubmitTrain.addEventListener('click', async () => {
            const cityId = document.getElementById('select-train-city')?.value || appState.selectedCityId;
            const unitId = selectedRecruitUnitId;
            const amount = parseInt(document.getElementById('input-train-amount')?.value, 10);

            if (!cityId || !unitId || isNaN(amount) || amount <= 0) {
                showToast('Selecione a unidade e informe uma quantidade válida para recrutar.', 'error');
                return;
            }

            const unit = MILITARY_UNITS_CATALOG.find(u => u.id === unitId);
            const trainType = unit ? unit.category : (parseInt(unitId, 10) >= 317 ? 'shipyard' : 'barracks');

            btnSubmitTrain.disabled = true;
            btnSubmitTrain.innerText = 'Despachando Ordem...';

            try {
                const res = await fetch('/api/action/military/train', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        city_id: cityId,
                        train_type: trainType,
                        trainings: { [unitId]: amount },
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || `Ordem de recrutamento de ${amount} ${unit ? unit.name : 'unidades'} enviada!`, 'success');
                    loadRecruitCityStatus(cityId);
                    loadMilitaryArmy();
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao recrutar tropas.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSubmitTrain.disabled = false;
                updateRecruitActionDock();
            }
        });
    }

    const btnSubmitStation = document.getElementById('btn-submit-station');
    if (btnSubmitStation) {
        btnSubmitStation.addEventListener('click', async () => {
            const originId = document.getElementById('select-station-origin')?.value;
            const destId = document.getElementById('select-station-destination')?.value;

            if (!originId || !destId || originId === destId) {
                showToast('Selecione origem e destino válidos e diferentes.', 'error');
                return;
            }

            const unitInputs = document.querySelectorAll('.station-unit-input');
            const unitsToSend = {};
            let hasUnits = false;

            unitInputs.forEach(inp => {
                const val = parseInt(inp.value, 10);
                if (val > 0) {
                    hasUnits = true;
                    unitsToSend[inp.dataset.unitName] = val;
                }
            });

            if (!hasUnits) {
                showToast('Informe a quantidade de pelo menos uma unidade para deslocar.', 'error');
                return;
            }

            btnSubmitStation.disabled = true;
            btnSubmitStation.innerText = 'Despachando Forças...';

            try {
                const res = await fetch('/api/action/military/station', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        origin_id: originId,
                        destination_id: destId,
                        deployment_type: 'army',
                        units: unitsToSend,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Deslocamento de forças despachado!', 'success');
                    fetchLogs();
                    loadMilitaryMovements();
                } else {
                    showToast(data.error || 'Erro ao deslocar tropas.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSubmitStation.disabled = false;
                btnSubmitStation.innerText = 'Enviar Deslocamento';
            }
        });
    }

    // ==========================================
    // 2. MÓDULO MERCADO & ENTREPOSTO
    // ==========================================
    function populateMarketSelects() {
        const selBuy = document.getElementById('select-market-buy-city');
        const selSell = document.getElementById('select-market-sell-city');
        if (!appState.cities || appState.cities.length === 0) return;

        const optionsHtml = appState.cities.map(c => `<option value="${c.id}">${c.name} [${c.x}:${c.y}]</option>`).join('');
        if (selBuy && !selBuy.innerHTML) selBuy.innerHTML = optionsHtml;
        if (selSell && !selSell.innerHTML) selSell.innerHTML = optionsHtml;
    }

    const btnSearchOffers = document.getElementById('btn-search-offers');
    if (btnSearchOffers) {
        btnSearchOffers.addEventListener('click', async () => {
            const cityId = document.getElementById('select-market-buy-city')?.value;
            const resKey = document.getElementById('select-market-buy-resource')?.value || 'wood';
            const container = document.getElementById('market-offers-container');
            if (!container) return;

            const resMap = { wood: 0, wine: 1, marble: 2, crystal: 3, sulfur: 4 };
            const resIdx = resMap[resKey] ?? 0;

            container.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
            btnSearchOffers.disabled = true;

            try {
                const res = await fetch(`/api/market/offers/${cityId}?resource=${resIdx}`);
                const data = await res.json();

                if (!data.success || !data.offers || data.offers.length === 0) {
                    container.innerHTML = '<p class="empty-hint">Nenhuma oferta encontrada para este recurso no raio selecionado.</p>';
                    return;
                }

                container.innerHTML = `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Comerciante / Cidade</th>
                                    <th>Distância</th>
                                    <th>Disponível</th>
                                    <th>Preço Unitário</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.offers.map((off, idx) => `
                                    <tr>
                                        <td><b>${off.name || 'Jogador'}</b><br><small class="text-muted">${off.destinationCityName || ''}</small></td>
                                        <td>${off.distancia || 0} ilhas</td>
                                        <td><b>${formatNumber(off.amount)}</b></td>
                                        <td><span class="unit-badge" style="color: var(--color-gold);">${off.price} 🪙</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-primary btn-buy-offer" data-index="${idx}">Comprar</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                // Eventos de compra
                container.querySelectorAll('.btn-buy-offer').forEach(b => {
                    b.addEventListener('click', async () => {
                        const idx = parseInt(b.dataset.index, 10);
                        const offer = data.offers[idx];
                        const amountStr = prompt(`Quantas unidades deseja comprar? (Máx: ${offer.amount})`, String(offer.amount));
                        if (!amountStr) return;
                        const amount = parseInt(amountStr, 10);
                        if (isNaN(amount) || amount <= 0 || amount > offer.amount) {
                            showToast('Quantidade inválida.', 'error');
                            return;
                        }

                        b.disabled = true;
                        b.innerText = 'Comprando...';
                        try {
                            const buyRes = await fetch('/api/action/market/buy', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    city_id: cityId,
                                    offer: offer,
                                    amount: amount,
                                }),
                            });
                            const buyData = await buyRes.json();
                            if (buyData.success) {
                                showToast('Compra efetuada com sucesso!', 'success');
                                fetchLogs();
                                btnSearchOffers.click();
                            } else {
                                showToast(buyData.error || 'Erro na compra.', 'error');
                            }
                        } catch (err) {
                            showToast('Erro de rede: ' + err.message, 'error');
                        } finally {
                            b.disabled = false;
                            b.innerText = 'Comprar';
                        }
                    });
                });

            } catch (e) {
                container.innerHTML = `<p class="empty-hint" style="color: var(--color-rose);">Erro ao buscar ofertas: ${e.message}</p>`;
            } finally {
                btnSearchOffers.disabled = false;
            }
        });
    }

    const btnSubmitSell = document.getElementById('btn-submit-sell');
    if (btnSubmitSell) {
        btnSubmitSell.addEventListener('click', async () => {
            const cityId = document.getElementById('select-market-sell-city')?.value;
            const resKey = document.getElementById('select-market-sell-resource')?.value || 'wood';
            const amount = parseInt(document.getElementById('input-market-sell-amount')?.value, 10);
            const price = parseInt(document.getElementById('input-market-sell-price')?.value, 10);

            const resMap = { wood: 0, wine: 1, marble: 2, crystal: 3, sulfur: 4 };
            const resType = resMap[resKey] ?? 0;

            if (!cityId || isNaN(amount) || amount <= 0 || isNaN(price) || price <= 0) {
                showToast('Preencha os campos da oferta corretamente.', 'error');
                return;
            }

            btnSubmitSell.disabled = true;
            btnSubmitSell.innerText = 'Publicando...';

            try {
                const res = await fetch('/api/action/market/sell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        city_id: cityId,
                        resource_type: resType,
                        amount: amount,
                        price: price,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Oferta publicada no Entreposto!', 'success');
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao publicar oferta.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSubmitSell.disabled = false;
                btnSubmitSell.innerText = 'Publicar Oferta';
            }
        });
    }

    // ==========================================
    // 3. MÓDULO LOGÍSTICA AVANÇADA
    // ==========================================
    function populateLogisticsCities() {
        const distContainer = document.getElementById('logistics-distribute-cities');
        const consContainer = document.getElementById('logistics-consolidate-cities');
        const selConsTarget = document.getElementById('select-consolidate-target');
        if (!appState.cities || appState.cities.length === 0) return;

        const optionsHtml = appState.cities.map(c => `<option value="${c.id}">${c.name} [${c.x}:${c.y}]</option>`).join('');
        if (selConsTarget && !selConsTarget.innerHTML) selConsTarget.innerHTML = optionsHtml;

        if (distContainer) {
            distContainer.innerHTML = appState.cities.map(c => `
                <label class="checkbox-label">
                    <input type="checkbox" name="dist-city" value="${c.id}" checked>
                    <span>${c.name}</span>
                </label>
            `).join('');
        }

        if (consContainer) {
            consContainer.innerHTML = appState.cities.map(c => `
                <label class="checkbox-label">
                    <input type="checkbox" name="cons-city" value="${c.id}" checked>
                    <span>${c.name}</span>
                </label>
            `).join('');
        }
    }

    const btnSubmitDistribute = document.getElementById('btn-submit-distribute');
    if (btnSubmitDistribute) {
        btnSubmitDistribute.addEventListener('click', async () => {
            const resKey = document.getElementById('select-distribute-resource')?.value || 'wood';
            const checkedBoxes = document.querySelectorAll('input[name="dist-city"]:checked');
            const cityIds = Array.from(checkedBoxes).map(cb => cb.value);

            if (cityIds.length < 2) {
                showToast('Selecione ao menos 2 cidades para distribuir recursos.', 'error');
                return;
            }

            const resMap = { wood: 0, wine: 1, marble: 2, crystal: 3, sulfur: 4 };
            const resType = resMap[resKey] ?? 0;

            btnSubmitDistribute.disabled = true;
            btnSubmitDistribute.innerText = 'Iniciando Distribuição...';

            try {
                const res = await fetch('/api/action/logistics/distribute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resource_type: resType,
                        evenly: true,
                        city_ids: cityIds,
                        use_freighters: false,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Distribuição equilibrada iniciada em segundo plano!', 'success');
                    fetchTasks();
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao iniciar distribuição.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSubmitDistribute.disabled = false;
                btnSubmitDistribute.innerText = 'Iniciar Distribuição Equilibrada';
            }
        });
    }

    const btnSubmitConsolidate = document.getElementById('btn-submit-consolidate');
    if (btnSubmitConsolidate) {
        btnSubmitConsolidate.addEventListener('click', async () => {
            const targetId = document.getElementById('select-consolidate-target')?.value;
            const checkedBoxes = document.querySelectorAll('input[name="cons-city"]:checked');
            const sourceIds = Array.from(checkedBoxes).map(cb => cb.value).filter(id => id !== targetId);

            if (sourceIds.length === 0) {
                showToast('Selecione cidades de origem diferentes da cidade destino.', 'error');
                return;
            }

            const checkedRes = document.querySelectorAll('input[name="consolidate-res"]:checked');
            const resMap = { wood: 0, wine: 1, marble: 2, crystal: 3, sulfur: 4 };
            const selectedResTypes = Array.from(checkedRes).map(r => resMap[r.value] ?? 0);

            if (selectedResTypes.length === 0) {
                showToast('Selecione ao menos um tipo de recurso para consolidar.', 'error');
                return;
            }

            btnSubmitConsolidate.disabled = true;
            btnSubmitConsolidate.innerText = 'Iniciando Consolidação...';

            try {
                // Inicia consolidação para os recursos selecionados
                for (const rType of selectedResTypes) {
                    await fetch('/api/action/logistics/consolidate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            resource_type: rType,
                            source_city_ids: sourceIds,
                            destination_id: targetId,
                        }),
                    });
                }
                showToast('Consolidação de recursos iniciada em segundo plano!', 'success');
                fetchTasks();
                fetchLogs();
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSubmitConsolidate.disabled = false;
                btnSubmitConsolidate.innerText = 'Iniciar Consolidação';
            }
        });
    }

    // ==========================================
    // 4. MÓDULO TEMPLO & MILAGRES
    // ==========================================
    async function loadMiracles() {
        const grid = document.getElementById('miracles-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        try {
            const res = await fetch('/api/miracles/status');
            const data = await res.json();

            if (!data.success || !data.miracles || data.miracles.length === 0) {
                grid.innerHTML = '<p class="empty-hint">Nenhuma maravilha ou templo disponível nas suas ilhas.</p>';
                return;
            }

            grid.innerHTML = data.miracles.map((m, idx) => {
                const isReady = m.available;
                const badgeClass = isReady ? 'ready' : 'cooldown';
                const badgeText = isReady ? 'Pronto para Invocar' : `Recarga: ${formatTimeRemaining(m.available_in_seconds)}`;

                return `
                    <div class="miracle-card ${isReady ? 'available' : 'cooling'}">
                        <div>
                            <div style="font-weight: 700; font-size: 1.05rem; color: var(--color-gold);">
                                ${m.wonder_name || 'Maravilha Divina'}
                            </div>
                            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                                Ilha: ${m.island_name || 'Ilha'} • Nível ${m.level}
                            </div>
                            <div style="margin-top: 8px;">
                                <span class="miracle-status-badge ${badgeClass}">${badgeText}</span>
                            </div>
                        </div>
                        <button class="btn btn-sm ${isReady ? 'btn-primary' : 'btn-secondary'} btn-activate-miracle" data-index="${idx}" ${isReady ? '' : 'disabled'}>
                            ${isReady ? 'Invocar Milagre' : 'Aguardando Recarga'}
                        </button>
                    </div>
                `;
            }).join('');

            grid.querySelectorAll('.btn-activate-miracle').forEach(b => {
                b.addEventListener('click', async () => {
                    const idx = parseInt(b.dataset.index, 10);
                    const miracle = data.miracles[idx];
                    b.disabled = true;
                    b.innerText = 'Invocando...';

                    try {
                        const actRes = await fetch('/api/action/miracles/activate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                city_id: miracle.city_id,
                                pos: miracle.pos,
                            }),
                        });
                        const actData = await actRes.json();
                        if (actData.success) {
                            showToast(actData.message || 'Milagre ativado com sucesso!', 'success');
                            fetchLogs();
                            loadMiracles();
                        } else {
                            showToast(actData.error || 'Erro ao ativar milagre.', 'error');
                        }
                    } catch (err) {
                        showToast('Erro de rede: ' + err.message, 'error');
                    }
                });
            });

        } catch (e) {
            grid.innerHTML = `<p class="empty-hint" style="color: var(--color-rose);">Erro ao carregar milagres: ${e.message}</p>`;
        }
    }

    const btnRefreshMiracles = document.getElementById('btn-refresh-miracles');
    if (btnRefreshMiracles) {
        btnRefreshMiracles.addEventListener('click', () => {
            loadMiracles();
            showToast('Milagres atualizados!', 'info');
        });
    }

    const btnActivateShrine = document.getElementById('btn-activate-shrine');
    if (btnActivateShrine) {
        btnActivateShrine.addEventListener('click', async () => {
            btnActivateShrine.disabled = true;
            btnActivateShrine.innerText = 'Ativando Santuário...';

            try {
                const res = await fetch('/api/action/shrine/activate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ god_id: 1 }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Bênção do Santuário ativada!', 'success');
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao ativar Santuário.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnActivateShrine.disabled = false;
                btnActivateShrine.innerText = 'Ativar Bênção do Santuário';
            }
        });
    }

    // ==========================================
    // 5. MÓDULO MUNDO & EXPANSÃO
    // ==========================================
    const btnStartIslandSpaces = document.getElementById('btn-start-island-spaces');
    if (btnStartIslandSpaces) {
        btnStartIslandSpaces.addEventListener('click', async () => {
            const rawCoords = document.getElementById('input-island-coords')?.value.trim() || '';
            const coordsList = rawCoords ? rawCoords.split(',').map(s => s.trim()).filter(Boolean) : [];

            btnStartIslandSpaces.disabled = true;
            btnStartIslandSpaces.innerText = 'Iniciando Monitoramento...';

            try {
                const res = await fetch('/api/action/world/search_spaces', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coords: coordsList }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Monitor de vagas ativado!', 'success');
                    fetchTasks();
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao iniciar monitoramento.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnStartIslandSpaces.disabled = false;
                btnStartIslandSpaces.innerText = 'Iniciar Monitoramento';
            }
        });
    }

    const btnStartDumpWorld = document.getElementById('btn-start-dump-world');
    if (btnStartDumpWorld) {
        btnStartDumpWorld.addEventListener('click', () => {
            showToast('Mapeamento do arquipélago em execução...', 'info');
        });
    }

    // ==========================================
    // 6. MÓDULO CONFIGURAÇÕES & SISTEMA
    // ==========================================
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings/config');
            const data = await res.json();
            if (!data.success) return;

            const tg = data.telegram || {};
            const disc = data.discord || {};
            const prx = data.proxy || {};

            const inpTgToken = document.getElementById('input-telegram-token');
            const inpTgChat = document.getElementById('input-telegram-chatid');
            const inpDiscWeb = document.getElementById('input-discord-webhook');
            const chkProxy = document.getElementById('chk-proxy-enable');
            const inpProxy = document.getElementById('input-proxy-url');

            if (inpTgToken) inpTgToken.value = tg.bot_token || '';
            if (inpTgChat) inpTgChat.value = tg.chat_id || '';
            if (inpDiscWeb) inpDiscWeb.value = disc.webhook_url || '';
            if (chkProxy) chkProxy.checked = Boolean(prx.enable);
            if (inpProxy) inpProxy.value = prx.proxy_url || '';
        } catch (e) {
            console.error('Erro ao carregar configurações:', e);
        }
    }

    const btnClaimDaily = document.getElementById('btn-claim-daily');
    if (btnClaimDaily) {
        btnClaimDaily.addEventListener('click', async () => {
            btnClaimDaily.disabled = true;
            btnClaimDaily.innerText = 'Coletando Recompensas...';

            try {
                const res = await fetch('/api/action/account/login_daily', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ city_id: appState.selectedCityId }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Bônus e recompensas diárias coletadas!', 'success');
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao coletar recompensas.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnClaimDaily.disabled = false;
                btnClaimDaily.innerText = 'Coletar Recompensas Agora';
            }
        });
    }

    const btnConfirmVacation = document.getElementById('btn-confirm-vacation');
    if (btnConfirmVacation) {
        btnConfirmVacation.addEventListener('click', async () => {
            const pwd = document.getElementById('input-vacation-password')?.value;
            if (!pwd) {
                showToast('Informe sua senha para confirmar a ativação do modo de férias.', 'error');
                return;
            }

            const confirmed = confirm('ATENÇÃO: Deseja realmente colocar a conta em MODO DE FÉRIAS? Sua conta ficará inacessível por no mínimo 48 horas.');
            if (!confirmed) return;

            btnConfirmVacation.disabled = true;
            btnConfirmVacation.innerText = 'Ativando...';

            try {
                const res = await fetch('/api/action/account/vacation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Modo de Férias ativado com sucesso!', 'warning');
                    fetchLogs();
                } else {
                    showToast(data.error || 'Erro ao ativar modo férias.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnConfirmVacation.disabled = false;
                btnConfirmVacation.innerText = 'Ativar Modo de Férias';
            }
        });
    }

    const btnSaveNotifications = document.getElementById('btn-save-notifications');
    if (btnSaveNotifications) {
        btnSaveNotifications.addEventListener('click', async () => {
            const tgToken = document.getElementById('input-telegram-token')?.value.trim();
            const tgChat = document.getElementById('input-telegram-chatid')?.value.trim();
            const discWeb = document.getElementById('input-discord-webhook')?.value.trim();

            btnSaveNotifications.disabled = true;
            try {
                const res = await fetch('/api/settings/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegram: { bot_token: tgToken, chat_id: tgChat },
                        discord: { webhook_url: discWeb },
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Configurações de notificação salvas!', 'success');
                } else {
                    showToast(data.error || 'Erro ao salvar.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSaveNotifications.disabled = false;
            }
        });
    }

    const btnTestNotifications = document.getElementById('btn-test-notifications');
    if (btnTestNotifications) {
        btnTestNotifications.addEventListener('click', () => {
            showToast('Disparando notificação de teste...', 'info');
        });
    }

    const btnSaveProxy = document.getElementById('btn-save-proxy');
    if (btnSaveProxy) {
        btnSaveProxy.addEventListener('click', async () => {
            const enable = document.getElementById('chk-proxy-enable')?.checked;
            const proxyUrl = document.getElementById('input-proxy-url')?.value.trim();

            btnSaveProxy.disabled = true;
            try {
                const res = await fetch('/api/settings/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        proxy: { enable: Boolean(enable), proxy_url: proxyUrl },
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Configurações de proxy salvas!', 'success');
                } else {
                    showToast(data.error || 'Erro ao salvar proxy.', 'error');
                }
            } catch (e) {
                showToast('Erro de rede: ' + e.message, 'error');
            } finally {
                btnSaveProxy.disabled = false;
            }
        });
    }

    // ==========================================
    // INICIALIZAÇÃO E CICLO DE REFRESH CONTÍNUO
    // ==========================================
    fetchStatus();
    fetchCities();
    fetchTasks();
    fetchLogs();

    // Polling contínuo
    setInterval(fetchStatus, 5000);  // Atualiza status e ouro a cada 5s
    setInterval(fetchTasks, 3000);   // Atualiza tarefas a cada 3s
    setInterval(fetchLogs, 2000);    // Atualiza logs a cada 2s
});
