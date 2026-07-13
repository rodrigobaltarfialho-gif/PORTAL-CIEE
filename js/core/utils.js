function somarObjeto(objeto) {
    return Object.values(objeto)
        .reduce((total, valor) => total + Number(valor || 0), 0);
}

function percentual(valor, meta) {
    if (!Number(meta)) {
        return 0;
    }

    return Math.round((Number(valor || 0) / Number(meta)) * 100);
}

function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 0
    });
}
