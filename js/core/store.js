const dadosProducao = {
    competencia: null,
    funcionarios: [],
    metas: {},
    comentarios: {},
    historico: [],
    parametros: {
        metas: {},
        pesos: {},
        kpisCelula: {}
    },
    rankings: {
        geral: [],
        celulas: {},
        extras: []
    },
    dashboard: {
        totalFuncionarios: 0,
        totalPrincipal: 0,
        totalExtra: 0,
        totalCelulas: 0,
        totaisKpis: {}
    }
};

window.dadosProducao = dadosProducao;
