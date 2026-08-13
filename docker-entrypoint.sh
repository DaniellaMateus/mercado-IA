#!/bin/sh
set -e

if [ ! -f /app/chroma_db/chroma.sqlite3 ]; then
    echo "Criando a base vetorial dos documentos..."
    python ingest.py
fi

exec uvicorn app:app --host 0.0.0.0 --port 8000
