# Mercado Central 24h - Assistente Virtual com RAG

Assistente corporativo inteligente do **Mercado Central 24h**, desenvolvido para o Desafio Final da Alura (Agente Alura).

> O Assistente Central não é um chatbot genérico. Ele consulta documentos institucionais reais, responde com base no conteúdo recuperado e mostra os arquivos e páginas utilizados como fonte.

## Sobre o projeto

O Mercado Central 24h é um supermercado moderno com operação contínua, lojas físicas, delivery, aplicativo próprio e o programa de fidelidade **Cliente VIP Central**. O assistente foi criado para facilitar o acesso a informações de atendimento, operação, fornecedores, estoque e políticas internas.

## Principais recursos

- Busca semântica em vários documentos PDF.
- Respostas geradas com Groq e fundamentadas por RAG.
- Banco vetorial persistente com ChromaDB.
- Embeddings locais com Sentence Transformers.
- Exibição do documento e da página consultados.
- Interface responsiva com aparência de chatbot.
- Sugestões rápidas de perguntas.
- Tratamento de erros e validação de entrada.

## Documentos utilizados

- Manual de Perguntas Frequentes (FAQ).
- Regulamento Interno e Manual de Procedimentos Operacionais.
- Manual de Fornecedores e Política de Compras.
- Política Integrada de Atendimento, Trocas, Devoluções e Privacidade.

## Tecnologias

- Python
- FastAPI e Uvicorn
- Groq
- ChromaDB
- Sentence Transformers
- PyPDF
- HTML, CSS e JavaScript

## Estrutura

```text
MERCADO-CENTRAL-24H/
├── chroma_db/              # Banco vetorial gerado pela ingestão
├── documentos/             # Documentos institucionais em PDF
├── static/
│   ├── fundo-mercado-central.jpg
│   ├── script.js
│   └── style.css
├── templates/
│   └── index.html
├── .env.example
├── .gitignore
├── app.py
├── config.py
├── Dockerfile
├── docker-entrypoint.sh
├── ingest.py
├── iniciar_site.bat
├── preparar_projeto.bat
├── rag.py
├── requirements.txt
└── README.md
```

## Como executar no Windows

Abra a pasta do projeto no VS Code e execute no PowerShell:

```powershell
py -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Abra o arquivo `.env` e substitua `cole_sua_chave_aqui` pela sua chave da Groq.

Crie o banco vetorial com os quatro documentos:

```powershell
py ingest.py
```

Depois inicie o site:

```powershell
py -m uvicorn app:app --reload
```

Acesse: [http://127.0.0.1:8000](http://127.0.0.1:8000)

### Opção mais simples

No Windows, você também pode executar `preparar_projeto.bat`, adicionar sua chave no `.env` quando solicitado e executar o preparador novamente. Quando a preparação terminar, abra `iniciar_site.bat` para iniciar o servidor e acessar o chatbot.

## Atualizar a documentação

1. Adicione ou remova PDFs na pasta `documentos`.
2. Execute novamente `py ingest.py`.
3. Reinicie o servidor.

O processo recria a coleção vetorial e passa a usar a documentação atualizada.

## Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `GROQ_API_KEY` | Chave utilizada para gerar as respostas. |
| `GROQ_MODEL` | Modelo da Groq. O padrão é `llama-3.1-8b-instant`. |

## Segurança

O arquivo `.env` não deve ser enviado ao GitHub, pois contém uma credencial privada. O repositório inclui apenas o modelo seguro `.env.example`.

## Limitações

- As respostas dependem do conteúdo presente nos PDFs.
- O sistema não consulta preços, estoque ou pedidos em tempo real.
- A geração da resposta depende da disponibilidade da API da Groq.
- Informações importantes devem ser confirmadas nos documentos indicados como fonte.

## Autoria

Desenvolvido para fins educacionais no programa Oracle Next Education e Alura.
