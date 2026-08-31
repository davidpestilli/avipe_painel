@echo off
setlocal

cd /d "%~dp0"
set "PACOTES_NPM_DIR=%USERPROFILE%\Downloads\pacotes-npm"

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
    echo [ERRO] Nenhum arquivo de configuracao foi encontrado.
    echo Crie "config.ini" na raiz do projeto.
    echo Veja tambem "config.ini.example".
    echo.
    pause
    exit /b 1
)

if not exist "frontend\dist\index.html" (
    echo [ERRO] O build do frontend React nao foi encontrado em "frontend\dist".
    if exist "frontend\package-lock.json" (
        findstr /i /c:"Downloads/pacotes-npm" "frontend\package-lock.json" >nul 2>&1
        if not errorlevel 1 (
            echo [INFO] Antes de preparar em maquina nova, confira a pasta offline:
            echo [INFO]   "%PACOTES_NPM_DIR%"
            echo [INFO] Essa pasta deve existir com os pacotes .tgz exigidos pelo frontend.
            echo [INFO] Motivo: a rede interna da empresa bloqueia com frequencia o download direto desses pacotes.
        )
    )
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

call :ensureFrontendBuildAtualizado
if errorlevel 1 (
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

:ensureFrontendBuildAtualizado
set "FRONTEND_REBUILD_REQUIRED="
for /f %%I in ('powershell -NoProfile -Command "$dist = Join-Path (Get-Location) 'frontend\\dist\\index.html'; if (-not (Test-Path $dist)) { 'missing'; exit 0 }; $distTime = (Get-Item $dist).LastWriteTimeUtc; $paths = @('frontend\\src','frontend\\index.html','frontend\\package.json','frontend\\package-lock.json','frontend\\tsconfig.json','frontend\\tsconfig.app.json','frontend\\tsconfig.node.json','frontend\\tailwind.config.js','frontend\\postcss.config.js','frontend\\vite.config.ts','frontend\\vite.config.js'); foreach ($path in $paths) { if (Test-Path $path) { $items = if ((Get-Item $path).PSIsContainer) { Get-ChildItem $path -Recurse -File } else { Get-Item $path }; foreach ($item in $items) { if ($item.LastWriteTimeUtc -gt $distTime) { 'stale'; exit 0 } } } }; 'ok'"') do set "FRONTEND_REBUILD_REQUIRED=%%I"

if /i "%FRONTEND_REBUILD_REQUIRED%"=="ok" (
    echo [OK] Build do frontend React ja esta atualizado.
    exit /b 0
)

if /i "%FRONTEND_REBUILD_REQUIRED%"=="stale" (
    echo [INFO] Alteracoes no frontend foram detectadas apos o ultimo build.
    echo [INFO] Reconstruindo frontend React automaticamente...
    pushd frontend
    call npm run build
    set "BUILD_EXIT=%errorlevel%"
    popd
    if not "%BUILD_EXIT%"=="0" (
        echo.
        echo [ERRO] Falha ao reconstruir o frontend React.
        echo [ERRO] Verifique se as dependencias do frontend estao instaladas nesta maquina.
        echo [ERRO] Se necessario, execute preparar_avipe_painel_nova_maquina.bat novamente.
        exit /b 1
    )
    echo [OK] Frontend React reconstruido com sucesso.
    exit /b 0
)

if /i "%FRONTEND_REBUILD_REQUIRED%"=="missing" (
    echo [ERRO] O build do frontend React nao foi encontrado em "frontend\dist".
    exit /b 1
)

echo [AVISO] Nao foi possivel determinar se o build do frontend precisa ser atualizado.
echo [AVISO] O painel tentara iniciar com o build atual.
exit /b 0

:warnAzure
echo [AVISO] Nenhum acesso local ao MySQL AVIPE foi identificado.
echo Para iniciar, use uma destas opcoes:
echo   1. criar o arquivo "config.local.ini" com a senha literal do mysql_avipe
echo   2. definir AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD
echo   3. iniciar este .bat em uma sessao com AZURE_CLIENT_ID, AZURE_TENANT_ID e AZURE_CLIENT_SECRET
echo.
goto :eof
