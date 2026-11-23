
/* =====================================
   PETMUNDO - CADASTRO E GESTÃO DE PETS
===================================== */

/* ENVIAR FOTO OU VÍDEO PARA O SUPABASE */

function extensaoArquivo(arquivo) {
    if (!arquivo || !arquivo.name) return "";
    return arquivo.name.split(".").pop().toLowerCase();
}

async function enviarArquivoPet(arquivo, tipo) {
    if (!arquivo || !usuarioAtual) return null;

    const extensao = extensaoArquivo(arquivo);
    const nomeArquivo = `${usuarioAtual.id}/${Date.now()}.${extensao}`;

    const { data, error } = await supabaseClient.storage
        .from("petmundo-pets")
        .upload(nomeArquivo, arquivo);

    if (error) {
        console.error("Erro ao enviar arquivo:", error);
        throw new Error("Não foi possível enviar o arquivo: " + error.message);
    }

    return data.path;
}

/* CALCULAR IDADE DO PET */

function calcularIdade(data) {
    if (!data) return "Não informada";

    const nascimento = new Date(data + "T12:00:00");

    if (Number.isNaN(nascimento.getTime())) {
        return "Não informada";
    }

    const hoje = new Date();

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (hoje.getDate() < nascimento.getDate()) meses--;

    if (meses < 0) {
        anos--;
        meses += 12;
    }

    if (anos < 0) return "Não informada";

    if (anos === 0) return meses + " mês(es)";

    return anos + " ano(s) e " + meses + " mês(es)";
}

/* CADASTRAR NOVO PET */

async function cadastrarPet() {
    if (!usuarioAtual) {
        mostrarMensagem("mensagemPet", "Entre na sua conta primeiro.");
        return;
    }

    const botao = document.getElementById("botaoCadastrarPet");
    const nome = document.getElementById("petNome").value.trim();
    const especie = document.getElementById("petEspecie").value;
    const raca = document.getElementById("petRaca").value.trim();
    const nascimento = document.getElementById("petNascimento").value || null;
    const sexo = document.getElementById("petSexo").value;
    const descricao = document.getElementById("petDescricao").value.trim();
    const telefone = document.getElementById("petTelefone").value.trim();
    const endereco = document.getElementById("petEndereco").value.trim();
    const mostrarContato = document.getElementById("petMostrarContato").checked;
    const foto = document.getElementById("petFoto").files[0];
    const video = document.getElementById("petVideo").files[0];

    if (!nome || !especie) {
        mostrarMensagem("mensagemPet", "Informe o nome e a espécie do animal.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Salvando cadastro...";

    try {
        const caminhoFoto = foto ? await enviarArquivoPet(foto, "foto") : null;
        const caminhoVideo = video ? await enviarArquivoPet(video, "vídeo") : null;

        const { error } = await supabaseClient
            .from("pets")
            .insert({
                owner_id: usuarioAtual.id,
                name: nome,
                species: especie,
                breed: raca || null,
                birth_date: nascimento,
                sex: sexo || null,
                description: descricao || null,
                photo_path: caminhoFoto,
                video_path: caminhoVideo,
                tutor_phone: telefone || null,
                tutor_address: endereco || null,
                show_contact: mostrarContato
            });

        if (error) {
            throw new Error("Não foi possível salvar o cadastro: " + error.message);
        }

        [
            "petNome",
            "petEspecie",
            "petRaca",
            "petNascimento",
            "petSexo",
            "petDescricao",
            "petTelefone",
            "petEndereco",
            "petFoto",
            "petVideo"
        ].forEach(id => {
            document.getElementById(id).value = "";
        });

        document.getElementById("petMostrarContato").checked = false;

        mostrarMensagem("mensagemPet", "Cadastro do pet realizado com sucesso! 🐾");

        await carregarMeusPets();

    } catch (erro) {
        mostrarMensagem("mensagemPet", erro.message || "Erro inesperado ao cadastrar.");
    } finally {
        botao.disabled = false;
        botao.textContent = "🐾 Salvar cadastro do pet";
    }
}

/* ADICIONAR VÍDEO AO PET */

async function adicionarVideoPet(petId, input, botao, mensagem) {
    if (!usuarioAtual) {
        mensagem.textContent = "Entre na sua conta primeiro.";
        return;
    }

    const arquivo = input.files[0];

    if (!arquivo) {
        mensagem.textContent = "Escolha um vídeo primeiro.";
        return;
    }

    if (arquivo.size > 20 * 1024 * 1024) {
        mensagem.textContent = "O vídeo ultrapassa o limite de 20 MB.";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando vídeo...";
    mensagem.textContent = "Enviando vídeo. Aguarde...";

    try {
        const caminho = await enviarArquivoPet(arquivo, "vídeo");

        const { data, error } = await supabaseClient
            .from("pets")
            .update({ video_path: caminho })
            .eq("id", petId)
            .eq("owner_id", usuarioAtual.id)
            .select("id")
            .maybeSingle();

        if (error) {
            throw new Error("O vídeo foi enviado, mas não foi possível atualizar o cadastro: " + error.message);
        }

        if (!data) {
            throw new Error("O vídeo foi enviado, mas o cadastro não foi atualizado. Verifique a permissão UPDATE da tabela pets.");
        }

        mensagem.textContent = "Vídeo adicionado ao pet com sucesso! 🐾";
        input.value = "";

        await carregarMeusPets();

    } catch (erro) {
        mensagem.textContent = erro.message || "Não foi possível adicionar o vídeo.";
    } finally {
        botao.disabled = false;
        botao.textContent = "🎬 Adicionar vídeo";
    }
}

/* CRIAR CAMPOS DO EDITOR */

function criarCampoEditor(form, rotulo, tipo, nome, valor) {
    const grupo = document.createElement("div");

    const label = document.createElement("label");
    label.textContent = rotulo;

    const campo = document.createElement(
        tipo === "textarea" ? "textarea" :
        tipo === "select" ? "select" : "input"
    );

    campo.name = nome;

    if (tipo === "select") {
        const opcoes = nome === "species"
            ? ["Cachorro", "Gato", "Ave", "Coelho", "Roedor", "Réptil", "Outro"]
            : ["Macho", "Fêmea"];

        const vazio = document.createElement("option");
        vazio.value = "";
        vazio.textContent = nome === "species" ? "Selecione" : "Não informado";
        campo.appendChild(vazio);

        opcoes.forEach(op => {
            const option = document.createElement("option");
            option.value = op;
            option.textContent = op;
            campo.appendChild(option);
        });

        campo.value = valor || "";

    } else {
        if (tipo !== "textarea") campo.type = tipo;
        campo.value = valor || "";
    }

    grupo.appendChild(label);
    grupo.appendChild(campo);
    form.appendChild(grupo);

    return campo;
}

/* ABRIR EDIÇÃO DO PET */

function abrirEdicaoPet(pet, card) {
    const editorExistente = card.querySelector(".editor-pet");

    if (editorExistente) {
        editorExistente.remove();
        return;
    }

    const editor = document.createElement("div");
    editor.className = "editor-pet";

    const titulo = document.createElement("h3");
    titulo.textContent = "✏️ Editar cadastro de " + pet.name;
    editor.appendChild(titulo);

    const form = document.createElement("form");
    form.addEventListener("submit", event => event.preventDefault());

    criarCampoEditor(form, "Nome do animal *", "text", "name", pet.name);
    criarCampoEditor(form, "Espécie *", "select", "species", pet.species);
    criarCampoEditor(form, "Raça", "text", "breed", pet.breed);
    criarCampoEditor(form, "Data de nascimento", "date", "birth_date", pet.birth_date);
    criarCampoEditor(form, "Sexo", "select", "sex", pet.sex);
    criarCampoEditor(form, "Descrição do pet", "textarea", "description", pet.description);
    criarCampoEditor(form, "Telefone do tutor", "tel", "tutor_phone", pet.tutor_phone);
    criarCampoEditor(form, "Endereço do tutor", "text", "tutor_address", pet.tutor_address);

    const checkArea = document.createElement("label");
    checkArea.className = "campo-check";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.name = "show_contact";
    check.checked = !!pet.show_contact;

    const checkTexto = document.createElement("span");
    checkTexto.textContent = "Autorizo exibir telefone e endereço no perfil público do pet.";

    checkArea.appendChild(check);
    checkArea.appendChild(checkTexto);
    form.appendChild(checkArea);

    const aviso = document.createElement("div");
    aviso.className = "aviso-privacidade";
    aviso.textContent = "Os dados de contato ficam privados quando esta opção não está marcada.";
    form.appendChild(aviso);

    const labelFoto = document.createElement("label");
    labelFoto.textContent = "Substituir foto do pet (opcional)";
    form.appendChild(labelFoto);

    const foto = document.createElement("input");
    foto.type = "file";
    foto.name = "photo";
    foto.accept = "image/jpeg,image/png,image/webp,image/gif";
    foto.className = "campo-arquivo";
    form.appendChild(foto);

    const labelVideo = document.createElement("label");
    labelVideo.textContent = "Substituir vídeo do pet (opcional, máximo 20 MB)";
    form.appendChild(labelVideo);

    const video = document.createElement("input");
    video.type = "file";
    video.name = "video";
    video.accept = "video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm";
    video.className = "campo-arquivo";
    form.appendChild(video);

    const mensagem = document.createElement("p");
    mensagem.className = "mensagem oculto";
    form.appendChild(mensagem);

    const acoes = document.createElement("div");
    acoes.className = "acoes-editor";

    const salvar = document.createElement("button");
    salvar.type = "button";
    salvar.textContent = "💾 Salvar alterações";
    salvar.addEventListener("click", () => salvarEdicaoPet(pet.id, form, salvar, mensagem));

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "cancelar";
    cancelar.textContent = "Cancelar";
    cancelar.addEventListener("click", () => editor.remove());

    acoes.appendChild(salvar);
    acoes.appendChild(cancelar);

    form.appendChild(acoes);
    editor.appendChild(form);
    card.appendChild(editor);

    editor.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* SALVAR EDIÇÃO DO PET */

async function salvarEdicaoPet(petId, form, botao, mensagem) {
    if (!usuarioAtual) {
        mensagem.textContent = "Entre na sua conta primeiro.";
        mensagem.classList.remove("oculto");
        return;
    }

    const nome = form.elements.name.value.trim();
    const especie = form.elements.species.value;

    if (!nome || !especie) {
        mensagem.textContent = "Preencha o nome e a espécie do animal.";
        mensagem.classList.remove("oculto");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const dados = {
            name: nome,
            species: especie,
            breed: form.elements.breed.value.trim() || null,
            birth_date: form.elements.birth_date.value || null,
            sex: form.elements.sex.value || null,
            description: form.elements.description.value.trim() || null,
            tutor_phone: form.elements.tutor_phone.value.trim() || null,
            tutor_address: form.elements.tutor_address.value.trim() || null,
            show_contact: form.elements.show_contact.checked
        };

        const novaFoto = form.elements.photo.files[0];
        const novoVideo = form.elements.video.files[0];

        if (novaFoto) {
            dados.photo_path = await enviarArquivoPet(novaFoto, "foto");
        }

        if (novoVideo) {
            dados.video_path = await enviarArquivoPet(novoVideo, "vídeo");
        }

        const { data, error } = await supabaseClient
            .from("pets")
            .update(dados)
            .eq("id", petId)
            .eq("owner_id", usuarioAtual.id)
            .select("id")
            .maybeSingle();

        if (error) {
            throw new Error("Não foi possível salvar as alterações: " + error.message);
        }

        if (!data) {
            throw new Error("Nenhum cadastro foi atualizado. Confira se você está conectado à conta proprietária do pet.");
        }

        mensagem.textContent = "Cadastro atualizado com sucesso! 🐾";
        mensagem.classList.remove("oculto");

        await carregarMeusPets();

    } catch (erro) {
        mensagem.textContent = erro.message || "Erro ao atualizar o cadastro.";
        mensagem.classList.remove("oculto");

        botao.disabled = false;
        botao.textContent = "💾 Salvar alterações";
    }
}

/* CARREGAR PETS CADASTRADOS */

async function carregarMeusPets() {
    const area = document.getElementById("listaMeusPets");

    if (!usuarioAtual) {
        area.innerHTML = "";
        return;
    }

    area.innerHTML = "<p class='pequeno'>Carregando seus animais...</p>";

    const { data: pets, error } = await supabaseClient
        .from("pets")
        .select("id,name,species,breed,birth_date,sex,description,photo_path,video_path,tutor_phone,tutor_address,show_contact,created_at")
        .eq("owner_id", usuarioAtual.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        area.textContent = "Não foi possível carregar seus pets: " + error.message;
        return;
    }

    area.innerHTML = "";

    if (!pets || pets.length === 0) {
        area.innerHTML = "<p class='pequeno'>Você ainda não cadastrou nenhum pet.</p>";
        return;
    }

    pets.forEach(pet => {
        const card = document.createElement("div");
        card.className = "pet-card";

        const titulo = document.createElement("h3");
        titulo.textContent = "🐾 " + pet.name;
        card.appendChild(titulo);

        if (pet.photo_path) {
            const { data } = supabaseClient.storage
                .from("petmundo-pets")
                .getPublicUrl(pet.photo_path);

            const img = document.createElement("img");
            img.src = data.publicUrl;
            img.alt = "Foto de " + pet.name;
            img.loading = "lazy";
            card.appendChild(img);
        }

        if (pet.video_path) {
            const { data } = supabaseClient.storage
                .from("petmundo-pets")
                .getPublicUrl(pet.video_path);

            const video = document.createElement("video");
            video.src = data.publicUrl;
            video.controls = true;
            video.preload = "metadata";
            video.playsInline = true;
            card.appendChild(video);

        } else {
            const areaVideo = document.createElement("div");
            areaVideo.className = "area-video-pet";

            const tituloVideo = document.createElement("strong");
            tituloVideo.textContent = "🎬 Este pet ainda não tem vídeo.";
            areaVideo.appendChild(tituloVideo);

            const input = document.createElement("input");
            input.type = "file";
            input.accept = "video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm";
            input.className = "campo-arquivo";
            input.setAttribute("aria-label", "Escolher vídeo de " + pet.name);

            const botaoVideo = document.createElement("button");
            botaoVideo.type = "button";
            botaoVideo.textContent = "🎬 Adicionar vídeo";

            const mensagemVideo = document.createElement("p");
            mensagemVideo.className = "pequeno";

            botaoVideo.addEventListener("click", () => {
                adicionarVideoPet(pet.id, input, botaoVideo, mensagemVideo);
            });

            areaVideo.appendChild(input);
            areaVideo.appendChild(botaoVideo);
            areaVideo.appendChild(mensagemVideo);
            card.appendChild(areaVideo);
        }

        const dados = document.createElement("div");
        dados.className = "pet-dados";

        function adicionarDado(rotulo, valor) {
            if (!valor) return;

            const p = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = rotulo + ": ";
            p.appendChild(strong);
            p.appendChild(document.createTextNode(valor));

            dados.appendChild(p);
        }

        adicionarDado("Espécie", pet.species);
        adicionarDado("Raça", pet.breed);

        adicionarDado(
            "Nascimento",
            pet.birth_date
                ? new Date(pet.birth_date + "T12:00:00").toLocaleDateString("pt-BR")
                : ""
        );

        adicionarDado("Idade aproximada", calcularIdade(pet.birth_date));
        adicionarDado("Sexo", pet.sex);
        adicionarDado("Descrição", pet.description);

        if (pet.show_contact) {
            adicionarDado("Telefone do tutor", pet.tutor_phone);
            adicionarDado("Endereço do tutor", pet.tutor_address);
        } else {
            const privado = document.createElement("p");
            privado.className = "pequeno";
            privado.textContent = "Contato do tutor protegido.";
            dados.appendChild(privado);
        }

        card.appendChild(dados);

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "editar";
        botaoEditar.textContent = "✏️ Editar pet";
        botaoEditar.addEventListener("click", () => abrirEdicaoPet(pet, card));
        card.appendChild(botaoEditar);

        const botaoPassaporte = document.createElement("button");
        botaoPassaporte.type = "button";
        botaoPassaporte.className = "botao-passaporte";
        botaoPassaporte.textContent = "📘 Abrir Passaporte Digital";
        botaoPassaporte.addEventListener("click", () => abrirPassaporte(pet, card));
        card.appendChild(botaoPassaporte);

        const botaoId = document.createElement("button");
        botaoId.type = "button";
        botaoId.className = "botao-passaporte";
        botaoId.textContent = "🆔 Gerar PETMUNDO ID / QR Code";
        botaoId.addEventListener("click", () => abrirPetmundoId(pet, card));
        card.appendChild(botaoId);

        area.appendChild(card);
    });
}
