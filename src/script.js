let selectedEquipamentoId = null;
let selectedEquipamentoNome = null;
let selectedDate = null;
const confirmButton = document.querySelector('.confirm-btn') || document.getElementById('open-agendamento-btn');

document.getElementById('open-cadastro-modal')?.addEventListener('click', () => {
    document.getElementById('cadastro-modal').classList.add('visible');
});
document.getElementById('close-cadastro-modal')?.addEventListener('click', () => {
    document.getElementById('cadastro-modal').classList.remove('visible');
    document.getElementById('cadastro-form')?.reset();
});

document.getElementById('cadastro-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const fileInput = form.elements['imagemEquipamento'];
    const file = fileInput.files[0];

    if (!file || !file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido (JPEG, PNG, etc).');
        return;
    }

    const fornecedor = form.elements['fornecedor'].value.trim();
    const nomeEquipamento = form.elements['nomeEquipamento'].value.trim();
    const descricao = form.elements['descricao'].value.trim();

    if (!fornecedor || !nomeEquipamento || !descricao) {
        alert('Por favor, preencha todos os campos de texto corretamente.');
        return;
    }

    formData.set('fornecedor', fornecedor);
    formData.set('nomeEquipamento', nomeEquipamento);
    formData.set('descricao', descricao);
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

function updateConfirmButtonState() {
    if (!confirmButton) return;
    confirmButton.disabled = !(selectedEquipamentoId && selectedDate);
}

const monthNames = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

let current = new Date();
const calendarGridEl = document.getElementById('calendar-grid');
const monthTitleEl = document.getElementById('month-title');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');
const dataDevolucaoInput = document.getElementById('dataDevolucao');

function renderCalendar(dateObj) {
    calendarGridEl.innerHTML = '';
    const dayHeaders = ['Domingo','Segunda-Feira','Terça-Feira','Quarta-Feira','Quinta-Feira','Sexta-Feira','Sábado'];
    dayHeaders.forEach(h => {
        const el = document.createElement('div');
        el.className = 'day-header';
        el.textContent = h;
        calendarGridEl.appendChild(el);
    });

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    monthTitleEl.textContent = `${monthNames[month]} ${year}`;

    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = startWeekday;
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = prevMonthDays - 1; i >= 0; i--) {
        const dayNumber = daysInPrevMonth - i;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day prev-month';
        dayEl.textContent = String(dayNumber);
        calendarGridEl.appendChild(dayEl);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = String(d);
        dayEl.dataset.fullDate = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        calendarGridEl.appendChild(dayEl);
    }

    const totalCellsSoFar = prevMonthDays + daysInMonth;
    const nextDaysToAdd = (7 - (totalCellsSoFar % 7)) % 7;
    for (let n = 1; n <= nextDaysToAdd; n++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day next-month';
        dayEl.textContent = String(n);
        calendarGridEl.appendChild(dayEl);
    }

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

prevBtn?.addEventListener('click', goToPrevMonth);
nextBtn?.addEventListener('click', goToNextMonth);

function addCalendarSelectionLogic() {
    const calendarDays = document.querySelectorAll('.calendar-day:not(.prev-month):not(.next-month)');

    calendarDays.forEach(day => {
        day.replaceWith(day.cloneNode(true));
    });

    const freshDays = document.querySelectorAll('.calendar-day:not(.prev-month):not(.next-month)');

    freshDays.forEach(day => {
        day.addEventListener('click', () => {
            const fullDate = day.dataset.fullDate;
            const today = new Date().toISOString().split('T')[0];

            if (fullDate < today) {
                alert('Não é possível agendar em uma data anterior ao dia atual.');
                return;
            }

            if (!selectedEquipamentoId) {
                alert('Por favor, selecione um equipamento primeiro!');
                return;
            }

            if (day.classList.contains('selected-day')) {
                day.classList.remove('selected-day');
                selectedDate = null;
            } else {
                document.querySelectorAll('.calendar-day.selected-day').forEach(d => d.classList.remove('selected-day'));
                day.classList.add('selected-day');
                selectedDate = day.dataset.fullDate || (() => {
                    const dayNum = String(day.textContent).padStart(2,'0');
                    return `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${dayNum}`;
                })();
            }

            updateConfirmButtonState();
        });
    });

    updateConfirmButtonState();
}

async function loadProducts() {
    const sidebar = document.getElementById('product-sidebar');
    const productList = document.getElementById('product-list');
    if (!productList || !sidebar) return;
    productList.innerHTML = '';

    selectedEquipamentoId = null;
    selectedDate = null;
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
                        <img class="product-item-image" src="/equipamento/imagem/${equipamento.idEquipamentos}?t=${Date.now()}" alt="${equipamento.nomeEquipamento}">
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

document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-products');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.querySelector('.create-text').textContent = 'Atualizando...';
            await loadProducts();
            refreshBtn.querySelector('.create-text').textContent = 'Atualizar Equipamentos';
        });
    }
});

function addSelectionLogic() {
    const productCards = document.querySelectorAll('.product-item-card');

    productCards.forEach(card => {
        const selectButton = card.querySelector('.select-button');
        const cardId = card.dataset.id;

        selectButton.addEventListener('click', (event) => {
            event.stopPropagation();

            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                selectButton.textContent = 'Selecionar';
                selectedEquipamentoId = null;
            } else {
                productCards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('.select-button').textContent = 'Selecionar';
                });

                card.classList.add('selected');
                selectedEquipamentoId = cardId;
                selectedEquipamentoNome = card.querySelector('.product-item-name')?.textContent || '';
                selectButton.textContent = 'Selecionado';
            }

            selectedDate = null;
            document.querySelectorAll('.calendar-day.selected-day').forEach(d => d.classList.remove('selected-day'));
            updateConfirmButtonState();
        });
    });
}

const agendamentoModal = document.getElementById('agendamento-modal');
const closeAgendamentoModalBtn = document.getElementById('close-agendamento-modal');
const agendamentoForm = document.getElementById('agendamento-form');

function openAgendamentoModal() {
    if (!selectedEquipamentoId || !selectedDate) {
        alert('Por favor, selecione um equipamento e uma data de retirada primeiro!');
        return;
    }

    const retiradaDate = selectedDate;

    if (dataDevolucaoInput) {
        dataDevolucaoInput.setAttribute('min', retiradaDate);
        if (dataDevolucaoInput.value && dataDevolucaoInput.value < retiradaDate) {
            dataDevolucaoInput.value = retiradaDate;
        } else if (!dataDevolucaoInput.value) {
            dataDevolucaoInput.value = retiradaDate;
        }
    }

    const equipamentoSpan = agendamentoModal?.querySelector('#modal-equipamento-nome');
    const dataRetiradaSpan = agendamentoModal?.querySelector('#modal-data-retirada');
    if (equipamentoSpan) equipamentoSpan.textContent = selectedEquipamentoNome;
    if (dataRetiradaSpan) dataRetiradaSpan.textContent = new Date(retiradaDate).toLocaleDateString('pt-BR');

    agendamentoModal?.classList.add('visible');
}

function closeAgendamentoModal() {
    agendamentoModal?.classList.remove('visible');
}

confirmButton?.addEventListener('click', (e) => {
    if (!confirmButton.disabled) {
        e.preventDefault();
        openAgendamentoModal();
    }
});

closeAgendamentoModalBtn?.addEventListener('click', closeAgendamentoModal);

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

    if (sectionToShowId === 'used-section') {
        initSearchBar();
    } else if (sectionToShowId === 'pendentes-section') {
        initPendentesSearch();
    }
}

navPendentes.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('pendentes-section');
});

navAgendar.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('agendamentos-section');
});

navUsados.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('used-section');
});

document.addEventListener('DOMContentLoaded', () => {
    navigateToSection('agendamentos-section');
});

async function loadUsedItems(searchTerm = '') {
    const usedListGrid = document.getElementById('used-list-grid');
    if (!usedListGrid) return;
    
    usedListGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando...</p>';

    try {
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

function initSearchBar() {
    const searchInput = document.getElementById('search-used');
    const searchButton = document.querySelector('#used-section .search-bar-top button');
    if (!searchInput || !searchButton) return;

    searchButton.replaceWith(searchButton.cloneNode(true));
    const freshSearchButton = document.querySelector('#used-section .search-bar-top button');

    freshSearchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        navigateToSection('used-section');
        loadUsedItems(searchTerm);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            navigateToSection('used-section');
            loadUsedItems(searchTerm);
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

navUsados.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('used-section');
    initSearchBar();
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

const navRelatorios = document.querySelector('.main-nav a[href="#"]').nextElementSibling;
const navRelatoriosItem = document.querySelectorAll('.main-nav .nav-item')[3];
const relatoriosSection = document.getElementById('relatorios-section');

function navigateToSection(sectionToShowId) {
    agendamentosSection.classList.add('hidden');
    usedSection.classList.add('hidden');
    pendentesSection.classList.add('hidden');
    relatoriosSection.classList.add('hidden');

    navAgendar.classList.remove('active');
    navUsados.classList.remove('active');
    navPendentes.classList.remove('active');
    navRelatoriosItem.classList.remove('active');

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
    } else if (sectionToShowId === 'relatorios-section') {
        relatoriosSection.classList.remove('hidden');
        navRelatoriosItem.classList.add('active');
        loadRelatorios();
    }
}

navRelatoriosItem.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToSection('relatorios-section');
});

async function loadRelatorios(searchTerm = '') {
    const relatoriosGrid = document.getElementById('relatorios-list-grid');
    if (!relatoriosGrid) return;

    relatoriosGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando...</p>';

    try {
        const url = searchTerm.trim() !== ''
            ? `/relatorios?search=${encodeURIComponent(searchTerm)}`
            : '/relatorios';

        const response = await fetch(url);
        const data = await response.json();
        relatoriosGrid.innerHTML = '';

        if (data.success && data.relatorios.length > 0) {
            data.relatorios.forEach(item => {
                const card = `
                    <div class="product-card relatorio-card">
                        <div class="product-image-container">
                            <img class="product-image" src="/equipamento/imagem/${item.idEquipamento}" alt="${item.nomeEquipamento}">
                        </div>
                        <div class="product-name">${item.nomeEquipamento}</div>
                        <div class="product-meta">
                            <span class="user-name"><i class="fas fa-user"></i> ${item.nomeSolicitante}</span>
                        </div>
                        </div>
                `;
                relatoriosGrid.insertAdjacentHTML('beforeend', card);
            });
        } else {
            relatoriosGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Nenhum registro encontrado.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        relatoriosGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Erro ao carregar relatórios.</p>';
    }
}

function initRelatoriosSearch() {
    const searchInput = document.getElementById('search-relatorios');
    const searchButton = document.querySelector('#relatorios-section .search-bar-top button');
    if (!searchInput || !searchButton) return;

    searchButton.addEventListener('click', () => {
        loadRelatorios(searchInput.value.trim());
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadRelatorios(searchInput.value.trim());
        }
    });
}

window.addEventListener('load', () => {
    loadProducts();
    renderCalendar(current);
    loadUsedItems();
    initSearchBar();
    initPendentesSearch();
    initRelatoriosSearch();
});

const relatorioModal = document.getElementById('relatorio-modal');
const btnDownloadPDF = document.getElementById('btn-download-pdf');
const cancelarRelatorioBtn = document.getElementById('cancelar-relatorio');
const relatorioForm = document.getElementById('relatorio-form');
const mensalFields = document.getElementById('mensal-fields');
const anoField = document.getElementById('ano-field');

btnDownloadPDF.addEventListener('click', () => {
  relatorioModal.classList.add('visible');
});

cancelarRelatorioBtn.addEventListener('click', () => {
  relatorioModal.classList.remove('visible');
});

relatorioForm.addEventListener('change', () => {
  const tipo = relatorioForm.tipoRelatorio.value;
  if (tipo === 'mensal') {
    mensalFields.classList.remove('hidden');
    anoField.classList.remove('hidden');
  } else if (tipo === 'anual') {
    mensalFields.classList.add('hidden');
    anoField.classList.remove('hidden');
  }
});

relatorioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = relatorioForm.tipoRelatorio.value;
    const mes = document.getElementById('mesSelecionado').value;
    const ano = document.getElementById('anoSelecionado').value;
  
    if (!tipo) {
      alert('Selecione se deseja relatório mensal ou anual.');
      return;
    }
  
    let url = '/relatorios/pdf';
    if (tipo === 'mensal') {
      url += `?tipo=mensal&mes=${mes}&ano=${ano}`;
    } else {
      url += `?tipo=anual&ano=${ano}`;
    }
  
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao gerar PDF.');
  
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `relatorio-${tipo}-${ano}${tipo === 'mensal' ? '-' + mes : ''}.pdf`;
      link.click();
    } catch (err) {
      alert('Falha ao gerar o PDF.');
      console.error(err);
    }
  
    relatorioModal.classList.remove('visible');
  });
  
  document.addEventListener('DOMContentLoaded', () => {
      initSearchBar();
      initPendentesSearch();
  });
  
  const excluirModal = document.getElementById('excluir-modal');
const openExcluirBtn = document.getElementById('open-excluir-modal');
const closeExcluirBtn = document.getElementById('close-excluir-modal');
const excluirForm = document.getElementById('excluir-form');
const selectExcluir = document.getElementById('equipamentoExcluir');

openExcluirBtn?.addEventListener('click', async () => {
    excluirModal.classList.add('visible');

    try {
        const response = await fetch('/equipamentos');
        const data = await response.json();

        selectExcluir.innerHTML = '';

        if (data.success && Array.isArray(data.equipamentos) && data.equipamentos.length > 0) {
            data.equipamentos.forEach(eq => {
                const option = document.createElement('option');
                option.value = eq.idEquipamentos;
                option.textContent = eq.nomeEquipamento;
                selectExcluir.appendChild(option);
            });
        } else {
            const opt = document.createElement('option');
            opt.textContent = 'Nenhum equipamento cadastrado.';
            opt.disabled = true;
            selectExcluir.appendChild(opt);
        }
    } catch (error) {
        console.error('Erro ao carregar equipamentos para exclusão:', error);
        alert('Erro ao carregar lista de equipamentos. Veja o console para mais detalhes.');
    }
});

closeExcluirBtn?.addEventListener('click', () => {
    excluirModal.classList.remove('visible');
});

excluirForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = selectExcluir.value;
    if (!id) {
        alert('Selecione um equipamento para excluir.');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir este equipamento? Esta ação é irreversível.')) return;

    try {
        const resp = await fetch(`/equipamento/${id}`, { method: 'DELETE' });

        let data = null;
        try { data = await resp.json(); } catch (_) { /* resposta sem JSON */ }

        if (resp.ok) {
            alert((data && data.message) ? data.message : 'Equipamento excluído com sucesso!');
            excluirModal.classList.remove('visible');
            await loadProducts();
        } else {
            const msg = (data && data.message) ? data.message : `Erro ao excluir (status ${resp.status})`;
            alert(msg);
            console.error('Resposta exclusão:', resp.status, data);
        }
    } catch (error) {
        console.error('Erro ao comunicar com o servidor durante exclusão:', error);
        alert('Erro de comunicação com o servidor. Veja o console para detalhes.');
    }
});
  
  document.getElementById('open-editar-modal')?.addEventListener('click', async () => {
      const modal = document.getElementById('editar-modal');
      modal.classList.add('visible');
  
      const select = document.getElementById('equipamentoEditar');
      select.innerHTML = '';
      try {
          const res = await fetch('/equipamentos');
          const data = await res.json();
          if (data.success) {
              data.equipamentos.forEach(eq => {
                  const option = document.createElement('option');
                  option.value = eq.idEquipamentos;
                  option.textContent = eq.nomeEquipamento;
                  select.appendChild(option);
              });
          }
      } catch (e) {
          alert('Erro ao carregar equipamentos.');
      }
  });
  
  document.getElementById('close-editar-modal')?.addEventListener('click', () => {
      document.getElementById('editar-modal').classList.remove('visible');
  });
  
  document.getElementById('editar-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const id = formData.get('equipamentoEditar');
  
      try {
        const res = await fetch(`/equipamento/editar/${id}`, {
            method: 'PUT',
            body: formData,
            headers: { 'enctype': 'multipart/form-data' }
        });
          const result = await res.json();
          if (result.success) {
              alert('Equipamento atualizado com sucesso!');
              document.getElementById('editar-modal').classList.remove('visible');
              loadProducts();
          } else {
              alert('Erro ao atualizar: ' + result.message);
          }
      } catch (err) {
          alert('Erro na comunicação com o servidor.');
      }
  });
  