from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from rag import gerar_resposta, obter_status_rag


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Mercado Central 24h - Assistente Virtual",
    description="Assistente corporativo com RAG para o Mercado Central 24h",
    version="2.0.0",
)

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)


class PerguntaRequest(BaseModel):
    pergunta: str = Field(min_length=1, max_length=1000)


@app.get("/", response_class=HTMLResponse)
async def pagina_inicial():
    arquivo_html = BASE_DIR / "templates" / "index.html"

    if not arquivo_html.exists():
        raise HTTPException(
            status_code=500,
            detail="A interface do assistente não foi encontrada.",
        )

    return arquivo_html.read_text(encoding="utf-8")


@app.post("/api/perguntar")
async def perguntar(dados: PerguntaRequest):
    pergunta = dados.pergunta.strip()

    if not pergunta:
        raise HTTPException(status_code=400, detail="Digite uma pergunta.")

    try:
        resultado = gerar_resposta(pergunta)
        return {
            "sucesso": True,
            "pergunta": pergunta,
            "resposta": resultado["resposta"],
            "fontes": resultado["fontes"],
        }
    except RuntimeError as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro
    except Exception as erro:
        print(f"Erro ao processar pergunta: {erro}")
        raise HTTPException(
            status_code=500,
            detail="Não foi possível processar a pergunta neste momento.",
        ) from erro


@app.get("/api/status")
async def status():
    return {
        "status": "online",
        "agente": "Mercado Central 24h",
        "rag": obter_status_rag(),
        "banco_vetorial": "ChromaDB",
        "llm": "Groq",
    }
