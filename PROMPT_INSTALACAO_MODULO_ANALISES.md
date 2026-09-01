# Prompt de configuracao do modulo de analises

Voce e responsavel por instalar e validar o modulo de analises do Watcher AVIPE em uma nova maquina Windows. Execute o trabalho de ponta a ponta e so considere concluido quando as credenciais locais e as APIs estiverem funcionais.

## Objetivo

O modulo persiste, por ambiente e ID de registro:

- o estado de analise (`analisado`);
- a anotacao editavel (`anotacao`).

Ele fica isolado no backend `analises/`, no frontend `frontend/src/features/analises/` e usa a tabela Supabase `public.watcher_analises`. O navegador nao pode receber a chave `service_role`.

## Regras de seguranca

1. Nunca adicione URL com segredo, `service_role_key`, tokens ou arquivos `.env` ao Git.
2. Nunca use a `service_role_key` no frontend, em JavaScript enviado ao navegador ou em documentos versionados.
3. Obtenha as credenciais do projeto Supabase definido pela equipe por um canal seguro. Nao copie codigo de outros projetos para este repositorio.
4. A aplicacao nao exige login; por isso, somente o backend Django acessa o Supabase com a credencial de servico. A tabela deve permanecer com RLS habilitada e sem politica anonima de acesso direto.

## Arquivos envolvidos

- `analises/client.py`: cliente server-side do Supabase e leitura de configuracao.
- `analises/views.py`: APIs do modulo.
- `frontend/src/features/analises/`: componentes, tipos e chamadas do frontend.
- `supabase/migrations/20260901_create_watcher_analises.sql`: migracao idempotente da tabela.
- `config.local.ini.example`: modelo de configuracao local, sem segredos.

## Etapa 1: preparar o projeto

1. Confirme que o checkout contem os arquivos acima.
2. Execute `preparar_avipe_painel_nova_maquina.bat` para criar o ambiente Python, instalar dependencias e gerar o build React.
3. Execute `.venv\Scripts\python.exe manage.py check`. Corrija qualquer erro antes de continuar.

## Etapa 2: configurar a credencial somente na maquina

O projeto Supabase compartilhado e a tabela `public.watcher_analises` ja existem e sao administrados centralmente. Nao execute migracoes, nao crie tabelas e nao altere RLS nesta maquina. As credenciais serao fornecidas durante a instalacao.

Escolha uma das opcoes abaixo. Nao use placeholders: informe a URL real do projeto Supabase e a `service_role_key` real.

Opcao recomendada, arquivo local ignorado pelo Git:

1. Crie `config.local.ini` na raiz, caso ainda nao exista.
2. Inclua ou complete a secao abaixo:

```ini
[supabase_watcher]
url = https://<project-ref>.supabase.co
service_role_key = <service-role-key>
```

Opcao alternativa, variaveis de ambiente do Windows:

```powershell
[Environment]::SetEnvironmentVariable('WATCHER_SUPABASE_URL', 'https://<project-ref>.supabase.co', 'User')
[Environment]::SetEnvironmentVariable('WATCHER_SUPABASE_SERVICE_ROLE_KEY', '<service-role-key>', 'User')
```

Depois de configurar variaveis de ambiente, inicie uma nova janela de terminal antes de subir o Watcher. Em Windows, o modulo tambem consegue ler as variaveis gravadas para evitar que um servidor Django ja aberto fique sem configuracao.

## Etapa 3: validar a comunicacao

1. Inicie o painel com `iniciar_avipe_painel.bat`.
2. Abra `http://127.0.0.1:8000/api/analises/?ambiente=app&ids=1`.
3. O resultado esperado e HTTP 200 com um objeto `analises`; ele pode estar vazio quando o ID ainda nao possui analise.
4. Na aba Pesquisa, marque um registro e atualize a pagina. O check deve permanecer marcado.
5. Abra Detalhe, salve uma anotacao, atualize a pagina e confirme a persistencia.
6. Na visualizacao Processos, confirme que a luz fica vermelha com algum registro pendente e verde somente quando todos estiverem marcados.
7. Confirme os filtros `Marcados` e `Pendentes`, inclusive na exportacao para Excel.

## Diagnostico de falhas

- Mensagem sobre `WATCHER_SUPABASE_URL` ou `WATCHER_SUPABASE_SERVICE_ROLE_KEY`: a maquina nao recebeu configuracao valida. Revise a secao `supabase_watcher` ou as variaveis de ambiente e reinicie o painel.
- HTTP 401 ou 403 do Supabase: confirme URL, `service_role_key` e acesso da credencial ao projeto correto.
- HTTP 404 da tabela: confirme com a equipe responsavel se a URL aponta para o projeto Supabase compartilhado correto. Nao tente criar ou migrar tabelas localmente.
- Falha de rede: confirme DNS, proxy corporativo, firewall e acesso HTTPS ao dominio `*.supabase.co`.
- Check ou anotacao nao persistem: verifique a resposta da API `/api/analises/` e os logs do Django; nao tente corrigir expondo a chave no frontend.

## Criterio de conclusao

Conclua somente quando todos estes itens forem verdadeiros:

- segredo configurado apenas localmente;
- `manage.py check` sem erro;
- API de analises retorna HTTP 200;
- check, anotacao, filtro e luz por processo funcionam apos recarregar a pagina;
- nenhum segredo aparece em `git status`, `git diff` ou em arquivo versionado.
