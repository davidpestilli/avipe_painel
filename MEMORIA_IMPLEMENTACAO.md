# Memoria de Criacao e Implementacao do AVIPE Painel

## Objetivo

Criar um painel web local, separado do fluxo principal do AVIPE, para visualizar os registros da tabela `avipe_pesquisa_endereco` do banco `avipebd`.

O painel foi pensado para:
- rodar dentro de uma subpasta do projeto AVIPE;
- sobreviver a atualizacoes rotineiras do repositorio principal;
- reutilizar a configuracao existente do `config.ini`;
- operar apenas em leitura;
- servir como base para consultas operacionais e futuras melhorias;
- poder ser distribuido separadamente e reutilizado por outros operadores que mantenham o repositorio `TJSP_AVIPE`.

## Historico resumido do que foi feito

Ao longo da implementacao, foram entregues e ajustados estes pontos:
- criacao do projeto Django isolado em `avipe_painel`;
- conexao ao banco `avipebd` reaproveitando o `config.ini` do AVIPE;
- suporte a segredos vindos do Azure Key Vault, igual ao AVIPE;
- suporte adicional a override local via `config.local.ini` ou variavel de ambiente;
- ajuste de timezone apenas na exibicao do painel para `America/Sao_Paulo`;
- dashboard com totais globais e totais locais da maquina e do usuario;
- exibicao do host, porta e banco em uso;
- listagem com filtros e paginacao;
- detalhe de registro com navegacao de ida e volta;
- correcao do detalhe para usar `id` da tabela, evitando erro por data formatada;
- exibicao de `usuario_logado` e `ip_cliente` por registro;
- filtros adicionais por usuario e data de insercao;
- remocao dos links de navegacao do topo;
- validacao de preservacao do `avipe_painel` apos atualizacao do AVIPE por `git pull`;
- criacao de um atalho `.bat` para subir o painel com menos passos e com checagens iniciais.

## Decisoes de arquitetura

### 1. Projeto separado dentro da pasta do AVIPE

O painel foi criado na subpasta:
- `avipe_painel`

Motivos:
- manter proximidade operacional com o AVIPE;
- facilitar uso do mesmo `config.ini`;
- evitar misturar o painel com o codigo principal do robo;
- permitir evolucao independente.

### 2. Django como framework

Foi adotado Django porque:
- entrega estrutura clara para telas, rotas e templates;
- funciona bem para painel administrativo local;
- facilita manutencao futura por outros desenvolvedores;
- permite crescer para autenticacao, exportacao e novos modulos se necessario.

### 3. Leitura do banco via servico proprio

O painel nao usa o ORM do Django para a tabela do AVIPE.

Em vez disso, a leitura foi implementada em `pesquisas/services.py` com `mysql-connector-python`.

Motivos:
- o AVIPE ja usa MySQL diretamente;
- reduz acoplamento com o schema do banco;
- evita introduzir modelos Django para uma tabela externa que o painel nao administra;
- mantem o banco padrao do Django apenas para uso interno, se necessario.

### 4. Reuso do config.ini do AVIPE

O painel le o arquivo `config.ini` que fica na raiz do projeto AVIPE.

Ele utiliza a secao `[mysql_avipe]` para abrir conexao no banco `avipebd`.

Se a senha estiver em formato `kv:<segredo>`, o painel reaproveita a mesma regra do AVIPE, importando `util.secrets.resolver_segredos`.

Isso evita duplicidade de credenciais e reduz risco de divergencia entre o robo e o painel.

### 4.1 Override local para uso sem Azure Key Vault

Em ambiente local, pode acontecer de o `config.ini` do AVIPE apontar a senha como `kv:<segredo>` e a maquina nao estar autenticada no Azure.

Para esse caso, o painel aceita duas alternativas locais:
- arquivo `config.local.ini`
- variavel de ambiente `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`

O arquivo `config.local.ini` sobrescreve apenas o que for necessario para o painel, sem alterar o `config.ini` principal do AVIPE.

Exemplo:

```ini
[mysql_avipe]
password = sua_senha_real_aqui
```

### 4.2 Credenciais Azure no Windows

Tambem foi validado o uso de credenciais Azure por variaveis de ambiente persistidas no Windows:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET`

Conclusao importante:
- o `venv` nao bloqueia essas variaveis;
- o que importa e que a sessao que inicia o painel enxergue essas variaveis;
- isso permite ao painel resolver segredos do Key Vault do mesmo jeito que o AVIPE.

### 5. Operacao somente leitura

O painel nao grava, altera ou exclui registros.

Todas as consultas atuais sao `SELECT`.

Essa decisao foi tomada para:
- nao interferir no funcionamento do AVIPE;
- reduzir risco operacional;
- permitir uso seguro como tela de acompanhamento.

### 6. Correcao de fuso horario apenas no painel

Na exibicao do painel, as colunas de data e hora passaram a ser convertidas para `America/Sao_Paulo`.

Essa correcao foi aplicada apenas na camada de apresentacao do Django, sem alterar qualquer dado no banco `avipebd`.

Assumiu-se, para esta versao, que os `datetime` lidos do MySQL estavam sendo entregues como horario em UTC e por isso precisavam de ajuste visual para o contexto local de uso.

### 7. Compatibilidade com atualizacoes do AVIPE

Foi verificado que o `avipe_painel` permanece intacto apos atualizacao do projeto principal via `git pull`, desde que:
- a pasta continue fora do versionamento do repositorio principal; e
- a nova versao do AVIPE nao passe a rastrear o caminho `avipe_painel/`.

Em teste real, o AVIPE foi atualizado para uma versao mais nova e o painel continuou funcional.

## Estrutura criada

```text
avipe_painel/
|-- .gitignore
|-- config.local.ini.example
|-- iniciar_avipe_painel.bat
|-- manage.py
|-- MEMORIA_IMPLEMENTACAO.md
|-- README.md
|-- requirements.txt
|-- painel_config/
|-- pesquisas/
|-- static/
`-- templates/
```

## Funcionalidades implementadas

### Dashboard inicial

Tela inicial com:
- totais globais do banco;
- totais da maquina e do usuario local;
- host, porta e nome do banco em uso;
- contexto local da execucao com usuario e IP;
- lista dos ultimos registros inseridos.

Os totais globais sao calculados sobre toda a tabela `avipe_pesquisa_endereco`.

Os totais locais usam os campos `ip_cliente` e `usuario_logado` para aproximar o que foi produzido pela maquina e pelo usuario que estao executando o painel naquele momento.

### Consulta principal

Tela de listagem da tabela `avipe_pesquisa_endereco` com:
- filtro por numero do processo;
- filtro por CPF;
- filtro por sigla do orgao;
- filtro por usuario;
- filtro por data de insercao;
- filtro por status `processado`;
- filtro por status `juntado`;
- exibicao de `usuario_logado` e `ip_cliente` por registro;
- paginacao;
- acesso ao detalhe por registro.

### Detalhe da linha

Tela para visualizar todos os campos retornados para um registro selecionado.

A navegacao do detalhe passou a usar o campo `id` da tabela `avipe_pesquisa_endereco`, em vez de combinar processo, CPF e data formatada. Isso foi feito para evitar falhas de localizacao causadas por diferenca de formato e ajuste de fuso horario na exibicao.

O detalhe preserva:
- retorno para a tela de consultas;
- retorno para o resumo.

### Navegacao

Decisoes de navegacao aplicadas:
- remocao dos links `Resumo` e `Pesquisas` da barra superior;
- uso de botoes diretamente nas telas;
- preservacao do caminho de volta da lista para o detalhe.

## Arquivos principais e responsabilidade

### `painel_config/settings.py`

Configura:
- app `pesquisas`;
- templates;
- arquivos estaticos;
- idioma `pt-br`;
- timezone `America/Sao_Paulo`;
- referencia ao diretorio raiz do AVIPE.

### `pesquisas/services.py`

Concentra a logica de acesso ao banco:
- leitura do `config.ini`;
- resolucao de segredos do Azure Key Vault;
- abertura da conexao MySQL;
- consulta de metricas globais e locais;
- informacoes do banco atual;
- consultas para dashboard, filtros, listagem e detalhe.

### `pesquisas/views.py`

Responsavel por:
- preparar contexto das telas;
- receber filtros da URL;
- tratar erros de conexao e configuracao;
- ajustar `datetime` para o fuso local na apresentacao;
- renderizar templates.

### `templates/`

Contem a interface HTML da aplicacao.

### `static/painel.css`

Ajustes visuais simples para deixar o painel mais amigavel sem complicar a manutencao.

### `iniciar_avipe_painel.bat`

Atalho para iniciar o painel com menos passos no Windows.

## Como executar

### Opcao 1. Fluxo manual

Na pasta `avipe_painel`, usar o ambiente virtual proprio do painel.

Exemplo:

```powershell
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Abrir no navegador:
- `http://127.0.0.1:8000/`

### Opcao 2. Atalho por .bat

Foi criado o arquivo:
- `iniciar_avipe_painel.bat`

Uso:
1. abrir a pasta `avipe_painel`;
2. dar duplo clique em `iniciar_avipe_painel.bat`, ou executa-lo no terminal;
3. aguardar as checagens;
4. abrir o navegador em `http://127.0.0.1:8000/`.

O `.bat` foi pensado para reduzir a quantidade de passos manuais do operador.

## Checagem inicial automatizada

O `iniciar_avipe_painel.bat` faz uma checagem inicial antes de subir o servidor.

### O que ele verifica

- existencia de `.venv\Scripts\python.exe`;
- existencia de `..\config.ini`;
- disponibilidade de um caminho de autenticacao para o MySQL AVIPE:
  - `config.local.ini`, ou
  - `AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD`, ou
  - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_CLIENT_SECRET` na sessao atual;
- validade estrutural da aplicacao com `python manage.py check`;
- existencia do `db.sqlite3` local do Django;
- se o `db.sqlite3` nao existir, executa `python manage.py migrate`.

### O que ele nao garante

Ele nao prova sozinho que:
- o banco MySQL esta acessivel pela rede;
- a senha esta correta;
- o Key Vault esta acessivel;
- o usuario tem permissao de leitura no banco.

Essas validacoes mais profundas continuam acontecendo quando o painel de fato tenta abrir os dados.

## Configuracoes de credenciais

### Se o AVIPE usar Key Vault

O ideal e iniciar o painel em uma sessao que enxergue:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET`

### Se o AVIPE nao puder usar Key Vault localmente

Criar:
- `config.local.ini`

usando como base:
- `config.local.ini.example`

## Dependencias do painel

Dependencias diretas do painel:
- `django`
- `mysql-connector-python`
- `azure-identity`
- `azure-keyvault-secrets`

As dependencias do Azure sao necessarias quando o `config.ini` usa credenciais com prefixo `kv:`.

## Compatibilidade para outros usuarios

Se outro usuario baixar apenas o `avipe_painel` e coloca-lo dentro de um repositorio `TJSP_AVIPE` funcional, ele tende a conseguir usar o painel sem grandes adaptacoes, desde que existam:
- Python compativel;
- criacao do `venv` do painel;
- instalacao do `requirements.txt`;
- `config.ini` valido do AVIPE;
- acesso ao banco `avipebd`;
- acesso ao Azure ou configuracao local alternativa para a senha.

Ou seja:
- a portabilidade interna esta boa;
- ainda nao e um pacote totalmente plug-and-play sem preparacao minima.

## Publicacao em repositorio publico

Para publicacao publica, foi definido que nao devem ser versionados:
- `.venv/`
- `db.sqlite3`
- `config.local.ini`
- `consultas/`
- logs locais

Esses itens foram mantidos fora do versionamento por `.gitignore`.

## Observacoes importantes

### 1. Persistencia da pasta

Se a intencao for blindar ainda mais o painel contra atualizacoes do AVIPE, a melhor evolucao futura e transformar `avipe_painel` em um repositorio Git proprio.

### 2. Banco padrao do Django

O Django continua com `sqlite3` local para recursos internos.

Isso nao interfere no banco `avipebd`, que continua sendo lido separadamente.

### 3. Chave secreta

O projeto usa uma chave local de desenvolvimento.

Para endurecer o ambiente, pode-se definir:
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=0`

### 4. Estado atual apos atualizacao do AVIPE

Foi testada uma atualizacao real do projeto principal do AVIPE por `git pull`, e o `avipe_painel`:
- permaneceu presente;
- nao entrou em conflito com os arquivos rastreados do repositorio principal;
- continuou funcional nas validacoes locais.

## Pontos de melhoria sugeridos

### Curto prazo

- exportar a listagem para CSV;
- mostrar badges visuais para pendente, processado e juntado;
- permitir ajuste do tamanho da pagina;
- melhorar formatacao de datas e valores nulos;
- criar uma checagem de conectividade com MySQL e Key Vault mais explicita.

### Medio prazo

- cruzar registros do banco com arquivos em `consultas/unificados/`;
- adicionar filtros por periodo mais ricos;
- exibir resumo por orgao;
- exibir quantidade por dia.

### Longo prazo

- autenticacao local;
- perfis de acesso;
- auditoria de uso do painel;
- novas telas para outros bancos e artefatos do AVIPE.

## Riscos e cuidados futuros

- se o schema da tabela `avipe_pesquisa_endereco` mudar, as consultas do painel podem precisar de ajuste;
- se a politica de segredos do AVIPE mudar, a integracao com `util.secrets` deve ser revisada;
- se a nova versao do AVIPE passar a rastrear o caminho `avipe_painel/`, a estrategia de preservacao deve ser revista;
- se o banco passar a ter volume muito maior, pode valer a pena adicionar indices extras ou filtros mais agressivos.

## Resumo da decisao

Foi implementado um painel Django local, separado, leve e em modo leitura, desenhado para consulta operacional do banco interno do AVIPE sem alterar o comportamento do robo principal.

O painel foi evoluido progressivamente para suportar:
- uso real com Azure Key Vault;
- uso alternativo com override local;
- correcao de horario apenas na exibicao;
- diferenciacao entre metricas globais e metricas locais;
- navegacao mais segura por `id`;
- filtros adicionais;
- distribuicao mais simples por meio de um inicializador `.bat`.
