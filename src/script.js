// VARIÁVEIS GLOBAIS PARA RASTREAR A SELEÇÃO
let selectedEquipamentoId = null;
let selectedEquipamentoNome = null;
let selectedDate = null;
const confirmButton = document.querySelector('.confirm-btn');

// Lógica para abrir/fechar o modal de cadastro
document.getElementById('open-cadastro-modal').addEventListener('click', () => {
    document.getElementById('cadastro-modal').classList.add('visible');
});

document.getElementById('close-cadastro-modal').addEventListener('click', () => {
    document.getElementById('cadastro-modal').classList.remove('visible');
    document.getElementById('cadastro-form').reset(); // ADICIONADO: Limpa o formulário e fecha o modal
});

// Lógica para envio do formulário de cadastro de equipamento
document.getElementById('cadastro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // Corrige o booleano do checkbox
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
            form.reset(); // ADICIONADO: Limpa o formulário após o sucesso
            // Chama a função para carregar a lista APÓS o cadastro
            loadProducts(); 
        } else {
            alert('Erro ao cadastrar equipamento: ' + result.message);
        }
    } catch (error) {
        alert('Erro na comunicação com o servidor: ' + error.message);
    }
});

/**
 * Função que verifica se equipamento E dia foram selecionados e atualiza o botão de confirmação.
 */
function updateConfirmButtonState() {
    confirmButton.disabled = !(selectedEquipamentoId && selectedDate);
}

function addCalendarSelectionLogic() {
    // Note que a seleção é feita apenas nos dias válidos (não de meses anteriores/próximos)
    const calendarDays = document.querySelectorAll('.calendar-day:not(.prev-month):not(.next-month)');

    calendarDays.forEach(day => {
        // CORREÇÃO: Lê o número do dia diretamente do conteúdo de texto do elemento.
        // O código anterior estava falhando porque tentava acessar um elemento inexistente.
        const dateValue = day.textContent; 

        day.addEventListener('click', () => {
            // Só permite selecionar o dia se um equipamento estiver selecionado
            if (!selectedEquipamentoId) {
                alert('Por favor, selecione um equipamento primeiro!');
                return;
            }

            // Desmarca o dia se ele já estiver selecionado (toggle)
            if (day.classList.contains('selected-day')) {
                day.classList.remove('selected-day');
                selectedDate = null;
            } else {
                // Remove a seleção de todos os outros dias
                calendarDays.forEach(d => d.classList.remove('selected-day'));

                // Marca o dia atual
                day.classList.add('selected-day');
                // IMPORTANTE: Aqui estamos apenas salvando o NÚMERO do dia (ex: "25").
                // O servidor precisa de "YYYY-MM-DD". O back-end precisaria de um input
                // de mês e ano para completar a data. Por simplicidade, o back-end 
                // usa o formato "DD-MM-YYYY". Para o exemplo, estamos salvando apenas
                // o dia e o back-end fará a concatenação (já implementada abaixo).
                selectedDate = dateValue; // Armazena o valor do dia selecionado
            }

            // Atualiza o estado do botão de confirmação
            updateConfirmButtonState();
        });
    });
    
    // Garante que o botão de confirmação está inicialmente desabilitado
    updateConfirmButtonState(); 
}

async function loadProducts() {
    const sidebar = document.getElementById('product-sidebar');
    const productList = document.getElementById('product-list');
    productList.innerHTML = ''; 

    // Limpa o estado da seleção ao recarregar os produtos
    selectedEquipamentoId = null;
    selectedDate = null;
    // Desmarca o dia no calendário (se houver)
    const selectedCalendarDay = document.querySelector('.calendar-day.selected-day');
    if (selectedCalendarDay) {
        selectedCalendarDay.classList.remove('selected-day');
    }
    updateConfirmButtonState(); // Desabilita o botão de confirmação

    try {
        // Faz a requisição para o endpoint que lista todos os equipamentos
        const response = await fetch('/equipamentos');
        const data = await response.json();

        if (data.success && data.equipamentos.length > 0) {

            // 1. Remove a classe 'empty-state' para mostrar a lista (e ocultar o botão "Criar Produto")
            sidebar.classList.remove('empty-state');
            productList.style.display = 'flex'; // Exibe o contêiner da lista

            data.equipamentos.forEach(equipamento => {
                // Monta o HTML do cartão do produto
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
            
            // Adiciona a lógica de seleção APÓS renderizar os cards
            addSelectionLogic();

        } else {
            // Se não houver produtos, garante que o estado vazio esteja ativo (mostra o botão "Criar Produto")
            sidebar.classList.add('empty-state');
            productList.style.display = 'none'; // Oculta o contêiner da lista
        }

    } catch (error) {
        console.error('Erro ao carregar a lista de produtos:', error);
        // Em caso de erro, mantém o estado vazio
        sidebar.classList.add('empty-state');
        productList.style.display = 'none';
    }
}

/**
 * Adiciona o ouvinte de eventos para os cartões de produto, focando no botão "Selecionar" (com lógica de toggle).
 */
function addSelectionLogic() {
    const productCards = document.querySelectorAll('.product-item-card');

    productCards.forEach(card => {
        const selectButton = card.querySelector('.select-button');
        const cardId = card.dataset.id;
        
        selectButton.addEventListener('click', (event) => {
            event.stopPropagation(); 
            
            // 1. Lógica de TOGGLE (desselecionar se já estiver selecionado)
            if (card.classList.contains('selected')) {
                // Desmarca o card atual
                card.classList.remove('selected');
                selectedEquipamentoId = null;
                selectButton.textContent = 'Selecionar';
                console.log('Equipamento Desselecionado:', cardId); 

            } else {
                // 2. Lógica de SELEÇÃO
                
                // Desmarca todos os outros cartões
                productCards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('.select-button').textContent = 'Selecionar';
                });

                // Marca o cartão atual
                card.classList.add('selected');
                selectedEquipamentoId = cardId;
                selectButton.textContent = 'Selecionado';
                console.log('Equipamento Selecionado:', cardId); 
            }
            
            // 3. Limpa a seleção do dia no calendário e atualiza o estado
            selectedDate = null;
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected-day'));
            updateConfirmButtonState();
        });
    });
}


// Chama as funções de inicialização ao carregar a página
window.addEventListener('load', () => {
    loadProducts();
    // É essencial chamar a lógica do calendário após a renderização inicial (ou garantir que os dias existam no DOM)
    addCalendarSelectionLogic(); 
});

// Referências ao novo modal de agendamento (EXISTENTE)
const agendamentoModal = document.getElementById('agendamento-modal');
const closeAgendamentoModalBtn = document.getElementById('close-agendamento-modal');
const agendamentoForm = document.getElementById('agendamento-form');

// Função para abrir o modal de agendamento (LIGEIRAMENTE CORRIGIDA)
function openAgendamentoModal() {
    // 1. Preenche o nome do equipamento e data de retirada no modal
    // CORREÇÃO: Usa a classe correta (.product-item-card) e busca o nome pelo span correto
    const equipamentoCard = document.querySelector(`.product-item-card[data-id="${selectedEquipamentoId}"]`); 
    const equipamentoNome = equipamentoCard ? equipamentoCard.querySelector('.product-item-name').textContent : 'N/A';
    
    document.getElementById('modal-equipamento-nome').textContent = equipamentoNome;
    document.getElementById('modal-data-retirada').textContent = selectedDate;
    // Preenche o dia no label de horário de retirada
    document.getElementById('modal-data-retirada-horario-label').textContent = selectedDate; 

    // 2. Exibe o modal
    agendamentoModal.classList.add('visible');
}

// Lógica para abrir/fechar o modal de agendamento
if (confirmButton) {
    // Quando o botão CONFIRMAR do calendário é clicado
    confirmButton.addEventListener('click', openAgendamentoModal);
}

// Fechar modal ao clicar em Cancelar
closeAgendamentoModalBtn.addEventListener('click', () => {
    agendamentoModal.classList.remove('visible');
    agendamentoForm.reset(); // Limpa o formulário
});

// Fechar modal ao clicar fora (no overlay)
agendamentoModal.addEventListener('click', (e) => {
    if (e.target === agendamentoModal) {
        agendamentoModal.classList.remove('visible');
        agendamentoForm.reset();
    }
});

// Lógica de SUBMISSÃO do formulário de agendamento (EXISTENTE)
agendamentoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Pega os dados do formulário
    const formData = new FormData(agendamentoForm);
    const nomeSolicitante = formData.get('nomeSolicitante');
    const horarioAgendamento = formData.get('horarioAgendamento');
    const dataDevolucao = formData.get('dataDevolucao'); // YYYY-MM-DD
    const horarioDevolucao = formData.get('horarioDevolucao');
    
    // Simulação do mês/ano (o código real precisaria ler o mês/ano do calendário)
    // Para simplificar a demonstração, usaremos Setembro de 2025 como o HTML sugere.
    const mesAno = '09-2025'; 
    const dataRetiradaFormatada = `${selectedDate}/${mesAno}`; // DD/MM/YYYY

    // Combina data e hora para os formatos DATETIME do MySQL
    // O backend precisa processar a dataRetiradaFormatada e a dataDevolucao
    const dataHorarioAg = `${dataRetiradaFormatada} ${horarioAgendamento}:00`; // Ex: 25/09/2025 10:00:00
    const dataHorarioDev = `${dataDevolucao} ${horarioDevolucao}:00`;         // Ex: 2025-10-01 17:00:00

    // ATENÇÃO: O back-end no index.js espera "YYYY-MM-DD HH:MM:SS" (ou um formato compatível)
    // Precisamos de uma data completa para a retirada. Assumindo que o dia selecionado
    // no calendário é do mês de Setembro/2025, vamos formatar a data completa.
    // O valor do input date para devolução já é YYYY-MM-DD.
    
    // RE-FORMATANDO PARA O FORMATO ESPERADO PELO MYSQL/BACKEND: YYYY-MM-DD HH:MM:SS
    // Assumindo Setembro de 2025 (como no index.html)
    const ano = '2025';
    const mes = '09';
    // Garante que o dia tenha 2 dígitos (o selectedDate é o número do dia)
    const diaRetirada = selectedDate.padStart(2, '0'); 
    
    const dataHorarioAg_mysql = `${ano}-${mes}-${diaRetirada} ${horarioAgendamento}:00`;
    const dataHorarioDev_mysql = `${dataDevolucao} ${horarioDevolucao}:00`; // dataDevolucao já é YYYY-MM-DD

    const agendamentoData = {
        idEquipamento: selectedEquipamentoId,
        nomeSolicitante: nomeSolicitante,
        dataHorarioAg: dataHorarioAg_mysql,
        dataHorarioDev: dataHorarioDev_mysql
    };
    
    console.log("Dados a serem enviados:", agendamentoData);

    try {
        const response = await fetch('/agendamento/novo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agendamentoData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Agendamento realizado com sucesso!');
            agendamentoModal.classList.remove('visible');
            agendamentoForm.reset();
            // Limpa o estado após o sucesso
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