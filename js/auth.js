(function configurarAutenticacao() {
    const MODULOS_PORTAL = [
        { id: "home", nome: "Menu", caminho: "index.html", padrao: true },
        { id: "sazonalidade", nome: "Sazonalidade", caminho: "modulos/sazonalidade/index.html" },
        { id: "desligamentos", nome: "Desligamentos", caminho: "modulos/desligamentos/index.html" },
        { id: "producao", nome: "Produção", caminho: "modulos/producao/index.html" },
        { id: "colaboradores", nome: "Colaboradores", caminho: "modulos/colaboradores/index.html" },
        { id: "importar-producao", nome: "Importar dados", caminho: "modulos/importar-producao/index.html" },
        { id: "memoria-calculo", nome: "Memória de cálculo", caminho: "modulos/memoria-calculo/index.html" },
        { id: "usuarios", nome: "Usuários", caminho: "modulos/usuarios/index.html", admin: true }
    ];
    const USUARIOS_PADRAO = [
        { usuario: "Rodrigo", senha: "000", nome: "Rodrigo", perfil: "admin", modulos: ["todos"], fixo: true }
    ];
    const CHAVE_SESSAO = "portal_ciee_sessao";
    const COLECAO_USUARIOS = "usuarios_login";
    const paginaLogin = location.pathname.toLowerCase().endsWith("/login.html");
    const paginaUsuarios = location.pathname.toLowerCase().includes("/modulos/usuarios/");
    const caminhoLogin = `${caminhoBase()}login.html`;
    const caminhoInicial = `${caminhoBase()}index.html`;
    let firebaseDbPromise = null;

    const firebaseConfig = {
        apiKey: "AIzaSyD7OHPZ8flOUGyCrdL3Sp-ZTASj03Dbn94",
        authDomain: "portal-producao-d3a08.firebaseapp.com",
        projectId: "portal-producao-d3a08",
        storageBucket: "portal-producao-d3a08.firebasestorage.app",
        messagingSenderId: "881576324700",
        appId: "1:881576324700:web:c68bdbe4c309d5fd1f4099"
    };

    function caminhoBase() {
        return location.pathname.includes("/modulos/") ? "../../" : "./";
    }

    function normalizarId(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }

    function normalizarPerfil(perfil) {
        return perfil === "admin" ? "admin" : "visualizacao";
    }

    function normalizarModulosUsuario(usuario) {
        if (normalizarPerfil(usuario?.perfil) === "admin") {
            return ["todos"];
        }

        const permitidos = new Set(MODULOS_PORTAL.filter(modulo => !modulo.admin).map(modulo => modulo.id));
        const modulos = Array.isArray(usuario?.modulos) ? usuario.modulos : [];
        const filtrados = modulos.filter(modulo => permitidos.has(modulo));

        return filtrados.length ? [...new Set(filtrados)] : ["home"];
    }

    function normalizarUsuario(usuario) {
        const perfil = normalizarPerfil(usuario?.perfil);

        return {
            ...usuario,
            perfil,
            modulos: perfil === "admin" ? ["todos"] : normalizarModulosUsuario({ ...usuario, perfil })
        };
    }

    function moduloAtual() {
        const path = location.pathname.toLowerCase().replace(/\\/g, "/");

        if (path.endsWith("/login.html")) {
            return "login";
        }

        if (path.includes("/modulos/sazonalidade/")) return "sazonalidade";
        if (path.includes("/modulos/desligamentos/")) return "desligamentos";
        if (path.includes("/modulos/producao/")) return "producao";
        if (path.includes("/modulos/colaboradores/")) return "colaboradores";
        if (path.includes("/modulos/importar-producao/")) return "importar-producao";
        if (path.includes("/modulos/memoria-calculo/")) return "memoria-calculo";
        if (path.includes("/modulos/usuarios/")) return "usuarios";

        return "home";
    }

    function usuarioPodeAcessar(usuario, moduloId) {
        const usuarioNormalizado = normalizarUsuario(usuario || {});

        if (usuarioNormalizado.perfil === "admin") {
            return true;
        }

        if (moduloId === "usuarios") {
            return false;
        }

        return usuarioNormalizado.modulos.includes(moduloId);
    }

    function caminhoModulo(moduloId) {
        const modulo = MODULOS_PORTAL.find(item => item.id === moduloId) || MODULOS_PORTAL[0];
        return `${caminhoBase()}${modulo.caminho}`;
    }

    function caminhoInicialPermitido(usuario) {
        const usuarioNormalizado = normalizarUsuario(usuario);

        if (usuarioNormalizado.perfil === "admin") {
            return caminhoInicial;
        }

        return caminhoModulo(usuarioNormalizado.modulos[0] || "home");
    }

    function nomeModulo(moduloId) {
        return MODULOS_PORTAL.find(item => item.id === moduloId)?.nome || "este módulo";
    }

    function renderizarAcessoNegado(moduloId, sessao) {
        const conteudo = document.querySelector(".content") || document.body;

        if (!conteudo || document.getElementById("portalAcessoNegado")) {
            return;
        }

        document.body.classList.add("access-denied-mode");

        const card = document.createElement("section");
        card.id = "portalAcessoNegado";
        card.className = "access-denied-card";
        card.innerHTML = `
            <div class="access-denied-emoji" aria-hidden="true">😅</div>
            <span class="eyebrow">Acesso restrito</span>
            <h1>Eu sei que o projeto está maneiro...</h1>
            <p>Mas a área <strong>${nomeModulo(moduloId)}</strong> ainda não está liberada para o seu perfil. Chama um admin se esse acesso fizer sentido para você.</p>
            <a class="primary-link-button" href="${caminhoInicialPermitido(sessao)}">Voltar para uma área liberada</a>
        `;

        conteudo.prepend(card);
    }

    function prepararAcessoNegado(moduloId, sessao) {
        window.portalAcessoBloqueado = true;

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => renderizarAcessoNegado(moduloId, sessao), { once: true });
            return;
        }

        renderizarAcessoNegado(moduloId, sessao);
    }

    async function obterFirebase() {
        if (firebaseDbPromise) {
            return firebaseDbPromise;
        }

        firebaseDbPromise = Promise.all([
            import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
        ]).then(([firebaseApp, firestore]) => {
            const app = firebaseApp.getApps().length
                ? firebaseApp.getApp()
                : firebaseApp.initializeApp(firebaseConfig);
            const db = firestore.getFirestore(app);

            return { db, firestore };
        });

        return firebaseDbPromise;
    }

    function obterSessao() {
        try {
            return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null");
        } catch {
            return null;
        }
    }

    async function listarUsuariosFirebase() {
        try {
            const { db, firestore } = await obterFirebase();
            const snap = await firestore.getDocs(firestore.collection(db, COLECAO_USUARIOS));
            const usuarios = [];

            snap.forEach(item => {
                const data = item.data();

                if (data.usuario && data.senha) {
                    usuarios.push(normalizarUsuario({
                        id: item.id,
                        ...data
                    }));
                }
            });

            return usuarios;
        } catch (erro) {
            console.warn("Nao foi possivel carregar usuarios do Firebase.", erro);
            return [];
        }
    }

    async function listarUsuarios() {
        const mapa = new Map();
        const cadastrados = await listarUsuariosFirebase();

        USUARIOS_PADRAO.forEach(usuario => mapa.set(usuario.usuario.toLowerCase(), normalizarUsuario(usuario)));
        cadastrados.forEach(usuario => {
            const chave = usuario.usuario.toLowerCase();
            const existente = mapa.get(chave) || {};
            mapa.set(chave, normalizarUsuario({
                ...existente,
                ...usuario,
                fixo: Boolean(existente.fixo || usuario.fixo)
            }));
        });

        return [...mapa.values()];
    }

    async function salvarUsuario(usuario) {
        const { db, firestore } = await obterFirebase();
        const id = normalizarId(usuario.usuario);

        if (!id) {
            throw new Error("Usuario invalido.");
        }

        await firestore.setDoc(firestore.doc(db, COLECAO_USUARIOS, id), {
            nome: usuario.nome,
            usuario: usuario.usuario,
            senha: usuario.senha,
            perfil: normalizarPerfil(usuario.perfil),
            modulos: normalizarModulosUsuario(usuario),
            atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });
    }

    async function removerUsuario(usuario) {
        const { db, firestore } = await obterFirebase();
        await firestore.deleteDoc(firestore.doc(db, COLECAO_USUARIOS, normalizarId(usuario)));
    }

    function salvarSessao(usuario) {
        const usuarioNormalizado = normalizarUsuario(usuario);

        sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({
            usuario: usuario.usuario,
            nome: usuario.nome,
            perfil: usuarioNormalizado.perfil,
            modulos: usuarioNormalizado.modulos,
            iniciadoEm: new Date().toISOString()
        }));
    }

    function encerrarSessao() {
        sessionStorage.removeItem(CHAVE_SESSAO);
        location.href = caminhoLogin;
    }

    async function usuarioValido(usuario, senha) {
        const usuarioNormalizado = String(usuario || "").trim().toLowerCase();
        const usuarios = await listarUsuarios();

        const encontrado = usuarios.find(item =>
            item.usuario.toLowerCase() === usuarioNormalizado &&
            item.senha === String(senha || "")
        );

        return encontrado ? normalizarUsuario(encontrado) : null;
    }

    function protegerPagina() {
        if (paginaLogin) {
            return;
        }

        const sessao = obterSessao();

        if (!sessao) {
            location.replace(caminhoLogin);
            return;
        }

        const modulo = moduloAtual();

        if (!usuarioPodeAcessar(sessao, modulo)) {
            prepararAcessoNegado(modulo, sessao);
        }
    }

    function configurarLogin() {
        const form = document.getElementById("loginForm");

        if (!form) {
            return;
        }

        if (obterSessao()) {
            location.replace(caminhoInicial);
            return;
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();

            const usuario = document.getElementById("loginUsuario")?.value;
            const senha = document.getElementById("loginSenha")?.value;
            const mensagem = document.getElementById("loginMensagem");

            if (mensagem) {
                mensagem.hidden = false;
                mensagem.textContent = "Validando acesso...";
            }

            const encontrado = await usuarioValido(usuario, senha);

            if (!encontrado) {
                if (mensagem) {
                    mensagem.textContent = "Usuario ou senha invalidos.";
                }
                return;
            }

            salvarSessao(encontrado);
            location.replace(caminhoInicialPermitido(encontrado));
        });
    }

    function configurarVisibilidadeNavegacao() {
        const sessao = obterSessao();

        if (!sessao || paginaLogin) {
            return;
        }

        document.querySelectorAll(".sidebar nav a").forEach(link => {
            const href = link.getAttribute("href") || "";
            const modulo = MODULOS_PORTAL
                .filter(item => item.id !== "home")
                .find(item => href.includes(item.caminho) || href.includes(item.caminho.replace("modulos/", "../")))
                || (href.includes("index.html") && !href.includes("/modulos/") && !href.includes("../") ? MODULOS_PORTAL[0] : null)
                || (href.endsWith("../../index.html") ? MODULOS_PORTAL[0] : null);

            if (modulo && !usuarioPodeAcessar(sessao, modulo.id)) {
                link.remove();
            }
        });
    }

    function inserirBotaoSair() {
        const sessao = obterSessao();

        if (paginaLogin || !sessao) {
            return;
        }

        const nav = document.querySelector(".sidebar nav");

        if (!nav || document.getElementById("botaoSairPortal")) {
            return;
        }

        if (sessao.perfil === "admin" && !document.getElementById("linkUsuariosPortal")) {
            const link = document.createElement("a");
            link.id = "linkUsuariosPortal";
            link.href = `${caminhoBase()}modulos/usuarios/index.html`;
            link.innerHTML = `<span class="nav-icon nav-icon-users" aria-hidden="true"></span>Usuários`;
            nav.appendChild(link);
        }

        const botao = document.createElement("button");
        botao.type = "button";
        botao.id = "botaoSairPortal";
        botao.className = "logout-button";
        botao.textContent = "Sair";
        botao.addEventListener("click", encerrarSessao);
        nav.appendChild(botao);
    }

    window.portalAuth = {
        obterSessao,
        listarUsuarios,
        salvarUsuario,
        removerUsuario,
        modulosDisponiveis: () => MODULOS_PORTAL.map(item => ({ ...item })),
        usuarioPodeAcessar,
        normalizarUsuario,
        usuarioAdmin: () => obterSessao()?.perfil === "admin"
    };

    protegerPagina();
    document.addEventListener("DOMContentLoaded", () => {
        configurarLogin();
        configurarVisibilidadeNavegacao();
        inserirBotaoSair();
    });
})();
