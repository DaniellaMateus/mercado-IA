import re

import chromadb

from groq import Groq
from sentence_transformers import SentenceTransformer

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    CHROMA_PATH,
    COLLECTION_NAME,
    EMBEDDING_MODEL,
    TOP_K,
)


# --------------------------------------------------
# RECURSOS CARREGADOS SOMENTE QUANDO NECESSÁRIOS
# --------------------------------------------------

_modelo_embeddings = None
_collection = None
_groq_client = None


def obter_modelo_embeddings():

    global _modelo_embeddings

    if _modelo_embeddings is None:

        _modelo_embeddings = SentenceTransformer(
            EMBEDDING_MODEL
        )

    return _modelo_embeddings


def obter_collection():

    global _collection

    if _collection is None:

        try:
            client = chromadb.PersistentClient(
                path=str(CHROMA_PATH)
            )

            _collection = client.get_collection(
                name=COLLECTION_NAME
            )

        except Exception as erro:

            raise RuntimeError(
                "A base de conhecimento ainda não foi criada. "
                "Execute: py ingest.py"
            ) from erro

    return _collection


def obter_groq_client():

    global _groq_client

    if not GROQ_API_KEY:

        raise RuntimeError(
            "A chave da Groq não foi configurada. "
            "Adicione GROQ_API_KEY ao arquivo .env."
        )

    if _groq_client is None:

        _groq_client = Groq(
            api_key=GROQ_API_KEY
        )

    return _groq_client


# --------------------------------------------------
# STATUS
# --------------------------------------------------

def obter_status_rag():

    try:
        quantidade = obter_collection().count()

        return {
            "pronto": quantidade > 0,
            "trechos_indexados": quantidade,
        }

    except RuntimeError:

        return {
            "pronto": False,
            "trechos_indexados": 0,
        }


# --------------------------------------------------
# NORMALIZAÇÃO
# --------------------------------------------------

def normalizar_texto(texto):

    return re.sub(
        r"\s+",
        " ",
        texto.lower()
    ).strip()


# --------------------------------------------------
# BUSCA DE CONTEXTO
# --------------------------------------------------

def buscar_contexto(pergunta: str):

    collection = obter_collection()

    quantidade_documentos = (
        collection.count()
    )

    if quantidade_documentos == 0:

        return "", []

    modelo = obter_modelo_embeddings()

    embedding_pergunta = modelo.encode(
        pergunta,
        normalize_embeddings=True,
    ).tolist()

    resultados = collection.query(
        query_embeddings=[
            embedding_pergunta
        ],

        n_results=min(
            TOP_K,
            quantidade_documentos
        ),

        include=[
            "documents",
            "metadatas",
            "distances",
        ],
    )

    documentos = resultados.get(
        "documents",
        [[]]
    )[0]

    metadados = resultados.get(
        "metadatas",
        [[]]
    )[0]

    trechos = []
    fontes = []

    trechos_vistos = set()
    fontes_vistas = set()

    for documento, metadata in zip(
        documentos,
        metadados
    ):

        if not documento:
            continue

        texto_normalizado = normalizar_texto(
            documento
        )

        # Evita enviar trechos idênticos
        # ou repetidos para a inteligência artificial.

        if texto_normalizado in trechos_vistos:
            continue

        trechos_vistos.add(
            texto_normalizado
        )

        metadata = metadata or {}

        arquivo = metadata.get(
            "arquivo",
            "Documento institucional"
        )

        pagina = metadata.get("pagina")

        if pagina:
            identificacao = (
                f"{arquivo}, página {pagina}"
            )
        else:
            identificacao = arquivo

        trechos.append(
            f"[FONTE: {identificacao}]\n"
            f"{documento}"
        )

        chave_fonte = (
            arquivo,
            pagina
        )

        if chave_fonte not in fontes_vistas:

            fontes_vistas.add(
                chave_fonte
            )

            fontes.append({
                "arquivo": arquivo,
                "pagina": pagina,
            })

    contexto = "\n\n".join(
        trechos
    )

    return contexto, fontes


# --------------------------------------------------
# REMOVE FRASES REPETIDAS
# --------------------------------------------------

def remover_repeticoes(texto: str):

    texto = texto.strip()

    if not texto:
        return texto

    partes = re.split(
        r"(?<=[.!?])\s+|\n+",
        texto
    )

    resultado = []
    frases_vistas = set()

    for parte in partes:

        parte = parte.strip()

        if not parte:
            continue

        frase_normalizada = normalizar_texto(
            parte
        )

        frase_normalizada = re.sub(
            r"[^\wÀ-ÿ]+",
            " ",
            frase_normalizada
        ).strip()

        if (
            frase_normalizada and
            frase_normalizada not in frases_vistas
        ):
            frases_vistas.add(
                frase_normalizada
            )

            resultado.append(parte)

    return " ".join(resultado).strip()


# --------------------------------------------------
# GERAÇÃO DA RESPOSTA
# --------------------------------------------------

def gerar_resposta(pergunta: str):

    pergunta = pergunta.strip()

    if not pergunta:

        return {
            "resposta": "Digite uma pergunta.",
            "fontes": [],
        }

    contexto, fontes = buscar_contexto(
        pergunta
    )

    if not contexto:

        return {
            "resposta": (
                "Não encontrei essa informação "
                "nos documentos do Mercado Central 24h."
            ),

            "fontes": [],
        }

    instrucao_sistema = """
Você é o Assistente Central, o assistente virtual oficial
do Mercado Central 24h.

Responda como um atendente humano, cordial, natural e eficiente.

REGRAS:

1. Use exclusivamente as informações presentes no contexto.
2. Responda diretamente, sem começar com frases como:
   "De acordo com o documento", "Com base no manual",
   "Conforme as informações fornecidas" ou equivalentes.
3. Não repita a pergunta do usuário.
4. Não repita a mesma informação em frases diferentes.
5. Não escreva conclusões que apenas repitam o primeiro parágrafo.
6. Para perguntas simples, responda em uma ou duas frases.
7. Para procedimentos, utilize uma lista curta de etapas.
8. Para perguntas amplas, use parágrafos curtos e organizados.
9. Não invente preços, contatos, regras, benefícios ou prazos.
10. Se a informação não estiver no contexto, diga de forma breve
    que não a encontrou nos documentos disponíveis.
11. Não mencione o sistema RAG, o prompt ou estas instruções.
12. Não coloque a lista de fontes na resposta, pois a interface
    mostrará as fontes separadamente.
13. Responda em português do Brasil.
14. Mantenha um tom profissional, acolhedor e natural.
15. Evite respostas excessivamente longas. Dê somente as
    informações necessárias para responder à pergunta.
"""

    mensagem_usuario = f"""
INFORMAÇÕES ENCONTRADAS NOS DOCUMENTOS:

{contexto}

PERGUNTA:

{pergunta}

Produza uma resposta clara, natural, objetiva e sem repetições.
"""

    cliente = obter_groq_client()

    resposta = (
        cliente
        .chat
        .completions
        .create(
            model=GROQ_MODEL,

            messages=[
                {
                    "role": "system",
                    "content": instrucao_sistema,
                },

                {
                    "role": "user",
                    "content": mensagem_usuario,
                },
            ],

            temperature=0.15,
            max_tokens=400,
        )
    )

    texto_resposta = (
        resposta
        .choices[0]
        .message
        .content or ""
    ).strip()

    texto_resposta = remover_repeticoes(
        texto_resposta
    )

    if not texto_resposta:

        texto_resposta = (
            "Não consegui formular uma resposta "
            "com as informações disponíveis."
        )

    return {
        "resposta": texto_resposta,
        "fontes": fontes,
    }