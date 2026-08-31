# Watcher AVIPE

Painel web local para monitoramento operacional e consulta da base `avipebd` usada pelo AVIPE.

Em 21 de agosto de 2026, o sistema opera com este stack:

- backend: Django
- frontend: React + Vite + TypeScript + Tailwind
- graficos: Recharts
- interface ativa unica: React sobre backend Django

## O que o sistema entrega hoje

- navegacao por navbar entre `Home`, `Pesquisa` e `Configuracoes`
- Home com KPIs globais e painel expansivel da maquina e do usuario local
- observabilidade do servico por periodo
- leitura por `registros` ou por `processos`
- graficos em `linhas` ou `barras`
- seletor de ambiente para alternancia entre `app`, `hml` e `prd`
- controle compartilhado para exibir ou ocultar o orgao de teste `SUPORTE` em todo o frontend
- analises de:
  - envios ao localizador por orgao
  - inclusao no localizador x processamento
  - processados e juntados por orgao
- cabecalho unificado `WATCHER AVIPE` com efeito visual de brilho animado
- destaque operacional de orgaos com diferenca entre processado e juntado
- tooltip de processamento com deficit e sanamento registro a registro por data
- filtros operacionais por processo, CPF, orgao, usuario, data, processado e juntado
- consulta paginada da tabela `avipe_pesquisa_endereco`
- exportacao para Excel na aba `Pesquisa`, respeitando filtros e modo ativo
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

## Destaques da observabilidade

### Grafico Entrada x Processamento

Na visualizacao `Barras` + `Processamento`, o tooltip de cada barra mostra, por orgao:

- valor processado no bucket
- `(-x)` quando ha registros que entraram naquele bucket e nao foram processados no mesmo bucket
- `(+n data)` para cada data posterior em que parte desse deficit foi sanada

Exemplo:

`SANTANA01CIV: 360 (-45) (+30 29/07) (+10 30/07)`

Esse calculo e feito **registro a registro** no backend (`pesquisas/analytics.py`) e enviado em `sanamento_por_orgao` dentro de cada ponto da `evolucao`.

### Grafico Processamento x Juntada por Unidade

Na visualizacao em linhas, orgaos com diferenca entre processado e juntado recebem tratamento especial:

- entram automaticamente na grade `Orgaos Destacados`
- aparecem com chip vermelho
- sobem para o topo do seletor `Selecionar orgaos`, ordenados pela maior diferenca
- regra de exibicao na grade:
  - todos os orgaos com diferenca sao exibidos, sem limite
  - quando houver 0, 1 ou 2 orgaos com diferenca, a grade completa ate 3 unidades com orgaos sem diferenca, priorizando maior movimentacao

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
|-- painel_preferences.json.example
|-- iniciar_avipe_painel.bat
|-- PROMPT_INSTALACAO_AGENTE_IA.md
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
- configuracoes: `http://127.0.0.1:8000/configuracoes/`

## APIs disponiveis

- `GET /health/`
- `GET /api/dashboard/`
- `GET /api/configuracoes/?ambiente=<app|hml|prd>`
- `POST /api/configuracoes/orgao-suporte/`
- `GET /api/observabilidade/?periodo=<recorte>`
- `GET /api/pesquisas/`
- `GET /api/pesquisas/exportar/?modo=<agrupada|linhas>`
- `GET /api/pesquisas/detalhe/?id=<id>`

## Requisitos para instalacao local

- Windows
- Python 3.14.6 disponivel no `PATH`
- Node.js 24.18.0 e npm 11.16.0 disponiveis no `PATH`
- acesso ao banco `avipebd`
- pasta offline `C:\Users\<usuario>\Downloads\pacotes-npm` com os pacotes `.tgz` exigidos pelo frontend
- certificado raiz local quando o ambiente exigir TLS no MySQL
- uma das opcoes de credencial abaixo:
  - `config.ini` com senha literal
  - `config.local.ini`
  - Azure Key Vault
  - variavel `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

Importante:

- O uso da pasta `pacotes-npm` e intencional nesta instalacao.
- Motivo: e conhecido que a rede interna da empresa bloqueia o download direto de parte dos pacotes do npm.
- Por isso, em outras maquinas, o usuario deve criar previamente `C:\Users\<usuario>\Downloads\pacotes-npm` e copiar ali os pacotes offline exigidos por esta versao do projeto.

## Dependencias

### Backend Python

As dependencias Python estao em `requirements.txt`:

- `django`
- `mysql-connector-python`
- `azure-identity`
- `azure-keyvault-secrets`
- `openpyxl`

### Exportacao para Excel

Na aba `Pesquisa`, o botao ao lado de `Filtrar` gera uma planilha `.xlsx` com estas regras:

- modo `Processos`: exporta ate `1000 processos`, sem expandir os registros internos
- modo `Registros`: exporta ate `1000 registros`
- filtros ativos: a planilha respeita os mesmos filtros informados na tela
- sem filtros: a exportacao usa os itens mais recentes para os mais antigos

Detalhes da planilha:

- a coluna `Processo` e gravada como texto para evitar notacao cientifica no Excel
- a primeira linha sai com cabecalho formatado
- a planilha abre com filtro ativo no cabecalho e primeira linha congelada
- as colunas sao ajustadas automaticamente para abrir legiveis

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
git clone https://github.com/davidpestilli/avipe_painel.git
cd avipe_painel
```

Se preferir, renomeie a pasta local conforme sua convencao.

### 2. Configurar o acesso ao banco

O painel procura a configuracao em `config.ini` na raiz do proprio projeto.

Como o repositorio e standalone, esse arquivo deve ficar na raiz do proprio `avipe_painel`. Nao ha exigencia de manter o projeto dentro de uma pasta `TJSP_AVIPE`.

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

[mysql_avipe_hml]
host = nape-hml-mysql-flex.mysql.database.azure.com
port = 3306
database = avipebd
user = avipe
password = kv:mysql-avipe-password
ssl_ca = C:\caminho\para\certificado.pem
ssl_verify_cert = true

[azure_hml]
key_vault_url = https://nape-hml-kv.vault.azure.net/

[mysql_avipe_prd]
host = nape-prd-mysql-flex.mysql.database.azure.com
port = 3306
database = avipebd
user = avipe
password = kv:mysql-avipe-password
ssl_ca = C:\caminho\para\certificado.pem
ssl_verify_cert = true

[azure_prd]
key_vault_url = https://nape-prd-kv.vault.azure.net/
```

### Convencao de ambientes

O painel usa estas secoes no `config.ini`:

- `app`: `[mysql_avipe]` e `[azure]`
- `hml`: `[mysql_avipe_hml]` e `[azure_hml]`
- `prd`: `[mysql_avipe_prd]` e `[azure_prd]`

Na aba `Configuracoes`, a interface passa a usar o ambiente selecionado em:

- `Home`
- `Pesquisa`
- `Detalhe`

Tambem ha um toggle para exibir ou ocultar o orgao de teste `SUPORTE`. Essa preferencia e compartilhada entre todos os usuarios do mesmo servidor e fica em `painel_preferences.json` na raiz do projeto.

Comportamento padrao:

- `SUPORTE` vem **oculto**
- quando oculto, o orgao deixa de aparecer em graficos, filtros, totais, exportacao e detalhe
- filtros `sig_orgao=SUPORTE` na URL sao limpos automaticamente
- a preferencia pode ser versionada a partir de `painel_preferences.json.example`

Para inicializar o arquivo em uma maquina nova:

```powershell
copy painel_preferences.json.example painel_preferences.json
```

### Certificado local para MySQL

Quando o banco exigir TLS, mantenha o certificado em uma pasta local fora de versionamento, por exemplo:

- `C:\Users\<usuario>\projetos\avipe_painel\.secrets\DigiCertGlobalRootG2.crt.pem`

O repositorio ja ignora `.secrets/` no Git. Assim:

- o certificado nao vai para o GitHub
- segredos locais continuam restritos a cada maquina
- o mesmo clone pode ser preparado por outros colegas sem expor credenciais

Campos opcionais aceitos em cada secao `mysql`:

- `ssl_ca`
- `ssl_cert`
- `ssl_key`
- `ssl_verify_cert`
- `ssl_verify_identity`

Exemplo local para `hml` ou `prd`:

```ini
ssl_ca = C:\Users\<usuario>\projetos\avipe_painel\.secrets\DigiCertGlobalRootG2.crt.pem
ssl_verify_cert = true
```

### 3. Preparar a maquina

Antes de executar o instalador, garanta estes pre-requisitos offline:

- criar a pasta `C:\Users\<usuario>\Downloads\pacotes-npm`
- copiar para dentro dela:
  - `esbuild-0.18.20.tgz`
  - `win32-x64-0.18.20.tgz`
  - `rollup-win32-x64-msvc-4.62.4.tgz`
- instalar previamente:
  - Python 3.14.6: [download direto](https://www.python.org/ftp/python/3.14.6/python-3.14.6-amd64.exe)
  - Node.js 24.18.0 x64: [download direto](https://nodejs.org/dist/v24.18.0/node-v24.18.0-x64.msi)

Links diretos dos pacotes offline do npm:

- `esbuild-0.18.20.tgz`: [download direto](https://registry.npmjs.org/esbuild/-/esbuild-0.18.20.tgz)
- `win32-x64-0.18.20.tgz`: [download direto](https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.18.20.tgz)
- `rollup-win32-x64-msvc-4.62.4.tgz`: [download direto](https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.62.4.tgz)

```powershell
.\preparar_avipe_painel_nova_maquina.bat
```

Esse atalho executa:

- checagem inicial de Python, Node.js, npm e da pasta offline `Downloads\pacotes-npm`
- criacao da `.venv`, se necessario
- upgrade do `pip`
- instalacao de `requirements.txt`
- `npm install` em `frontend`
- `npm run build` do frontend
- `manage.py migrate`
- `manage.py check`

Agora o instalador tambem:

- interrompe logo no inicio quando faltam Python, Node.js ou a pasta `pacotes-npm`
- informa os links diretos dos instaladores e dos pacotes offline esperados
- cria log com timestamp em `logs\`
- registra a saida tecnica das etapas de Python, Node, `pip`, `npm`, build e migracoes
- destaca falhas que podem estar ligadas a rede interna, proxy, DNS ou certificados
- cria `config.ini` a partir de `config.ini.example` quando necessario
- orienta os dados minimos que o usuario precisa preencher no `config.ini`
- alerta quando houver dependencia de Azure Key Vault sem variaveis de ambiente completas

### 3.1. Instalacao assistida por agente de IA

Se a instalacao em outra maquina for conduzida por um agente de IA, use o prompt versionado em:

- `PROMPT_INSTALACAO_AGENTE_IA.md`

Esse arquivo instrui o agente a:

- validar pre-requisitos da maquina
- executar `preparar_avipe_painel_nova_maquina.bat`
- acompanhar e resumir o log gerado em `logs\`
- identificar falhas de download e de rede tipicas do ambiente interno do tribunal
- conferir `config.ini`, `config.local.ini` e variaveis Azure
- diferenciar aplicacao instalada de aplicacao realmente operacional

Fluxo recomendado:

1. clonar ou copiar o repositorio para a maquina alvo
2. pedir para a IA ler `PROMPT_INSTALACAO_AGENTE_IA.md`
3. pedir para a IA executar o fluxo de instalacao a partir desse arquivo
4. usar o relatorio final da IA para resolver pendencias de rede, credenciais ou configuracao

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

Para ambientes especificos, o painel tambem aceita:

- `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD_HML`
- `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD_PRD`

## Arquivos principais

- `pesquisas/services.py`: acesso ao banco e consultas operacionais
- `pesquisas/preferences.py`: preferencias compartilhadas do painel
- `pesquisas/analytics.py`: agregacoes de observabilidade
- `pesquisas/views.py`: shell React e endpoints JSON
- `frontend/src/App.tsx`: interface React ativa
- `frontend/src/api.ts`: consumo das APIs
- `frontend/src/components/SearchPage.tsx`: filtros da pesquisa e acao de exportacao
- `frontend/src/types.ts`: contratos do frontend
- `frontend/src/components/AppShell.tsx`: cabecalho compacto e overlay de carregamento
- `frontend/src/components/SettingsPage.tsx`: seletor de ambiente e toggle do orgao `SUPORTE`
- `frontend/src/components/HomeDashboard.tsx`: orquestracao da Home
- `frontend/src/components/HomeDashboardHeader.tsx`: cabecalho, KPIs e resumo da Home
- `frontend/src/components/homeDashboardCharts.tsx`: graficos da Home
- `frontend/src/components/homeDashboardShared.tsx`: infraestrutura compartilhada da Home
- `frontend/package.json`: dependencias e scripts do frontend
- `iniciar_avipe_painel.bat`: inicializacao rapida
- `preparar_avipe_painel_nova_maquina.bat`: bootstrap de maquina nova com log detalhado em `logs\`
- `PROMPT_INSTALACAO_AGENTE_IA.md`: roteiro operacional para agente de IA executar e acompanhar a instalacao
- `MEMORIA_IMPLEMENTACAO.md`: memoria tecnica do projeto

## O que nao deve ser versionado

Coberto pelo `.gitignore`:

- `.venv/`
- `db.sqlite3`
- `config.local.ini`
- `painel_preferences.json`
- `consultas/`
- `*.log`
- `frontend/node_modules/`
- `frontend/dist/`

## Solucao de problemas

### A interface abre, mas nao carrega dados

Verifique:

- se existe `config.ini` na raiz do projeto
- se o acesso ao MySQL `avipebd` esta disponivel
- se o Key Vault esta acessivel, quando o `config.ini` usa `kv:`
- se a identidade Azure tem permissao de leitura de segredos nos cofres dos ambientes desejados
- se as variaveis Azure estao visiveis na sessao atual
- se `config.local.ini` foi criado corretamente

### O instalador falhou em outra maquina

Verifique:

- o arquivo de log mais recente em `logs\`
- se a pasta `C:\Users\<usuario>\Downloads\pacotes-npm` foi criada antes da instalacao
- se os tres arquivos `.tgz` esperados estao dentro dessa pasta
- se Python 3.14.6 e Node.js 24.18.0 foram instalados e adicionados ao `PATH`
- em qual etapa ocorreu a falha: `.venv`, `pip`, `requirements.txt`, `npm install`, build, migracoes ou `manage.py check`
- se a falha indica bloqueio de rede, proxy, DNS, certificado ou indisponibilidade externa
- se `config.ini` foi criado e ainda contem valores de exemplo
- se a instalacao depende de Azure Key Vault sem `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_CLIENT_SECRET`

Quando a instalacao for acompanhada por IA, use `PROMPT_INSTALACAO_AGENTE_IA.md` para que o agente leia o log e produza um relatorio de pendencias.

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
- `GET /api/pesquisas/exportar/`
- inicializacao do `preparar_avipe_painel_nova_maquina.bat` com criacao de log em `logs\`
- leitura por `config.ini` local
- leitura da API `GET /api/configuracoes/` para `app`
- toggle compartilhado de exibicao do orgao `SUPORTE`
- carregamento da Home e da Pesquisa
- carregamento da API de observabilidade

Observacao:

- `hml` e `prd` dependem de permissao Azure da entidade de servico usada pelo painel para leitura dos segredos nos respectivos Key Vaults

Com isso, o repositorio permanece apto para instalacao limpa em maquina nova e para evolucao do Watcher AVIPE no stack atual.
