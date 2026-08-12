# AVIPE Painel

Painel web local para consulta do banco `avipebd` usado pelo AVIPE.

Em 12 de agosto de 2026, o projeto passou a operar com este stack:

- frontend ativo: React + Vite + TypeScript + Tailwind 3.3.5
- backend ativo: Django servindo APIs e a interface compilada
- frontend legado: preservado em `Legado`

## O que este repositorio entrega

- resumo operacional do banco AVIPE
- totais globais e totais da maquina/usuario local
- leitura dos ultimos registros
- consulta paginada da tabela `avipe_pesquisa_endereco`
- filtros por processo, CPF, orgao, usuario, data, processado e juntado
- detalhe completo por registro
- frontend legado acessivel em rota separada

## Modos de uso

O projeto agora suporta dois cenarios:

### 1. Clone standalone

Voce pode clonar este repositorio sozinho e configurar um `config.ini` local dentro da propria pasta `avipe_painel`.

### 2. Pasta embutida no AVIPE maior

Voce tambem pode manter `avipe_painel` dentro de uma copia maior do `TJSP_AVIPE`, reaproveitando o `config.ini` da pasta pai.

O painel procura a configuracao nesta ordem:

1. `avipe_painel/config.ini`
2. `../config.ini`

## Estrutura atual

```text
avipe_painel/
|-- frontend/
|-- Legado/
|-- painel_config/
|-- pesquisas/
|-- .venv/
|-- config.ini.example
|-- config.local.ini.example
|-- iniciar_avipe_painel.bat
|-- preparar_avipe_painel_nova_maquina.bat
|-- manage.py
|-- MEMORIA_IMPLEMENTACAO.md
|-- requirements.txt
`-- README.md
```

## Dependencias do stack atual

### Backend Python

As dependencias Python ficam em:

- `requirements.txt`

Pacotes principais:

- `django`
- `mysql-connector-python`
- `azure-identity`
- `azure-keyvault-secrets`

### Frontend React

As dependencias do frontend ficam em:

- `frontend/package.json`

O frontend foi remodelado para instalacao limpa em outra maquina, sem depender de arquivos locais em `Downloads`.

## Requisitos

- Windows
- Python disponivel no `PATH`
- Node.js disponivel no `PATH`
- acesso ao banco `avipebd`
- uma destas opcoes de credencial:
  - Azure Key Vault via `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_CLIENT_SECRET`
  - `config.ini` com a senha literal do `mysql_avipe`
  - `config.local.ini` como override local
  - variavel `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

## Instalacao a partir do GitHub

### 1. Clonar

```powershell
git clone https://github.com/davidpestilli/avipe_paniel.git
cd avipe_paniel
```

Se preferir, renomeie a pasta localmente para `avipe_painel`.

### 2. Configurar o acesso ao banco

Escolha um dos caminhos:

- criar `config.ini` com base em `config.ini.example`
- ou manter um `config.ini` na pasta pai, se este painel estiver embutido em outro projeto AVIPE

Exemplo minimo:

```ini
[mysql_avipe]
host = 127.0.0.1
port = 3306
database = avipebd
user = avipe
password = sua_senha_aqui
```

Se usar Azure Key Vault, preencha tambem:

```ini
[azure]
key_vault_url = https://seu-vault.vault.azure.net/
```

### 3. Preparar a maquina

```powershell
.\preparar_avipe_painel_nova_maquina.bat
```

Esse atalho faz:

- criacao do `.venv`, se necessario
- upgrade do `pip`
- instalacao do `requirements.txt`
- `npm install` em `frontend`
- `npm run build` do frontend React
- `manage.py migrate`

### 4. Iniciar

```powershell
.\iniciar_avipe_painel.bat
```

Depois, abra:

- `http://127.0.0.1:8000/`

## Preparacao manual

Na pasta raiz:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py migrate
```

Na pasta `frontend`:

```powershell
npm install
npm run build
```

## Como iniciar

### Atalho rapido

```powershell
.\iniciar_avipe_painel.bat
```

Esse arquivo:

- valida `.venv`
- valida a existencia de `config.ini` local ou na pasta pai
- valida se `frontend/dist` existe
- executa `manage.py check`
- cria o `db.sqlite3` local se necessario
- sobe o servidor Django local

### Execucao manual

```powershell
.\.venv\Scripts\activate
python manage.py runserver
```

## Rotas principais

- nova interface: `http://127.0.0.1:8000/`
- frontend legado: `http://127.0.0.1:8000/legado/`

## APIs mantidas

As APIs consumidas pela interface e por integracoes externas foram preservadas:

- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/detalhe/?id=<id>`

## Credenciais

### Azure Key Vault

Se o `config.ini` usa segredos com prefixo `kv:`, o painel pode usar o mesmo fluxo por meio destas variaveis:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET`

### Override local

Se preferir nao depender do Azure localmente, crie `config.local.ini` ao lado do `manage.py`.

Exemplo:

```ini
[mysql_avipe]
password = sua_senha_aqui
```

Tambem e possivel definir:

- `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

## O que nao deve ser versionado

Coberto pelo `.gitignore`:

- `.venv/`
- `db.sqlite3`
- `config.local.ini`
- `consultas/`
- `*.log`
- `frontend/node_modules/`
- `frontend/dist/`

## Arquivos principais

- `pesquisas/services.py`: acesso ao banco e consultas
- `pesquisas/secrets.py`: resolucao local de segredos Azure
- `pesquisas/views.py`: APIs e shell React
- `pesquisas/legacy_views.py`: frontend Django antigo preservado
- `frontend/src/App.tsx`: interface React ativa
- `frontend/package.json`: dependencias e scripts do frontend
- `config.ini.example`: exemplo para clone standalone
- `preparar_avipe_painel_nova_maquina.bat`: montagem de uma maquina nova
- `iniciar_avipe_painel.bat`: inicializacao rapida
- `MEMORIA_IMPLEMENTACAO.md`: historico tecnico da evolucao

## Solucao de problemas

### A interface abre, mas nao carrega dados

Verifique:

- se existe `config.ini` local ou na pasta pai
- se o acesso ao MySQL `avipebd` esta disponivel
- se o Key Vault esta acessivel, quando o `config.ini` usa `kv:`
- se as variaveis Azure estao visiveis na sessao atual
- ou se `config.local.ini` foi criado corretamente

### O frontend React foi alterado e a pagina nao mudou

Rebuild do frontend:

```powershell
cd frontend
npm run build
```

### Preciso abrir a interface antiga

Use:

- `http://127.0.0.1:8000/legado/`

## Verificacao do fluxo de clone

Em 12 de agosto de 2026, o fluxo novo foi verificado localmente com:

- `npm install`
- `npm run build`
- `python manage.py check`
- leitura por `config.ini` local
- leitura por `config.ini` na pasta pai

Com isso, o repositorio ficou adequado ao fluxo descrito neste README.
