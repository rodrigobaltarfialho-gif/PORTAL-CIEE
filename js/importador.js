let importacaoPendente = null;

function obterPlanilha(workbook) {
    const nomePreferencial = workbook.SheetNames.find(nome => normalizarTexto(nome) === "PLANILHA1");
    const nomeAba = nomePreferencial || workbook.SheetNames[0];

    return {
        nomeAba,
        planilha: workbook.Sheets[nomeAba]
    };
}

function obterCompetenciaProducao() {
    const inputCompetencia = document.getElementById("competenciaProducao");

    if (inputCompetencia?.value) {
        return inputCompetencia.value;
    }

    throw new Error("Informe a competência da importação antes de enviar a planilha.");
}

function validarColunasObrigatorias(linhas) {
    if (!linhas.length) {
        return ["A planilha está vazia."];
    }

    const primeiraLinha = linhas[0];
    const colunasObrigatorias = Object.values(mapaColunas);

    return colunasObrigatorias.filter(coluna => {
        const chaveEsperada = normalizarChaveColuna(coluna);
        return !Object.keys(primeiraLinha)
            .some(chave => normalizarChaveColuna(chave) === chaveEsperada);
    });
}

function celulasSemRegra(dadosPadronizados) {
    return [...new Set(dadosPadronizados.map(linha => linha.celula || "Sem célula"))]
        .filter(celula => !obterKpisPrincipais(celula).length)
        .sort((a, b) => a.localeCompare(b));
}

function kpisReconhecidos(dadosPadronizados) {
    const kpis = new Set();

    dadosPadronizados.forEach(linha => {
        obterKpisPrincipais(linha.celula).forEach(kpi => kpis.add(kpi));
    });

    return [...kpis].sort((a, b) => (nomesKpis[a] || a).localeCompare(nomesKpis[b] || b));
}

function montarResumoValidacao({ competencia, nomeAba, dadosPadronizados, linhasSemEmail }) {
    const container = document.getElementById("preValidacaoImportacao");
    const celulas = [...new Set(dadosPadronizados.map(linha => linha.celula || "Sem célula"))]
        .sort((a, b) => a.localeCompare(b));
    const semRegra = celulasSemRegra(dadosPadronizados);
    const kpis = kpisReconhecidos(dadosPadronizados);
    const alertas = [
        linhasSemEmail ? `${formatarNumero(linhasSemEmail)} linha(s) sem e-mail. Nesses casos o histórico usa o nome como fallback.` : "",
        semRegra.length ? `Células sem regra de atividade: ${semRegra.join(", ")}.` : ""
    ].filter(Boolean);

    if (!container) {
        return;
    }

    container.hidden = false;
    container.innerHTML = `
        <div class="section-heading">
            <div>
                <h2>Pré-validação da importação</h2>
                <p>Confira os dados antes de salvar no Firebase.</p>
            </div>
            <button type="button" onclick="confirmarImportacaoProducao()">Confirmar e salvar</button>
        </div>
        <div class="import-validation-grid">
            <article><span>Competência</span><strong>${escaparHtml(competencia)}</strong></article>
            <article><span>Aba lida</span><strong>${escaparHtml(nomeAba)}</strong></article>
            <article><span>Colaboradores</span><strong>${formatarNumero(dadosPadronizados.length)}</strong></article>
            <article><span>Células</span><strong>${formatarNumero(celulas.length)}</strong></article>
            <article><span>Atividades reconhecidas</span><strong>${formatarNumero(kpis.length)}</strong></article>
            <article><span>Sem e-mail</span><strong>${formatarNumero(linhasSemEmail)}</strong></article>
        </div>
        <div class="import-validation-list">
            <h3>Células encontradas</h3>
            <p>${celulas.map(escaparHtml).join(", ") || "-"}</p>
        </div>
        <div class="import-validation-list">
            <h3>Atividades reconhecidas</h3>
            <p>${kpis.map(kpi => escaparHtml(nomesKpis[kpi] || kpi)).join(", ") || "-"}</p>
        </div>
        ${alertas.length ? `
            <div class="import-validation-alerts">
                <h3>Alertas</h3>
                ${alertas.map(alerta => `<p>${escaparHtml(alerta)}</p>`).join("")}
            </div>
        ` : `<div class="status-message success">Nenhum alerta encontrado na pré-validação.</div>`}
    `;
}

function importarProducao() {
    const input = document.getElementById("arquivoProducao");
    const resultado = document.getElementById("resultadoImportacao");
    const validacao = document.getElementById("preValidacaoImportacao");

    if (!input.files.length) {
        alert("Selecione uma planilha primeiro.");
        return;
    }

    importacaoPendente = null;

    if (validacao) {
        validacao.hidden = true;
        validacao.innerHTML = "";
    }

    const arquivo = input.files[0];
    const leitor = new FileReader();

    resultado.className = "status-message muted";
    resultado.textContent = "Lendo planilha...";

    leitor.onload = function(event) {
        try {
            const dados = new Uint8Array(event.target.result);
            const workbook = XLSX.read(dados, { type: "array" });
            const { nomeAba, planilha } = obterPlanilha(workbook);

            if (!planilha) {
                throw new Error("Nenhuma aba foi encontrada na planilha.");
            }

            const linhas = XLSX.utils.sheet_to_json(planilha, { defval: "" });
            const erros = validarColunasObrigatorias(linhas);

            if (erros.length) {
                throw new Error(`Colunas obrigatórias não encontradas: ${erros.join(", ")}`);
            }

            const dadosPadronizados = padronizarPlanilha(linhas);
            const competencia = obterCompetenciaProducao();
            const linhasSemEmail = dadosPadronizados
                .filter(funcionario => !String(funcionario.email || "").trim())
                .length;

            importacaoPendente = {
                competencia,
                nomeAba,
                dadosPadronizados,
                linhasSemEmail
            };

            montarResumoValidacao(importacaoPendente);

            resultado.className = "status-message success";
            resultado.textContent = "Planilha validada. Confira o resumo antes de confirmar o salvamento.";
        } catch (erro) {
            console.error(erro);
            resultado.className = "status-message error";
            resultado.textContent = erro.message;
        }
    };

    leitor.readAsArrayBuffer(arquivo);
}

async function confirmarImportacaoProducao() {
    const resultado = document.getElementById("resultadoImportacao");

    if (!importacaoPendente) {
        alert("Valide uma planilha antes de salvar.");
        return;
    }

    try {
        const { competencia, nomeAba, dadosPadronizados, linhasSemEmail } = importacaoPendente;
        dadosProducao.competencia = competencia;

        resultado.className = "status-message muted";
        resultado.textContent = "Carregando histórico para calcular metas...";

        if (typeof window.carregarHistoricoProducao === "function") {
            await window.carregarHistoricoProducao(competencia);
        }

        if (typeof window.carregarParametrosProducao === "function") {
            await window.carregarParametrosProducao(competencia);
        }

        processarProducao(dadosPadronizados);
        atualizarDashboardProducao();

        resultado.className = "status-message success";
        resultado.textContent = `Importação concluída pela aba "${nomeAba}". Salvando no Firebase...`;

        if (typeof window.salvarProducaoNoFirebase === "function") {
            await window.salvarProducaoNoFirebase(dadosPadronizados);
            resultado.className = "status-message success";
            resultado.textContent = linhasSemEmail
                ? `Produção salva. Atenção: ${formatarNumero(linhasSemEmail)} linha(s) sem e-mail foram identificadas; nesses casos o histórico usa o nome como fallback.`
                : "Produção salva no Firebase com sucesso.";
        } else {
            resultado.textContent = `Importação concluída pela aba "${nomeAba}". ${formatarNumero(dadosProducao.dashboard.totalFuncionarios)} funcionários processados.`;
        }
    } catch (erro) {
        console.error(erro);
        resultado.className = "status-message error";
        resultado.textContent = erro.message;
    }
}
