@echo off
setlocal

cd /d "%~dp0"

echo =========================================
echo  AVIPE Painel - Inicializacao
echo =========================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [ERRO] Ambiente virtual nao encontrado em ".venv".
    echo Crie o ambiente e instale as dependencias antes de iniciar.
    echo Exemplo:
    echo   python -m venv .venv
    echo   .venv\Scripts\python.exe -m pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

if exist "config.ini" (
    echo [OK] Encontrado config.ini local.
) else (
    if exist "..\config.ini" (
        echo [OK] Encontrado config.ini na pasta pai.
    ) else (
        echo [ERRO] Nenhum arquivo de configuracao foi encontrado.
        echo Use uma destas opcoes:
        echo   1. criar "config.ini" dentro de avipe_painel
        echo   2. manter "..\config.ini" na pasta pai
        echo Veja tambem "config.ini.example".
        echo.
        pause
        exit /b 1
    )
)

if not exist "frontend\dist\index.html" (
    echo [ERRO] O build do frontend React nao foi encontrado em "frontend\dist".
    echo Antes de iniciar em uma maquina nova, execute:
    echo   preparar_avipe_painel_nova_maquina.bat
    echo ou rode manualmente:
    echo   cd frontend
    echo   npm install
    echo   npm run build
    echo.
    pause
    exit /b 1
)

if exist "config.local.ini" (
    echo [OK] Encontrado override local: config.local.ini
) else (
    if defined AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD (
        echo [OK] Encontrada senha local pela variavel AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD
    ) else (
        if defined AZURE_CLIENT_ID (
            if defined AZURE_TENANT_ID (
                if defined AZURE_CLIENT_SECRET (
                    echo [OK] Credenciais Azure disponiveis na sessao atual.
                ) else (
                    call :warnAzure
                )
            ) else (
                call :warnAzure
            )
        ) else (
            call :warnAzure
        )
    )
)

echo [INFO] Validando a aplicacao...
".venv\Scripts\python.exe" manage.py check
if errorlevel 1 (
    echo.
    echo [ERRO] A validacao do Django falhou.
    pause
    exit /b 1
)

if not exist "db.sqlite3" (
    echo [INFO] Banco local do Django nao encontrado. Aplicando migracoes iniciais...
    ".venv\Scripts\python.exe" manage.py migrate
    if errorlevel 1 (
        echo.
        echo [ERRO] Falha ao criar a base local do Django.
        pause
        exit /b 1
    )
)

echo.
echo [OK] Painel pronto para iniciar.
echo [INFO] Abra no navegador: http://127.0.0.1:8000/
echo.
".venv\Scripts\python.exe" manage.py runserver
exit /b %errorlevel%

:warnAzure
echo [AVISO] Nenhum acesso local ao MySQL AVIPE foi identificado.
echo Para iniciar, use uma destas opcoes:
echo   1. criar o arquivo "config.local.ini" com a senha literal do mysql_avipe
echo   2. definir AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD
echo   3. iniciar este .bat em uma sessao com AZURE_CLIENT_ID, AZURE_TENANT_ID e AZURE_CLIENT_SECRET
echo.
goto :eof
