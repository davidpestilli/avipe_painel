@echo off
setlocal

cd /d "%~dp0"

if not exist "logs" mkdir "logs" >nul 2>nul
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TIMESTAMP=%%I"
set "LOG_FILE=%~dp0logs\preparar_avipe_%TIMESTAMP%.log"
set "STEP_FAILED="

call :log =========================================
call :log  AVIPE Painel - Preparacao de nova maquina
call :log =========================================
call :log Log desta execucao: "%LOG_FILE%"
call :log

where python >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :fail "Python nao foi encontrado no PATH." "Instale o Python e tente novamente."
    call :showLogHint
    pause
    exit /b 1
)

where npm >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :fail "npm nao foi encontrado no PATH." "Instale o Node.js e tente novamente."
    call :showLogHint
    pause
    exit /b 1
)

call :runStep "Versao do Python" "python --version"
call :runStep "Versao do npm" "npm --version"
call :runStep "Versao do Node.js" "node --version"

call :log [INFO] Validando arquivos obrigatorios do projeto...
if not exist "requirements.txt" (
    call :fail "Arquivo requirements.txt nao encontrado." "Verifique se a copia do projeto esta completa."
    call :showLogHint
    pause
    exit /b 1
)
if not exist "frontend\package.json" (
    call :fail "Arquivo frontend\\package.json nao encontrado." "Verifique se a copia do projeto esta completa."
    call :showLogHint
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    call :runStep "Criando ambiente virtual" "python -m venv .venv"
) else (
    call :log [OK] Ambiente virtual ja existe.
)

call :runStep "Atualizando pip" "\".venv\Scripts\python.exe\" -m pip install --upgrade pip"
call :runStep "Instalando dependencias Python" "\".venv\Scripts\python.exe\" -m pip install -r requirements.txt"

call :runStep "Instalando dependencias do frontend React" "pushd frontend && npm install && popd"
call :runStep "Gerando build do frontend React" "pushd frontend && npm run build && popd"

call :runStep "Aplicando migracoes locais do Django" "\".venv\Scripts\python.exe\" manage.py migrate"
call :runStep "Validando a aplicacao com manage.py check" "\".venv\Scripts\python.exe\" manage.py check"

if not exist "config.ini" (
    if exist "config.ini.example" (
        copy /y "config.ini.example" "config.ini" >>"%LOG_FILE%" 2>&1
        call :log [AVISO] config.ini nao existia e foi criado a partir de config.ini.example.
        call :log [AVISO] Edite o arquivo antes de iniciar o painel.
    ) else (
        call :log [AVISO] config.ini nao existe e config.ini.example nao foi encontrado para copia automatica.
    )
) else (
    call :log [OK] Arquivo config.ini encontrado.
)

call :orientarConfiguracao
call :validarCredenciaisAzure

call :log
call :log [OK] Preparacao concluida.
call :log Proximos passos:
call :log   1. revisar e preencher o arquivo "config.ini" na raiz do projeto
call :log   2. se nao quiser depender de Azure localmente, criar "config.local.ini" com as senhas literais necessarias
call :log   3. se usar Key Vault, validar AZURE_CLIENT_ID, AZURE_TENANT_ID e AZURE_CLIENT_SECRET
call :log   4. iniciar com "iniciar_avipe_painel.bat"
call :showLogHint
pause
exit /b 0

:runStep
set "STEP_FAILED=%~1"
call :log [INFO] %~1...
cmd /d /c %~2 >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :fail "%~1 falhou." ""
    if /i "%~1"=="Instalando dependencias Python" call :log [DICA] Em rede interna, verifique acesso ao indice do pip, proxy corporativo, DNS e certificados.
    if /i "%~1"=="Instalando dependencias do frontend React" call :log [DICA] Em rede interna, verifique acesso ao registro do npm, proxy corporativo, DNS e certificados.
    call :showLogHint
    pause
    exit /b 1
)
call :log [OK] %~1 concluido.
exit /b 0

:orientarConfiguracao
call :log
call :log [INFO] Informacoes que o usuario precisa fornecer no config.ini:
call :log   - [mysql_avipe] host, port, database, user e password
call :log   - [mysql_avipe_hml] host, port, database, user e password, se o ambiente HML for usado
call :log   - [mysql_avipe_prd] host, port, database, user e password, se o ambiente PRD for usado
call :log   - [azure], [azure_hml] e [azure_prd] key_vault_url quando a senha estiver como kv:nome-do-segredo
if exist "config.ini" (
    findstr /i /c:"sua_senha_aqui" /c:"127.0.0.1" /c:"coloque_a_senha" "config.ini" >nul 2>&1
    if not errorlevel 1 (
        call :log [AVISO] O arquivo config.ini ainda parece conter valores de exemplo e precisa ser revisado manualmente.
    )
)
exit /b 0

:validarCredenciaisAzure
if not exist "config.ini" exit /b 0

findstr /b /i /c:"password = kv:" "config.ini" >nul 2>&1
if errorlevel 1 (
    call :log [INFO] Nenhuma referencia kv: foi detectada no config.ini.
    exit /b 0
)

call :log [INFO] Foram detectadas referencias kv: no config.ini.
if defined AZURE_CLIENT_ID if defined AZURE_TENANT_ID if defined AZURE_CLIENT_SECRET (
    call :log [OK] Variaveis de ambiente Azure presentes na sessao atual.
) else (
    call :log [AVISO] O config.ini depende de Azure Key Vault, mas as variaveis AZURE_CLIENT_ID, AZURE_TENANT_ID e AZURE_CLIENT_SECRET nao estao completas nesta sessao.
    call :log [AVISO] Sem essas variaveis, o painel so funcionara se houver senha literal no config.ini ou em config.local.ini.
)
exit /b 0

:fail
echo [ERRO] %~1
>>"%LOG_FILE%" echo [ERRO] %~1
if not "%~2"=="" (
    echo %~2
    >>"%LOG_FILE%" echo %~2
)
exit /b 0

:showLogHint
call :log [INFO] Consulte o log para detalhes tecnicos: "%LOG_FILE%"
exit /b 0

:log
if "%~1"=="" (
    echo.
    >>"%LOG_FILE%" echo.
    exit /b 0
)
echo %*
>>"%LOG_FILE%" echo %*
exit /b 0
