const kpisDesligamentoReposicao = [
    "contratosDesligados",
    "ticketsResolvidos"
];

const kpisGmc = [
    "prorrogacoes",
    "contratosDesligados",
    "ticketsResolvidos"
];

const regrasProducao = {
    "Desligamento": kpisDesligamentoReposicao,
    "Desligamento e Reposição": kpisDesligamentoReposicao,
    "Desligamento Reposição": kpisDesligamentoReposicao,

    "Aprendiz Personalizado": [
        "contratosMarcados",
        "prorrogacoes",
        "contratosDesligados",
        "ticketsResolvidos"
    ],

    "GMC Personalizado": kpisGmc,
    "GMC Privadas": kpisGmc,
    "GMC Privada": kpisGmc,
    "GMC Públicas": kpisGmc,
    "GMC Pública": kpisGmc,
    "GMC Publicas": kpisGmc,
    "GMC Publica": kpisGmc,
    "GMC Expúblicas": kpisGmc,

    "Personalizado Estágio": [
        "contratosMarcados",
        "prorrogacoes",
        "contratosDesligados",
        "ticketsResolvidos"
    ],

    "Regularização de Contrato": [
        "ticketsResolvidos"
    ],

    "Cobrança de Via": [
        "contratosDesligados"
    ],
    "Cobranca de Via": [
        "contratosDesligados"
    ],
    "Cobrança Via": [
        "contratosDesligados"
    ],
    "Cobranca Via": [
        "contratosDesligados"
    ],

    "Postos": [
        "contratosMarcados",
        "prorrogacoes",
        "contratosDesligados",
        "ticketsResolvidos"
    ],

    "Desligamento Aprendiz": kpisDesligamentoReposicao
};

const nomesKpis = {
    contratosMarcados: "Contratos Marcados",
    prorrogacoes: "Prorrogações",
    alteracoes: "Alterações",
    contratosDesligados: "Contratos Desligados",
    ticketsResolvidos: "Tickets Resolvidos",
    satisfacaoPositiva: "Satisfação Positiva",
    satisfacaoNegativa: "Satisfação Negativa",
    sla: "SLA"
};
