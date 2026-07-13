(function iniciarMemoriaCalculo() {
    const pesosPadrao = {
        contratosMarcados: 1.4,
        prorrogacoes: 1,
        alteracoes: .7,
        contratosDesligados: 1.3,
        ticketsResolvidos: .9,
        satisfacaoPositiva: 0,
        satisfacaoNegativa: 0,
        sla: 0
    };

    const formulas = [
        {
            titulo: "Meta por KPI",
            formula: "média histórica x (1 + percentual de acréscimo)",
            detalhe: "O percentual padrão é 10%. Pode ser alterado por célula, KPI e competência."
        },
        {
            titulo: "Média histórica",
            formula: "soma das últimas competências anteriores / quantidade de competências encontradas",
            detalhe: "O sistema usa até 5 competências no cálculo da meta; se existirem apenas 2, usa essas 2."
        },
        {
            titulo: "Piso estatístico",
            formula: "mediana individual equivalente a 8h x 70%",
            detalhe: "Impede percentuais absurdos quando uma meta histórica ficou baixa demais."
        },
        {
            titulo: "Meta final da célula",
            formula: "maior valor entre meta calculada e piso estatístico da célula",
            detalhe: "Quando há meta manual, a meta manual prevalece sobre a fórmula."
        },
        {
            titulo: "Meta individual",
            formula: "meta final da célula/KPI / quantidade de pessoas do KPI",
            detalhe: "Depois aplica o fator de jornada: 1,00 para 8h e 0,75 para 6h."
        },
        {
            titulo: "Percentual de cumprimento",
            formula: "produção realizada / meta final x 100",
            detalhe: "Esse percentual alimenta rankings, metas por célula e gráficos de evolução."
        },
        {
            titulo: "Índice de esforço",
            formula: "soma de cada KPI x peso configurado",
            detalhe: "É a base do velocímetro de força de trabalho."
        },
        {
            titulo: "Pressão operacional",
            formula: "índice de esforço atual / limite sustentável x 100",
            detalhe: "O limite sustentável usa a faixa alta da equipe ajustada para jornada de 8h."
        }
    ];

    const componentes = [
        {
            tipo: "Card",
            titulo: "Cards de produção por KPI",
            onde: "Tela Produção, topo do dashboard",
            mede: "Total produzido em cada KPI reconhecido na competência selecionada.",
            conta: "Soma direta do KPI em todas as linhas importadas da competência.",
            leitura: "Serve para enxergar volume bruto por atividade antes da comparação com meta."
        },
        {
            tipo: "Card",
            titulo: "Metas por célula e KPI",
            onde: "Tela Produção, painel de metas",
            mede: "Produção, meta e percentual médio de cada célula por KPI principal.",
            conta: "Percentual = produção realizada da célula / meta final da célula x 100.",
            leitura: "Mostra quais células estão próximas, acima ou distantes da meta esperada."
        },
        {
            tipo: "Tabela",
            titulo: "Ranking geral",
            onde: "Tela Produção, bloco Ranking geral",
            mede: "Ordenação dos colaboradores pelo percentual geral de cumprimento de meta.",
            conta: "Percentual geral = soma da produção principal / soma das metas individuais x 100.",
            leitura: "Compara desempenho proporcional, evitando olhar só o maior volume absoluto."
        },
        {
            tipo: "Tabela",
            titulo: "Destaques por KPI",
            onde: "Tela Produção, abaixo do ranking geral",
            mede: "Melhores percentuais individuais dentro de um KPI da célula.",
            conta: "Percentual do KPI = produção individual no KPI / meta individual daquele KPI x 100.",
            leitura: "Ajuda a identificar especialistas ou picos de performance por atividade."
        },
        {
            tipo: "Gráfico",
            titulo: "Evolução mensal",
            onde: "Tela Produção, bloco de evolução",
            mede: "Variação mensal do percentual de meta atingida por equipe, célula ou colaborador.",
            conta: "Para cada mês: produção processada / meta calculada da competência x 100.",
            leitura: "Quando filtra célula, compara linhas de colaboradores daquela célula. Sem filtro, mostra visão geral."
        },
        {
            tipo: "Gráfico",
            titulo: "Velocímetro de força de trabalho",
            onde: "Tela Produção, bloco Força de trabalho",
            mede: "Pressão operacional da equipe em relação a uma faixa sustentável de esforço.",
            conta: "Pressão = índice de esforço atual / limite sustentável x 100.",
            leitura: "Verde indica baixa pressão, amarelo indica pressão controlada/moderada e vermelho indica alta pressão."
        },
        {
            tipo: "Gráfico",
            titulo: "Pressão por célula",
            onde: "Tela Produção, bloco Força de trabalho",
            mede: "Ocupação ponderada de cada célula em relação ao próprio limite sustentável.",
            conta: "Ocupação da célula = esforço ponderado da célula / limite sustentável da célula x 100.",
            leitura: "Mostra onde a demanda está concentrada e quais células têm menor folga operacional."
        },
        {
            tipo: "Card",
            titulo: "Composição de esforço",
            onde: "Tela Produção, bloco Força de trabalho",
            mede: "Participação de cada KPI no total de pontos de esforço.",
            conta: "Pontos do KPI = quantidade produzida x peso configurado do KPI.",
            leitura: "Evita comparar atividades diferentes como se tivessem o mesmo esforço."
        },
        {
            tipo: "Tabela",
            titulo: "Produção por pessoa e célula",
            onde: "Tela Produção, detalhamento individual",
            mede: "Produção, meta individual, percentual e comentários por colaborador.",
            conta: "Meta individual = meta da célula/KPI dividida pelos colaboradores do KPI, ajustada pela jornada.",
            leitura: "Permite justificar desvios com comentários, férias, apoio em outra demanda ou dedicação parcial."
        },
        {
            tipo: "Mural",
            titulo: "Mural de destaques",
            onde: "Tela Colaboradores",
            mede: "Melhores desempenhos e melhores evoluções entre competências.",
            conta: "Evolução = percentual atual de meta atingida - percentual anterior de meta atingida.",
            leitura: "Mostra reconhecimento por resultado e por melhora de um mês para outro."
        },
        {
            tipo: "Card",
            titulo: "Perfil do colaborador",
            onde: "Tela Colaboradores",
            mede: "Resumo individual: última meta, percentual, melhor mês, tendência e histórico.",
            conta: "Usa os mesmos percentuais mensais calculados pela produção e compara a sequência no tempo.",
            leitura: "Ajuda a diferenciar queda, estabilidade ou evolução do colaborador."
        }
    ];

    function escaparHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function nomeKpi(kpi) {
        return nomesKpis?.[kpi] || kpi;
    }

    function renderizarFormulas() {
        const container = document.getElementById("listaFormulas");

        if (!container) {
            return;
        }

        container.innerHTML = formulas.map(item => `
            <div class="formula-row">
                <span>${escaparHtml(item.titulo)}</span>
                <strong>${escaparHtml(item.formula)}</strong>
                <p>${escaparHtml(item.detalhe)}</p>
            </div>
        `).join("");
    }

    function renderizarKpis() {
        const tabela = document.getElementById("tabelaKpisMemoria");

        if (!tabela) {
            return;
        }

        tabela.innerHTML = Object.entries(regrasProducao)
            .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
            .map(([celula, kpis]) => `
                <tr>
                    <td><strong>${escaparHtml(celula)}</strong></td>
                    <td>${kpis.map(kpi => `<span class="calc-chip">${escaparHtml(nomeKpi(kpi))}</span>`).join("")}</td>
                    <td>Produção principal da célula; demais KPIs entram como produção extra.</td>
                </tr>
            `).join("");
    }

    function renderizarPesos() {
        const tabela = document.getElementById("tabelaPesosMemoria");

        if (!tabela) {
            return;
        }

        tabela.innerHTML = Object.keys(nomesKpis).map(kpi => {
            const peso = Number(pesosPadrao[kpi] ?? 1);
            return `
                <tr>
                    <td><strong>${escaparHtml(nomeKpi(kpi))}</strong></td>
                    <td>${String(peso).replace(".", ",")}</td>
                    <td>Quantidade produzida x ${String(peso).replace(".", ",")} ponto(s)</td>
                </tr>
            `;
        }).join("");
    }

    function renderizarComponentes() {
        const container = document.getElementById("memoriaComponentes");

        if (!container) {
            return;
        }

        container.innerHTML = componentes.map(item => `
            <article class="component-memory-card">
                <header>
                    <span>${escaparHtml(item.tipo)}</span>
                    <h3>${escaparHtml(item.titulo)}</h3>
                </header>
                <dl>
                    <div>
                        <dt>Onde aparece</dt>
                        <dd>${escaparHtml(item.onde)}</dd>
                    </div>
                    <div>
                        <dt>O que mede</dt>
                        <dd>${escaparHtml(item.mede)}</dd>
                    </div>
                    <div>
                        <dt>Conta usada</dt>
                        <dd>${escaparHtml(item.conta)}</dd>
                    </div>
                    <div>
                        <dt>Como interpretar</dt>
                        <dd>${escaparHtml(item.leitura)}</dd>
                    </div>
                </dl>
            </article>
        `).join("");
    }

    renderizarFormulas();
    renderizarKpis();
    renderizarPesos();
    renderizarComponentes();
})();
