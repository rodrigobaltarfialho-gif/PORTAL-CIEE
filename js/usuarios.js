(function configurarCadastroUsuarios() {
    const form = document.getElementById("formUsuario");
    const tabela = document.getElementById("tabelaUsuarios");

    if (!form || !tabela) {
        return;
    }

    function limparTexto(valor) {
        return String(valor || "").trim();
    }

    async function renderizarUsuarios() {
        tabela.innerHTML = `<tr><td colspan="4">Carregando usuarios...</td></tr>`;

        const usuarios = await window.portalAuth.listarUsuarios();

        tabela.innerHTML = usuarios.map(usuario => `
            <tr>
                <td>${usuario.nome || usuario.usuario}</td>
                <td>${usuario.usuario}</td>
                <td>${usuario.perfil === "admin" ? "Admin" : "Usuario"}</td>
                <td>
                    ${usuario.fixo ? `<span class="badge badge-success">Principal</span>` : `<button type="button" class="secondary-button user-delete-button" data-usuario="${usuario.usuario}">Remover</button>`}
                </td>
            </tr>
        `).join("") || `<tr><td colspan="4">Nenhum usuario cadastrado.</td></tr>`;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const nome = limparTexto(document.getElementById("usuarioNome")?.value);
        const usuario = limparTexto(document.getElementById("usuarioLogin")?.value);
        const senha = String(document.getElementById("usuarioSenha")?.value || "");
        const usuarios = await window.portalAuth.listarUsuarios();

        if (!nome || !usuario || !senha) {
            alert("Preencha nome, usuario e senha.");
            return;
        }

        if (usuarios.some(item => item.usuario.toLowerCase() === usuario.toLowerCase())) {
            alert("Esse usuario ja existe.");
            return;
        }

        await window.portalAuth.salvarUsuario({
            nome,
            usuario,
            senha,
            perfil: "usuario"
        });

        form.reset();
        await renderizarUsuarios();
    });

    tabela.addEventListener("click", async event => {
        const botao = event.target.closest(".user-delete-button");

        if (!botao) {
            return;
        }

        if (!confirm("Remover este usuario?")) {
            return;
        }

        await window.portalAuth.removerUsuario(botao.dataset.usuario);
        await renderizarUsuarios();
    });

    renderizarUsuarios().catch(erro => {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="4">Erro ao carregar usuarios.</td></tr>`;
    });
})();
