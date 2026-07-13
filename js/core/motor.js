function identificarJornada(nome) {
    const nomeNormalizado = normalizarTexto(nome);
    const estagiario = /\(.*ESTAGIARI[AO].*\)/.test(nomeNormalizado);

    return {
        horas: estagiario ? 6 : 8,
        fatorMeta: estagiario ? 0.75 : 1,
        tipo: estagiario ? "Estagiário" : "Colaborador CLT"
    };
}

function chaveFuncionario(funcionario) {
    const email = String(funcionario?.email || "").trim().toLowerCase();

    if (email) {
        return `email:${email}`;
    }

    const nome = String(funcionario?.nome || "Sem nome")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\([^)]*\)/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    return `nome:${nome || "sem-nome"}`;
}

function valorFuncionario(funcionario) {
    return funcionario?.id || chaveFuncionario(funcionario);
}

function processarFuncionario(funcionario) {
    const kpis = obterKpisFuncionario(funcionario);
    const totalPrincipal = somarObjeto(kpis.principais);
    const totalExtra = somarObjeto(kpis.extras);
    const jornada = identificarJornada(funcionario.nome || "");

    return {
        id: chaveFuncionario(funcionario),
        nome: funcionario.nome || "Sem nome",
        email: funcionario.email || "",
        celula: funcionario.celula || "Sem célula",
        jornada,
        principais: kpis.principais,
        extras: kpis.extras,
        metas: {},
        desempenho: {},
        totalPrincipal,
        totalExtra,
        metaTotal: 0,
        percentualGeral: 0,
        rankingCelula: 0,
        rankingGeral: 0,
        rankingExtra: 0
    };
}

function calcularTotaisPorKpi(funcionarios) {
    const totais = {};

    Object.keys(nomesKpis).forEach(kpi => {
        totais[kpi] = funcionarios.reduce((total, funcionario) => {
            return total + Number(funcionario[kpi] || funcionario.principais?.[kpi] || funcionario.extras?.[kpi] || 0);
        }, 0);
    });

    return totais;
}

function aplicarMetasEDesempenho(funcionarios, metasPorCelula) {
    return funcionarios.map(funcionario => {
        const metasFuncionario = {};
        const desempenho = {};
        let metaTotal = 0;

        Object.keys(funcionario.principais).forEach(kpi => {
            const metaCelulaKpi = metasPorCelula[funcionario.celula]?.[kpi];
            const metaIndividual8h = obterMetaIndividual(metaCelulaKpi);
            const metaIndividual = metaIndividual8h * funcionario.jornada.fatorMeta;

            metasFuncionario[kpi] = Math.round(metaIndividual);
            desempenho[kpi] = percentual(funcionario.principais[kpi], metaIndividual);
            metaTotal += metaIndividual;
        });

        return {
            ...funcionario,
            metas: metasFuncionario,
            desempenho,
            metaTotal: Math.round(metaTotal),
            percentualGeral: percentual(funcionario.totalPrincipal, metaTotal)
        };
    });
}

function processarProducao(linhasPadronizadas) {
    const funcionariosProcessados = linhasPadronizadas
        .filter(funcionario => funcionario.nome || funcionario.email)
        .map(processarFuncionario);

    const metas = calcularMetasPorCelula(funcionariosProcessados, dadosProducao.historico, dadosProducao.competencia);
    const funcionariosComMetas = aplicarMetasEDesempenho(funcionariosProcessados, metas);
    const rankings = calcularRankings(funcionariosComMetas);
    const celulas = new Set(funcionariosComMetas.map(funcionario => funcionario.celula));

    dadosProducao.funcionarios = funcionariosComMetas;
    dadosProducao.metas = metas;
    dadosProducao.rankings = rankings;
    dadosProducao.dashboard.totalFuncionarios = funcionariosComMetas.length;
    dadosProducao.dashboard.totalPrincipal = funcionariosComMetas.reduce((total, f) => total + f.totalPrincipal, 0);
    dadosProducao.dashboard.totalExtra = funcionariosComMetas.reduce((total, f) => total + f.totalExtra, 0);
    dadosProducao.dashboard.totalCelulas = celulas.size;
    dadosProducao.dashboard.totaisKpis = calcularTotaisPorKpi(linhasPadronizadas);

    return dadosProducao;
}
