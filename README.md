# Watcher AVIPE

Painel web local para monitoramento operacional e consulta da base `avipebd` usada pelo AVIPE.

Em 15 de agosto de 2026, o sistema opera com este stack:

- backend: Django
- frontend: React + Vite + TypeScript + Tailwind
- graficos: Recharts
- interface ativa unica: React sobre backend Django

## O que o sistema entrega hoje

- navegacao por navbar entre `Home` e `Pesquisa`
- Home com KPIs globais e painel expansivel da maquina e do usuario local
- observabilidade do servico por periodo
- leitura por `registros` ou por `processos`
- graficos em `linhas` ou `barras`
- analises de:
  - envios ao localizador por orgao
  - inclusao no localizador x processamento
  - processados e juntados por orgao
- filtros operacionais por processo, CPF, orgao, usuario, data, processado e juntado
- consulta paginada da tabela `avipe_pesquisa_endereco`
- detalhe completo por registro

## Recortes de tempo da observabilidade

O Watcher AVIPE suporta estes recortes:

- `Hoje`
- `24h`
- `48h`
- `72h`
- `Semana`
- `7 dias`
- `Mes`
- `30 dias`
- `Todo periodo`

### Regras dos recortes moveis

Os recortes `24h`, `48h` e `72h` sao ancorados no momento atual da consulta.

- `24h`: ponto final = hora atual; ponto inicial = 24 horas corridas para tras; buckets de 2 em 2 horas
- `48h`: ponto final = hora atual; ponto inicial = 48 horas corridas para tras; buckets de 8 em 8 horas
- `72h`: ponto final = hora atual; ponto inicial = 72 horas corridas para tras; buckets de 18 em 18 horas

Nos graficos de linha ate `7 dias`, o sistema marca a virada de dia quando ha mudanca real de data entre buckets consecutivos.

## Estrutura atual

```text
avipe_painel/
|-- docs/
|-- frontend/
|-- painel_config/
|-- pesquisas/
|-- static/
|-- templates/
|-- config.ini.example
|-- config.local.ini.example
|-- iniciar_avipe_painel.bat
|-- preparar_avipe_painel_nova_maquina.bat
|-- manage.py
|-- MEMORIA_IMPLEMENTACAO.md
|-- requirements.txt
`-- README.md
```

## Rotas principais

- interface principal: `http://127.0.0.1:8000/`
- interface principal alternativa: `http://127.0.0.1:8000/home/`
- pesquisa: `http://127.0.0.1:8000/pesquisas/`
- detalhe: `http://127.0.0.1:8000/pesquisas/detalhe/?id=<id>`

## APIs disponiveis

- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/observabilidade/?periodo=<recorte>`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/detalhe/?id=<id>`

## Requisitos para instalacao local

- Windows
- Python disponivel no `PATH`
- Node.js disponivel no `PATH`
- acesso ao banco `avipebd`
- uma das opcoes de credencial abaixo:
  - `config.ini` com senha literal
  - `config.local.ini`
  - Azure Key Vault
  - variavel `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

## Dependencias

### Backend Python

As dependencias Python estao em `requirements.txt`:

- `django`
- `mysql-connector-python`
- `azure-identity`
- `azure-keyvault-secrets`

### Frontend

As dependencias do frontend estao em `frontend/package.json`.

Pacotes principais:

- `react`
- `react-dom`
- `recharts`
- `vite`
- `typescript`
- `tailwindcss`

## Instalacao a partir do GitHub

### 1. Clonar o repositorio

```powershell
git clone https://github.com/davidpestilli/avipe_paniel.git
cd avipe_paniel
```

Se preferir, renomeie a pasta local para `avipe_painel`.

### 2. Configurar o acesso ao banco

O painel procura configuracao nesta ordem:

1. `avipe_painel/config.ini`
2. `../config.ini`

Voce pode usar `config.ini.example` como base:

```ini
[mysql_avipe]
host = 127.0.0.1
port = 3306
database = avipebd
user = avipe
password = sua_senha_aqui
```

Se usar Azure Key Vault:

```ini
[azure]
key_vault_url = https://seu-vault.vault.azure.net/
```

### 3. Preparar a maquina

```powershell
.\preparar_avipe_painel_nova_maquina.bat
```

Esse atalho executa:

- criacao da `.venv`, se necessario
- upgrade do `pip`
- instalacao de `requirements.txt`
- `npm install` em `frontend`
- `npm run build` do frontend
- `manage.py migrate`

### 4. Iniciar o sistema

```powershell
.\iniciar_avipe_painel.bat
```

Depois, abra:

- `http://127.0.0.1:8000/`

## Preparacao manual

### Backend

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py check
```

### Frontend

```powershell
cd frontend
npm install
npm run build
```

## Credenciais

### Azure Key Vault

Se o `config.ini` usa segredos com prefixo `kv:`, o painel pode resolver por meio destas variaveis:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET`

### Override local

Se preferir nao depender do Azure localmente:

```ini
[mysql_avipe]
password = sua_senha_aqui
```

Crie esse conteudo em `config.local.ini` ao lado do `manage.py`.

Tambem e possivel usar:

- `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

## Arquivos principais

- `pesquisas/services.py`: acesso ao banco e consultas operacionais
- `pesquisas/analytics.py`: agregacoes de observabilidade
- `pesquisas/views.py`: shell React e endpoints JSON
- `frontend/src/App.tsx`: interface React ativa
- `frontend/src/api.ts`: consumo das APIs
- `frontend/src/types.ts`: contratos do frontend
- `frontend/src/components/HomeDashboard.tsx`: orquestracao da Home
- `frontend/src/components/HomeDashboardHeader.tsx`: cabecalho, KPIs e resumo da Home
- `frontend/src/components/homeDashboardCharts.tsx`: graficos da Home
- `frontend/src/components/homeDashboardShared.tsx`: infraestrutura compartilhada da Home
- `frontend/package.json`: dependencias e scripts do frontend
- `iniciar_avipe_painel.bat`: inicializacao rapida
- `preparar_avipe_painel_nova_maquina.bat`: bootstrap de maquina nova
- `MEMORIA_IMPLEMENTACAO.md`: memoria tecnica do projeto

## O que nao deve ser versionado

Coberto pelo `.gitignore`:

- `.venv/`
- `db.sqlite3`
- `config.local.ini`
- `consultas/`
- `*.log`
- `frontend/node_modules/`
- `frontend/dist/`

## Solucao de problemas

### A interface abre, mas nao carrega dados

Verifique:

- se existe `config.ini` local ou na pasta pai
- se o acesso ao MySQL `avipebd` esta disponivel
- se o Key Vault esta acessivel, quando o `config.ini` usa `kv:`
- se as variaveis Azure estao visiveis na sessao atual
- se `config.local.ini` foi criado corretamente

### O frontend foi alterado e a tela nao mudou

```powershell
cd frontend
npm run build
```

## Validacao do fluxo local

O fluxo atual foi validado localmente com:

- `npm install`
- `npm run build`
- `python manage.py check`
- leitura por `config.ini` local
- leitura por `config.ini` na pasta pai
- carregamento da Home e da Pesquisa
- carregamento da API de observabilidade

Com isso, o repositorio permanece apto para instalacao limpa em maquina nova e para evolucao do Watcher AVIPE no stack atual.
