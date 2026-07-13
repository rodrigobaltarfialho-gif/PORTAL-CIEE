(function configurarAutenticacao() {
    const USUARIOS_PADRAO = [
        { usuario: "Rodrigo", senha: "000", nome: "Rodrigo", perfil: "admin", fixo: true }
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
                    usuarios.push({
                        id: item.id,
                        perfil: "usuario",
                        ...data
                    });
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

        USUARIOS_PADRAO.forEach(usuario => mapa.set(usuario.usuario.toLowerCase(), usuario));
        cadastrados.forEach(usuario => mapa.set(usuario.usuario.toLowerCase(), usuario));

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
            perfil: usuario.perfil || "usuario",
            atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });
    }

    async function removerUsuario(usuario) {
        const { db, firestore } = await obterFirebase();
        await firestore.deleteDoc(firestore.doc(db, COLECAO_USUARIOS, normalizarId(usuario)));
    }

    function salvarSessao(usuario) {
        sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({
            usuario: usuario.usuario,
            nome: usuario.nome,
            perfil: usuario.perfil || "usuario",
            iniciadoEm: new Date().toISOString()
        }));
    }

    function encerrarSessao() {
        sessionStorage.removeItem(CHAVE_SESSAO);
        location.href = caminhoLogin;
    }

    async function usuarioValido(usuario, senha) {
        const usuarioNormalizado = String(usuario || "").trim().toLowerCase();
        const usuarioPadrao = USUARIOS_PADRAO.find(item =>
            item.usuario.toLowerCase() === usuarioNormalizado &&
            item.senha === String(senha || "")
        );

        if (usuarioPadrao) {
            return usuarioPadrao;
        }

        const usuarios = await listarUsuarios();

        return usuarios.find(item =>
            item.usuario.toLowerCase() === usuarioNormalizado &&
            item.senha === String(senha || "")
        );
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

        if (paginaUsuarios && sessao.perfil !== "admin") {
            location.replace(caminhoInicial);
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
            location.replace(caminhoInicial);
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
            link.innerHTML = `<span class="nav-icon nav-icon-users" aria-hidden="true"></span>Usuarios`;
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
        usuarioAdmin: () => obterSessao()?.perfil === "admin"
    };

    protegerPagina();
    document.addEventListener("DOMContentLoaded", () => {
        configurarLogin();
        inserirBotaoSair();
    });
})();
