import hashlib
from pathlib import Path

import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

from config import (
    CHROMA_PATH,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    COLLECTION_NAME,
    DOCUMENTS_DIR,
    EMBEDDING_MODEL,
)


def listar_pdfs() -> list[Path]:
    arquivos = sorted(DOCUMENTS_DIR.glob("*.pdf"))

    if not arquivos:
        raise FileNotFoundError(
            f"Nenhum PDF foi encontrado na pasta: {DOCUMENTS_DIR}"
        )

    return arquivos


def criar_chunks(texto: str, tamanho: int, sobreposicao: int) -> list[str]:
    texto = " ".join(texto.split())

    if not texto:
        return []

    chunks = []
    inicio = 0

    while inicio < len(texto):
        fim = min(inicio + tamanho, len(texto))

        if fim < len(texto):
            ultimo_espaco = texto.rfind(" ", inicio, fim)
            if ultimo_espaco > inicio:
                fim = ultimo_espaco

        chunk = texto[inicio:fim].strip()
        if chunk:
            chunks.append(chunk)

        if fim >= len(texto):
            break

        inicio = max(fim - sobreposicao, inicio + 1)

    return chunks


def extrair_documentos():
    documentos = []
    metadados = []
    ids = []

    for pdf_path in listar_pdfs():
        print(f"Lendo: {pdf_path.name}")
        reader = PdfReader(pdf_path)

        for pagina_numero, pagina in enumerate(reader.pages, start=1):
            texto = pagina.extract_text() or ""
            chunks = criar_chunks(texto, CHUNK_SIZE, CHUNK_OVERLAP)

            for chunk_numero, chunk in enumerate(chunks, start=1):
                identificador = hashlib.sha1(
                    f"{pdf_path.name}:{pagina_numero}:{chunk_numero}".encode("utf-8")
                ).hexdigest()

                ids.append(identificador)
                documentos.append(chunk)
                metadados.append(
                    {
                        "arquivo": pdf_path.name,
                        "pagina": pagina_numero,
                        "chunk": chunk_numero,
                    }
                )

    return ids, documentos, metadados


def criar_banco_vetorial():
    ids, documentos, metadados = extrair_documentos()

    if not documentos:
        raise ValueError("Os PDFs não possuem texto que possa ser indexado.")

    print(f"\nGerando embeddings para {len(documentos)} trechos...")
    modelo = SentenceTransformer(EMBEDDING_MODEL)
    embeddings = modelo.encode(
        documentos,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))

    try:
        client.delete_collection(name=COLLECTION_NAME)
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    tamanho_lote = 100
    for inicio in range(0, len(documentos), tamanho_lote):
        fim = inicio + tamanho_lote
        collection.add(
            ids=ids[inicio:fim],
            documents=documentos[inicio:fim],
            embeddings=embeddings[inicio:fim].tolist(),
            metadatas=metadados[inicio:fim],
        )

    print("\nBanco vetorial criado com sucesso.")
    print(f"PDFs indexados: {len(listar_pdfs())}")
    print(f"Trechos armazenados: {collection.count()}")
    print(f"Banco salvo em: {CHROMA_PATH}")


if __name__ == "__main__":
    criar_banco_vetorial()
