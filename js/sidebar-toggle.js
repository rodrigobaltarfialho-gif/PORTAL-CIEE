(function configurarToggleSidebar() {
    const layout = document.querySelector(".layout");
    const sidebar = document.querySelector(".sidebar");

    if (!layout || !sidebar || document.getElementById("toggleSidebarPortal")) {
        return;
    }

    const chave = `portalSidebarCollapsed:${location.pathname}`;
    const botao = document.createElement("button");
    botao.id = "toggleSidebarPortal";
    botao.className = "sidebar-toggle";
    botao.type = "button";
    document.body.insertBefore(botao, document.body.firstChild);

    function redimensionarGraficos() {
        window.dispatchEvent(new Event("resize"));
    }

    function aplicarEstado(recolhida) {
        document.body.classList.toggle("sidebar-collapsed", recolhida);
        botao.setAttribute("aria-label", recolhida ? "Abrir menu lateral" : "Recolher menu lateral");
        botao.title = recolhida ? "Abrir menu lateral" : "Recolher menu lateral";
        localStorage.setItem(chave, recolhida ? "1" : "0");
        setTimeout(redimensionarGraficos, 320);
    }

    aplicarEstado(localStorage.getItem(chave) === "1");
    botao.addEventListener("click", () => aplicarEstado(!document.body.classList.contains("sidebar-collapsed")));
})();

(function configurarVoltarAoTopo() {
    if (document.getElementById("voltarTopoPortal")) {
        return;
    }

    const botao = document.createElement("button");
    botao.id = "voltarTopoPortal";
    botao.className = "back-to-top";
    botao.type = "button";
    botao.setAttribute("aria-label", "Voltar para o topo");
    botao.title = "Voltar para o topo";
    botao.innerHTML = "<span aria-hidden=\"true\">↑</span>";
    document.body.appendChild(botao);

    function atualizarVisibilidade() {
        botao.classList.toggle("is-visible", window.scrollY > 260);
    }

    botao.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", atualizarVisibilidade, { passive: true });
    atualizarVisibilidade();
})();
