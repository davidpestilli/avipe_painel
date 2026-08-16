# Memoria de Criacao e Implementacao do Watcher AVIPE

## Objetivo

Criar e evoluir um painel web local, separado do fluxo principal do AVIPE, para:

- consultar os registros da tabela `avipe_pesquisa_endereco`
- monitorar o servico por indicadores e graficos operacionais
- oferecer uma interface moderna e unica para Home, Pesquisa e Detalhe

## Arquitetura atual

Em sabado, 15 de agosto de 2026, o projeto opera assim:

- backend principal: Django
- frontend principal: React + Vite + TypeScript + Tailwind
- camada de graficos: Recharts
- interface ativa unica servida pelo backend Django

## Evolucao resumida

### Fase 1. Painel Django inicial

Foram entregues:

- criacao do projeto Django isolado em `avipe_painel`
- conexao ao banco `avipebd`
- reaproveitamento do `config.ini` do AVIPE
- suporte a segredos no Azure Key Vault
- suporte adicional a `config.local.ini` e variavel de ambiente
- dashboard inicial com totais globais e totais locais
- listagem com filtros e paginacao
- detalhe por registro
- atalho `.bat` para subir o painel

### Fase 2. Migracao para React

A interface principal foi migrada para:

- React
- Vite
- TypeScript
- Tailwind

Mantendo:

- backend Django
- APIs existentes
- logica Python de leitura do banco
- integracao com `config.ini` e Key Vault

### Fase 3. Preparacao para maquina nova

Os ajustes principais foram:

- normalizacao de `frontend/package.json`
- eliminacao de dependencias locais em `Downloads`
- preservacao de `requirements.txt` como fonte das dependencias Python
- criacao de `preparar_avipe_painel_nova_maquina.bat`
- reforco do `iniciar_avipe_painel.bat`
- suporte a `config.ini` local para clone standalone

### Fase 4. Transformacao do painel em Watcher AVIPE

Nesta fase, o painel deixou de ser apenas uma tela de consulta e passou a ter:

- navbar entre `Home` e `Pesquisa`
- Home dedicada a KPIs e observabilidade
- painel local de maquina e usuario expansivel
- retirada do bloco de ultimos registros da Home
- reorganizacao visual da interface para o padrao escuro atual
- titulo do sistema alterado para `Watcher AVIPE`

### Fase 5. Observabilidade operacional

Foi criada uma nova camada analitica em `pesquisas/analytics.py` para alimentar:

- envios ao localizador por orgao
- inclusao no localizador x processamento
- processados e juntados por orgao

Tambem foi criada a API:

- `GET /api/observabilidade/?periodo=<recorte>`

### Fase 6. Saneamento tecnico e refatoracao

Nesta fase mais recente foram feitos:

- limpeza de caracteres estranhos em multiplos componentes do frontend
- reorganizacao da aba `Pesquisa`
- separacao de componentes de tabela, filtros e detalhe
- extracao da infraestrutura compartilhada da Home para modulos dedicados
- extracao dos graficos da Home para arquivos proprios
- extracao do cabecalho e resumo da Home para componente especifico
- retirada do legado Django do fluxo ativo de rotas e configuracao

## Decisoes de arquitetura

### 1. Backend Django preservado

O Django continuou central porque:

- ja possuia a logica de acesso ao banco
- ja servia bem o fluxo de APIs
- evita duplicacao de regra de negocio no frontend
- continua adequado ao uso local

### 2. Frontend React como interface ativa

O React passou a concentrar:

- navegacao entre Home, Pesquisa e Detalhe
- estado visual da observabilidade
- alternancia de modo `linhas` e `barras`
- alternancia de leitura por `registros` e `processos`
- filtros e navegacao de consulta

### 3. Contrato de API preservado e ampliado

Foram mantidas:

- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/detalhe/`

Foi adicionada:

- `GET /api/observabilidade/`

### 4. Legado removido do fluxo ativo

O frontend Django antigo deixou de participar das rotas e da configuracao ativa do sistema.

Com isso:

- a manutencao ficou concentrada em uma unica interface
- o Django passou a servir apenas o shell React e as APIs
- o risco de divergencia funcional entre interfaces foi reduzido

## Observabilidade e recortes de tempo

### Modos de leitura

Os graficos da Home suportam:

- `registros`: quantidade de CPFs pesquisados
- `processos`: quantidade distinta de processos

### Camadas de status

Na aba de processamento e juntada, o sistema suporta:

- `Sobrepostos`
- `So processados`
- `So juntados`

### Recortes moveis

Os recortes `24h`, `48h` e `72h` usam janela movel real:

- ponto final = hora atual da consulta
- ponto inicial = 24h, 48h ou 72h para tras

Granularidade adotada:

- `24h`: buckets de 2 em 2 horas
- `48h`: buckets de 8 em 8 horas
- `72h`: buckets de 18 em 18 horas

### Rotulagem dos buckets

Para evitar ambiguidade:

- `Hoje` e `24h`: foco em hora
- `48h` e `72h`: foco em `dia + hora`
- `Semana`, `7 dias`, `Mes` e `30 dias`: foco em data

### Virada de dia

Os graficos de linha ate `7 dias` marcam viradas de dia quando ha mudanca real de data entre buckets consecutivos.

## Estrutura atual

```text
avipe_painel/
|-- docs/
|-- frontend/
|-- painel_config/
|-- pesquisas/
|-- static/
|-- templates/
|-- iniciar_avipe_painel.bat
|-- preparar_avipe_painel_nova_maquina.bat
|-- manage.py
|-- requirements.txt
|-- MEMORIA_IMPLEMENTACAO.md
`-- README.md
```

## Componentes principais

### `requirements.txt`

Mantem as dependencias Python do backend:

- Django
- MySQL connector
- Azure Identity
- Azure Key Vault Secrets

### `frontend/package.json`

Mantem o stack da interface:

- React
- Recharts
- Vite
- TypeScript
- Tailwind

### `pesquisas/analytics.py`

Concentra:

- agregacoes por orgao
- agregacoes por bucket temporal
- contagem por registros
- contagem por processos distintos
- consolidacao de processados e juntados

### `pesquisas/views.py`

Ficou responsavel por:

- shell React na raiz e em `/home/`
- endpoints JSON
- entrega da Home e da Pesquisa

### `frontend/src/App.tsx`

Concentra:

- layout principal
- estados dos filtros e modos de graficos
- navegacao entre Home, Pesquisa e Detalhe
- ligacao entre dados e componentes principais

### `frontend/src/components/HomeDashboard.tsx`

Hoje atua como orquestrador da Home.

### `frontend/src/components/HomeDashboardHeader.tsx`

Concentra:

- KPIs
- painel local expansivel
- navbar interna dos graficos
- picker de periodo
- resumo e badge do grafico ativo

### `frontend/src/components/homeDashboardCharts.tsx`

Concentra:

- grafico de inclusoes por unidade
- grafico de entrada x processamento
- grafico de processamento x juntada
- seletor de orgaos

### `frontend/src/components/homeDashboardShared.tsx`

Concentra:

- tipos compartilhados da Home
- constantes de periodo
- infraestrutura visual reutilizada

## Validacoes realizadas em 15 de agosto de 2026

Foram validados com sucesso:

- `npm run build`
- `python manage.py check`
- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/observabilidade/`
- `GET /api/pesquisas/`
- abertura da Home em `http://127.0.0.1:8000/home/`
- abertura da Pesquisa

## Observacoes finais

- o projeto esta pronto para instalacao limpa em maquina nova
- a consulta operacional e a observabilidade coexistem na mesma interface
- a logica de banco e de credenciais segue centralizada no backend Python
- a manutencao agora esta mais concentrada em componentes menores e mais legiveis
