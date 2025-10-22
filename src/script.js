let selectedEquipamentoId = null;
let selectedEquipamentoNome = null;
let selectedDate = null;
const confirmButton = document.querySelector('.confirm-btn') || document.getElementById('open-agendamento-btn');

// --- Reuso de funções dos seus arquivos originais (modificadas para integração) ---

// Funções de modal de cadastro (mantive sua lógica)
document.getElementById('open-cadastro-modal')?.addEventListener('click', () => {
    document.getElementById('cadastro-modal').classList.add('visible');
});
document.getElementById('close-cadastro-modal')?.addEventListener('click', () => {
    document.getElementById('cadastro-modal').classList.remove('visible');
    document.getElementById('cadastro-form')?.reset();
});

// Lógica para envio do formulário de cadastro de equipamento (mantida)
document.getElementById('cadastro-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    formData.set('altoValor', form.elements['altoValor'].checked ? 1 : 0);
    try {
        const response = await fetch('/equipamento/cadastro', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if(result.success) {
            alert('Equipamento cadastrado com sucesso! A lista será atualizada.');
            document.getElementById('cadastro-modal').classList.remove('visible');
            form.reset();
            loadProducts();
        } else {
            alert('Erro ao cadastrar equipamento: ' + result.message);
        }
    } catch (error) {
        alert('Erro na comunicação com o servidor: ' + error.message);
    }
});

// Atualiza o estado do botão Confirmar/Agendar
function updateConfirmButtonState() {
    if (!confirmButton) return;
    confirmButton.disabled = !(selectedEquipamentoId && selectedDate);
}

// --- RENDERIZAÇÃO DINÂMICA DO CALENDÁRIO ---

const monthNames = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

let current = new Date(); // mês/ano atual - você pode ajustar se quiser abrir em um mês fixo

const calendarGridEl = document.getElementById('calendar-grid');
const monthTitleEl = document.getElementById('month-title');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

function renderCalendar(dateObj) {
    // Limpa grid
    calendarGridEl.innerHTML = '';

    // Cabeçalhos dos dias
    const dayHeaders = ['Domingo','Segunda-Feira','Terça-Feira','Quarta-Feira','Quinta-Feira','Sexta-Feira','Sábado'];
    dayHeaders.forEach(h => {
        const el = document.createElement('div');
        el.className = 'day-header';
        el.textContent = h;
        calendarGridEl.appendChild(el);
    });

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();

    // Título do mês
    monthTitleEl.textContent = `${monthNames[month]} ${year}`;

    // Primeiro dia do mês (weekday) e quantos dias tem o mês
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 (Dom) - 6 (Sáb)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Quantos dias do mês anterior precisam aparecer (para completar a primeira linha)
    const prevMonthDays = startWeekday; // 0..6
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Adiciona os dias do mês anterior (classes .prev-month)
    for (let i = prevMonthDays - 1; i >= 0; i--) {
        const dayNumber = daysInPrevMonth - i;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day prev-month';
        dayEl.textContent = String(dayNumber);
        calendarGridEl.appendChild(dayEl);
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = String(d);

        // data completa em ISO para referência (YYYY-MM-DD)
        dayEl.dataset.fullDate = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

        calendarGridEl.appendChild(dayEl);
    }

    // Preenche os dias do próximo mês para completar a última semana (até 42 células no total: 7x6)
    const totalCellsSoFar = prevMonthDays + daysInMonth;
    const nextDaysToAdd = (7 - (totalCellsSoFar % 7)) % 7;
    for (let n = 1; n <= nextDaysToAdd; n++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day next-month';
        dayEl.textContent = String(n);
        calendarGridEl.appendChild(dayEl);
    }

    // Após renderizar, anexa a lógica de seleção dos dias
    addCalendarSelectionLogic();
}

function goToPrevMonth() {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    renderCalendar(current);
}
function goToNextMonth() {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    renderCalendar(current);
}

// Event listeners nas setas
prevBtn?.addEventListener('click', goToPrevMonth);
nextBtn?.addEventListener('click', goToNextMonth);

// --- SELEÇÃO DE DIAS (mantive e adaptei sua lógica) ---
function addCalendarSelectionLogic() {
    // Seleciona apenas dias do mês atual (não prev/next)
    const calendarDays = document.querySelectorAll('.calendar-day:not(.prev-month):not(.next-month)');

    calendarDays.forEach(day => {
        const dateValue = day.textContent;

        // Remove listeners duplicados (evita múltiplos binds após re-render)
        day.replaceWith(day.cloneNode(true));
    });
    // Requery depois do clone
    const freshDays = document.querySelectorAll('.calendar-day:not(.prev-month):not(.next-month)');

    freshDays.forEach(day => {
        day.addEventListener('click', () => {
            if (!selectedEquipamentoId) {
                alert('Por favor, selecione um equipamento primeiro!');
                return;
            }

            if (day.classList.contains('selected-day')) {
                day.classList.remove('selected-day');
                selectedDate = null;
            } else {
                // Remove seleção anterior
                document.querySelectorAll('.calendar-day.selected-day').forEach(d => d.classList.remove('selected-day'));
                day.classList.add('selected-day');

                // Usa dataset.fullDate se disponível, senão monta a partir do texto
                selectedDate = day.dataset.fullDate || (() => {
                    // monta YYYY-MM-DD usando current
                    const dayNum = String(day.textContent).padStart(2,'0');
                    return `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${dayNum}`;
                })();
            }

            updateConfirmButtonState();
        });
    });

    // Atualiza estado do botão inicialmente
    updateConfirmButtonState();
}

// -------------------------
// Carregamento de produtos e seleção (mantive suas funções e integração)
// -------------------------

async function loadProducts() {
    const sidebar = document.getElementById('product-sidebar');
    const productList = document.getElementById('product-list');
    if (!productList || !sidebar) return;
    productList.innerHTML = '';

    selectedEquipamentoId = null;
    selectedDate = null;
    // limpa seleção visual
    document.querySelectorAll('.calendar-day.selected-day').forEach(d => d.classList.remove('selected-day'));
    updateConfirmButtonState();

    try {
        const response = await fetch('/equipamentos');
        const data = await response.json();

        if (data.success && data.equipamentos.length > 0) {
            sidebar.classList.remove('empty-state');
            productList.style.display = 'flex';

            data.equipamentos.forEach(equipamento => {
                const productHtml = `
                    <div class="product-item-card" data-id="${equipamento.idEquipamentos}">
                        <div class="product-item-image-container">
                            <img class="product-item-image" src="/equipamento/imagem/${equipamento.idEquipamentos}" alt="${equipamento.nomeEquipamento}">
                        </div>
                        <div class="product-item-details">
                            <span class="product-item-name">${equipamento.nomeEquipamento}</span>
                            <span class="product-item-meta">Fornecedor: ${equipamento.fornecedor}</span>
                            <span class="product-item-description">${equipamento.descricao}</span>
                        </div>
                        <span class="product-item-status">${equipamento.altoValor ? 'Alto Valor' : 'Padrão'}</span>
                        <button class="select-button">Selecionar</button>
                    </div>
                `;
                productList.insertAdjacentHTML('beforeend', productHtml);
            });

            addSelectionLogic();
        } else {
            sidebar.classList.add('empty-state');
            productList.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao carregar a lista de produtos:', error);
        sidebar.classList.add('empty-state');
        productList.style.display = 'none';
    }
}

function addSelectionLogic() {
    const productCards = document.querySelectorAll('.product-item-card');

    productCards.forEach(card => {
        const selectButton = card.querySelector('.select-button');
        const cardId = card.dataset.id;

        selectButton.addEventListener('click', (event) => {
            event.stopPropagation();

            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                selectedEquipamentoId = null;
                selectButton.textContent = 'Selecionar';
            } else {
                productCards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('.select-button').textContent = 'Selecionar';
                });

                card.classList.add('selected');
                selectedEquipamentoId = cardId;
                selectButton.textContent = 'Selecionado';
            }

            // limpa dia selecionado
            selectedDate = null;
            document.querySelectorAll('.calendar-day.selected-day').forEach(d => d.classList.remove('selected-day'));
            updateConfirmButtonState();
        });
    });
}

// -------------------------
// Modal de agendamento (mantive sua lógica)
// -------------------------
const agendamentoModal = document.getElementById('agendamento-modal');
const closeAgendamentoModalBtn = document.getElementById('close-agendamento-modal');
const agendamentoForm = document.getElementById('agendamento-form');

function openAgendamentoModal() {
    const equipamentoCard = document.querySelector(`.product-item-card[data-id="${selectedEquipamentoId}"]`);
    const equipamentoNome = equipamentoCard ? equipamentoCard.querySelector('.product-item-name').textContent : 'N/A';

    document.getElementById('modal-equipamento-nome').textContent = equipamentoNome;
    // modal espera algo tipo DD/MM/YYYY, mas deixo o ISO para precisão
    document.getElementById('modal-data-retirada').textContent = selectedDate || 'N/A';

    agendamentoModal.classList.add('visible');
}

if (confirmButton) {
    confirmButton.addEventListener('click', (e) => {
        // caso o botão seja o da página principal (id open-agendamento-btn) ou .confirm-btn
        if (confirmButton.disabled) return;
        openAgendamentoModal();
    });
}

closeAgendamentoModalBtn?.addEventListener('click', () => {
    agendamentoModal.classList.remove('visible');
    agendamentoForm?.reset();
});
agendamentoModal?.addEventListener('click', (e) => {
    if (e.target === agendamentoModal) {
        agendamentoModal.classList.remove('visible');
        agendamentoForm?.reset();
    }
});

// Submissão do formulário de agendamento (mantive a construção dos dados)
agendamentoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(agendamentoForm);
    const nomeSolicitante = formData.get('nomeSolicitante');
    const horarioAgendamento = formData.get('horarioAgendamento');
    const dataDevolucao = formData.get('dataDevolucao');
    const horarioDevolucao = formData.get('horarioDevolucao');

    if (!selectedDate) {
        alert('Selecione a data de retirada no calendário.');
        return;
    }

    // selectedDate já está no formato YYYY-MM-DD (dataset)
    const dataHorarioAg_mysql = `${selectedDate} ${horarioAgendamento}:00`;
    const dataHorarioDev_mysql = `${dataDevolucao} ${horarioDevolucao}:00`;

    const agendamentoData = {
        idEquipamento: selectedEquipamentoId,
        nomeSolicitante: nomeSolicitante,
        dataHorarioAg: dataHorarioAg_mysql,
        dataHorarioDev: dataHorarioDev_mysql
    };

    try {
        const response = await fetch('/agendamento/novo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendamentoData)
        });
        const result = await response.json();
        if (result.success) {
            alert('Agendamento realizado com sucesso!');
            agendamentoModal.classList.remove('visible');
            agendamentoForm.reset();
            selectedEquipamentoId = null;
            selectedDate = null;
            document.querySelectorAll('.product-item-card.selected').forEach(c => {
                c.classList.remove('selected');
                c.querySelector('.select-button').textContent = 'Selecionar';
            });
            document.querySelectorAll('.calendar-day.selected-day').forEach(d => d.classList.remove('selected-day'));
            updateConfirmButtonState();
        } else {
            alert('Erro ao agendar: ' + result.message);
        }
    } catch (erro) {
        console.error('Erro ao enviar agendamento:', erro);
        alert('Erro de conexão ao tentar agendar.');
    }
});

// -------------------------
// Navegação entre telas (mantive sua lógica)
// -------------------------
const navAgendar = document.getElementById('nav-schedule');
const navUsados = document.getElementById('nav-used');
const navPendentes = document.getElementById('nav-pendentes');
const pendentesSection = document.getElementById('pendentes-section');
const agendamentosSection = document.getElementById('agendamentos-section');
const usedSection = document.getElementById('used-section');

function navigateToSection(sectionToShowId) {
    agendamentosSection.classList.add('hidden');
    usedSection.classList.add('hidden');
    pendentesSection.classList.add('hidden');
    navAgendar.classList.remove('active');
    navUsados.classList.remove('active');
    navPendentes.classList.remove('active');

    if (sectionToShowId === 'agendamentos-section') {
        agendamentosSection.classList.remove('hidden');
        navAgendar.classList.add('active');
        renderCalendar(current);
    } else if (sectionToShowId === 'used-section') {
        usedSection.classList.remove('hidden');
        navUsados.classList.add('active');
        loadUsedItems();
    } else if (sectionToShowId === 'pendentes-section') {
        pendentesSection.classList.remove('hidden');
        navPendentes.classList.add('active');
        loadPendentes();
    }
}

// Evento do botão Pendentes
navPendentes.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('pendentes-section');
});
// Botões do menu
navAgendar.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('agendamentos-section');
});
navUsados.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('used-section');
});

// Abre inicialmente na aba "Agendar"
document.addEventListener('DOMContentLoaded', () => {
    navigateToSection('agendamentos-section');
});

// Carrega usados (mantive sua função)
async function loadUsedItems(searchTerm = '') {
    const usedListGrid = document.getElementById('used-list-grid');
    if (!usedListGrid) return;
    
    usedListGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando...</p>';

    try {
        // Se tiver texto digitado, adiciona como parâmetro ?search=
        const url = searchTerm.trim() !== '' 
            ? `/agendamentos?search=${encodeURIComponent(searchTerm)}`
            : '/agendamentos';

        const response = await fetch(url);
        const data = await response.json();

        usedListGrid.innerHTML = '';

        if (data.success && data.agendamentos.length > 0) {
            data.agendamentos.forEach(item => {
                const card = `
                    <div class="product-card used-card">
                        <div class="product-image-container">
                            <img class="product-image" src="/equipamento/imagem/${item.idEquipamento}" alt="${item.nomeEquipamento}">
                        </div>
                        <div class="product-name">${item.nomeEquipamento}</div>
                        <div class="product-meta">
                            <span class="user-name"><i class="fas fa-user"></i> ${item.nomeSolicitante}</span>
                        </div>
                        <div class="product-meta">
                            <span class="days-indicator" style="background-color: var(--medium-blue);">
                                <i class="fas fa-calendar-plus"></i> Retirada: ${new Date(item.dataHorarioAg).toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div class="product-meta">
                            <span class="days-indicator" style="background-color: var(--dark-blue);">
                                <i class="fas fa-calendar-check"></i> Devolução: ${new Date(item.dataHorarioDev).toLocaleString('pt-BR')}
                            </span>
                        </div>
                    </div>
                `;
                usedListGrid.insertAdjacentHTML('beforeend', card);
            });
        } else {
            usedListGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Nenhum agendamento encontrado.</p>';
        }

    } catch (error) {
        console.error('Erro ao carregar itens usados:', error);
        usedListGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Erro ao carregar os dados.</p>';
    }
}

// ======================================================
// 🧭 EVENTOS DA BARRA DE PESQUISA
// ======================================================
function initSearchBar() {
    const searchInput = document.getElementById('search-used');
    const searchButton = document.querySelector('#used-section .search-bar-top button');
    if (!searchInput || !searchButton) return;

    // Evita adicionar o mesmo evento várias vezes — usa addEventListener mas remove antes
    searchButton.replaceWith(searchButton.cloneNode(true));
    const freshSearchButton = document.querySelector('#used-section .search-bar-top button');

    freshSearchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        // garante que a aba "Em Uso" esteja visível antes de carregar
        navigateToSection('used-section');
        loadUsedItems(searchTerm);
    });

    // Use 'keydown' para capturar Enter de forma mais confiável
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            // mostra a aba "Em Uso" e pesquisa apenas os resultados relacionados
            navigateToSection('used-section');
            loadUsedItems(searchTerm);
            // Opcional: manter o foco no campo
            searchInput.focus();
        }
    });
}

function initPendentesSearch() {
    const searchInput = document.getElementById('search-pendentes');
    const searchButton = document.querySelector('#pendentes-section .search-bar-top button');
    if (!searchInput || !searchButton) return;

    searchButton.addEventListener('click', () => {
        const term = searchInput.value.trim();
        loadPendentes(term);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadPendentes(searchInput.value.trim());
        }
    });
}

// Chama a inicialização ao carregar a página
window.addEventListener('load', () => {
    loadProducts();
    renderCalendar(current);
    loadUsedItems(); // carrega tudo inicialmente (vazio = lista completa)
    initSearchBar(); // ativa a barra de pesquisa
});

// Garante que o initSearchBar seja reativado ao abrir a aba "Em Uso"
navUsados.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('used-section');
    initSearchBar(); // reafirma os listeners
    initPendentesSearch();
});

async function loadPendentes(searchTerm = '') {
    const pendentesGrid = document.getElementById('pendentes-list-grid');
    if (!pendentesGrid) return;

    pendentesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando...</p>';

    try {
        const url = searchTerm.trim() !== ''
            ? `/pendentes?search=${encodeURIComponent(searchTerm)}`
            : '/pendentes';

        const response = await fetch(url);
        const data = await response.json();

        pendentesGrid.innerHTML = '';

        if (data.success && data.pendentes.length > 0) {
            data.pendentes.forEach(item => {
                const card = `
                    <div class="product-card used-card">
                        <div class="product-image-container">
                            <img class="product-image" src="/equipamento/imagem/${item.idEquipamento}" alt="${item.nomeEquipamento}">
                        </div>
                        <div class="product-name">${item.nomeEquipamento}</div>
                        <div class="product-meta">
                            <span class="user-name"><i class="fas fa-user"></i> ${item.nomeSolicitante}</span>
                        </div>
                        <div class="product-meta">
                            <span class="days-indicator" style="background-color: #C62828;">
                                <i class="fas fa-clock"></i> Devolução prevista: ${new Date(item.dataHorarioDev).toLocaleString('pt-BR')}
                            </span>
                        </div>
                    </div>
                `;
                pendentesGrid.insertAdjacentHTML('beforeend', card);
            });
        } else {
            pendentesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Nenhum pendente encontrado.</p>';
        }

    } catch (error) {
        console.error('Erro ao carregar pendentes:', error);
        pendentesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Erro ao carregar os dados.</p>';
    }
}