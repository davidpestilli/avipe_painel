# Memoria de Criacao e Implementacao do Watcher AVIPE

## Objetivo

Criar e evoluir um painel web local, separado do fluxo principal do AVIPE, para:

- consultar os registros da tabela `avipe_pesquisa_endereco`
- monitorar o servico por indicadores e graficos operacionais
- oferecer uma interface moderna e unica para Home, Pesquisa, Detalhe e Configuracoes

## Arquitetura atual

Em 21 de agosto de 2026, o projeto opera assim:

- backend principal: Django
- frontend principal: React + Vite + TypeScript + Tailwind
- camada de graficos: Recharts
- interface ativa unica servida pelo backend Django
- suporte a selecao de ambiente `app`, `hml` e `prd`

## Evolucao resumida

### Fase 1. Painel Django inicial

Foram entregues:

- criacao do projeto Django isolado em `avipe_painel`
- conexao ao banco `avipebd`
- uso de `config.ini` proprio na raiz do projeto
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
- consolidacao do `config.ini` local para clone standalone

### Fase 3.1. Instalacao assistida, logging e suporte a rede interna

Nesta extensao da preparacao para maquina nova foram entregues:

- log com timestamp em `logs\` para cada execucao de `preparar_avipe_painel_nova_maquina.bat`
- captura da saida tecnica das etapas de versao, `pip`, `npm`, build e migracoes
- mensagens de apoio para falhas tipicas de rede interna:
  - proxy
  - DNS
  - certificado
  - bloqueio de download
  - indisponibilidade de repositorio externo
- copia automatica de `config.ini.example` para `config.ini` quando o arquivo nao existe
- orientacao explicita ao usuario sobre os dados minimos exigidos em `config.ini`
- validacao basica da presenca das variaveis `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_CLIENT_SECRET` quando houver `kv:` no `config.ini`
- criacao do arquivo `PROMPT_INSTALACAO_AGENTE_IA.md` para guiar um agente de IA durante a instalacao e o diagnostico

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

### Fase 7. Refinamentos operacionais da observabilidade e da interface

Nesta fase foram entregues:

- cabecalho unificado `WATCHER AVIPE` com gradiente animado no shell React
- estabilizacao do grafico `Entrada x Processamento` na Home apos refresh forte:
  - protecao contra condicao de corrida entre multiplas cargas de `GET /api/observabilidade/`
  - aplicacao do ultimo payload valido apenas para a requisicao mais recente
  - manutencao do grafico montado durante `loadingHome`, com overlay visual em vez de desmontagem
- tooltip do grafico `Entrada x Processamento` na visualizacao `Barras` + `Processamento` com:
  - deficit `(-x)` por orgao e bucket
  - sanamento `(+n data)` calculado registro a registro no backend
  - campo `sanamento_por_orgao` em cada ponto da `evolucao`
- destaque automatico de orgaos com diferenca entre processado e juntado no grafico `Processamento x Juntada por Unidade`:
  - chips vermelhos na grade `Orgaos Destacados`
  - prioridade no seletor `Selecionar orgaos`
  - selecao automatica conforme regra de exibicao da grade

### Fase 8. Suporte a multiplos ambientes

Nesta fase foram entregues:

- nova aba `Configuracoes` na navbar principal
- seletor de ambiente com persistencia local no navegador
- suporte de backend para alternancia entre `app`, `hml` e `prd`
- propagacao do ambiente ativo para:
  - `GET /api/dashboard/`
  - `GET /api/configuracoes/`
  - `GET /api/observabilidade/`
  - `GET /api/pesquisas/`
  - `GET /api/pesquisas/detalhe/`
- suporte a secoes dedicadas de configuracao:
  - `[mysql_avipe]` e `[azure]`
  - `[mysql_avipe_hml]` e `[azure_hml]`
  - `[mysql_avipe_prd]` e `[azure_prd]`
- suporte a overrides de senha por ambiente:
  - `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`
  - `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD_HML`
  - `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD_PRD`
- identificacao dos Key Vaults:
  - `nape-hml-kv`
  - `nape-prd-kv`
- identificacao dos hosts MySQL:
  - `nape-hml-mysql-flex.mysql.database.azure.com`
  - `nape-prd-mysql-flex.mysql.database.azure.com`
- identificacao da entidade de servico Azure usada pelo painel:
  - `app-nape-hml`
- validacao de que `hml` e `prd` dependem de permissao RBAC da entidade de servico para leitura de segredos nos respectivos Key Vaults

### Fase 8.1. TLS local e isolamento seguro de certificado

Nesta extensao de infraestrutura foram entregues:

- suporte no backend a parametros opcionais de TLS por ambiente:
  - `ssl_ca`
  - `ssl_cert`
  - `ssl_key`
  - `ssl_verify_cert`
  - `ssl_verify_identity`
- compatibilidade com conexao local direta ao MySQL de `hml` e `prd`, sem necessidade de commitar credenciais
- convencao de armazenamento do certificado em pasta local ignorada pelo Git:
  - `.secrets/`
- preparacao do projeto para distribuicao a outros colegas por `git pull`, mantendo apenas configuracoes sensiveis fora do repositorio

### Fase 8.2. Exportacao de pesquisa para Excel

Nesta extensao da aba `Pesquisa` foram entregues:

- novo botao de exportacao ao lado de `Filtrar`
- suporte a exportacao conforme o modo visual ativo:
  - `Processos`: ate `1000 processos`
  - `Registros`: ate `1000 registros`
- reaproveitamento integral dos filtros ativos da tela na geracao da planilha
- fallback sem filtros para exportacao em ordem do mais recente para o mais antigo
- nova rota de backend:
  - `GET /api/pesquisas/exportar/?modo=<agrupada|linhas>`
- geracao de `.xlsx` no backend com `openpyxl`
- gravacao da coluna `Processo` como texto para evitar notacao cientifica no Excel
- aplicacao de formatacao basica da planilha:
  - cabecalho destacado
  - primeira linha congelada
  - autofiltro
  - largura automatica das colunas
- protecao de inicializacao do Django quando `openpyxl` nao estiver instalado:
  - a importacao da biblioteca ocorre apenas no fluxo de exportacao
  - a ausencia da dependencia nao derruba mais a subida do painel

### Fase 8.3. Ocultacao compartilhada do orgao de teste SUPORTE

Nesta extensao da aba `Configuracoes` foram entregues:

- toggle para exibir ou ocultar o orgao `SUPORTE` em todo o frontend
- preferencia compartilhada entre todos os usuarios do mesmo servidor
- persistencia em `painel_preferences.json` na raiz do projeto
- padrao desativado quando o arquivo ainda nao existe
- arquivo de exemplo versionado:
  - `painel_preferences.json.example`
- nova rota de backend:
  - `POST /api/configuracoes/orgao-suporte/`
- campo adicional em:
  - `GET /api/configuracoes/`
- exclusao centralizada do orgao `SUPORTE` no backend quando a preferencia estiver desativada:
  - metricas globais e locais
  - observabilidade e totais por orgao
  - filtros e listagem de pesquisa
  - exportacao Excel
  - detalhe por registro
  - ultimos registros do dashboard
- limpeza automatica de filtro `sig_orgao=SUPORTE` na URL e nas consultas quando o orgao estiver oculto
- modulo dedicado:
  - `pesquisas/preferences.py`
- helpers de exclusao em:
  - `pesquisas/services.py`
  - `pesquisas/analytics.py`
- toggle na interface em:
  - `frontend/src/components/SettingsPage.tsx`

### Fase 8.4. Reconstrucao automatica do frontend no inicializador

Nesta extensao operacional foram entregues:

- deteccao de build React desatualizado no `iniciar_avipe_painel.bat`
- comparacao entre `frontend/dist` e os arquivos-fonte do frontend apos atualizacoes do repositorio
- reconstrucao automatica com `npm run build` quando houver divergencia
- interrupcao da inicializacao com mensagem orientativa se a reconstrucao falhar
- reducao do risco de subir o painel com frontend antigo apos `git pull`

## Decisoes de arquitetura

### 1. Backend Django preservado

O Django continuou central porque:

- ja possuia a logica de acesso ao banco
- ja servia bem o fluxo de APIs
- evita duplicacao de regra de negocio no frontend
- continua adequado ao uso local

### 2. Frontend React como interface ativa

O React passou a concentrar:

- navegacao entre Home, Pesquisa, Detalhe e Configuracoes
- estado visual da observabilidade
- alternancia de modo `linhas` e `barras`
- alternancia de leitura por `registros` e `processos`
- filtros e navegacao de consulta
- selecao do ambiente ativo consumido pelas APIs
- toggle compartilhado de exibicao do orgao `SUPORTE`

### 3. Contrato de API preservado e ampliado

Foram mantidas:

- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/detalhe/`

Foram adicionadas:

- `GET /api/observabilidade/`
- `GET /api/configuracoes/`
- `POST /api/configuracoes/orgao-suporte/`
- `GET /api/pesquisas/exportar/`

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

### Sanamento de deficit no fluxo entrada x processamento

Para cada bucket de entrada e orgao, o backend classifica cada registro com inclusao no periodo:

- processado no mesmo bucket da entrada: nao compoe deficit
- processado em bucket posterior: compoe recuperacao `(+n data)`
- nao processado: permanece no deficit residual `(-x)`

Para leitura por processos, a mesma logica usa `nuprocesso` como chave distinta.

O frontend consome `sanamento_por_orgao` no tooltip do grafico de barras em modo `Processamento`.

### Destaque de orgaos com diferenca processado x juntado

No grafico `Processamento x Juntada por Unidade`, orgaos com `processado != juntado` recebem:

- inclusao automatica na grade de orgaos destacados
- chip vermelho
- ordenacao por maior diferenca absoluta
- regra de preenchimento da grade:
  - exibir todos os orgaos com diferenca
  - completar ate 3 unidades visiveis com orgaos sem diferenca quando houver 0, 1 ou 2 orgaos com diferenca

A logica compartilhada vive em `frontend/src/components/homeDashboardShared.tsx` (`computeHighlightedOrgans`, `getOrgaoProcessamentoJuntadaGap`, `orderOrgansForHighlight`).

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
|-- PROMPT_INSTALACAO_AGENTE_IA.md
|-- preparar_avipe_painel_nova_maquina.bat
|-- painel_preferences.json.example
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
- OpenPyXL

### `frontend/package.json`

Mantem o stack da interface:

- React
- Recharts
- Vite
- TypeScript
- Tailwind

### `preparar_avipe_painel_nova_maquina.bat`

Hoje concentra:

- verificacao de `python`, `node` e `npm`
- criacao de `.venv`
- instalacao de dependencias Python
- instalacao de dependencias do frontend
- build do frontend
- migracoes do Django
- `manage.py check`
- escrita de log detalhado em `logs\`
- orientacao operacional sobre `config.ini`
- alerta sobre dependencia de Azure Key Vault

### `iniciar_avipe_painel.bat`

Hoje concentra:

- verificacao de `.venv`
- verificacao de `config.ini`
- validacao da existencia de `frontend/dist`
- deteccao de frontend desatualizado por timestamp
- reconstrucao automatica do build React quando necessario
- `manage.py check`
- subida do servidor Django

### `PROMPT_INSTALACAO_AGENTE_IA.md`

Concentra:

- roteiro completo para um agente de IA executar a instalacao
- formato padronizado de acompanhamento por etapa
- classificacao de falhas de rede e dependencias
- checklist final de prontidao
- relatorio final tecnico e executivo

### `pesquisas/preferences.py`

Concentra:

- leitura e gravacao de preferencias compartilhadas do painel
- estado padrao de exibicao do orgao `SUPORTE`
- persistencia em `painel_preferences.json`

### `pesquisas/analytics.py`

Concentra:

- agregacoes por orgao
- agregacoes por bucket temporal
- contagem por registros
- contagem por processos distintos
- consolidacao de processados e juntados
- sanamento registro a registro de deficit entre entrada e processamento

### `frontend/src/components/AppShell.tsx`

Concentra:

- cabecalho compacto sticky
- titulo unificado `WATCHER AVIPE`
- overlay de carregamento

### `frontend/src/components/homeDashboardShared.tsx`

Concentra:

- tipos compartilhados da Home
- constantes de periodo
- infraestrutura visual reutilizada
- regras de destaque de orgaos com diferenca processado x juntado
- helpers de sanamento e ordenacao de orgaos

### `pesquisas/views.py`

Ficou responsavel por:

- shell React na raiz e em `/home/`
- endpoints JSON
- entrega da Home, da Pesquisa e de `Configuracoes`
- geracao do arquivo Excel da aba `Pesquisa`

### `frontend/src/App.tsx`

Concentra:

- layout principal
- estados dos filtros e modos de graficos
- navegacao entre Home, Pesquisa, Detalhe e Configuracoes
- ligacao entre dados e componentes principais
- persistencia e troca do ambiente ativo
- disparo do download da exportacao de pesquisa

### `frontend/src/components/SearchPage.tsx`

Concentra:

- filtros operacionais da aba `Pesquisa`
- alternancia entre `Processos` e `Registros`
- acao visual de exportacao para Excel

### `frontend/src/components/SettingsPage.tsx`

Concentra:

- seletor do ambiente ativo
- resumo dos ambientes disponiveis
- exibicao do host, da base e do Key Vault do ambiente selecionado
- toggle compartilhado para exibir ou ocultar o orgao `SUPORTE`

### `frontend/src/components/HomeDashboard.tsx`

Hoje atua como orquestrador da Home.

### `frontend/src/components/HomeDashboardHeader.tsx`

Concentra:

- KPIs
- painel local expansivel
- navbar interna dos graficos
- picker de periodo
- resumo e badge do grafico ativo
- overlay de atualizacao da observabilidade sem desmontar o grafico em tela

### `frontend/src/App.tsx`

Concentra:

- bootstrap inicial da aplicacao React
- sincronizacao com rotas `Home`, `Pesquisa`, `Detalhe` e `Configuracoes`
- cargas de dashboard, observabilidade, lista e detalhe
- protecao contra resposta atrasada em cargas concorrentes de observabilidade

### `frontend/src/components/homeDashboardCharts.tsx`

Concentra:

- grafico de inclusoes por unidade
- grafico de entrada x processamento
- grafico de processamento x juntada
- seletor de orgaos

## Validacoes realizadas ate 31 de agosto de 2026

Foram validados com sucesso:

- `npm run build`
- `python manage.py check`
- `python manage.py test pesquisas.tests`
- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/configuracoes/?ambiente=app`
- `POST /api/configuracoes/orgao-suporte/`
- `GET /api/observabilidade/`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/exportar/`
- abertura da Home em `http://127.0.0.1:8000/home/`
- abertura da Pesquisa
- abertura da aba `Configuracoes`
- toggle compartilhado de exibicao do orgao `SUPORTE`
- tooltip de sanamento no grafico Entrada x Processamento
- tooltip do grafico de linhas Entrada x Processamento com lista colorida de unidades por horario
- destaque de orgaos com diferenca processado x juntado
- geracao de planilha Excel por `Processos`
- validacao de subida do Django sem importacao antecipada de `openpyxl`
- execucao de `iniciar_avipe_painel.bat` com deteccao de build React atualizado

Tambem foi validado:

- descoberta dos Key Vaults `nape-hml-kv` e `nape-prd-kv`
- descoberta dos hosts MySQL de `hml` e `prd` por meio do segredo `db-connection-string`
- resposta correta do ambiente `app`
- bloqueio de `hml` e `prd` por falta de permissao da entidade de servico no Key Vault
- geracao do prompt `PROMPT_INSTALACAO_AGENTE_IA.md` para instalacao assistida
- inicializacao do novo fluxo de log do instalador em `logs\`

## Observacoes finais

- o projeto esta pronto para instalacao limpa em maquina nova
- a instalacao em maquina do tribunal passa a ter trilha de log e roteiro para agente de IA
- a consulta operacional e a observabilidade coexistem na mesma interface
- a logica de banco e de credenciais segue centralizada no backend Python
- a manutencao agora esta mais concentrada em componentes menores e mais legiveis
