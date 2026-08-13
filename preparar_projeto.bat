@echo off
title Preparar Mercado Central 24h
echo.
echo ==========================================
echo   MERCADO CENTRAL 24H - PREPARACAO
echo ==========================================
echo.

if not exist .venv (
    echo Criando o ambiente virtual...
    py -m venv .venv
    if errorlevel 1 goto erro
)

call .venv\Scripts\activate.bat

echo Instalando as dependencias...
py -m pip install -r requirements.txt
if errorlevel 1 goto erro

if not exist .env (
    copy .env.example .env >nul
    echo.
    echo O arquivo .env foi criado.
    echo Abra esse arquivo e adicione sua chave GROQ_API_KEY.
    echo Depois execute este preparador novamente.
    pause
    exit /b 0
)

findstr /C:"cole_sua_chave_aqui" .env >nul
if not errorlevel 1 (
    echo.
    echo Adicione sua chave da Groq ao arquivo .env antes de continuar.
    pause
    exit /b 0
)

echo Criando a base de conhecimento com os PDFs...
py ingest.py
if errorlevel 1 goto erro

echo.
echo Projeto preparado com sucesso.
echo Agora execute iniciar_site.bat.
pause
exit /b 0

:erro
echo.
echo Ocorreu um erro durante a preparacao.
echo Verifique as mensagens acima antes de tentar novamente.
pause
exit /b 1
