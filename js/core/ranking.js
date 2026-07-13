function ordenarRanking(lista, campo) {
    return [...lista].sort((a, b) => Number(b[campo] || 0) - Number(a[campo] || 0));
}

function calcularRankings(funcionarios) {
    const geral = ordenarRanking(funcionarios, "percentualGeral")
        .map((funcionario, indice) => ({
            ...funcionario,
            rankingGeral: indice + 1
        }));

    const extras = ordenarRanking(funcionarios, "totalExtra")
        .map((funcionario, indice) => ({
            ...funcionario,
            rankingExtra: indice + 1
        }));

    const celulas = {};
    const nomesCelulas = [...new Set(funcionarios.map(funcionario => funcionario.celula || "Sem célula"))];

    nomesCelulas.forEach(celula => {
        celulas[celula] = ordenarRanking(
            funcionarios.filter(funcionario => (funcionario.celula || "Sem célula") === celula),
            "totalPrincipal"
        ).map((funcionario, indice) => ({
            ...funcionario,
            rankingCelula: indice + 1
        }));
    });

    return {
        geral,
        extras,
        celulas
    };
}
