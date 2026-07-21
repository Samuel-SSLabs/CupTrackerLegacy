const STATUS_LIVE = ['1H', '2H', 'ET', 'P'];
const STATUS_LIVE_COM_HT = ['1H', '2H', 'ET', 'P', 'HT'];
const STATUS_FIM = ['FT', 'AET', 'PEN'];
const STATUS_COM_DETALHES = [...STATUS_LIVE_COM_HT, ...STATUS_FIM];
let placaresAnteriores = {};
let historicoGols = {};
const TEMPO_DESTAQUE_MS = 180000;
let cachePartidas = {};
let fixtureAtualNoModal = null;
let primeiraCargaMain = true;
let cacheDetalhesMemoria = {};
let mapaTimeParaGrupo = {};
let grupoAtualNoPainel = null;
const somGol = new Audio('assets/audio.mp3');
const SIGLAS_FIFA = {
    "Canada": "CAN", "United States": "USA", "Mexico": "MEX",
    "Curacao": "CUW", "Haiti": "HAI", "Panama": "PAN",
    "Argentina": "ARG", "Brazil": "BRA", "Colombia": "COL",
    "Ecuador": "ECU", "Paraguay": "PAR", "Uruguay": "URU",
    "Germany": "GER", "Austria": "AUT", "Belgium": "BEL",
    "Bosnia and Herzegovina": "BIH", "Croatia": "CRO", "Scotland": "SCO",
    "Spain": "ESP", "France": "FRA", "Netherlands": "NED",
    "England": "ENG", "Norway": "NOR", "Portugal": "POR",
    "Czech Republic": "CZE", "Sweden": "SWE", "Switzerland": "SUI",
    "Turkey": "TUR", "Saudi Arabia": "KSA", "Australia": "AUS",
    "Qatar": "QAT", "South Korea": "KOR", "Iran": "IRN",
    "Iraq": "IRQ", "Japan": "JPN", "Jordan": "JOR",
    "Uzbekistan": "UZB", "South Africa": "RSA", "Algeria": "ALG",
    "Cape Verde": "CPV", "Ivory Coast": "CIV", "Egypt": "EGY",
    "Ghana": "GHA", "Morocco": "MAR", "DR Congo": "COD",
    "Senegal": "SEN", "Tunisia": "TUN", "New Zealand": "NZL"
};
const CORES_SELECOES = {
    6:    '#FFD700',     26:   '#75AADB',     9:    '#C60B1E',     2:    '#003189',     25:   '#000000',     27:   '#C8102E',     10:   '#003090',     15:   '#FF0000',     1118: '#FF6900',     12:   '#BC002D',     8:    '#FCD116',     16:   '#006847',     2384: '#002868',     31:   '#C1272D',     1090: '#003087',     5529: '#FF0000',     5:    '#006AA7',     3:    '#FF0000',     7:    '#5EB6E4',     17:   '#C60C30',     22:   '#239F40',     32:   '#C8102E',     1531: '#007A4D',     20:   '#FFD700',     1108: '#003F87',     1:    '#000000',     1532: '#006233',     1113: '#002395',     2380: '#D52B1E',     1533: '#003893',     1504: '#FCD116',     775:  '#C8102E',     1508: '#007FFF',     2382: '#FFD100',     5530: '#003087',     28:   '#C8102E',     1569: '#8D1B3D',     770:  '#D7141A',     1548: '#007A3D',     1567: '#007A3D',     1568: '#1EB53A',     4673: '#00247D',     2386: '#00209F',     11:   '#005F9E',     777:  '#C8102E',     23:   '#006C35',     13:   '#00853F',     1501: '#F77F00', };
const CORES_ALT = {
    6:    '#003087',     26:   '#FFFFFF',     9:    '#003087',     2:    '#FFFFFF',     25:   '#FFFFFF',     27:   '#006600',     10:   '#FFFFFF',     15:   '#003087',     1118: '#003087',     12:   '#003087',     8:    '#003087',     16:   '#C8102E',     2384: '#C8102E',     31:   '#006233',     1090: '#C8102E',     5529: '#000000',     5:    '#FFD700',     3:    '#003087',     7:    '#000000',     17:   '#003087',     22:   '#FFFFFF',     32:   '#000000',     1531: '#FFD700',     20:   '#003087',     1108: '#C8102E',     1:    '#C8102E',     1532: '#C8102E',     1113: '#FFD700',     2380: '#003087',     1533: '#C8102E',     1504: '#C60B1E',     775:  '#FFFFFF',     1508: '#FFD100',     2382: '#003087', };
function corSelecao(homeId, awayId) {
    const corH = CORES_SELECOES[homeId] || 'var(--green-1)';
    if (awayId === undefined) return corH;
    const corA = CORES_SELECOES[awayId] || 'var(--amber)';
    const conflito = corH.toLowerCase() === corA.toLowerCase();
    const corHFinal = corH;
    const corAFinal = conflito
        ? (CORES_ALT[awayId] || 'var(--amber)')
        : corA;
    return { home: corHFinal, away: corAFinal };
}
document.getElementById('btn-teste-audio').addEventListener('click', () => {
    somGol.currentTime = 0;
    somGol.play().catch(() => {});
});
function sigla(nome) {
    return SIGLAS_FIFA[nome] || nome.substring(0, 3).toUpperCase();
}
function temDetalhes(statusShort) {
    return STATUS_COM_DETALHES.includes(statusShort);
}

function labelDaFase(roundStr) {
    const r = (roundStr || '').toLowerCase();
    if (!r) return '';
    if (r.includes('group')) {
        const numero = r.match(/(\d+)/);
        return numero ? `Fase de Grupos • Rodada ${numero[1]}` : 'Fase de Grupos';
    }
    if (r.includes('32')) return '16 avos de Final';
    if (r.includes('16') || r.includes('1/8') || r.includes('oitavas') || r.includes('octavos')) return 'Oitavas de Final';
    if (r.includes('quarter') || r.includes('quartas') || r.includes('1/4')) return 'Quartas de Final';
    if (r.includes('semi') || r.includes('1/2')) return 'Semifinal';
    if (r.includes('3rd') || r.includes('terceiro') || r.includes('third') || r.includes('bronze')) return 'Disputa de 3º Lugar';
    if (r.includes('final')) return 'Final';
    return '';
}

function dadosEstaticos() {
    return window.DADOS_COPA || null;
}

async function abrirMenuDetalhes(fixtureId) {
    const match = cachePartidas[fixtureId];
    if (!match || !temDetalhes(match.fixture.status.short)) return;
    const modal = document.getElementById('modal-detalhes');
    const conteudo = document.getElementById('conteudo-estatisticas');
    fixtureAtualNoModal = fixtureId;
    modal.classList.add('visivel');
    if (!cacheDetalhesMemoria[fixtureId]) {
        conteudo.innerHTML = '<div class="modal-loading"><div class="spinner"></div><span>Carregando...</span></div>';
    }
    await carregarDetalhes(fixtureId);
}
async function carregarDetalhes(fixtureId) {
    const conteudo = document.getElementById('conteudo-estatisticas');
    try {
        const base = dadosEstaticos();
        const dados = base?.detalhes?.[fixtureId];
        if (!dados) throw new Error('Dados não disponíveis no snapshot estático');
        cacheDetalhesMemoria[fixtureId] = dados;
        if (fixtureAtualNoModal === fixtureId) renderizarDetalhes(fixtureId, dados);
    } catch (e) {
        if (fixtureAtualNoModal !== fixtureId) return;
        if (!cacheDetalhesMemoria[fixtureId]) {
            conteudo.innerHTML = '<div class="modal-erro">Não foi possível carregar os detalhes.</div>';
        }
    }
}
function renderizarDetalhes(fixtureId, dados) {
    const conteudo = document.getElementById('conteudo-estatisticas');
    const match = cachePartidas[fixtureId];
    let htmlPlacar = '';
    if (match) {
        const nomeA = match.teams.home.name;
        const nomeB = match.teams.away.name;
        const siglaA = sigla(nomeA);
        const siglaB = sigla(nomeB);
        const logoA = match.teams.home.logo;
        const logoB = match.teams.away.logo;
        const golA = match.goals.home !== null ? match.goals.home : '-';
        const golB = match.goals.away !== null ? match.goals.away : '-';
        const statusShort = match.fixture.status.short;
        const isLive = STATUS_LIVE.includes(statusShort);
        const isPenaltyShootout = statusShort === 'P';
        const isPenaltyFim = statusShort === 'PEN';
        const elapsed = match.fixture.status.elapsed;
        const cores = corSelecao(match.teams.home.id, match.teams.away.id);
        const corHome = cores.home;
        const corAway = cores.away;
        document.getElementById('conteudo-estatisticas').style.setProperty('--bar-home', corHome);
        document.getElementById('conteudo-estatisticas').style.setProperty('--bar-away', corAway);
        const penHome = match.score?.penalty?.home;
        const penAway = match.score?.penalty?.away;
        const temPen = penHome !== null && penHome !== undefined && penAway !== null && penAway !== undefined;
        let statusTexto = '';
        let dotHtml = '';
        if (isLive) {
            dotHtml = '<span class="live-dot"></span>';
            if (isPenaltyShootout) {
                statusTexto = 'Pênaltis — Ao Vivo';
            } else {
                const extra = match.fixture.status.extra;
                statusTexto = elapsed ? (extra ? `${elapsed}+${extra}' — Ao Vivo` : `${elapsed}' — Ao Vivo`) : 'Ao Vivo';
            }
        } else if (statusShort === 'HT') {
            statusTexto = 'Intervalo';
        } else if (STATUS_FIM.includes(statusShort)) {
            statusTexto = isPenaltyFim
                ? 'Encerrado — Pênaltis'
                : (statusShort === 'AET' ? 'Encerrado — Prorrogação' : 'Encerrado');
        }
        const modalPenHtml = temPen && (isPenaltyShootout || isPenaltyFim)
            ? `<span class="modal-pen-score">${penHome} x ${penAway} <span class="score-pen-label">nos pênaltis</span></span>`
            : '';
        htmlPlacar = `
            <div class="modal-placar ${isLive ? 'live' : ''}">
                <div class="modal-team-side">
                    <img src="${logoA}" class="modal-team-logo" alt="${siglaA}">
                    <span class="modal-tla">${siglaA}</span>
                </div>
                <div class="modal-center">
                    <span class="modal-score">${golA} x ${golB}</span>
                    ${modalPenHtml}
                    <span class="modal-status">${dotHtml}${statusTexto}</span>
                </div>
                <div class="modal-team-side">
                    <img src="${logoB}" class="modal-team-logo" alt="${siglaB}">
                    <span class="modal-tla">${siglaB}</span>
                </div>
            </div>`;
    }
    let htmlStats = '';
    const stats = dados.statistics;
    if (Array.isArray(stats) && stats.length === 2) {
        const statsHome = {};
        const statsAway = {};
        (stats[0]?.statistics ?? []).forEach(s => { statsHome[s.type] = s.value; });
        (stats[1]?.statistics ?? []).forEach(s => { statsAway[s.type] = s.value; });
        const listaStats = [
            { chave: 'Ball Possession', label: 'Posse de Bola' },
            { chave: 'Shots on Goal', label: 'Chutes no Gol' },
            { chave: 'Total Shots', label: 'Total de Chutes' },
            { chave: 'Corner Kicks', label: 'Escanteios' },
            { chave: 'Fouls', label: 'Faltas' },
            { chave: 'Yellow Cards', label: 'Cartões Amarelos' },
            { chave: 'Red Cards', label: 'Cartões Vermelhos' },
        ];
        const rowsHtml = listaStats.map(item => {
            const rawH = statsHome[item.chave];
            const rawA = statsAway[item.chave];
            if (rawH === null && rawA === null) return '';
            if (rawH === undefined && rawA === undefined) return '';
            let vH = rawH ?? 0;
            let vA = rawA ?? 0;
            if (typeof vH === 'string' && vH.includes('%')) vH = parseInt(vH);
            if (typeof vA === 'string' && vA.includes('%')) vA = parseInt(vA);
            vH = Number(vH) || 0;
            vA = Number(vA) || 0;
            const total = vH + vA || 1;
            const pctH = Math.round((vH / total) * 100);
            const pctA = 100 - pctH;
            const exibeH = rawH !== null && rawH !== undefined ? rawH : '—';
            const exibeA = rawA !== null && rawA !== undefined ? rawA : '—';
            return `
                <div class="stat-row">
                    <span class="stat-val">${exibeH}</span>
                    <div class="stat-col-center">
                        <span class="stat-nome">${item.label}</span>
                        <div class="stat-barra-container">
                            <div class="stat-barra-home" style="width:${pctH}%"></div>
                            <div class="stat-barra-away" style="width:${pctA}%"></div>
                        </div>
                    </div>
                    <span class="stat-val right">${exibeA}</span>
                </div>`;
        }).filter(Boolean).join('');
        if (rowsHtml) {
            htmlStats = `<div class="secao-titulo">Estatísticas</div>${rowsHtml}`;
        }
    }
    let htmlEventos = '';
    const eventos = dados.events;
    if (Array.isArray(eventos) && eventos.length > 0) {
        const relevantes = eventos.filter(e => ['Goal', 'Card'].includes(e.type));
        if (relevantes.length > 0) {
            const idHome = match?.teams?.home?.id;
            const siglaHome = match ? sigla(match.teams.home.name) : '???';
            const siglaAway = match ? sigla(match.teams.away.name) : '???';
            const itens = relevantes.map(e => {
                const minuto = e.time?.elapsed != null ? `${e.time.elapsed}'` : '—';
                const isHome = e.team?.id === idHome;
                let icone = '⚽';
                let detalhe = '';
                if (e.type === 'Goal') {
                    if (e.detail === 'Own Goal') detalhe = '(contra)';
                    else if (e.detail === 'Penalty') detalhe = '(pen.)';
                } else if (e.type === 'Card') {
                    if (e.detail === 'Yellow Card') icone = '🟨';
                    else if (e.detail === 'Red Card') icone = '🟥';
                    else if (e.detail === 'Yellow Red Card') icone = '🟧';
                }
                const desc = e.player?.name || '—';
                const conteudoHome = isHome
                    ? `<span class="evento-icone">${icone}</span><span class="evento-nome">${desc}${detalhe ? ` <span class="evento-detalhe">${detalhe}</span>` : ''}</span>`
                    : '';
                const conteudoAway = !isHome
                    ? `<span class="evento-nome">${desc}${detalhe ? ` <span class="evento-detalhe">${detalhe}</span>` : ''}</span><span class="evento-icone">${icone}</span>`
                    : '';
                return `
                    <div class="evento-item">
                        <div class="evento-col home">${conteudoHome}</div>
                        <span class="evento-minuto">${minuto}</span>
                        <div class="evento-col away">${conteudoAway}</div>
                    </div>`;
            }).join('');
            const cabecalho = `
                <div class="secao-titulo eventos-header">
                    <span class="eventos-header-time">${siglaHome}</span>
                    <span>Gols &amp; Cartões</span>
                    <span class="eventos-header-time">${siglaAway}</span>
                </div>`;
            htmlEventos = cabecalho + itens;
        }
    }
    if (!htmlStats && !htmlEventos) {
        htmlEventos = '<div class="modal-erro" style="padding-top:20px;">Sem dados disponíveis para esta partida.</div>';
    }
    const modoTorneio = document.body.classList.contains('modo-torneio-ativo');
    if (modoTorneio) {
        conteudo.innerHTML = htmlPlacar + `
            <div class="stats-eventos-colunas">
                <div class="coluna-stats">${htmlStats}</div>
                <div class="coluna-eventos">${htmlEventos}</div>
            </div>`;
    } else {
        conteudo.innerHTML = htmlPlacar + htmlStats + htmlEventos;
    }
}
function fecharModal() {
    document.getElementById('modal-detalhes').classList.remove('visivel');
    fixtureAtualNoModal = null;
}
function criarBlocoPartida(match, isLive, quemMarcou) {
    isLive = isLive || false;
    quemMarcou = quemMarcou || null;
    const nomeA = match.teams.home.name;
    const nomeB = match.teams.away.name;
    const siglaA = sigla(nomeA);
    const siglaB = sigla(nomeB);
    const logoA = match.teams.home.logo;
    const logoB = match.teams.away.logo;
    const golA = match.goals.home !== null ? match.goals.home : '-';
    const golB = match.goals.away !== null ? match.goals.away : '-';
    const corGolA = quemMarcou === 'home' ? '#00FF00' : '#FFF';
    const corGolB = quemMarcou === 'away' ? '#00FF00' : '#FFF';
    const dataJogo = new Date(match.fixture.date);
    const dia = String(dataJogo.getDate()).padStart(2, '0');
    const mes = String(dataJogo.getMonth() + 1).padStart(2, '0');
    const horaMinuto = dataJogo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const statusShort = match.fixture.status.short;
    const isLiveStatus = STATUS_LIVE.includes(statusShort);
    const isPaused = statusShort === 'HT';
    const isFinished = STATUS_FIM.includes(statusShort);
    const isPenaltyShootout = statusShort === 'P';
    const isPenaltyFim = statusShort === 'PEN';
    const isProrrogacaoFim = statusShort === 'AET';
    const podeClicar = temDetalhes(statusShort);
    const penHome = match.score?.penalty?.home;
    const penAway = match.score?.penalty?.away;
    const temPen = penHome !== null && penHome !== undefined && penAway !== null && penAway !== undefined;
    let infoCentral = '';
    let infoMinuto = '';
    if (isLiveStatus) {
        if (isPenaltyShootout) {
            infoMinuto = 'Pênaltis';
        } else {
            const elapsed = match.fixture.status.elapsed;
            const extra = match.fixture.status.extra;
            infoMinuto = elapsed ? (extra ? `${elapsed}+${extra}'` : `${elapsed}'`) : '';
        }
        infoCentral = '<span class="live-dot"></span> Ao Vivo';
    } else if (isPaused) {
        infoMinuto = 'Intervalo';
        infoCentral = ' ';
    } else if (isFinished) {
        infoCentral = isPenaltyFim
            ? `${dia}/${mes} - Pên.`
            : (isProrrogacaoFim ? `${dia}/${mes} - Prór.` : `${dia}/${mes} - Fim`);
    } else {
        infoCentral = `${dia}/${mes} ${horaMinuto}`;
    }
    const penHtml = temPen && (isPenaltyShootout || isPenaltyFim)
        ? `<span class="score-pen">${penHome} x ${penAway} <span class="score-pen-label">pên.</span></span>`
        : '';
    const onclickAttr = podeClicar ? `onclick="abrirMenuDetalhes(${match.fixture.id})"` : '';
    const classesExtra = [
        isLive ? 'live' : '',
        quemMarcou ? 'gol-ativo' : '',
        podeClicar ? 'clicavel' : ''
    ].filter(Boolean).join(' ');
    const faseTexto = labelDaFase(match.league?.round);
    const faseHtml = faseTexto ? `<div class="match-fase">${faseTexto}</div>` : '';
    return `
        <div class="match-block ${classesExtra}" ${onclickAttr}>
            ${faseHtml}
            <div class="match-row">
                <div class="team-side">
                    <img src="${logoA}" class="team-logo" alt="${siglaA}">
                    <span class="tla">${siglaA}</span>
                </div>
                <div class="center-info">
                    <span class="match-minute">${infoMinuto}</span>
                    <div class="score-row">
                        <span class="score-num ${quemMarcou === 'home' ? 'gol-marcado' : ''}" style="color:${corGolA};">${golA}</span>
                        <span class="score-sep">x</span>
                        <span class="score-num ${quemMarcou === 'away' ? 'gol-marcado' : ''}" style="color:${corGolB};">${golB}</span>
                    </div>
                    ${penHtml}
                    <span class="status-time">${infoCentral}</span>
                </div>
                <div class="team-side right">
                    <span class="tla">${siglaB}</span>
                    <img src="${logoB}" class="team-logo" alt="${siglaB}">
                </div>
            </div>
        </div>`;
}

function atualizarPainel() {
    const debugLog = document.getElementById('debug-log');
    const mainQueue = document.getElementById('main-queue');
    const historyContent = document.getElementById('history-content');
    const base = dadosEstaticos();
    try {
        if (!base || !base.partidas || !Array.isArray(base.partidas.response)) {
            throw new Error('dados.js não encontrado ou inválido');
        }
        debugLog.innerText = 'Dados salvos';
        const aoVivo = [], proximos = [], encerrados = [];
        base.partidas.response.forEach(m => {
            cachePartidas[m.fixture.id] = m;
            const s = m.fixture.status.short;
            const isLiveStatus = STATUS_LIVE_COM_HT.includes(s);
            const isFinished = STATUS_FIM.includes(s);
            if (isLiveStatus) {
                aoVivo.push(m);
            } else if (isFinished) {
                encerrados.push(m);
            } else {
                proximos.push(m);
            }
        });
        proximos.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
        encerrados.sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
        const fila = [...aoVivo, ...encerrados];
        if (fila.length === 0) {
            mainQueue.innerHTML = '<div class="sem-jogos">Nenhum jogo<br>encontrado.</div>';
        } else {
            mainQueue.innerHTML = fila.map(m => criarBlocoPartida(m, STATUS_LIVE.includes(m.fixture.status.short), null)).join('');
        }
        const modoTorneio = document.getElementById('app-layout').classList.contains('modo-torneio');
        const qtdEncerrados = modoTorneio ? 3 : 1;
        const tituloHistory = document.getElementById('history-title-label');
        if (tituloHistory) tituloHistory.innerText = modoTorneio ? 'Últimos Resultados' : 'Último Resultado';
        historyContent.innerHTML = encerrados.length > 0
            ? encerrados.slice(0, qtdEncerrados).map(m => criarBlocoPartida(m)).join('')
            : '<div style="color:var(--text-muted);text-align:center;font-size:12px;">Sem resultados</div>';
        primeiraCargaMain = false;
    } catch (e) {
        debugLog.innerText = 'Falha ao carregar dados.js';
        if (primeiraCargaMain) {
            mainQueue.innerHTML = '<div class="sem-jogos">Falha ao carregar.<br>Verifique se dados.js foi incluído.</div>';
        }
        console.error(e);
    }
}
atualizarPainel();
let torneioCarregado = false;
document.getElementById('btn-toggle-torneio').addEventListener('click', async function () {
    const layout = document.getElementById('app-layout');
    const ativo = layout.classList.toggle('modo-torneio');
    document.body.classList.toggle('modo-torneio-ativo', ativo);
    this.innerHTML = ativo
        ? '←'
        : '<img src="assets/trophy-icon.png" alt="Torneio" class="btn-icon-img">';
    this.style.color = ativo ? '#fff' : '';
    if (!ativo) {
        const tituloLabel = document.getElementById('history-title-label');
        if (tituloLabel) tituloLabel.innerText = 'Último Resultado';
        const historyContent = document.getElementById('history-content');
        const encerrados = Object.values(cachePartidas)
            .filter(m => STATUS_FIM.includes(m.fixture.status.short))
            .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
        if (historyContent && encerrados.length > 0) {
            historyContent.innerHTML = criarBlocoPartida(encerrados[0]);
        }
        if (grupoAtualNoPainel) {
            grupoAtualNoPainel = null;
            atualizarPainel();
        }
        return;
    }
    if (ativo) {
        renderizarRecentesTorneio();
        if (torneioCarregado) {
            renderizarBracket(null);
        }
        if (!torneioCarregado) {
            document.getElementById('grupos-rodape').innerHTML =
                '<span style="color:var(--text-muted);font-size:11px;padding:10px;display:block;text-align:center;">Carregando grupos...</span>';
            await buscarEConstruirTorneio();
        }
    }
});
let statsCarregadas = false;

document.getElementById('btn-stats').addEventListener('click', function () {
    const overlay = document.getElementById('stats-overlay');
    const overlayAbriu = overlay.classList.toggle('visivel');

    if (overlayAbriu && !statsCarregadas) {
        buscarStats();
    }
});

document.getElementById('btn-fechar-stats').addEventListener('click', function () {
    document.getElementById('stats-overlay').classList.remove('visivel');
});


async function buscarStats() {
    buscarListaStats('topscorers', 'lista-artilheiros', 'goals');
    buscarListaStats('topassists', 'lista-assistencias', 'assists');
    statsCarregadas = true;
}

function buscarListaStats(action, elementId, campo) {
    const el = document.getElementById(elementId);
    try {
        const base = dadosEstaticos();
        const data = base?.[action];
        const lista = data?.response;
        if (!Array.isArray(lista) || lista.length === 0) throw new Error('Sem dados');
        el.innerHTML = lista.slice(0, 10).map((item, idx) => {
            const p        = item.player;
            const stat     = item.statistics?.[0];
            const valor    = campo === 'goals'
                ? (stat?.goals?.total ?? 0)
                : (stat?.goals?.assists ?? 0);
            const logoTime = stat?.team?.logo ?? '';
            const nomeTime = stat?.team?.name ?? '';
            const rankClass = idx === 0 ? 'ouro' : idx === 1 ? 'prata' : idx === 2 ? 'bronze' : '';
            return `<div class="stats-jogador-row">
                <span class="stats-jogador-rank ${rankClass}">${idx + 1}</span>
                <img src="${logoTime}" class="stats-time-logo" alt="${nomeTime}" title="${nomeTime}">
                <div class="stats-jogador-info">
                    <div class="stats-jogador-nome" title="${p.name}">${p.name}</div>
                    <div class="stats-jogador-pais">${sigla(nomeTime)}</div>
                </div>
                <span class="stats-jogador-num">${valor}</span>
            </div>`;
        }).join('');
    } catch (e) {
        el.innerHTML = `<div class="stats-erro">Indisponível no momento</div>`;
    }
}

async function buscarEConstruirTorneio() {
    try {
        const base = dadosEstaticos();
        const data = base?.standings;
        if (!data || !data.response || data.response.length === 0) throw new Error('Sem dados');
        const todasEntradas = data.response[0].league.standings;
        const tabelaTerceiros = todasEntradas.find(g => g[0]?.group === 'Group Stage') ?? [];
        const top8TerceiroIds = new Set(
            tabelaTerceiros.filter(t => t.rank <= 8).map(t => t.team.id)
        );
        renderizarGrupos(todasEntradas, top8TerceiroIds);
        renderizarBracket(todasEntradas);
        torneioCarregado = true;
    } catch (e) {
        console.error('Falha ao carregar torneio:', e);
        document.getElementById('grupos-rodape').innerHTML =
            '<span style="color:var(--amber);font-size:11px;padding:10px;display:block;text-align:center;">Falha ao carregar. Verifique dados.js.</span>';
        torneioCarregado = false;
    }
}
function renderizarRecentesTorneio() {
    const historyContent = document.getElementById('history-content');
    const tituloLabel = document.getElementById('history-title-label');
    if (tituloLabel) tituloLabel.innerText = 'Últimos Resultados';
    const encerrados = Object.values(cachePartidas)
        .filter(m => STATUS_FIM.includes(m.fixture.status.short))
        .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
        .slice(0, 3);
    if (historyContent) {
        historyContent.innerHTML = encerrados.length > 0
            ? encerrados.map(m => criarBlocoPartida(m, false, null)).join('')
            : '<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:6px 0;">Sem resultados recentes</div>';
    }
}
function atualizarCampeao(mFinal) {
    const el = document.getElementById('campeao-conteudo');
    if (!el) return;
    if (!mFinal) {
        el.innerHTML = '<span class="campeao-placeholder">A definir</span>';
        return;
    }
    const statusShort = mFinal.fixture.status.short;
    const finalizada = STATUS_FIM.includes(statusShort);
    const wH = mFinal.teams.home.winner === true;
    const wA = mFinal.teams.away.winner === true;
    if (!finalizada || (!wH && !wA)) {
        el.innerHTML = '<span class="campeao-placeholder">A definir</span>';
        return;
    }
    const timeCampeao = wH ? mFinal.teams.home : mFinal.teams.away;
    el.innerHTML = `
        <img src="${timeCampeao.logo}" class="campeao-logo" alt="${sigla(timeCampeao.name)}">
        <span class="campeao-nome">${timeCampeao.name}</span>`;
}
function renderizarBracket(standingsData) {
    const slotReal = (m) => {
        const d = new Date(m.fixture.date);
        const dia = String(d.getDate()).padStart(2,'0');
        const mes = String(d.getMonth()+1).padStart(2,'0');
        const hora = d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        const golH = m.goals.home, golA = m.goals.away;
        const temGol = golH !== null && golA !== null;
        const wH = m.teams.home.winner === true;
        const wA = m.teams.away.winner === true;
        const isTbdA = !m.teams.home.id || (m.teams.home.name && m.teams.home.name.toUpperCase() === 'TBD');
        const isTbdB = !m.teams.away.id || (m.teams.away.name && m.teams.away.name.toUpperCase() === 'TBD');
        const rowA = isTbdA
            ? `<span class="slot-sig tbd">TBD</span>`
            : `<img src="${m.teams.home.logo}" class="slot-logo"><span class="slot-sig">${sigla(m.teams.home.name)}</span>${temGol ? `<span class="slot-score${wH ? ' slot-score-win' : ''}">${golH}</span>` : ''}`;
        const rowB = isTbdB
            ? `<span class="slot-sig tbd">TBD</span>`
            : `<img src="${m.teams.away.logo}" class="slot-logo"><span class="slot-sig">${sigla(m.teams.away.name)}</span>${temGol ? `<span class="slot-score${wA ? ' slot-score-win' : ''}">${golA}</span>` : ''}`;
        const dataTexto = (m.fixture.status.short === 'TBD' || (isTbdA && isTbdB)) ? 'A definir' : `${dia}/${mes} ${hora}`;
        const podeClicarSlot = temDetalhes(m.fixture.status.short);
        return `<div class="match-slot${podeClicarSlot ? ' slot-clicavel' : ''}"${podeClicarSlot ? ` onclick="abrirMenuDetalhes(${m.fixture.id})"` : ''}>
            <div class="slot-team-row${wH && !isTbdA ? ' slot-winner' : ''}">${rowA}</div>
            <div class="slot-team-row${wA && !isTbdB ? ' slot-winner' : ''}">${rowB}</div>
            <span class="slot-data">${dataTexto}</span>
        </div>`;
    };
    const slotTbd = () => `<div class="match-slot slot-tbd">
        <div class="slot-team-row"><span class="slot-sig tbd">TBD</span></div>
        <div class="slot-team-row"><span class="slot-sig tbd">TBD</span></div>
        <span class="slot-data">A definir</span>
    </div>`;
    const coluna = (slots) => {
        const qtd = slots.length;
        return `<div class="bracket-col" data-slots="${qtd}">${slots.join('')}</div>`;
    };
    const todasElim = Object.values(cachePartidas)
        .filter(m => !((m.league?.round ?? '').toLowerCase().includes('group')))
        .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
    const porFase = { r32: [], r16: [], qf: [], sf: [], final: [], third: [] };
    todasElim.forEach(m => {
        const r = (m.league?.round ?? '').toLowerCase();
        if (r.includes('32') || r.includes('1/16') || r.includes('16-avos') || r.includes('16 avos')) porFase.r32.push(m);
        else if (r.includes('16') || r.includes('1/8') || r.includes('oitavas') || r.includes('octavos')) porFase.r16.push(m);
        else if (r.includes('quarter') || r.includes('quartas') || r.includes('1/4')) porFase.qf.push(m);
        else if (r.includes('semi') || r.includes('semis') || r.includes('1/2')) porFase.sf.push(m);
        else if (r.includes('3rd') || r.includes('terceiro') || r.includes('third') || r.includes('bronze')) porFase.third.push(m);
        else if (r.includes('final')) porFase.final.push(m);
    });
    const ordenarPorData = (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date);
    porFase.r32.sort(ordenarPorData);
    porFase.r16.sort(ordenarPorData);
    porFase.qf.sort(ordenarPorData);
    porFase.sf.sort(ordenarPorData);
    const mapearFase = (partidas, totalJogos, indicesEsq, indicesDir) => {
        const completas = new Array(totalJogos).fill(null);
        partidas.forEach((m, i) => { if (i < totalJogos) completas[i] = m; });
        return {
            esq: indicesEsq.map(i => completas[i] ? slotReal(completas[i]) : slotTbd()),
            dir: indicesDir.map(i => completas[i] ? slotReal(completas[i]) : slotTbd())
        };
    };
    const r32 = mapearFase(porFase.r32, 16, [2, 5, 0, 3, 11, 10, 9, 8], [1, 4, 6, 7, 14, 13, 12, 15]);
    const r16 = mapearFase(porFase.r16, 8, [1, 0, 4, 5], [2, 3, 6, 7]);
    const qf  = mapearFase(porFase.qf,  4, [0, 1], [2, 3]);
    const sf  = mapearFase(porFase.sf,  2, [0], [1]);
    document.getElementById('bracket-left').innerHTML  = coluna(r32.esq) + coluna(r16.esq) + coluna(qf.esq) + coluna(sf.esq);
    document.getElementById('bracket-right').innerHTML = coluna(sf.dir)  + coluna(qf.dir)  + coluna(r16.dir) + coluna(r32.dir);
    const finalEl = document.querySelector('.final-box .match-slot');
    const thirdEl = document.querySelector('.bronze-box .match-slot');
    if (finalEl) {
        const mF = porFase.final[0];
        finalEl.outerHTML = mF ? slotReal(mF) : slotTbd().replace('slot-tbd','final-slot');
    }
    if (thirdEl) {
        const mT = porFase.third[0];
        thirdEl.outerHTML = mT ? slotReal(mT) : slotTbd();
    }
    atualizarCampeao(porFase.final[0] || null);
}
function renderizarGrupos(todasEntradas, top8TerceiroIds) {
    const scroller = document.getElementById('grupos-rodape');
    const gruposValidos = todasEntradas.filter(grupo =>
        /^Group\s+[A-L]$/i.test(grupo[0]?.group ?? '')
    );
    mapaTimeParaGrupo = {};
    scroller.innerHTML = gruposValidos.map((grupo, i) => {
        const nomeGrupo = grupo[0].group.replace(/Group/i, 'Grupo');
        grupo.forEach(time => { mapaTimeParaGrupo[time.team.id] = nomeGrupo; });
        const linhasTime = grupo.map((time, idx) => {
            const top2 = idx < 2;
            const top4Terceiro = idx === 2 && (top8TerceiroIds?.has(time.team.id) ?? false);
            let corBorda = 'transparent';
            let corNome = 'var(--text-muted)';
            let pesoFonte = '400';
            if (top2) { corBorda = 'var(--green-1)'; corNome = 'var(--text-primary)'; pesoFonte = '700'; }
            else if (top4Terceiro) { corBorda = 'var(--amber)'; corNome = 'var(--amber)'; pesoFonte = '600'; }
            return `
                <div class="grupo-linha-time" style="border-left-color:${corBorda}">
                    <div class="grupo-linha-esq">
                        <span class="grupo-rank">${time.rank}</span>
                        <img src="${time.team.logo}" class="grupo-logo" alt="${time.team.name}">
                        <span class="grupo-sigla" style="color:${corNome};font-weight:${pesoFonte};">${sigla(time.team.name)}</span>
                    </div>
                    <span class="grupo-pts">${time.points}</span>
                </div>`;
        }).join('');
        const ativo = grupoAtualNoPainel === nomeGrupo;
        return `
            <div class="grupo-card${ativo ? ' grupo-card-ativo' : ''}" data-grupo="${nomeGrupo}" onclick="alternarFiltroGrupo('${nomeGrupo}')">
                <div class="grupo-card-titulo">${nomeGrupo}</div>
                ${linhasTime}
            </div>`;
    }).join('');
}

function alternarFiltroGrupo(nomeGrupo) {
    if (grupoAtualNoPainel === nomeGrupo) {
        limparFiltroGrupo();
    } else {
        renderizarHistoricoGrupo(nomeGrupo);
    }
}

function renderizarHistoricoGrupo(nomeGrupo) {
    grupoAtualNoPainel = nomeGrupo;
    const mainQueue = document.getElementById('main-queue');
    const jogos = Object.values(cachePartidas)
        .filter(m => (m.league?.round ?? '').toLowerCase().includes('group') && mapaTimeParaGrupo[m.teams.home.id] === nomeGrupo)
        .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
    const cabecalho = `
        <div class="grupo-painel-header">
            <span class="grupo-painel-titulo">${nomeGrupo}</span>
            <button class="grupo-painel-fechar" onclick="limparFiltroGrupo()">Ver todas ✕</button>
        </div>`;
    const corpo = jogos.length
        ? jogos.map(m => criarBlocoPartida(m)).join('')
        : '<div class="sem-jogos">Sem jogos<br>para este grupo.</div>';
    mainQueue.innerHTML = cabecalho + corpo;
    document.querySelectorAll('.grupo-card').forEach(c => {
        c.classList.toggle('grupo-card-ativo', c.dataset.grupo === nomeGrupo);
    });
}

function limparFiltroGrupo() {
    grupoAtualNoPainel = null;
    document.querySelectorAll('.grupo-card').forEach(c => c.classList.remove('grupo-card-ativo'));
    atualizarPainel();
}

// ===================== MODO TESTE (uso apenas via console do navegador) =====================
window.testeFicticio = (function () {
    const FIXTURE_ID_TESTE = 999999;
    let ativo = false;

    const LOGOS_TESTE = {
        'Brazil':    'https://media.api-sports.io/football/teams/6.png',
        'Argentina': 'https://media.api-sports.io/football/teams/26.png'
    };

    function montarPartida(homeName, awayName, golsHome, golsAway) {
        return {
            fixture: {
                id: FIXTURE_ID_TESTE,
                date: new Date(),
                status: { short: '1H', elapsed: 10, extra: null }
            },
            teams: {
                home: { id: homeName === 'Brazil' ? 6 : 9999, name: homeName, logo: LOGOS_TESTE[homeName] || '' },
                away: { id: awayName === 'Brazil' ? 6 : 8888, name: awayName, logo: LOGOS_TESTE[awayName] || '' }
            },
            goals: { home: golsHome, away: golsAway },
            score: { penalty: { home: null, away: null } }
        };
    }

    function renderizar(destaque) {
        const mainQueue = document.getElementById('main-queue');
        const match = cachePartidas[FIXTURE_ID_TESTE];
        if (!mainQueue || !match) return;
        mainQueue.innerHTML = criarBlocoPartida(match, true, destaque);
    }

    function iniciar(homeName = 'Brazil', awayName = 'Argentina') {
        ativo = true;
        cachePartidas[FIXTURE_ID_TESTE] = montarPartida(homeName, awayName, 0, 0);
        placaresAnteriores[FIXTURE_ID_TESTE] = { home: 0, away: 0 };
        renderizar(null);
        console.log(
            `%c[MODO TESTE] Partida fictícia criada: ${homeName} x ${awayName}.\nUse testeFicticio.golHome() ou testeFicticio.golAway() para simular gols.\nUse testeFicticio.parar() para encerrar.`,
            'color:#3dffa0;font-weight:bold;'
        );
    }

    function gol(lado) {
        if (!ativo) {
            console.warn('[MODO TESTE] Não está ativo. Chame testeFicticio.iniciar() primeiro.');
            return;
        }
        const match = cachePartidas[FIXTURE_ID_TESTE];
        if (lado === 'home') match.goals.home++; else match.goals.away++;

        somGol.currentTime = 0;
        somGol.play().catch(() => {});

        const nomeQueMarcou = lado === 'home' ? match.teams.home.name : match.teams.away.name;
        console.log(`%c[MODO TESTE] Gol de ${nomeQueMarcou}. Tocando audio.mp3`, 'color:#fff;');

        placaresAnteriores[FIXTURE_ID_TESTE] = { home: match.goals.home, away: match.goals.away };
        historicoGols[FIXTURE_ID_TESTE] = { time: lado, timestamp: Date.now() };
        renderizar(lado);

        setTimeout(() => {
            if (cachePartidas[FIXTURE_ID_TESTE]) renderizar(null);
        }, TEMPO_DESTAQUE_MS);
    }

    function parar() {
        ativo = false;
        delete cachePartidas[FIXTURE_ID_TESTE];
        delete placaresAnteriores[FIXTURE_ID_TESTE];
        delete historicoGols[FIXTURE_ID_TESTE];
        atualizarPainel();
        console.log('%c[MODO TESTE] Encerrado. Voltando ao snapshot estático.', 'color:#ffab4d;font-weight:bold;');
    }

    return {
        iniciar,
        golHome: () => gol('home'),
        golAway: () => gol('away'),
        parar
    };
})();
