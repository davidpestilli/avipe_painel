# Memoria de Criacao e Implementacao do AVIPE Painel

## Objetivo

Criar e evoluir um painel web local, separado do fluxo principal do AVIPE, para visualizar os registros da tabela `avipe_pesquisa_endereco` do banco `avipebd`.

## Linha de arquitetura atual

Na quarta-feira, 12 de agosto de 2026, o projeto passou a operar assim:

- frontend principal: React + Vite + TypeScript + Tailwind 3.3.5
- backend principal: Django servindo APIs e a shell da interface compilada
- legado: frontend Django antigo preservado em `Legado`

## Historico resumido

### Fase 1. Painel Django inicial

Foram entregues:

- criacao do projeto Django isolado em `avipe_painel`
- conexao ao banco `avipebd` reaproveitando o `config.ini` do AVIPE
- suporte a segredos do Azure Key Vault
- suporte adicional a override local via `config.local.ini` ou variavel de ambiente
- dashboard com totais globais e totais locais
- listagem com filtros e paginacao
- detalhe de registro
- atalho `.bat` para subir o painel com menos passos

### Fase 2. Migracao para React

Foi feita a migracao da interface para:

- React
- Vite
- TypeScript
- Tailwind 3.3.5

Mantendo:

- o backend Django
- as APIs existentes
- a logica Python de leitura do banco
- a integracao com o `config.ini` e com o Key Vault

### Fase 3. Remodelagem para maquina nova

Depois da migracao, foi necessario adaptar a montagem do projeto para um computador novo.

Os ajustes principais foram:

- normalizacao de `frontend/package.json` para remover dependencias locais em `Downloads`
- preservacao de `requirements.txt` como fonte unica das dependencias Python
- criacao de `preparar_avipe_painel_nova_maquina.bat`
- reforco do `iniciar_avipe_painel.bat` para exigir `frontend/dist`
- atualizacao da documentacao para o stack novo
- suporte a `config.ini` local para clone standalone do repositorio

## Decisoes de arquitetura

### 1. Backend Django preservado

O Django continuou no centro porque:

- ja continha a logica de acesso ao banco
- ja possuia as APIs uteis para resumo, listagem e detalhe
- ja estava integrado ao `TJSP_AVIPE`
- evita duplicar regra de negocio no frontend

### 2. Frontend React para a interface ativa

A interface principal foi migrada para React para:

- melhorar a fluidez da navegacao
- facilitar futuras expansoes visuais
- alinhar o AVIPE com a estrategia ja adotada na central do NAPE

### 3. Contrato de API preservado

As rotas abaixo foram mantidas:

- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/detalhe/`

Isso foi importante para:

- preservar compatibilidade com a central do NAPE
- reduzir risco de regressao
- permitir migracao do frontend sem reescrever servicos Python

### 4. Legado isolado

O frontend Django antigo foi movido para:

- `Legado/Frontend_Django`

Com isso:

- a aplicacao em uso ficou menos poluida
- a interface antiga continua acessivel em `/legado/`
- a base nova ficou mais clara para manutencao

### 5. Montagem separada por camadas

Para uma maquina nova, a preparacao agora fica dividida assim:

- Python e Django: `requirements.txt`
- React, Vite e Tailwind: `frontend/package.json`
- automacao de bootstrap: `preparar_avipe_painel_nova_maquina.bat`
- configuracao: `config.ini` local ou `../config.ini`

## Estrutura atual

```text
avipe_painel/
|-- frontend/
|-- Legado/
|-- painel_config/
|-- pesquisas/
|-- .venv/
|-- iniciar_avipe_painel.bat
|-- preparar_avipe_painel_nova_maquina.bat
|-- manage.py
|-- requirements.txt
|-- MEMORIA_IMPLEMENTACAO.md
`-- README.md
```

## Componentes principais

### `requirements.txt`

Mantem as dependencias do backend:

- Django
- MySQL connector
- Azure Identity
- Azure Key Vault Secrets

### `frontend/package.json`

Mantem:

- React
- Vite
- TypeScript
- Tailwind 3.3.5
- scripts `npm install`, `npm run build` e `npm run dev`

Tambem deixou de depender de pacotes locais em `Downloads`, o que viabiliza uma instalacao limpa em outra maquina.

### `preparar_avipe_painel_nova_maquina.bat`

Passou a concentrar:

- criacao da `.venv`
- instalacao de dependencias Python
- instalacao das dependencias do frontend
- build React
- migracoes locais do Django

### `iniciar_avipe_painel.bat`

Passou a validar:

- `.venv`
- `..\config.ini`
- existencia de `frontend/dist/index.html`
- `manage.py check`
- migracoes locais, se necessarias

### `pesquisas/services.py`

Mantem:

- leitura do `config.ini`
- resolucao de segredos do Azure Key Vault
- conexao ao MySQL
- metricas globais e locais
- consultas da listagem
- detalhe de registro

### `pesquisas/views.py`

Agora ficou responsavel por:

- `react_app` na raiz
- endpoints JSON
- shell da interface React

### `pesquisas/legacy_views.py`

Passou a concentrar:

- dashboard HTML antigo
- listagem HTML antiga
- detalhe HTML antigo

## Validacoes realizadas em 12 de agosto de 2026

Foram validados com sucesso:

- `npm run build`
- `manage.py check`
- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/pesquisas/`
- abertura da nova interface em `http://127.0.0.1:8000/`
- abertura do legado em `http://127.0.0.1:8000/legado/`

## Integracao com a central do NAPE

Apos a migracao, a integracao com a central do NAPE foi mantida porque:

- a URL principal continuou em `http://127.0.0.1:8000/`
- o health continuou em `http://127.0.0.1:8000/health/`
- o dashboard continuou em `http://127.0.0.1:8000/api/dashboard/`

Isso preserva:

- leitura de status do painel AVIPE
- abertura do painel pela central
- consumo do dashboard pela central

## Observacoes finais

- o projeto agora esta pronto para ser montado em uma maquina nova com o stack atual
- o legado foi preservado, mas saiu do caminho principal
- a logica de banco e de credenciais continua centralizada no Python
