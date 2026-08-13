const form = document.getElementById("chat-form");
const input = document.getElementById("pergunta");
const chat = document.getElementById("chat");
const typing = document.getElementById("typing");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");

let processandoPergunta = false;


// ENVIO PELO FORMULÁRIO

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const pergunta = input.value.trim();

    if (
        !pergunta ||
        processandoPergunta
    ) {
        return;
    }

    await enviarPergunta(pergunta);
});


// ENTER ENVIA E SHIFT + ENTER QUEBRA A LINHA

input.addEventListener("keydown", function (event) {
    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {
        event.preventDefault();
        form.requestSubmit();
    }
});


// AJUSTA A ALTURA DO CAMPO

input.addEventListener("input", ajustarAlturaInput);


// CLIQUES NAS SUGESTÕES E MENU LATERAL

document.addEventListener("click", async function (event) {
    const botao = event.target.closest(
        "[data-question]"
    );

    if (
        !botao ||
        processandoPergunta
    ) {
        return;
    }

    document
        .querySelectorAll(".nav-item")
        .forEach(function (item) {
            item.classList.remove("active");
        });

    if (botao.classList.contains("nav-item")) {
        botao.classList.add("active");
    }

    await enviarPergunta(
        botao.dataset.question
    );
});


// NOVA CONVERSA

clearButton.addEventListener("click", function () {
    if (processandoPergunta) {
        return;
    }

    chat.innerHTML = criarBoasVindas();

    input.value = "";
    ajustarAlturaInput();
    input.focus();

    document
        .querySelectorAll(".nav-item")
        .forEach(function (item) {
            item.classList.remove("active");
        });

    document
        .querySelector(".nav-item")
        ?.classList.add("active");
});


// ENVIA A PERGUNTA PARA A API

async function enviarPergunta(pergunta) {
    processandoPergunta = true;

    removerBoasVindas();

    adicionarMensagem(
        pergunta,
        "user"
    );

    input.value = "";
    ajustarAlturaInput();

    input.disabled = true;
    sendButton.disabled = true;

    exibirDigitacao(true);

    try {
        const response = await fetch(
            "/api/perguntar",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    pergunta: pergunta
                })
            }
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "O servidor retornou uma resposta inválida."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.detail ||
                "Não foi possível consultar o assistente."
            );
        }

        if (!data.resposta) {
            throw new Error(
                "O assistente não retornou uma resposta."
            );
        }

        adicionarMensagem(
            data.resposta,
            "bot",
            data.fontes || []
        );

    } catch (erro) {
        console.error(
            "Erro ao enviar pergunta:",
            erro
        );

        adicionarMensagem(
            erro.message ||
            "Não consegui responder agora. Tente novamente em alguns instantes.",
            "bot"
        );

    } finally {
        exibirDigitacao(false);

        input.disabled = false;
        sendButton.disabled = false;

        processandoPergunta = false;

        input.focus();
        rolarChat();
    }
}


// REMOVE A TELA INICIAL

function removerBoasVindas() {
    const welcome =
        document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }
}


// ADICIONA UMA MENSAGEM

function adicionarMensagem(
    texto,
    tipo,
    fontes = []
) {
    const mensagem =
        document.createElement("div");

    mensagem.className =
        `message message-${tipo}`;

    if (tipo === "bot") {
        const avatar =
            document.createElement("div");

        avatar.className =
            "message-avatar";

        avatar.textContent = "MC";

        mensagem.appendChild(avatar);
    }

    const wrap =
        document.createElement("div");

    wrap.className = "message-wrap";

    const bolha =
        document.createElement("div");

    bolha.className = "message-bubble";
    bolha.textContent = texto;

    wrap.appendChild(bolha);

    if (
        tipo === "bot" &&
        Array.isArray(fontes) &&
        fontes.length > 0
    ) {
        wrap.appendChild(
            criarFontes(fontes)
        );
    }

    const horario =
        document.createElement("span");

    horario.className = "message-time";

    horario.textContent =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(new Date());

    wrap.appendChild(horario);
    mensagem.appendChild(wrap);
    chat.appendChild(mensagem);

    rolarChat();
}


// CRIA A LISTA RECOLHÍVEL DE FONTES

function criarFontes(fontes) {
    const detalhes =
        document.createElement("details");

    detalhes.className = "sources";

    const resumo =
        document.createElement("summary");

    resumo.textContent =
        "Ver fontes consultadas";

    detalhes.appendChild(resumo);

    const lista =
        document.createElement("div");

    lista.className = "sources-list";

    const fontesAgrupadas =
        agruparFontes(fontes);

    fontesAgrupadas.forEach(
        function (fonte) {
            const item =
                document.createElement("span");

            const paginas =
                fonte.paginas.length > 0
                    ? ` · página${
                        fonte.paginas.length > 1
                            ? "s"
                            : ""
                    } ${fonte.paginas.join(", ")}`
                    : "";

            item.textContent =
                `${fonte.arquivo}${paginas}`;

            lista.appendChild(item);
        }
    );

    detalhes.appendChild(lista);

    return detalhes;
}


// AGRUPA PÁGINAS DO MESMO DOCUMENTO

function agruparFontes(fontes) {
    const agrupadas = new Map();

    fontes.forEach(function (fonte) {
        const arquivo =
            typeof fonte === "string"
                ? fonte
                : (
                    fonte.arquivo ||
                    fonte.nome ||
                    "Documento institucional"
                );

        const pagina =
            typeof fonte === "object"
                ? fonte.pagina
                : null;

        if (!agrupadas.has(arquivo)) {
            agrupadas.set(
                arquivo,
                new Set()
            );
        }

        if (pagina) {
            agrupadas
                .get(arquivo)
                .add(Number(pagina));
        }
    });

    return Array
        .from(agrupadas.entries())
        .map(function ([arquivo, paginas]) {
            return {
                arquivo: arquivo,

                paginas: Array
                    .from(paginas)
                    .sort(function (a, b) {
                        return a - b;
                    })
            };
        });
}


// MOSTRA OU ESCONDE O INDICADOR

function exibirDigitacao(visivel) {
    typing.classList.toggle(
        "visible",
        visivel
    );

    typing.setAttribute(
        "aria-hidden",
        String(!visivel)
    );
}


// AJUSTA O TEXTAREA

function ajustarAlturaInput() {
    input.style.height = "auto";

    input.style.height =
        `${Math.min(
            input.scrollHeight,
            100
        )}px`;
}


// ROLA EXCLUSIVAMENTE A ÁREA DO CHAT

function rolarChat() {
    requestAnimationFrame(
        function () {
            chat.scrollTo({
                top: chat.scrollHeight,
                behavior: "smooth"
            });
        }
    );
}


// CONTEÚDO DA NOVA CONVERSA

function criarBoasVindas() {
    return `
        <section class="welcome" id="welcome">

            <span class="welcome-tag">
                ✦ MERCADO CENTRAL INTELLIGENCE
            </span>

            <div class="welcome-icon">
                MC
            </div>

            <h2>
                Informação confiável para clientes,
                colaboradores e fornecedores.
            </h2>

            <p>
                Converse com o assistente inteligente do Mercado
                Central 24h e encontre respostas fundamentadas
                nos documentos oficiais da empresa.
            </p>

            <div class="suggestions">

                <button
                    type="button"
                    data-question="Como funciona o programa Cliente VIP Central?"
                >
                    <span class="suggestion-icon">★</span>

                    <div>
                        <strong>Cliente VIP Central</strong>

                        <small>
                            Benefícios, cadastro e funcionamento
                        </small>
                    </div>
                </button>

                <button
                    type="button"
                    data-question="Quais são as regras para trocas e devoluções?"
                >
                    <span class="suggestion-icon">↻</span>

                    <div>
                        <strong>Trocas e devoluções</strong>

                        <small>
                            Prazos e procedimentos
                        </small>
                    </div>
                </button>

                <button
                    type="button"
                    data-question="Como funciona o delivery do Mercado Central 24h?"
                >
                    <span class="suggestion-icon">⌁</span>

                    <div>
                        <strong>Delivery e aplicativo</strong>

                        <small>
                            Pedidos, entregas e atendimento
                        </small>
                    </div>
                </button>

                <button
                    type="button"
                    data-question="Qual é o horário de funcionamento das lojas?"
                >
                    <span class="suggestion-icon">◷</span>

                    <div>
                        <strong>Funcionamento</strong>

                        <small>
                            Horários e infraestrutura
                        </small>
                    </div>
                </button>

            </div>

        </section>
    `;
}