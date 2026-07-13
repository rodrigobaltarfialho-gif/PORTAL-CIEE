let graficoEvolucaoProducao = null;
const timersComentariosProducao = new Map();

const nomesMesesCurtos = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const coresGrafico = [
    "#003b71", "#ff7a00", "#168a4a", "#7c3aed", "#dc2626",
    "#0891b2", "#db2777", "#65a30d", "#ea580c", "#2563eb",
    "#9333ea", "#0f766e", "#be123c", "#4d7c0f"
];

function preencherTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function escaparHtml(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function slugFotoFuncionario(nome) {
    return String(nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function iniciaisFuncionario(nome) {
    const partes = String(nome || "")
        .replace(/\([^)]*\)/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!partes.length) {
        return "?";
    }

    return `${partes[0][0] || ""}${partes.length > 1 ? partes[partes.length - 1][0] : ""}`.toUpperCase();
}

function avatarFuncionario(funcionario, tamanho = "sm") {
    const nome = funcionario?.nome || "";
    const slug = slugFotoFuncionario(nome);
    const iniciais = iniciaisFuncionario(nome);
    const caminhos = [
        `../../assets/funcionarios/${slug}.jpg`,
        `../../assets/funcionarios/${slug}.jpeg`,
        `../../assets/funcionarios/${slug}.png`,
        `../../assets/funcionarios/${slug}.png.png`
    ];

    return `
        <span class="avatar avatar-${tamanho}">
            <img src="${caminhos[0]}" data-fallbacks='${JSON.stringify(caminhos.slice(1))}' alt="${escaparHtml(nome)}" onerror="trocarFotoFuncionario(this);">
            <b>${escaparHtml(iniciais)}</b>
        </span>
    `;
}

function trocarFotoFuncionario(img) {
    const fallbacks = JSON.parse(img.dataset.fallbacks || "[]");
    const proxima = fallbacks.shift();

    if (proxima) {
        img.dataset.fallbacks = JSON.stringify(fallbacks);
        img.src = proxima;
        return;
    }

    img.style.display = "none";
    img.nextElementSibling.style.display = "grid";
}

function renderizarLinhaVazia(colunas, texto = "Aguardando importação.") {
    return `<tr><td colspan="${colunas}">${texto}</td></tr>`;
}

function criarCardIndicador(titulo, valor, destaque = false) {
    return `
        <article class="kpi-card ${destaque ? "kpi-card-highlight" : ""}">
            <span>${titulo}</span>
            <strong>${formatarNumero(valor)}</strong>
        </article>
    `;
}

function criarCardsProducoes(totais) {
    return Object.keys(nomesKpis).map(kpi => {
        if (kpi === "sla") {
            const totalFuncionarios = Number(dadosProducao.dashboard.totalFuncionarios || 0);
            const mediaSla = totalFuncionarios ? (Number(totais.sla || 0) / totalFuncionarios) : 0;

            return criarCardIndicador("SLA médio", mediaSla);
        }

        return criarCardIndicador(nomesKpis[kpi], totais[kpi] || 0);
    });
}

function renderizarIndicadoresProducao() {
    const container = document.getElementById("cardsProducoes");

    if (!container) {
        return;
    }

    const totais = dadosProducao.dashboard.totaisKpis || {};
    const cards = [
        criarCardIndicador("Funcionários", dadosProducao.dashboard.totalFuncionarios, true),
        criarCardIndicador("Células ativas", dadosProducao.dashboard.totalCelulas, true),
        ...criarCardsProducoes(totais)
    ];

    container.innerHTML = cards.join("");
}

function classeMeta(percentualMeta) {
    if (percentualMeta >= 100) {
        return "badge badge-success";
    }

    if (percentualMeta >= 80) {
        return "badge badge-warning";
    }

    return "badge badge-danger";
}

function nomeCurtoFuncionario(nome) {
    const partes = String(nome || "")
        .replace(/\([^)]*\)/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length <= 1) {
        return partes[0] || "Sem nome";
    }

    return `${partes[0]} ${partes[partes.length - 1]}`;
}

function calcularResumoMetas(metas) {
    const itens = Object.values(metas || {});
    const total = itens.reduce((soma, meta) => soma + Number(meta.total || 0), 0);
    const metaTotal = itens.reduce((soma, meta) => soma + Number(meta.meta || 0), 0);
    const mediaPercentual = itens.length
        ? Math.round(itens.reduce((soma, meta) => soma + Number(meta.percentual || 0), 0) / itens.length)
        : 0;

    return {
        total,
        metaTotal,
        percentualTotal: percentual(total, metaTotal),
        mediaPercentual
    };
}

function rotuloFonteMeta(meta) {
    if (meta.fonte === "metaManual") {
        return "Meta manual";
    }

    if (meta.fonte === "pisoEstatistico") {
        return "Piso estatistico";
    }

    if (meta.fonte === "referenciaKpiGeral") {
        return "Referencia geral do KPI";
    }

    if (Number(meta.percentualAcrescimo || 10) !== 10) {
        return `${formatarNumero(meta.percentualAcrescimo)}% configurado`;
    }

    return meta.fonte === "historico5Meses" ? "Historico 5 meses" : "Previa da competencia";
}

function renderizarMetasPorCelula() {
    const container = document.getElementById("cardsMetasCelulas");

    if (!container) {
        return;
    }

    const celulas = Object.keys(dadosProducao.metas);

    if (!celulas.length) {
        container.innerHTML = `<div class="empty-state">Aguardando importação.</div>`;
        return;
    }

    const cardsCelulas = celulas.map(celula => {
        const metas = dadosProducao.metas[celula];
        const resumoCelula = calcularResumoMetas(metas);
        const linhas = Object.keys(metas).map(kpi => {
            const meta = metas[kpi];

            return `
                <div class="meta-row">
                    <div>
                        <strong>${nomesKpis[kpi] || kpi}</strong>
                        <span>${rotuloFonteMeta(meta)}</span>
                    </div>
                    <div class="meta-numbers">
                        <span>${formatarNumero(meta.total)} / ${formatarNumero(meta.meta)}</span>
                        <b class="${classeMeta(meta.percentual)}">${formatarNumero(meta.percentual)}%</b>
                    </div>
                </div>
            `;
        }).join("");

        return `
            <article class="meta-cell-card">
                <header>
                    <h3>${celula}</h3>
                    <span>${Object.keys(metas).length} KPIs</span>
                </header>
                <div class="meta-list">${linhas}</div>
                <footer class="meta-total-row">
                    <span>Media total celula</span>
                    <b class="${classeMeta(resumoCelula.mediaPercentual)}">${formatarNumero(resumoCelula.mediaPercentual)}%</b>
                </footer>
            </article>
        `;
    }).join("");

    container.innerHTML = cardsCelulas;
}

function renderizarRankingGeral() {
    const tabela = document.getElementById("tabelaRankingGeral");

    if (!tabela) {
        return;
    }

    const linhas = dadosProducao.rankings.geral.map(funcionario => `
        <tr>
            <td class="rank-position">${funcionario.rankingGeral}</td>
            <td class="rank-person">
                <div class="person-with-avatar">
                    ${avatarFuncionario(funcionario)}
                    <div>
                        <strong title="${escaparHtml(funcionario.nome)}">${escaparHtml(nomeCurtoFuncionario(funcionario.nome))}</strong>
                        <span>${funcionario.jornada.horas} horas</span>
                    </div>
                </div>
            </td>
            <td><span class="${classeMeta(funcionario.percentualGeral)}">${formatarNumero(funcionario.percentualGeral)}%</span></td>
            <td>${escaparHtml(funcionario.celula)}</td>
            <td>${formatarNumero(funcionario.totalPrincipal)}</td>
        </tr>
    `);

    tabela.innerHTML = linhas.length ? linhas.join("") : renderizarLinhaVazia(5);
}

function calcularRankingDestaquesKpi() {
    return (dadosProducao.funcionarios || [])
        .map(funcionario => {
            const melhor = Object.keys(funcionario.principais || {})
                .map(kpi => ({
                    kpi,
                    valor: Number(funcionario.principais[kpi] || 0),
                    meta: Number(funcionario.metas?.[kpi] || 0),
                    percentual: percentual(funcionario.principais[kpi], funcionario.metas?.[kpi])
                }))
                .filter(item => item.meta > 0 && item.valor > 0)
                .sort((a, b) => b.percentual - a.percentual || b.valor - a.valor)[0];

            if (!melhor) {
                return null;
            }

            return {
                funcionario,
                ...melhor
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.percentual - a.percentual || b.valor - a.valor)
        .slice(0, 10);
}

function renderizarRankingDestaquesKpi() {
    const tabela = document.getElementById("tabelaRankingKpiDestaque");

    if (!tabela) {
        return;
    }

    const linhas = calcularRankingDestaquesKpi().map((item, indice) => `
        <tr>
            <td class="rank-position">${indice + 1}</td>
            <td class="rank-person">
                <strong title="${escaparHtml(item.funcionario.nome)}">${escaparHtml(nomeCurtoFuncionario(item.funcionario.nome))}</strong>
                <span>${escaparHtml(item.funcionario.celula)}</span>
            </td>
            <td>
                <strong>${nomesKpis[item.kpi] || item.kpi}</strong>
                <span>${formatarNumero(item.valor)} / ${formatarNumero(item.meta)}</span>
            </td>
            <td><span class="${classeMeta(item.percentual)}">${formatarNumero(item.percentual)}%</span></td>
        </tr>
    `);

    tabela.innerHTML = linhas.length ? linhas.join("") : renderizarLinhaVazia(4);
}

function obterDetalheKpisFuncionario(funcionario) {
    return Object.keys(funcionario.principais).map(kpi => {
        const valor = funcionario.principais[kpi];
        const meta = funcionario.metas[kpi] || 0;
        const desempenho = funcionario.desempenho[kpi] || 0;

        return `
            <span class="person-kpi-chip">
                ${nomesKpis[kpi] || kpi}: ${formatarNumero(valor)} / ${formatarNumero(meta)}
                <b>${formatarNumero(desempenho)}%</b>
            </span>
        `;
    }).join("");
}

function comentarioFuncionario(funcionario) {
    return dadosProducao.comentarios?.[valorFuncionario(funcionario)] || "";
}

function renderizarAnalisePessoasPorCelula() {
    const container = document.getElementById("analisePessoasCelula");

    if (!container) {
        return;
    }

    const celulas = Object.keys(dadosProducao.rankings.celulas || {});

    if (!celulas.length) {
        container.innerHTML = `<div class="empty-state">Aguardando importação.</div>`;
        return;
    }

    container.innerHTML = celulas.map(celula => {
        const funcionarios = dadosProducao.rankings.celulas[celula]
            .map(funcionario => `
                <tr>
                    <td>
                        <div class="person-with-avatar">
                            ${avatarFuncionario(funcionario)}
                            <div>
                                <strong>${escaparHtml(funcionario.nome)}</strong>
                                <span class="muted-line">${escaparHtml(funcionario.email || "-")}</span>
                                <textarea class="person-comment-input" data-funcionario-id="${escaparHtml(valorFuncionario(funcionario))}" placeholder="Comentário do mês...">${escaparHtml(comentarioFuncionario(funcionario))}</textarea>
                            </div>
                        </div>
                    </td>
                    <td>${funcionario.jornada.tipo}</td>
                    <td>${funcionario.jornada.horas} horas</td>
                    <td>${formatarNumero(funcionario.totalPrincipal)}</td>
                    <td>${formatarNumero(funcionario.metaTotal)}</td>
                    <td><span class="${classeMeta(funcionario.percentualGeral)}">${formatarNumero(funcionario.percentualGeral)}%</span></td>
                    <td><div class="person-kpi-list">${obterDetalheKpisFuncionario(funcionario)}</div></td>
                </tr>
            `).join("");

        return `
            <article class="people-cell-card">
                <header>
                    <div>
                        <h3>${escaparHtml(celula)}</h3>
                        <span>${dadosProducao.rankings.celulas[celula].length} pessoas</span>
                    </div>
                </header>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Funcionário</th>
                                <th>Regra</th>
                                <th>Carga horária</th>
                                <th>Produção</th>
                                <th>Meta individual</th>
                                <th>% Meta</th>
                                <th>KPIs da célula</th>
                            </tr>
                        </thead>
                        <tbody>${funcionarios}</tbody>
                    </table>
                </div>
            </article>
        `;
    }).join("");
}

function valoresSelecionados(select) {
    if (!select) {
        return [];
    }

    if (select.classList?.contains("multi-filter")) {
        return JSON.parse(select.dataset.selected || "[]");
    }

    return [...select.selectedOptions].map(option => option.value).filter(Boolean);
}

function resumoSelecao(selecionados, vazio) {
    if (!selecionados.length) {
        return vazio;
    }

    if (selecionados.length === 1) {
        return selecionados[0];
    }

    return `${selecionados.length} selecionados`;
}

function rotuloFuncionario(funcionario) {
    return funcionario?.nome || funcionario?.email || "Sem nome";
}

function valorFuncionario(funcionario) {
    return funcionario?.id || chaveFuncionario(funcionario);
}

function aplicarOpcoesMultiplas(controle, opcoes, selecionados, vazio) {
    const valoresOpcoes = opcoes.map(opcao => typeof opcao === "string" ? opcao : opcao.valor);
    const selecionadosValidos = new Set(selecionados.filter(valor => valoresOpcoes.includes(valor)));
    const botao = controle.querySelector(".multi-filter-button");
    const menu = controle.querySelector(".multi-filter-menu");

    controle.dataset.selected = JSON.stringify([...selecionadosValidos]);

    if (botao) {
        const labelsSelecionados = opcoes
            .map(opcao => ({
                valor: typeof opcao === "string" ? opcao : opcao.valor,
                label: typeof opcao === "string" ? opcao : opcao.label
            }))
            .filter(opcao => selecionadosValidos.has(opcao.valor))
            .map(opcao => opcao.label);

        botao.textContent = resumoSelecao(labelsSelecionados, vazio);
    }

    if (!menu) {
        return;
    }

    menu.innerHTML = opcoes.length
        ? opcoes.map(opcao => {
            const valor = typeof opcao === "string" ? opcao : opcao.valor;
            const label = typeof opcao === "string" ? opcao : opcao.label;

            return `
            <label class="multi-filter-option">
                <input type="checkbox" value="${escaparHtml(valor)}" ${selecionadosValidos.has(valor) ? "checked" : ""}>
                <span>${escaparHtml(label)}</span>
            </label>
        `;
        }).join("")
        : `<div class="multi-filter-empty">Nenhuma opção disponível</div>`;
}

function atualizarFiltrosEvolucao() {
    const filtroCelula = document.getElementById("filtroCelulaProducao");
    const filtroFuncionario = document.getElementById("filtroFuncionarioProducao");

    if (!filtroCelula || !filtroFuncionario) {
        return;
    }

    const celulasSelecionadas = valoresSelecionados(filtroCelula);
    const funcionariosSelecionados = valoresSelecionados(filtroFuncionario);
    const celulas = [...new Set(dadosProducao.funcionarios.map(funcionario => funcionario.celula))]
        .sort((a, b) => a.localeCompare(b));
    const funcionariosBase = dadosProducao.funcionarios
        .filter(funcionario => !celulasSelecionadas.length || celulasSelecionadas.includes(funcionario.celula))
        .map(funcionario => ({
            valor: valorFuncionario(funcionario),
            label: rotuloFuncionario(funcionario)
        }))
        .filter((funcionario, indice, lista) => lista.findIndex(item => item.valor === funcionario.valor) === indice)
        .sort((a, b) => a.label.localeCompare(b.label));

    aplicarOpcoesMultiplas(filtroCelula, celulas, celulasSelecionadas, "Todas");
    aplicarOpcoesMultiplas(filtroFuncionario, funcionariosBase, funcionariosSelecionados, "Todos");
}

function anoBaseEvolucao() {
    const competencia = dadosProducao.competencia || new Date().toISOString().slice(0, 7);
    const ano = Number(String(competencia).slice(0, 4));
    return Number.isFinite(ano) ? ano : new Date().getFullYear();
}

function competenciaBaseEvolucao() {
    return dadosProducao.competencia || `${anoBaseEvolucao()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
}

function competenciasDesdeJaneiro() {
    const competencia = competenciaBaseEvolucao();
    const ano = Number(competencia.slice(0, 4));
    const mesFinal = Math.max(1, Number(competencia.slice(5, 7)) || 1);

    return Array.from({ length: mesFinal }, (_, indice) => {
        const mes = indice + 1;
        return `${ano}-${String(mes).padStart(2, "0")}`;
    });
}

function labelCompetencia(competencia) {
    const mes = Number(String(competencia).slice(5, 7));
    const ano = String(competencia).slice(0, 4);

    return `${nomesMesesCurtos[mes - 1] || competencia}/${ano}`;
}

function agruparHistoricoPorCompetencia() {
    const mapa = new Map();

    (dadosProducao.historico || []).forEach(linha => {
        const competencia = linha.competencia;

        if (!competencia) {
            return;
        }

        if (!mapa.has(competencia)) {
            mapa.set(competencia, []);
        }

        mapa.get(competencia).push(linha);
    });

    mapa.set(competenciaBaseEvolucao(), dadosProducao.funcionarios);
    return mapa;
}

function processarLinhasParaEvolucao(linhas, competencia) {
    if (!linhas.length) {
        return [];
    }

    const jaProcessado = linhas.every(linha => linha.principais && linha.metas && linha.jornada);

    if (jaProcessado) {
        return linhas;
    }

    const funcionarios = linhas
        .filter(funcionario => funcionario.nome || funcionario.email)
        .map(processarFuncionario);
    const metas = calcularMetasPorCelula(funcionarios, dadosProducao.historico, competencia);

    return aplicarMetasEDesempenho(funcionarios, metas);
}

function percentualDaLista(funcionarios) {
    const totalProducao = funcionarios.reduce((total, funcionario) => total + Number(funcionario.totalPrincipal || 0), 0);
    const totalMeta = funcionarios.reduce((total, funcionario) => total + Number(funcionario.metaTotal || 0), 0);

    return percentual(totalProducao, totalMeta);
}

function funcionariosParaGrafico(celulasSelecionadas, funcionariosSelecionados) {
    if (funcionariosSelecionados.length) {
        return funcionariosSelecionados;
    }

    if (celulasSelecionadas.length) {
        return dadosProducao.funcionarios
            .filter(funcionario => celulasSelecionadas.includes(funcionario.celula))
            .map(valorFuncionario)
            .filter((id, indice, lista) => lista.indexOf(id) === indice)
            .sort((a, b) => {
                const nomeA = rotuloFuncionario(dadosProducao.funcionarios.find(funcionario => valorFuncionario(funcionario) === a));
                const nomeB = rotuloFuncionario(dadosProducao.funcionarios.find(funcionario => valorFuncionario(funcionario) === b));
                return nomeA.localeCompare(nomeB);
            });
    }

    return [];
}

function valoresEvolucaoPorFiltro(idFuncionario, celulasSelecionadas, porCompetencia) {
    return competenciasDesdeJaneiro().map(competencia => {
        const linhas = porCompetencia.get(competencia) || [];
        const funcionarios = processarLinhasParaEvolucao(linhas, competencia)
            .filter(funcionario => !celulasSelecionadas.length || celulasSelecionadas.includes(funcionario.celula))
            .filter(funcionario => !idFuncionario || valorFuncionario(funcionario) === idFuncionario);

        return funcionarios.length ? percentualDaLista(funcionarios) : 0;
    });
}

function nomeFuncionarioPorId(idFuncionario, porCompetencia) {
    const atual = dadosProducao.funcionarios.find(funcionario => valorFuncionario(funcionario) === idFuncionario);

    if (atual) {
        return rotuloFuncionario(atual);
    }

    for (const linhas of porCompetencia.values()) {
        const funcionario = processarLinhasParaEvolucao(linhas, "").find(item => valorFuncionario(item) === idFuncionario);

        if (funcionario) {
            return rotuloFuncionario(funcionario);
        }
    }

    return idFuncionario;
}

function montarDatasetsEvolucao() {
    const celulasSelecionadas = valoresSelecionados(document.getElementById("filtroCelulaProducao"));
    const funcionariosSelecionados = valoresSelecionados(document.getElementById("filtroFuncionarioProducao"));
    const porCompetencia = agruparHistoricoPorCompetencia();
    const funcionariosGrafico = funcionariosParaGrafico(celulasSelecionadas, funcionariosSelecionados);

    if (!funcionariosGrafico.length) {
        return [{
            label: "Equipe geral - % da meta",
            data: valoresEvolucaoPorFiltro("", [], porCompetencia),
            borderColor: coresGrafico[0],
            backgroundColor: `${coresGrafico[0]}22`,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: .28,
            fill: true
        }];
    }

    return funcionariosGrafico.map((idFuncionario, indice) => {
        const cor = coresGrafico[indice % coresGrafico.length];

        return {
            label: nomeFuncionarioPorId(idFuncionario, porCompetencia),
            data: valoresEvolucaoPorFiltro(idFuncionario, celulasSelecionadas, porCompetencia),
            borderColor: cor,
            backgroundColor: `${cor}1F`,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: .28,
            fill: false
        };
    });
}

function deveMostrarRotulo(contexto) {
    const datasets = contexto.chart.data.datasets;
    const valor = contexto.dataset.data[contexto.dataIndex];

    if (!valor) {
        return false;
    }

    if (datasets.length <= 2) {
        return true;
    }

    return contexto.dataIndex === contexto.dataset.data.length - 1;
}

function renderizarGraficoEvolucao() {
    const canvas = document.getElementById("graficoEvolucaoProducao");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (typeof ChartDataLabels !== "undefined") {
        Chart.register(ChartDataLabels);
    }

    const contexto = canvas.getContext("2d");

    if (graficoEvolucaoProducao) {
        graficoEvolucaoProducao.destroy();
    }

    graficoEvolucaoProducao = new Chart(contexto, {
        type: "line",
        data: {
            labels: competenciasDesdeJaneiro().map(labelCompetencia),
            datasets: montarDatasetsEvolucao()
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            layout: {
                padding: {
                    top: 28,
                    right: 28,
                    bottom: 8,
                    left: 8
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        boxWidth: 12,
                        color: "#102033",
                        font: { weight: "bold" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: contexto => `${contexto.dataset.label}: ${formatarNumero(contexto.parsed.y)}%`
                    }
                },
                datalabels: {
                    display: deveMostrarRotulo,
                    formatter: valor => `${formatarNumero(valor)}%`,
                    align: contexto => contexto.datasetIndex % 2 === 0 ? "top" : "bottom",
                    anchor: "end",
                    offset: contexto => 6 + (contexto.datasetIndex % 4) * 4,
                    clamp: true,
                    clip: false,
                    borderRadius: 5,
                    padding: {
                        top: 3,
                        right: 5,
                        bottom: 3,
                        left: 5
                    },
                    color: "#fff",
                    backgroundColor: contexto => contexto.dataset.borderColor,
                    font: {
                        size: 10,
                        weight: "bold"
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: valor => `${formatarNumero(valor)}%`
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function limitarValor(valor, minimo, maximo) {
    return Math.min(maximo, Math.max(minimo, valor));
}

function obterDiagnosticoCapacidade(ocupacao) {
    if (ocupacao < 70) {
        return {
            classe: "capacity-good",
            titulo: "Há espaço para mais demanda",
            texto: "A equipe está com folga operacional relevante."
        };
    }

    if (ocupacao < 90) {
        return {
            classe: "capacity-stable",
            titulo: "Capacidade moderada",
            texto: "Ainda existe margem, mas vale distribuir a demanda com atenção."
        };
    }

    if (ocupacao <= 105) {
        return {
            classe: "capacity-warning",
            titulo: "Próximo do limite",
            texto: "A equipe está operando perto da capacidade planejada."
        };
    }

    return {
        classe: "capacity-danger",
        titulo: "Sobrecarga operacional",
        texto: "A demanda atual já passa da capacidade estimada."
    };
}

function calcularForcaTrabalho() {
    const funcionarios = dadosProducao.funcionarios || [];
    const totalProducao = funcionarios.reduce((total, funcionario) => total + Number(funcionario.totalPrincipal || 0), 0);
    const totalMeta = funcionarios.reduce((total, funcionario) => total + Number(funcionario.metaTotal || 0), 0);
    const ocupacao = percentual(totalProducao, totalMeta);
    const capacidadeRestante = Math.max(0, totalMeta - totalProducao);
    const capacidadePercentual = Math.max(0, 100 - ocupacao);
    const porCelula = Object.entries(dadosProducao.rankings.celulas || {}).map(([celula, lista]) => {
        const producao = lista.reduce((total, funcionario) => total + Number(funcionario.totalPrincipal || 0), 0);
        const meta = lista.reduce((total, funcionario) => total + Number(funcionario.metaTotal || 0), 0);

        return {
            celula,
            producao,
            meta,
            ocupacao: percentual(producao, meta),
            capacidadeRestante: Math.max(0, meta - producao)
        };
    }).sort((a, b) => a.ocupacao - b.ocupacao);

    return {
        totalProducao,
        totalMeta,
        ocupacao,
        capacidadeRestante,
        capacidadePercentual,
        porCelula
    };
}

function renderizarForcaTrabalho() {
    const container = document.getElementById("forcaTrabalho");

    if (!container) {
        return;
    }

    if (!dadosProducao.funcionarios.length) {
        container.innerHTML = `<div class="empty-state">Aguardando importação.</div>`;
        return;
    }

    const capacidade = calcularForcaTrabalho();
    const diagnostico = obterDiagnosticoCapacidade(capacidade.ocupacao);
    const angulo = limitarValor((capacidade.ocupacao / 140) * 180, 0, 180);
    const celulas = capacidade.porCelula.slice(0, 6).map(celula => `
        <div class="capacity-cell-row">
            <div>
                <strong>${escaparHtml(celula.celula)}</strong>
                <span>${formatarNumero(celula.capacidadeRestante)} pontos livres</span>
            </div>
            <div class="capacity-cell-meter">
                <span style="width:${limitarValor(celula.ocupacao, 0, 140) / 140 * 100}%"></span>
            </div>
            <b>${formatarNumero(celula.ocupacao)}%</b>
        </div>
    `).join("");

    container.innerHTML = `
        <article class="capacity-gauge-card ${diagnostico.classe}">
            <div class="capacity-gauge" style="--gauge-angle:${angulo}deg">
                <div class="capacity-gauge-arc"></div>
                <div class="capacity-gauge-needle"></div>
                <div class="capacity-gauge-center"></div>
            </div>
            <div class="capacity-gauge-value">
                <strong>${formatarNumero(capacidade.ocupacao)}%</strong>
                <span>ocupação da equipe</span>
            </div>
        </article>

        <article class="capacity-summary-card">
            <span class="capacity-status ${diagnostico.classe}">${diagnostico.titulo}</span>
            <h3>${diagnostico.texto}</h3>
            <div class="capacity-summary-grid">
                <div>
                    <span>Produção atual</span>
                    <strong>${formatarNumero(capacidade.totalProducao)}</strong>
                </div>
                <div>
                    <span>Capacidade planejada</span>
                    <strong>${formatarNumero(capacidade.totalMeta)}</strong>
                </div>
                <div>
                    <span>Folga estimada</span>
                    <strong>${formatarNumero(capacidade.capacidadeRestante)}</strong>
                </div>
                <div>
                    <span>Margem</span>
                    <strong>${formatarNumero(capacidade.capacidadePercentual)}%</strong>
                </div>
            </div>
            <p>Use a folga estimada como referência inicial. A decisão final ainda deve considerar complexidade dos casos, prazos e células específicas.</p>
        </article>

        <article class="capacity-cells-card">
            <h3>Folga por célula</h3>
            <div class="capacity-cell-list">
                ${celulas || `<div class="empty-state">Sem células para comparar.</div>`}
            </div>
        </article>
    `;
}

function obterDiagnosticoCapacidade(ocupacao) {
    if (ocupacao < 65) {
        return {
            classe: "capacity-good",
            titulo: "Há espaço para mais demanda",
            texto: "A equipe está distante do teto produtivo estimado."
        };
    }

    if (ocupacao < 82) {
        return {
            classe: "capacity-stable",
            titulo: "Capacidade saudável",
            texto: "Existe margem para crescer com acompanhamento."
        };
    }

    if (ocupacao <= 95) {
        return {
            classe: "capacity-warning",
            titulo: "Próximo do teto",
            texto: "A equipe já opera perto do benchmark de alta produção."
        };
    }

    return {
        classe: "capacity-danger",
        titulo: "No teto ou acima",
        texto: "A produção atual já encosta no teto produtivo estimado."
    };
}

function fatorJornadaFuncionario(funcionario) {
    const fator = Number(funcionario?.jornada?.fatorMeta || 1);
    return fator > 0 ? fator : 1;
}

function calcularTetoProdutivo(funcionarios) {
    const validos = funcionarios.filter(funcionario => Number(funcionario.totalPrincipal || 0) > 0);
    const totalFte = funcionarios.reduce((total, funcionario) => total + fatorJornadaFuncionario(funcionario), 0);
    const producoesEquivalentes8h = validos
        .map(funcionario => Number(funcionario.totalPrincipal || 0) / fatorJornadaFuncionario(funcionario))
        .sort((a, b) => b - a);

    if (!producoesEquivalentes8h.length || !totalFte) {
        return {
            teto: 0,
            benchmark8h: 0,
            pessoasReferencia: 0
        };
    }

    const pessoasReferencia = Math.max(1, Math.ceil(producoesEquivalentes8h.length * .25));
    const topQuartil = producoesEquivalentes8h.slice(0, pessoasReferencia);
    const benchmark8h = topQuartil.reduce((total, valor) => total + valor, 0) / topQuartil.length;

    return {
        teto: Math.round(benchmark8h * totalFte),
        benchmark8h,
        pessoasReferencia
    };
}

function calcularForcaTrabalho() {
    const funcionarios = dadosProducao.funcionarios || [];
    const totalProducao = funcionarios.reduce((total, funcionario) => total + Number(funcionario.totalPrincipal || 0), 0);
    const tetoGeral = calcularTetoProdutivo(funcionarios);
    const ocupacao = percentual(totalProducao, tetoGeral.teto);
    const capacidadeRestante = Math.max(0, tetoGeral.teto - totalProducao);
    const capacidadePercentual = Math.max(0, 100 - ocupacao);
    const porCelula = Object.entries(dadosProducao.rankings.celulas || {}).map(([celula, lista]) => {
        const producao = lista.reduce((total, funcionario) => total + Number(funcionario.totalPrincipal || 0), 0);
        const tetoCelula = calcularTetoProdutivo(lista);

        return {
            celula,
            producao,
            teto: tetoCelula.teto,
            ocupacao: percentual(producao, tetoCelula.teto),
            capacidadeRestante: Math.max(0, tetoCelula.teto - producao)
        };
    }).sort((a, b) => a.ocupacao - b.ocupacao);

    return {
        totalProducao,
        tetoProdutivo: tetoGeral.teto,
        benchmark8h: tetoGeral.benchmark8h,
        pessoasReferencia: tetoGeral.pessoasReferencia,
        ocupacao,
        capacidadeRestante,
        capacidadePercentual,
        porCelula
    };
}

function renderizarForcaTrabalho() {
    const container = document.getElementById("forcaTrabalho");

    if (!container) {
        return;
    }

    if (!dadosProducao.funcionarios.length) {
        container.innerHTML = `<div class="empty-state">Aguardando importação.</div>`;
        return;
    }

    const capacidade = calcularForcaTrabalho();
    const diagnostico = obterDiagnosticoCapacidade(capacidade.ocupacao);
    const angulo = limitarValor((capacidade.ocupacao / 120) * 180, 0, 180);
    const celulas = capacidade.porCelula.slice(0, 6).map(celula => `
        <div class="capacity-cell-row">
            <div>
                <strong>${escaparHtml(celula.celula)}</strong>
                <span>${formatarNumero(celula.capacidadeRestante)} pontos livres</span>
            </div>
            <div class="capacity-cell-meter">
                <span style="width:${limitarValor(celula.ocupacao, 0, 120) / 120 * 100}%"></span>
            </div>
            <b>${formatarNumero(celula.ocupacao)}%</b>
        </div>
    `).join("");

    container.innerHTML = `
        <article class="capacity-gauge-card ${diagnostico.classe}">
            <div class="capacity-gauge" style="--gauge-angle:${angulo}deg">
                <div class="capacity-gauge-arc"></div>
                <div class="capacity-gauge-needle"></div>
                <div class="capacity-gauge-center"></div>
            </div>
            <div class="capacity-gauge-value">
                <strong>${formatarNumero(capacidade.ocupacao)}%</strong>
                <span>uso do teto produtivo</span>
            </div>
        </article>

        <article class="capacity-summary-card">
            <span class="capacity-status ${diagnostico.classe}">${diagnostico.titulo}</span>
            <h3>${diagnostico.texto}</h3>
            <div class="capacity-summary-grid">
                <div>
                    <span>Produção atual</span>
                    <strong>${formatarNumero(capacidade.totalProducao)}</strong>
                </div>
                <div>
                    <span>Teto produtivo</span>
                    <strong>${formatarNumero(capacidade.tetoProdutivo)}</strong>
                </div>
                <div>
                    <span>Folga estimada</span>
                    <strong>${formatarNumero(capacidade.capacidadeRestante)}</strong>
                </div>
                <div>
                    <span>Benchmark 8h</span>
                    <strong>${formatarNumero(capacidade.benchmark8h)}</strong>
                </div>
            </div>
            <p>Referência calculada pela média do quartil superior de produção, ajustada para jornada de 8h. A decisão final ainda deve considerar complexidade dos casos, prazos e células específicas.</p>
        </article>

        <article class="capacity-cells-card">
            <h3>Folga por célula</h3>
            <div class="capacity-cell-list">
                ${celulas || `<div class="empty-state">Sem células para comparar.</div>`}
            </div>
        </article>
    `;
}

const pesosEsforcoKpi = {
    contratosMarcados: 1.4,
    prorrogacoes: 1,
    alteracoes: .7,
    contratosDesligados: 1.3,
    ticketsResolvidos: .9
};

function obterPesoEsforcoKpi(kpi) {
    return Number(dadosProducao.parametros?.pesos?.[kpi] ?? pesosEsforcoKpi[kpi] ?? 1);
}

function calcularIndiceEsforcoFuncionario(funcionario) {
    return Object.entries(funcionario.principais || {}).reduce((total, [kpi, valor]) => {
        const peso = obterPesoEsforcoKpi(kpi);
        return total + (Number(valor || 0) * peso);
    }, 0);
}

function calcularComposicaoEsforco(funcionarios) {
    const composicao = {};

    funcionarios.forEach(funcionario => {
        Object.entries(funcionario.principais || {}).forEach(([kpi, valor]) => {
            const quantidade = Number(valor || 0);
            const peso = obterPesoEsforcoKpi(kpi);

            if (!quantidade) {
                return;
            }

            if (!composicao[kpi]) {
                composicao[kpi] = {
                    kpi,
                    nome: nomesKpis[kpi] || kpi,
                    quantidade: 0,
                    peso,
                    pontos: 0
                };
            }

            composicao[kpi].quantidade += quantidade;
            composicao[kpi].pontos += quantidade * peso;
        });
    });

    const total = Object.values(composicao).reduce((soma, item) => soma + item.pontos, 0);

    return Object.values(composicao)
        .map(item => ({
            ...item,
            percentual: total ? Math.round((item.pontos / total) * 100) : 0
        }))
        .sort((a, b) => b.pontos - a.pontos);
}

function calcularTetoProdutivo(funcionarios) {
    const validos = funcionarios.filter(funcionario => calcularIndiceEsforcoFuncionario(funcionario) > 0);
    const totalFte = funcionarios.reduce((total, funcionario) => total + fatorJornadaFuncionario(funcionario), 0);
    const indicesEquivalentes8h = validos
        .map(funcionario => calcularIndiceEsforcoFuncionario(funcionario) / fatorJornadaFuncionario(funcionario))
        .sort((a, b) => b - a);

    if (!indicesEquivalentes8h.length || !totalFte) {
        return {
            teto: 0,
            benchmark8h: 0,
            pessoasReferencia: 0
        };
    }

    const pessoasReferencia = Math.max(1, Math.ceil(indicesEquivalentes8h.length * .25));
    const topQuartil = indicesEquivalentes8h.slice(0, pessoasReferencia);
    const benchmark8h = topQuartil.reduce((total, valor) => total + valor, 0) / topQuartil.length;

    return {
        teto: Math.round(benchmark8h * totalFte),
        benchmark8h,
        pessoasReferencia
    };
}

function calcularForcaTrabalho() {
    const funcionarios = dadosProducao.funcionarios || [];
    const totalProducao = funcionarios.reduce((total, funcionario) => total + calcularIndiceEsforcoFuncionario(funcionario), 0);
    const tetoGeral = calcularTetoProdutivo(funcionarios);
    const ocupacao = percentual(totalProducao, tetoGeral.teto);
    const capacidadeRestante = Math.max(0, tetoGeral.teto - totalProducao);
    const capacidadePercentual = Math.max(0, 100 - ocupacao);
    const porCelula = Object.entries(dadosProducao.rankings.celulas || {}).map(([celula, lista]) => {
        const producao = lista.reduce((total, funcionario) => total + calcularIndiceEsforcoFuncionario(funcionario), 0);
        const tetoCelula = calcularTetoProdutivo(lista);

        return {
            celula,
            producao,
            teto: tetoCelula.teto,
            ocupacao: percentual(producao, tetoCelula.teto),
            capacidadeRestante: Math.max(0, tetoCelula.teto - producao)
        };
    }).sort((a, b) => a.ocupacao - b.ocupacao);

    return {
        totalProducao,
        tetoProdutivo: tetoGeral.teto,
        benchmark8h: tetoGeral.benchmark8h,
        pessoasReferencia: tetoGeral.pessoasReferencia,
        ocupacao,
        capacidadeRestante,
        capacidadePercentual,
        porCelula
    };
}

function renderizarForcaTrabalho() {
    const container = document.getElementById("forcaTrabalho");

    if (!container) {
        return;
    }

    if (!dadosProducao.funcionarios.length) {
        container.innerHTML = `<div class="empty-state">Aguardando importação.</div>`;
        return;
    }

    const capacidade = calcularForcaTrabalho();
    const diagnostico = obterDiagnosticoCapacidade(capacidade.ocupacao);
    const angulo = limitarValor((capacidade.ocupacao / 120) * 180, 0, 180);
    const celulas = capacidade.porCelula.slice(0, 6).map(celula => `
        <div class="capacity-cell-row">
            <div>
                <strong>${escaparHtml(celula.celula)}</strong>
                <span>${formatarNumero(celula.capacidadeRestante)} pontos ponderados livres</span>
            </div>
            <div class="capacity-cell-meter">
                <span style="width:${limitarValor(celula.ocupacao, 0, 120) / 120 * 100}%"></span>
            </div>
            <b>${formatarNumero(celula.ocupacao)}%</b>
        </div>
    `).join("");

    container.innerHTML = `
        <article class="capacity-gauge-card ${diagnostico.classe}">
            <div class="capacity-gauge" style="--gauge-angle:${angulo}deg">
                <div class="capacity-gauge-arc"></div>
                <div class="capacity-gauge-needle"></div>
                <div class="capacity-gauge-center"></div>
            </div>
            <div class="capacity-gauge-value">
                <strong>${formatarNumero(capacidade.ocupacao)}%</strong>
                <span>uso do teto ponderado</span>
            </div>
        </article>

        <article class="capacity-summary-card">
            <span class="capacity-status ${diagnostico.classe}">${diagnostico.titulo}</span>
            <h3>${diagnostico.texto}</h3>
            <div class="capacity-summary-grid">
                <div>
                    <span>Índice atual</span>
                    <strong>${formatarNumero(capacidade.totalProducao)}</strong>
                </div>
                <div>
                    <span>Teto ponderado</span>
                    <strong>${formatarNumero(capacidade.tetoProdutivo)}</strong>
                </div>
                <div>
                    <span>Folga ponderada</span>
                    <strong>${formatarNumero(capacidade.capacidadeRestante)}</strong>
                </div>
                <div>
                    <span>Benchmark 8h</span>
                    <strong>${formatarNumero(capacidade.benchmark8h)}</strong>
                </div>
            </div>
            <p>Referência calculada por índice ponderado de esforço, usando o quartil superior da equipe ajustado para jornada de 8h. Assim, atividades diferentes não entram com o mesmo peso.</p>
        </article>

        <article class="capacity-cells-card">
            <h3>Folga por célula</h3>
            <div class="capacity-cell-list">
                ${celulas || `<div class="empty-state">Sem células para comparar.</div>`}
            </div>
        </article>
    `;
}

function percentil(valores, ponto) {
    const ordenados = valores
        .filter(valor => Number.isFinite(valor))
        .sort((a, b) => a - b);

    if (!ordenados.length) {
        return 0;
    }

    const posicao = (ordenados.length - 1) * ponto;
    const base = Math.floor(posicao);
    const topo = Math.ceil(posicao);

    if (base === topo) {
        return ordenados[base];
    }

    return ordenados[base] + ((ordenados[topo] - ordenados[base]) * (posicao - base));
}

function obterAmostraHistoricaEsforco() {
    const porCompetencia = agruparHistoricoPorCompetencia();
    const amostra = [];

    porCompetencia.forEach((linhas, competencia) => {
        processarLinhasParaEvolucao(linhas, competencia).forEach(funcionario => {
            const indice = calcularIndiceEsforcoFuncionario(funcionario);

            if (indice > 0) {
                amostra.push(indice / fatorJornadaFuncionario(funcionario));
            }
        });
    });

    return amostra;
}

function calcularReferenciaSustentavel(funcionarios) {
    const amostraHistorica = obterAmostraHistoricaEsforco();
    const amostraAtual = funcionarios
        .map(funcionario => calcularIndiceEsforcoFuncionario(funcionario) / fatorJornadaFuncionario(funcionario))
        .filter(valor => valor > 0);
    const amostra = amostraHistorica.length >= 8 ? amostraHistorica : amostraAtual;
    const totalFte = funcionarios.reduce((total, funcionario) => total + fatorJornadaFuncionario(funcionario), 0);
    const faixaSustentavel8h = percentil(amostra, .70);
    const faixaCritica8h = percentil(amostra, .90) || faixaSustentavel8h;

    return {
        limiteSustentavel: Math.round(faixaSustentavel8h * totalFte),
        limiteCritico: Math.round(faixaCritica8h * totalFte),
        faixaSustentavel8h,
        faixaCritica8h
    };
}

function obterDiagnosticoCapacidade(ocupacao, percentualAcimaFaixa = 0) {
    if (ocupacao >= 100 || percentualAcimaFaixa >= 50) {
        return {
            classe: "capacity-danger",
            titulo: "Pressão alta",
            texto: "A equipe está acima da faixa sustentável de trabalho."
        };
    }

    if (ocupacao >= 88 || percentualAcimaFaixa >= 35) {
        return {
            classe: "capacity-warning",
            titulo: "Pressão moderada",
            texto: "A equipe está em atenção, com pouca margem para aumentar demanda."
        };
    }

    if (ocupacao >= 75) {
        return {
            classe: "capacity-stable",
            titulo: "Pressão controlada",
            texto: "A equipe tem demanda relevante, mas ainda dentro da faixa controlada."
        };
    }

    return {
        classe: "capacity-good",
        titulo: "Pressão baixa",
        texto: "A equipe está abaixo da faixa sustentável estimada."
    };
}

function calcularForcaTrabalho() {
    const funcionarios = dadosProducao.funcionarios || [];
    const totalProducao = funcionarios.reduce((total, funcionario) => total + calcularIndiceEsforcoFuncionario(funcionario), 0);
    const referencia = calcularReferenciaSustentavel(funcionarios);
    const ocupacao = percentual(totalProducao, referencia.limiteSustentavel);
    const capacidadeRestante = Math.max(0, referencia.limiteSustentavel - totalProducao);
    const excessoEstimado = Math.max(0, totalProducao - referencia.limiteSustentavel);
    const pessoasAcimaFaixa = funcionarios.filter(funcionario => {
        const indice8h = calcularIndiceEsforcoFuncionario(funcionario) / fatorJornadaFuncionario(funcionario);
        return indice8h > referencia.faixaSustentavel8h;
    }).length;
    const percentualAcimaFaixa = funcionarios.length ? Math.round((pessoasAcimaFaixa / funcionarios.length) * 100) : 0;
    const porCelula = Object.entries(dadosProducao.rankings.celulas || {}).map(([celula, lista]) => {
        const producao = lista.reduce((total, funcionario) => total + calcularIndiceEsforcoFuncionario(funcionario), 0);
        const referenciaCelula = calcularReferenciaSustentavel(lista);
        const pessoasAcima = lista.filter(funcionario => {
            const indice8h = calcularIndiceEsforcoFuncionario(funcionario) / fatorJornadaFuncionario(funcionario);
            return indice8h > referenciaCelula.faixaSustentavel8h;
        }).length;

        return {
            celula,
            producao,
            teto: referenciaCelula.limiteSustentavel,
            ocupacao: percentual(producao, referenciaCelula.limiteSustentavel),
            capacidadeRestante: Math.max(0, referenciaCelula.limiteSustentavel - producao),
            pessoasAcima
        };
    }).sort((a, b) => b.ocupacao - a.ocupacao);

    return {
        totalProducao,
        tetoProdutivo: referencia.limiteSustentavel,
        limiteCritico: referencia.limiteCritico,
        benchmark8h: referencia.faixaSustentavel8h,
        benchmarkCritico8h: referencia.faixaCritica8h,
        ocupacao,
        capacidadeRestante,
        excessoEstimado,
        pessoasAcimaFaixa,
        percentualAcimaFaixa,
        composicao: calcularComposicaoEsforco(funcionarios),
        porCelula
    };
}

function renderizarComposicaoEsforco(composicao) {
    if (!composicao.length) {
        return `<div class="empty-state">Sem composição de atividades para exibir.</div>`;
    }

    const cores = ["#003b71", "#ff7a00", "#168a4a", "#7c3aed", "#0891b2", "#c23b3b"];
    const segmentos = composicao.map((item, indice) => `
        <span style="width:${item.percentual}%; background:${cores[indice % cores.length]}" title="${escaparHtml(item.nome)}: ${formatarNumero(item.percentual)}%"></span>
    `).join("");
    const linhas = composicao.map((item, indice) => `
        <div class="workload-row">
            <i style="background:${cores[indice % cores.length]}"></i>
            <div>
                <strong>${escaparHtml(item.nome)}</strong>
                <span>${formatarNumero(item.quantidade)} atividades x peso ${String(item.peso).replace(".", ",")}</span>
            </div>
            <b>${formatarNumero(item.pontos)} pts</b>
        </div>
    `).join("");

    return `
        <div class="workload-composition">
            <div class="workload-stack">${segmentos}</div>
            <div class="workload-list">${linhas}</div>
        </div>
    `;
}

function renderizarForcaTrabalho() {
    const container = document.getElementById("forcaTrabalho");

    if (!container) {
        return;
    }

    if (!dadosProducao.funcionarios.length) {
        container.innerHTML = `<div class="empty-state">Aguardando importação.</div>`;
        return;
    }

    const capacidade = calcularForcaTrabalho();
    const diagnostico = obterDiagnosticoCapacidade(capacidade.ocupacao, capacidade.percentualAcimaFaixa);
    const angulo = limitarValor((capacidade.ocupacao / 120) * 180, 0, 180);
    const celulas = capacidade.porCelula.slice(0, 6).map(celula => `
        <div class="capacity-cell-row">
            <div>
                <strong>${escaparHtml(celula.celula)}</strong>
                <span>${celula.pessoasAcima} pessoa(s) acima da faixa</span>
            </div>
            <div class="capacity-cell-meter">
                <span style="width:${limitarValor(celula.ocupacao, 0, 120) / 120 * 100}%"></span>
            </div>
            <b>${formatarNumero(celula.ocupacao)}%</b>
        </div>
    `).join("");

    container.innerHTML = `
        <article class="capacity-gauge-card ${diagnostico.classe}">
            <div class="capacity-gauge" style="--gauge-angle:${angulo}deg">
                <div class="capacity-gauge-arc"></div>
                <div class="capacity-gauge-needle"></div>
                <div class="capacity-gauge-center"></div>
            </div>
            <div class="capacity-gauge-value">
                <strong>${formatarNumero(capacidade.ocupacao)}%</strong>
                <span>pressão operacional</span>
            </div>
            <div class="capacity-gauge-caption">
                <b>${formatarNumero(capacidade.totalProducao)}</b>
                <span>pontos de carga ponderada</span>
            </div>
        </article>

        <article class="capacity-summary-card">
            <span class="capacity-status ${diagnostico.classe}">${diagnostico.titulo}</span>
            <h3>${diagnostico.texto}</h3>
            <div class="capacity-summary-grid">
                <div>
                    <span>Índice atual</span>
                    <strong>${formatarNumero(capacidade.totalProducao)}</strong>
                </div>
                <div>
                    <span>Faixa sustentável</span>
                    <strong>${formatarNumero(capacidade.tetoProdutivo)}</strong>
                </div>
                <div>
                    <span>Excesso estimado</span>
                    <strong>${formatarNumero(capacidade.excessoEstimado)}</strong>
                </div>
                <div>
                    <span>Pessoas acima</span>
                    <strong>${formatarNumero(capacidade.percentualAcimaFaixa)}%</strong>
                </div>
            </div>
            <p>A leitura usa índice ponderado de esforço e compara a produção atual com uma faixa sustentável, baseada no percentil 70 da produção equivalente a 8h. Isso ajuda a mostrar pressão mesmo quando a equipe segue entregando muito.</p>
            ${renderizarComposicaoEsforco(capacidade.composicao)}
        </article>

        <article class="capacity-cells-card">
            <h3>Pressão por célula</h3>
            <div class="capacity-cell-list">
                ${celulas || `<div class="empty-state">Sem células para comparar.</div>`}
            </div>
        </article>
    `;
}

function configurarEventosFiltrosEvolucao() {
    const filtroCelula = document.getElementById("filtroCelulaProducao");
    const filtroFuncionario = document.getElementById("filtroFuncionarioProducao");
    const limparFiltros = document.getElementById("limparFiltrosProducao");

    if (filtroCelula && !filtroCelula.dataset.configurado) {
        configurarMultiFiltro(filtroCelula, () => {
            atualizarFiltrosEvolucao();
            renderizarGraficoEvolucao();
        });
        filtroCelula.dataset.configurado = "1";
    }

    if (filtroFuncionario && !filtroFuncionario.dataset.configurado) {
        configurarMultiFiltro(filtroFuncionario, renderizarGraficoEvolucao);
        filtroFuncionario.dataset.configurado = "1";
    }

    if (limparFiltros && !limparFiltros.dataset.configurado) {
        limparFiltros.addEventListener("click", () => {
            if (filtroCelula) {
                filtroCelula.dataset.selected = "[]";
            }

            if (filtroFuncionario) {
                filtroFuncionario.dataset.selected = "[]";
            }

            document.querySelectorAll(".multi-filter.open").forEach(controle => controle.classList.remove("open"));
            atualizarFiltrosEvolucao();
            renderizarGraficoEvolucao();
        });
        limparFiltros.dataset.configurado = "1";
    }
}

function configurarComentariosProducao() {
    const container = document.getElementById("analisePessoasCelula");

    if (!container || container.dataset.comentariosConfigurados) {
        return;
    }

    container.addEventListener("input", event => {
        const campo = event.target;

        if (!campo.classList.contains("person-comment-input")) {
            return;
        }

        const funcionarioId = campo.dataset.funcionarioId;
        const texto = campo.value;

        dadosProducao.comentarios[funcionarioId] = texto;

        if (timersComentariosProducao.has(funcionarioId)) {
            clearTimeout(timersComentariosProducao.get(funcionarioId));
        }

        timersComentariosProducao.set(funcionarioId, setTimeout(() => {
            if (typeof window.salvarComentarioProducao === "function") {
                window.salvarComentarioProducao(funcionarioId, texto).catch(erro => {
                    console.error(erro);
                });
            }
        }, 600));
    });

    container.dataset.comentariosConfigurados = "1";
}

function configurarMultiFiltro(controle, aoAlterar) {
    const botao = controle.querySelector(".multi-filter-button");
    const menu = controle.querySelector(".multi-filter-menu");

    botao?.addEventListener("click", event => {
        event.stopPropagation();
        document.querySelectorAll(".multi-filter.open").forEach(aberto => {
            if (aberto !== controle) {
                aberto.classList.remove("open");
            }
        });
        controle.classList.toggle("open");
    });

    menu?.addEventListener("change", event => {
        if (event.target.type !== "checkbox") {
            return;
        }

        const selecionados = [...menu.querySelectorAll("input:checked")].map(input => input.value);
        controle.dataset.selected = JSON.stringify(selecionados);
        aoAlterar();
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".multi-filter.open").forEach(controle => controle.classList.remove("open"));
});

function atualizarDashboardProducao() {
    renderizarIndicadoresProducao();
    renderizarForcaTrabalho();
    renderizarMetasPorCelula();
    renderizarRankingGeral();
    renderizarRankingDestaquesKpi();
    renderizarAnalisePessoasPorCelula();
    configurarComentariosProducao();
    atualizarFiltrosEvolucao();
    configurarEventosFiltrosEvolucao();
    renderizarGraficoEvolucao();
}

document.addEventListener("DOMContentLoaded", atualizarDashboardProducao);
