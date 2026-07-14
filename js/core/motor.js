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

function obterAvaliacaoMetaFuncionario(funcionarioId) {
    const dados = dadosProducao.avaliacoesMeta?.[funcionarioId] || {};
    const semanasInformadas = Number(dados.semanasAtivas);
    const semanasAtivas = Number.isFinite(semanasInformadas)
        ? Math.max(0, Math.min(4, semanasInformadas))
        : 4;

    return {
        semanasAtivas,
        fatorMeta: semanasAtivas / 4,
        motivo: dados.motivo || "",
        observacao: dados.observacao || "",
        avaliado: semanasAtivas > 0
    };
}

function processarFuncionario(funcionario, opcoes = {}) {
    const kpis = obterKpisFuncionario(funcionario);
    const totalPrincipal = somarObjeto(kpis.principais);
    const totalExtra = somarObjeto(kpis.extras);
    const jornada = identificarJornada(funcionario.nome || "");
    const id = chaveFuncionario(funcionario);
    const avaliacaoMeta = opcoes.ignorarAvaliacaoMeta
        ? { semanasAtivas: 4, fatorMeta: 1, motivo: "", observacao: "", avaliado: true }
        : obterAvaliacaoMetaFuncionario(id);

    return {
        id,
        nome: funcionario.nome || "Sem nome",
        email: funcionario.email || "",
        celula: funcionario.celula || "Sem célula",
        jornada,
        avaliacaoMeta,
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
        const fatorParticipacao = Number(funcionario.avaliacaoMeta?.fatorMeta ?? 1);

        Object.keys(funcionario.principais).forEach(kpi => {
            const metaCelulaKpi = metasPorCelula[funcionario.celula]?.[kpi];
            const metaIndividual8h = obterMetaIndividual(metaCelulaKpi);
            const metaIndividual = metaIndividual8h * funcionario.jornada.fatorMeta * fatorParticipacao;

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
    dadosProducao.linhasOriginais = linhasPadronizadas;

    const funcionariosProcessados = linhasPadronizadas
        .filter(funcionario => funcionario.nome || funcionario.email)
        .map(processarFuncionario);

    const funcionariosAvaliaveis = funcionariosProcessados.filter(funcionario => funcionario.avaliacaoMeta?.avaliado !== false);
    const metas = calcularMetasPorCelula(funcionariosAvaliaveis, dadosProducao.historico, dadosProducao.competencia);
    const funcionariosComMetas = aplicarMetasEDesempenho(funcionariosProcessados, metas);
    const funcionariosAvaliados = funcionariosComMetas.filter(funcionario => funcionario.avaliacaoMeta?.avaliado !== false);
    const rankings = calcularRankings(funcionariosAvaliados);
    const celulas = new Set(funcionariosAvaliados.map(funcionario => funcionario.celula));

    dadosProducao.funcionarios = funcionariosComMetas;
    dadosProducao.metas = metas;
    dadosProducao.rankings = rankings;
    dadosProducao.dashboard.totalFuncionarios = funcionariosAvaliados.length;
    dadosProducao.dashboard.totalPrincipal = funcionariosAvaliados.reduce((total, f) => total + f.totalPrincipal, 0);
    dadosProducao.dashboard.totalExtra = funcionariosAvaliados.reduce((total, f) => total + f.totalExtra, 0);
    dadosProducao.dashboard.totalCelulas = celulas.size;
    dadosProducao.dashboard.totaisKpis = calcularTotaisPorKpi(funcionariosAvaliados);

    return dadosProducao;
}
