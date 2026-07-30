# AVIPE Painel

Painel web local em Django para consulta do banco `avipebd` usado pelo AVIPE.

O projeto foi pensado para ser colocado dentro de uma cópia funcional do repositório `TJSP_AVIPE`, reutilizando o `config.ini` e a mesma configuração de acesso ao MySQL e ao Azure Key Vault.

## O que o painel mostra

- totais globais do banco;
- totais da máquina e do usuário local;
- host, porta e banco em uso;
- últimos registros inseridos;
- consulta paginada da tabela `avipe_pesquisa_endereco`;
- filtros por processo, CPF, órgão, usuário, data de inserção, processado e juntado;
- detalhe completo por registro.

## Requisitos

- Windows
- Python compatível com o projeto
- uma cópia funcional do repositório `TJSP_AVIPE`
- acesso ao banco `avipebd`
- uma destas opções de credencial:
  - Azure Key Vault via `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_CLIENT_SECRET`
  - `config.local.ini` com a senha literal do `mysql_avipe`
  - variável `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

## Estrutura esperada

O painel deve ficar dentro da pasta do projeto AVIPE:

```text
TJSP_AVIPE/
|-- config.ini
|-- ...
`-- avipe_painel/
```

## Instalação

Dentro da pasta `avipe_painel`:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py migrate
```

## Como iniciar

### Opção 1. Atalho rápido

Use:

```powershell
.\iniciar_avipe_painel.bat
```

Esse arquivo:
- verifica se existe `.venv`;
- verifica se existe `..\config.ini`;
- verifica se há algum caminho de credencial disponível;
- executa `manage.py check`;
- cria o `db.sqlite3` local do Django se ele ainda não existir;
- sobe o servidor local.

Depois, abra:

- `http://127.0.0.1:8000/`

### Opção 2. Execução manual

```powershell
.\.venv\Scripts\activate
python manage.py runserver
```

## Credenciais

### Azure Key Vault

Se o `config.ini` do AVIPE usa segredos com prefixo `kv:`, o painel pode usar o mesmo fluxo do AVIPE por meio destas variáveis de ambiente:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET`

### Override local

Se preferir não depender do Azure localmente, crie um arquivo `config.local.ini` ao lado do `manage.py`, usando como base `config.local.ini.example`.

Exemplo:

```ini
[mysql_avipe]
password = sua_senha_aqui
```

Também é possível definir:

- `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

## Observações

- o painel é somente leitura;
- o ajuste de horário é feito apenas na exibição do front, em `America/Sao_Paulo`;
- a navegação de detalhe usa o `id` do registro para evitar falhas por formatação de data;
- o projeto foi testado após atualização do AVIPE por `git pull` e continuou funcional.

## O que não deve ser versionado

Já está coberto pelo `.gitignore`:

- `.venv/`
- `db.sqlite3`
- `config.local.ini`
- `consultas/`
- logs e caches locais

## Arquivos principais

- `pesquisas/services.py`: acesso ao banco e consultas
- `pesquisas/views.py`: preparação das telas
- `templates/pesquisas/`: interface HTML
- `iniciar_avipe_painel.bat`: inicialização rápida
- `MEMORIA_IMPLEMENTACAO.md`: histórico técnico e memória de evolução
