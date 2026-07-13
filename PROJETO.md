# Portal CIEE - Modelo de Dados

## Módulo principal: Produção

A produção será organizada por célula, funcionário, mês e KPI.

---

## Coleção: funcionarios

Guarda os dados fixos dos colaboradores.

Campos:

- nome
- email
- celula
- status
- criadoEm
- atualizadoEm

---

## Coleção: producao_mensal

Guarda a produção mensal de cada colaborador.

Campos:

- funcionarioId
- nome
- email
- celula
- mes
- ano
- competencia

KPIs:

- contratosMarcados
- prorrogacoes
- alteracoes
- contratosDesligados
- ticketsResolvidos
- satisfacaoPositiva
- satisfacaoNegativa
- sla

---

## Coleção: regras_metas

Define quais KPIs contam como meta para cada célula.

### Desligamento

KPIs principais:

- contratosDesligados
- ticketsResolvidos

### Aprendiz Personalizado

KPIs principais:

- contratosMarcados
- prorrogacoes
- contratosDesligados
- ticketsResolvidos

### GMC Personalizado

KPIs principais:

- prorrogacoes
- contratosDesligados
- ticketsResolvidos

### GMC Expúblicas

KPIs principais:

- prorrogacoes
- contratosDesligados
- ticketsResolvidos

### Personalizado Estágio

KPIs principais:

- contratosMarcados
- prorrogacoes
- contratosDesligados
- ticketsResolvidos

### Regularização de Contrato

KPIs principais:

- ticketsResolvidos

### Postos

KPIs principais:

- contratosMarcados
- prorrogacoes
- contratosDesligados
- ticketsResolvidos

### Desligamento Aprendiz

KPIs principais:

- contratosDesligados
- ticketsResolvidos

---

## Regra de cálculo da meta

As metas são calculadas separadamente para cada KPI principal da célula.

Não existe uma única meta geral da célula.

A meta será calculada por:

- célula
- KPI
- competência

Fórmula:

Meta do KPI = média dos últimos 5 meses da célula para aquele KPI + 10%

Exemplo:

Célula: Aprendiz Personalizado  
KPI: contratosMarcados  

Média dos últimos 5 meses: 100  
Acréscimo: 10%  
Meta final: 110  

Cada KPI terá:

- média dos últimos 5 meses
- acréscimo de 10%
- meta final
- produção realizada
- percentual de cumprimento

Exemplo de metas separadas:

Aprendiz Personalizado:

- contratosMarcados
- prorrogacoes
- contratosDesligados
- ticketsResolvidos

Cada uma dessas atividades terá sua própria meta.
---

## Rankings

### Ranking da célula

Calculado por volume bruto dentro da própria célula.

### Ranking geral

Calculado por percentual de cumprimento da meta.

### Ranking de produção extra

Calculado com base nas produções que não entram como KPI principal.

## Coleção: calculo_metas

Guarda o cálculo detalhado das metas por competência, célula e KPI.

Campos:

- competencia
- celula
- kpi
- mediaUltimos5Meses
- percentualAcrescimo
- metaFinal
- quantidadeFuncionarios
- dataCalculo

---

## Exemplo de cálculo salvo

Competência: 2026-07  
Célula: Aprendiz Personalizado  
KPI: contratosMarcados  

Média dos últimos 5 meses: 100  
Percentual de acréscimo: 10%  
Meta final: 110  

Fórmula:

Meta final = Média dos últimos 5 meses + 10%

---

# MOTOR DA PRODUÇÃO

O Motor da Produção é responsável por transformar os dados importados da planilha em informações gerenciais para o sistema.

Todo cálculo de metas, rankings, produção extra e indicadores será executado pelo motor antes da exibição nos dashboards.

---

## Fluxo Geral

```text
Planilha Excel

        │

        ▼

Importador

        │

        ▼

Validação dos Dados

        │

        ▼

Firestore

        │

        ▼

Motor da Produção

        │

        ├── Calcular Metas

        ├── Calcular Ranking

        ├── Calcular Produção Extra

        ├── Calcular KPIs

        └── Gerar Indicadores

        │

        ▼

Dashboard
```

---

# ETAPA 1

Receber a planilha importada.

Verificar se todas as colunas obrigatórias existem.

Campos obrigatórios:

- Nome
- Email
- Célula
- Contratos Marcados
- Prorrogações
- Alterações
- Contratos Desligados
- Tickets Resolvidos
- SLA
- Satisfação Positiva
- Satisfação Negativa

Caso exista erro, interromper a importação.

---

# ETAPA 2

Identificar a célula do colaborador.

Exemplo:

Rodrigo

↓

Aprendiz Personalizado

↓

Buscar automaticamente quais KPIs pertencem àquela célula.

O sistema utilizará:

regras-producao.js

para descobrir os KPIs válidos.

---

# ETAPA 3

Salvar os dados no Firestore.

Coleção:

funcionarios

Caso o colaborador não exista:

Criar.

Caso exista:

Atualizar cadastro.

Depois salvar a produção mensal em:

producao_mensal

---

# ETAPA 4

Buscar automaticamente os últimos 5 meses da mesma célula.

Calcular a média de cada KPI.

Exemplo:

Contratos Marcados

95

102

98

105

100

↓

Média

100

---

# ETAPA 5

Aplicar a regra institucional.

Meta

=

Média dos últimos 5 meses

+

10%

Exemplo

100

↓

110

---

# ETAPA 6

Salvar o cálculo.

Coleção

calculo_metas

Campos

competencia

celula

kpi

mediaUltimos5Meses

percentual

metaFinal

dataCalculo

---

# ETAPA 7

Calcular o percentual de desempenho do colaborador.

Exemplo

Meta

110

Produção

121

Resultado

110%

---

# ETAPA 8

Calcular os Rankings.

Ranking da Célula

↓

Volume bruto

dos KPIs principais.

Ranking Geral

↓

Percentual de cumprimento da meta.

Ranking Produção Extra

↓

Produções que não fazem parte dos KPIs principais.

---

# ETAPA 9

Gerar os Dashboards.

Dashboard Geral

Dashboard Produção

Perfil do Funcionário

Metas

Ranking

Produção Extra

Todos os dashboards utilizarão os dados já calculados pelo Motor da Produção.

Nenhum dashboard realizará cálculos diretamente.