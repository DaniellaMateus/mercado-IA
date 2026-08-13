@echo off
title Mercado Central 24h

if not exist .venv\Scripts\activate.bat (
    echo O projeto ainda nao foi preparado.
    echo Execute primeiro o arquivo preparar_projeto.bat.
    pause
    exit /b 1
)

if not exist chroma_db\chroma.sqlite3 (
    echo A base de conhecimento ainda nao foi criada.
    echo Execute primeiro o arquivo preparar_projeto.bat.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
start "" http://127.0.0.1:8000
py -m uvicorn app:app --host 127.0.0.1 --port 8000

pause
