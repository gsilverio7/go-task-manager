const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const listaTarefas = document.getElementById('lista-tarefas');
const modal = document.getElementById('modal-tarefa');
const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Ao carregar, verifica se já tem senha salva
window.onload = () => {
    if (localStorage.getItem('app_password')) {
        showApp();
    }
};

// Login
loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const pass = document.getElementById('password').value;
    localStorage.setItem('app_password', pass);

    const res = await apiCall('/ping');
    if (res.pong) {
        showApp();
    }
};

function logout() {
    localStorage.removeItem('app_password');
    
    appScreen.style.display = 'none';
    loginScreen.style.display = 'block';
    
    // Aplica animação ao voltar para o login
    loginScreen.classList.add('fade-in');
    
    listaTarefas.innerHTML = '';
    document.getElementById('password').value = '';
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const pass = localStorage.getItem('app_password');
    const options = {
        method,
        headers: {
            'X-Custom-Auth': pass,
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`/api${endpoint}`, options);
    if (res.status === 401) {
        alert("Senha incorreta!");
        logout();
    }
    return res.status === 204 ? null : res.json();
}

async function showApp() {
    // Remove qualquer animação anterior para resetar o estado
    loginScreen.classList.remove('fade-in');
    appScreen.classList.remove('fade-in');

    loginScreen.style.display = 'none';
    appScreen.style.display = 'block';
    
    // Adiciona a classe de animação
    appScreen.classList.add('fade-in');
    
    carregarTarefas();
}

async function carregarTarefas() {
    const tarefas = await apiCall('/tarefas');
    listaTarefas.innerHTML = tarefas.map(t => `
        <tr>
            <td>${
                t.feito 
                    ? '<svg class="icon icon-lg icon-green" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M256 512a256 256 0 1 1 0-512 256 256 0 1 1 0 512zm0-464a208 208 0 1 0 0 416 208 208 0 1 0 0-416zm70.7 121.9c7.8-10.7 22.8-13.1 33.5-5.3 10.7 7.8 13.1 22.8 5.3 33.5L243.4 366.1c-4.1 5.7-10.5 9.3-17.5 9.8-7 .5-13.9-2-18.8-6.9l-55.9-55.9c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l36 36 105.6-145.2z"/></svg>' 
                    : '<svg class="icon icon-lg icon-' + corPrioridade(t.prioridade) + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M464 256a208 208 0 1 1 -416 0 208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0 256 256 0 1 0 -512 0zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>'
            }</td>
            <td class="${t.feito ? 'feito' : ''}">${t.nome}</td>
            <td><button onclick='abrirModal(${JSON.stringify(t)})'>Visualizar</button></td>
        </tr>
    `).join('');
}

function corPrioridade(prioridade) {
    switch (prioridade) {
        case 1: return 'blue';
        case 2: return 'yellow';
        case 3: return 'red';
        default: return 'blue';
    }
}

// Modal e Operações
function abrirModal(tarefa = null) {
    document.getElementById('form-tarefa').reset();
    document.getElementById('task-id').value = tarefa ? tarefa.id : '';
    document.getElementById('btn-deletar').style.display = tarefa ? 'inline' : 'none';
    
    if (tarefa) {
        document.getElementById('task-nome').value = tarefa.nome;
        document.getElementById('task-desc').value = tarefa.descricao;
        document.getElementById('task-feito').checked = tarefa.feito;
        document.getElementById('task-prioridade').value = tarefa.prioridade;        
    }
    modal.showModal();
}

function fecharModal() { modal.close(); }

document.getElementById('form-tarefa').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const data = {
        nome: document.getElementById('task-nome').value,
        descricao: document.getElementById('task-desc').value,
        feito: document.getElementById('task-feito').checked,
        prioridade: parseInt(document.getElementById('task-prioridade').value)
    };

    if (id) {
        await apiCall(`/tarefas/${id}`, 'PUT', data);
    } else {
        await apiCall('/tarefas', 'POST', data);
    }
    fecharModal();
    carregarTarefas();
};

async function deletarTarefa() {
    const id = document.getElementById('task-id').value;
    if (confirm("Excluir esta tarefa?")) {
        await apiCall(`/tarefas/${id}`, 'DELETE');
        fecharModal();
        carregarTarefas();
    }
}

// Fechar modal ao clicar no backdrop (fundo)
modal.addEventListener('click', (e) => {
    // Se o alvo do clique for o próprio dialog (e não seus filhos), fecha.
    // Isso resolve o bug do select, pois o menu do select não altera o target do dialog.
    if (e.target === modal) {
        modal.close();
    }
});
