const form = document.getElementById("chat-form");
const input = document.getElementById("pergunta");
const chat = document.getElementById("chat");
const typing = document.getElementById("typing");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");

let processandoPergunta = false;

const TEMPO_LIMITE_RESPOSTA = 60000;


// ENVIO PELO FORMULÁRIO

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const pergunta = input.value.trim();

    if (!pergunta || processandoPergunta) {
        return;
    }

    await enviarPergunta(pergunta);
});


// ENTER ENVIA E SHIFT + ENTER QUEBRA A LINHA

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});


// AJUSTA A ALTURA DO CAMPO

input.addEventListener("input", ajustarAlturaInput);


// CLIQUES NAS SUGESTÕES E NO MENU LATERAL

document.addEventListener("click", async function (event) {
    const botao = event.target.closest("[data-question]");

    if (!botao || processandoPergunta) {
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

    await enviarPergunta(botao.dataset.question);
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
    adicionarMensagem(pergunta, "user");

    input.value = "";
    ajustarAlturaInput();

    input.disabled = true;
    sendButton.disabled = true;
    form.setAttribute("aria-busy", "true");

    exibirDigitacao(true);

    const controller = new AbortController();

    const timeout = setTimeout(function () {
        controller.abort();
    }, TEMPO_LIMITE_RESPOSTA);

    try {
        if (!navigator.onLine) {
            throw new Error(
                "Você parece estar sem conexão com a internet. Verifique sua rede e tente novamente."
            );
        }

        const response = await fetch("/api/perguntar", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                pergunta: pergunta
            }),

            signal: controller.signal
        });

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
                "Não foi possível consultar a assistente."
            );
        }

        if (!data.resposta) {
            throw new Error(
                "A assistente não retornou uma resposta."
            );
        }

        adicionarMensagem(
            data.resposta,
            "bot",
            data.fontes || []
        );

    } catch (erro) {
        console.error("Erro ao enviar pergunta:", erro);

        const mensagemErro =
            erro.name === "AbortError"
                ? "A consulta demorou mais que o esperado. Tente novamente em alguns instantes."
                : (
                    erro.message ||
                    "Não consegui responder agora. Tente novamente em alguns instantes."
                );

        adicionarMensagem(
            mensagemErro,
            "bot",
            [],
            { erro: true }
        );

    } finally {
        clearTimeout(timeout);

        exibirDigitacao(false);

        input.disabled = false;
        sendButton.disabled = false;

        form.removeAttribute("aria-busy");

        processandoPergunta = false;

        input.focus();
        rolarChat();
    }
}


// REMOVE A TELA INICIAL

function removerBoasVindas() {
    const welcome = document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }
}


// ADICIONA UMA MENSAGEM

function adicionarMensagem(
    texto,
    tipo,
    fontes = [],
    opcoes = {}
) {
    const mensagem = document.createElement("div");

    mensagem.className = `message message-${tipo}`;

    if (tipo === "bot") {
        const avatar = document.createElement("div");

        avatar.className = "message-avatar";
        avatar.textContent = "MIA";
        avatar.setAttribute(
            "aria-label",
            "Mensagem da MIA"
        );

        mensagem.appendChild(avatar);
    }

    const wrap = document.createElement("div");
    wrap.className = "message-wrap";

    if (tipo === "bot") {
        const selo = document.createElement("span");

        selo.className = opcoes.erro
            ? "answer-badge answer-badge-error"
            : "answer-badge";

        if (opcoes.erro) {
            selo.textContent =
                "⚠ Não foi possível consultar";
        } else if (
            Array.isArray(fontes) &&
            fontes.length > 0
        ) {
            selo.textContent = "▣ Base documental";
        } else {
            selo.textContent = "✦ Resposta da MIA";
        }

        wrap.appendChild(selo);
    }

    const bolha = document.createElement("div");

    bolha.className = "message-bubble";
    bolha.textContent = texto;

    wrap.appendChild(bolha);

    if (
        tipo === "bot" &&
        Array.isArray(fontes) &&
        fontes.length > 0
    ) {
        wrap.appendChild(criarFontes(fontes));
    }

    const rodapeMensagem =
        document.createElement("div");

    rodapeMensagem.className =
        "message-footer-line";

    const horario = document.createElement("span");

    horario.className = "message-time";

    horario.textContent = new Intl.DateTimeFormat(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(new Date());

    rodapeMensagem.appendChild(horario);

    if (tipo === "bot" && !opcoes.erro) {
        const copiar = document.createElement("button");

        copiar.type = "button";
        copiar.className = "copy-button";
        copiar.textContent = "Copiar";

        copiar.setAttribute(
            "aria-label",
            "Copiar resposta da MIA"
        );

        copiar.addEventListener("click", function () {
            copiarResposta(texto, copiar);
        });

        rodapeMensagem.appendChild(copiar);
    }

    wrap.appendChild(rodapeMensagem);
    mensagem.appendChild(wrap);
    chat.appendChild(mensagem);

    rolarChat();
}


// CRIA A LISTA RECOLHÍVEL DE FONTES

function criarFontes(fontes) {
    const detalhes = document.createElement("details");
    detalhes.className = "sources";

    const fontesAgrupadas = agruparFontes(fontes);

    const resumo = document.createElement("summary");

    resumo.textContent =
        fontesAgrupadas.length === 1
            ? "Ver 1 fonte consultada"
            : `Ver ${fontesAgrupadas.length} fontes consultadas`;

    detalhes.appendChild(resumo);

    const lista = document.createElement("div");
    lista.className = "sources-list";

    fontesAgrupadas.forEach(function (fonte) {
        const item = document.createElement("span");

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
    });

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
            agrupadas.set(arquivo, new Set());
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


// COPIA UMA RESPOSTA

async function copiarResposta(texto, botao) {
    const rotuloOriginal = botao.textContent;

    try {
        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            await navigator.clipboard.writeText(texto);
        } else {
            const areaTemporaria =
                document.createElement("textarea");

            areaTemporaria.value = texto;
            areaTemporaria.style.position = "fixed";
            areaTemporaria.style.opacity = "0";

            document.body.appendChild(areaTemporaria);

            areaTemporaria.select();

            const copiado =
                document.execCommand("copy");

            areaTemporaria.remove();

            if (!copiado) {
                throw new Error(
                    "Cópia não suportada"
                );
            }
        }

        botao.textContent = "Copiado ✓";

    } catch {
        botao.textContent =
            "Não foi possível copiar";
    }

    setTimeout(function () {
        botao.textContent = rotuloOriginal;
    }, 1800);
}


// MOSTRA OU ESCONDE O INDICADOR DE DIGITAÇÃO

function exibirDigitacao(visivel) {
    typing.classList.toggle("visible", visivel);

    typing.setAttribute(
        "aria-hidden",
        String(!visivel)
    );
}


// AJUSTA O TEXTAREA

function ajustarAlturaInput() {
    input.style.height = "auto";

    input.style.height =
        `${Math.min(input.scrollHeight, 100)}px`;
}


// ROLA EXCLUSIVAMENTE A ÁREA DO CHAT

function rolarChat() {
    requestAnimationFrame(function () {
        chat.scrollTo({
            top: chat.scrollHeight,
            behavior: "smooth"
        });
    });
}


// CONTEÚDO DA NOVA CONVERSA

function criarBoasVindas() {
    return `
        <section class="welcome" id="welcome">

            <span class="welcome-tag">
                ✦ PROJETO DE IA GENERATIVA + RAG
            </span>

            <div class="welcome-icon">
                MIA
            </div>

            <h2>
                Olá, eu sou a MIA.<br>
                Como posso ajudar você hoje?
            </h2>

            <p>
                A assistente inteligente do Mercado Central 24h
                pesquisa a base documental da empresa para oferecer
                respostas confiáveis a clientes, colaboradores
                e fornecedores.
            </p>

            <div
                class="welcome-features"
                aria-label="Diferenciais do projeto"
            >
                <span class="feature-pill">
                    <strong>RAG</strong>
                    Consulta contextual
                </span>

                <span class="feature-pill">
                    <strong>Base oficial</strong>
                    Respostas fundamentadas
                </span>

                <span class="feature-pill">
                    <strong>24 horas</strong>
                    Atendimento inteligente
                </span>
            </div>

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