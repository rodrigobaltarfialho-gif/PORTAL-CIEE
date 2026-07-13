function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}

function obterKpisPrincipaisPadrao(celula) {
    const celulaNormalizada = normalizarTexto(celula);
    const regrasNormalizadas = {};

    Object.keys(regrasProducao).forEach(nomeCelula => {
        regrasNormalizadas[normalizarTexto(nomeCelula)] = regrasProducao[nomeCelula];
    });

    return regrasNormalizadas[celulaNormalizada] || [];
}

function obterKpisPrincipais(celula) {
    const competencia = window.dadosProducao?.competencia;
    const parametrosKpis = window.dadosProducao?.parametros?.kpisCelula || {};
    const configurados = Object.values(parametrosKpis)
        .filter(parametro => parametro.celula === celula)
        .filter(parametro => parametro.competencia && parametro.competencia !== "geral")
        .filter(parametro => !competencia || parametro.competencia <= competencia)
        .sort((a, b) => b.competencia.localeCompare(a.competencia))[0];

    if (configurados?.kpis?.length) {
        return configurados.kpis;
    }

    return obterKpisPrincipaisPadrao(celula);
}

function obterKpisExtras(celula) {
    const todos = Object.keys(nomesKpis);
    const principais = obterKpisPrincipais(celula);

    return todos.filter(kpi => !principais.includes(kpi));
}

function obterKpisFuncionario(funcionario) {
    const principais = obterKpisPrincipais(funcionario.celula);
    const kpisPrincipais = {};
    const kpisExtras = {};

    Object.keys(nomesKpis).forEach(kpi => {
        const valor = Number(funcionario[kpi] || 0);

        if (principais.includes(kpi)) {
            kpisPrincipais[kpi] = valor;
        } else {
            kpisExtras[kpi] = valor;
        }
    });

    return {
        principais: kpisPrincipais,
        extras: kpisExtras
    };
}
