
/* =====================================
   PETMUNDO - ADOÇÃO E RESGATE
===================================== */

/* PUBLICAR CASO DE ADOÇÃO OU RESGATE */

async function publicarResgate() {
    if (!usuarioAtual) {
        mostrarMensagem("mensagemResgate", "Entre na sua conta primeiro.");
        return;
    }

    const botao = document.getElementById("botaoPublicarResgate");
    const tipo = document.getElementById("resgateTipo").value;
    const nome = document.getElementById("resgateNome").value.trim();
    const especie = document.getElementById("resgateEspecie").value;
    const descricao = document.getElementById("resgateDescricao").value.trim();
    const cidade = document.getElementById("resgateCidade").value.trim();
    const bairro = document.getElementById("resgateBairro").value.trim();
    const ajuda = document.getElementById("resgateAjuda").value.trim();
    const contatoDigitado = document.getElementById("resgateContato").value.trim();
    const autorizaContato = document.getElementById("resgateAutorizaContato").checked;
    const foto = document.getElementById("resgateFoto").files[0];

    if (!tipo || !especie || !descricao || !cidade) {
        mostrarMensagem("mensagemResgate", "Preencha o tipo de publicação, a espécie, a descrição e a cidade.");
        return;
    }

    if (contatoDigitado && !autorizaContato) {
        mostrarMensagem("mensagemResgate", "Para divulgar o contato, marque a autorização. Se não quiser divulgá-lo, apague o campo de contato.");
        return;
    }

    const tipoBanco = tipo === "Adoção"
        ? "adocao"
        : tipo === "Ferido ou em risco"
            ? "ajuda"
            : "resgate";

    botao.disabled = true;
    botao.textContent = "Publicando...";

    try {
        let caminhoFoto = null;

        if (foto) {
            if (!foto.type.startsWith("image/")) {
                throw new Error("Escolha um arquivo de imagem válido.");
            }

            caminhoFoto = await enviarArquivoPet(foto, "foto");
        }

        const dados = {
            owner_id: usuarioAtual.id,
            tipo: tipoBanco,
            nome_animal: nome || null,
            especie: especie,
            descricao: descricao,
            cidade: cidade,
            bairro: bairro || null,
            contato: autorizaContato ? contatoDigitado : null,
            ajuda_necessaria: ajuda || null,
            foto_path: caminhoFoto,
            status: "aguardando"
        };

        const { error } = await supabaseClient
            .from("pet_resgates")
            .insert(dados);

        if (error) {
            throw new Error("Não foi possível publicar o caso: " + error.message);
        }

        [
            "resgateTipo",
            "resgateNome",
            "resgateEspecie",
            "resgateDescricao",
            "resgateCidade",
            "resgateBairro",
            "resgateAjuda",
            "resgateContato",
            "resgateFoto"
        ].forEach(id => {
            document.getElementById(id).value = "";
        });

        document.getElementById("resgateAutorizaContato").checked = false;

        mostrarMensagem("mensagemResgate", "Publicação realizada com sucesso! 🐾");

        await carregarResgates();

    } catch (erro) {
        mostrarMensagem("mensagemResgate", erro.message || "Ocorreu um erro ao publicar.");
    } finally {
        botao.disabled = false;
        botao.textContent = "🐾 Publicar caso";
    }
}

/* =====================================
   MARCAR PUBLICAÇÃO COMO ATENDIDA
===================================== */

async function marcarResgateAtendido(id, botao) {
    if (!usuarioAtual) return;

    if (!confirm("Este pedido já foi atendido? Deseja marcar a publicação como ATENDIDA?")) {
        return;
    }

    botao.disabled = true;
    botao.textContent = "Atualizando...";

    const { data, error } = await supabaseClient
        .from("pet_resgates")
        .update({ status: "resolvido" })
        .eq("id", id)
        .eq("owner_id", usuarioAtual.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        alert("Não foi possível atualizar: " + (error?.message || "Publicação não encontrada ou sem permissão."));
        botao.disabled = false;
        botao.textContent = "✓ Marcar como atendido";
        return;
    }

    await carregarResgates();
}

/* =====================================
   EXCLUIR PUBLICAÇÃO E FOTO
===================================== */

async function excluirResgate(id, botao) {
    if (!usuarioAtual) {
        alert("Entre na sua conta primeiro.");
        return;
    }

    if (!confirm("Deseja realmente excluir esta publicação e sua foto? Esta ação não pode ser desfeita.")) {
        return;
    }

    botao.disabled = true;
    botao.textContent = "Excluindo...";

    const { data: caso, error: erroBusca } = await supabaseClient
        .from("pet_resgates")
        .select("id,foto_path")
        .eq("id", id)
        .eq("owner_id", usuarioAtual.id)
        .maybeSingle();

    if (erroBusca || !caso) {
        alert("Não foi possível localizar a publicação: " + (erroBusca?.message || "Publicação não encontrada."));
        botao.disabled = false;
        botao.textContent = "🗑 Excluir publicação e foto";
        return;
    }

    const { data, error } = await supabaseClient
        .from("pet_resgates")
        .delete()
        .eq("id", id)
        .eq("owner_id", usuarioAtual.id)
        .select("id")
        .maybeSingle();

    if (error || !data) {
        alert("Não foi possível excluir: " + (error?.message || "Publicação não encontrada ou sem permissão."));
        botao.disabled = false;
        botao.textContent = "🗑 Excluir publicação e foto";
        return;
    }

    let avisoFoto = "";

    if (caso.foto_path) {
        const { error: erroFoto } = await supabaseClient
            .storage
            .from("petmundo-pets")
            .remove([caso.foto_path]);

        if (erroFoto) {
            console.error("Publicação excluída, mas não foi possível apagar a foto:", erroFoto.message);
            avisoFoto = " A publicação foi excluída, mas a foto permaneceu no armazenamento.";
        }
    }

    await carregarResgates();

    if (avisoFoto) {
        alert(avisoFoto);
    }
}

/* =====================================
   CARREGAR MURAL DE ADOÇÃO E RESGATE
===================================== */

async function carregarResgates() {
    const mural = document.getElementById("muralResgates");

    mural.innerHTML = "<p>Carregando publicações...</p>";

    const { data: casos, error } = await supabaseClient
        .from("pet_resgates")
        .select("id,owner_id,tipo,nome_animal,especie,descricao,cidade,bairro,contato,ajuda_necessaria,foto_path,status,created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar resgates:", error);
        mural.innerHTML = "<p>Não foi possível carregar as publicações: " + escapeHTML(error.message) + "</p>";
        return;
    }

    mural.innerHTML = "";

    if (!casos || casos.length === 0) {
        mural.innerHTML = "<p>Ainda não há casos publicados. Seja o primeiro a ajudar um animal!</p>";
        return;
    }

    casos.forEach(caso => {
        const card = document.createElement("div");
        card.className = "resgate-publicacao";

        const etiqueta = document.createElement("span");
        etiqueta.className = "resgate-etiqueta";

        const rotulosTipo = {
            adocao: "Animal para adoção",
            resgate: "Animal abandonado ou perdido",
            ajuda: "Animal ferido ou em risco"
        };

        etiqueta.textContent = rotulosTipo[caso.tipo] || caso.tipo || "Adoção e resgate";
        card.appendChild(etiqueta);

        if (caso.status === "resolvido") {
            const selo = document.createElement("div");
            selo.className = "resgate-atendido";
            selo.textContent = "✓ PEDIDO ATENDIDO";
            card.appendChild(selo);
        }

        const titulo = document.createElement("h3");
        titulo.textContent = "🐾 " + (caso.nome_animal || caso.especie || "Animal");
        card.appendChild(titulo);

        if (caso.foto_path) {
            const { data: urlData } = supabaseClient
                .storage
                .from("petmundo-pets")
                .getPublicUrl(caso.foto_path);

            const img = document.createElement("img");
            img.src = urlData.publicUrl;
            img.alt = "Foto do animal anunciado";
            img.loading = "lazy";
            card.appendChild(img);
        }

        function adicionarTexto(rotulo, valor) {
            if (!valor) return;

            const p = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = rotulo + ": ";
            p.appendChild(strong);
            p.appendChild(document.createTextNode(valor));

            card.appendChild(p);
        }

        adicionarTexto("Espécie", caso.especie);
        adicionarTexto("Descrição", caso.descricao);
        adicionarTexto("Cidade", caso.cidade);
        adicionarTexto("Bairro", caso.bairro);
        adicionarTexto("Ajuda necessária", caso.ajuda_necessaria);

        if (caso.contato) {
            adicionarTexto("Contato autorizado pelo responsável", caso.contato);
        }

        if (caso.created_at) {
            const data = document.createElement("p");
            data.className = "pequeno";
            data.textContent = "Publicado em " + new Date(caso.created_at).toLocaleDateString("pt-BR");
            card.appendChild(data);
        }

        if (usuarioAtual && caso.owner_id === usuarioAtual.id) {
            const acoes = document.createElement("div");
            acoes.className = "acoes-foto";

            if (caso.status !== "resolvido") {
                const botaoAtendido = document.createElement("button");
                botaoAtendido.type = "button";
                botaoAtendido.textContent = "✓ Marcar como atendido";
                botaoAtendido.onclick = () => marcarResgateAtendido(caso.id, botaoAtendido);
                acoes.appendChild(botaoAtendido);
            }

            const botaoExcluir = document.createElement("button");
            botaoExcluir.type = "button";
            botaoExcluir.className = "excluir";
            botaoExcluir.textContent = "🗑 Excluir publicação e foto";
            botaoExcluir.onclick = () => excluirResgate(caso.id, botaoExcluir);

            acoes.appendChild(botaoExcluir);
            card.appendChild(acoes);
        }

        mural.appendChild(card);
    });
}

/* =====================================
   ESCAPAR HTML
===================================== */

function escapeHTML(texto) {
    return String(texto).replace(/[&<>"']/g, function(letra) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[letra];
    });
}
