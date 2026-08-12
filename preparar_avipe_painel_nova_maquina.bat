@echo off
setlocal

cd /d "%~dp0"

echo =========================================
echo  AVIPE Painel - Preparacao de nova maquina
echo =========================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Python nao foi encontrado no PATH.
    echo Instale o Python e tente novamente.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERRO] npm nao foi encontrado no PATH.
    echo Instale o Node.js e tente novamente.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Criando ambiente virtual...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar o ambiente virtual.
        pause
        exit /b 1
    )
) else (
    echo [OK] Ambiente virtual ja existe.
)

echo [INFO] Instalando dependencias Python...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
    echo [ERRO] Falha ao atualizar o pip.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar requirements.txt.
    pause
    exit /b 1
)

echo [INFO] Instalando dependencias do frontend React...
pushd frontend
call npm install
if errorlevel 1 (
    popd
    echo [ERRO] Falha ao instalar dependencias do frontend.
    pause
    exit /b 1
)

echo [INFO] Gerando build do frontend React...
call npm run build
if errorlevel 1 (
    popd
    echo [ERRO] Falha ao gerar o build do frontend.
    pause
    exit /b 1
)
popd

echo [INFO] Aplicando migracoes locais do Django...
".venv\Scripts\python.exe" manage.py migrate
if errorlevel 1 (
    echo [ERRO] Falha ao aplicar as migracoes locais.
    pause
    exit /b 1
)

echo.
echo [OK] Preparacao concluida.
echo Proximos passos:
echo   1. criar "config.ini" local ou garantir "..\config.ini" na pasta pai
echo   2. configurar Azure ou "config.local.ini" se necessario
echo   3. iniciar com "iniciar_avipe_painel.bat"
echo.
pause
exit /b 0
