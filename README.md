# Portal CEL

Portal web estático para gestão dos módulos CEL/CIEE.

## Módulos

- Dashboard Geral: entrada do portal e atalhos principais.
- Sazonalidade: dashboard já estruturado com filtros, gráficos e sincronização.
- Produção: importação de planilha, KPIs principais/extras, metas por célula e rankings.
- Desligamentos: página reservada para a próxima etapa.

## Produção

A tela de Produção calcula:

- total de funcionários;
- produção principal;
- produção extra;
- células ativas;
- metas por célula e KPI;
- ranking geral por percentual de meta;
- ranking de produção extra.

A regra de meta usa a média dos últimos 5 meses salvos da célula para cada KPI + 10%. Enquanto não houver histórico suficiente, a tela usa a competência importada como prévia.

## Firebase Produção

Coleções usadas:

- `producao/atual`: aponta para a última competência publicada.
- `producao_competencias/{competencia}`: metadados da competência.
- `producao_competencias/{competencia}/chunks`: linhas da planilha divididas em blocos.
- `calculo_metas`: cálculo salvo por competência, célula e KPI.

## Publicação no GitHub

O projeto pode ser publicado como site estático no GitHub Pages.

Antes de publicar para uso geral, revise as regras do Firestore. O arquivo `firestore.rules` deixa leitura pública e escrita bloqueada, que é mais seguro para publicação. Para permitir importação pelo portal publicado, será necessário adicionar autenticação ou liberar escrita temporariamente apenas durante carga controlada.
