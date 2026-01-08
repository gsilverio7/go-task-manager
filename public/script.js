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
            <td>${t.feito ? '✅' : '⏳'}</td>
            <td class="${t.feito ? 'feito' : ''}">
                <span class="${classeCssPrioridade(t.prioridade)}">|</span> ${t.nome}
            </td>
            <td><button onclick='abrirModal(${JSON.stringify(t)})'>Visualizar</button></td>
        </tr>
    `).join('');
}

function classeCssPrioridade(prioridade) {
    switch (prioridade) {
        case 3: return 'prioridade-alta';
        case 2: return 'prioridade-media';
        case 1: return 'prioridade-baixa';
        default: return '';
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
