
/* =====================================
   PETMUNDO - PASSAPORTE DIGITAL
===================================== */

function dataPassaporte(valor) {
    if (!valor) return "Não informada";

    const data = new Date(valor + "T12:00:00");

    return Number.isNaN(data.getTime())
        ? "Não informada"
        : data.toLocaleDateString("pt-BR");
}

function escaparPassaporte(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, function(letra) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[letra];
    });
}

/* =====================================
   ABRIR PASSAPORTE DIGITAL
===================================== */

function abrirPassaporte(pet, card) {
    const existente = card.querySelector(".area-passaporte");

    if (existente) {
        existente.remove();
        return;
    }

    const area = document.createElement("div");
    area.className = "area-passaporte";

    const titulo = document.createElement("h3");
    titulo.textContent = "📘 Passaporte Digital de " + pet.name;
    area.appendChild(titulo);

    const explicacao = document.createElement("p");
    explicacao.className = "pequeno";
    explicacao.textContent = "Registre e acompanhe vacinas, consultas, exames, medicamentos e outros cuidados deste animal.";
    area.appendChild(explicacao);

    const botaoImprimir = document.createElement("button");
    botaoImprimir.type = "button";
    botaoImprimir.className = "botao-imprimir-passaporte";
    botaoImprimir.textContent = "🖨️ Gerar passaporte para imprimir / PDF";
    botaoImprimir.addEventListener("click", () => gerarPassaporteImpressao(pet, botaoImprimir));
    area.appendChild(botaoImprimir);

    const formulario = document.createElement("form");
    formulario.className = "passaporte-formulario";

    formulario.innerHTML = `
        <h3 id="tituloFormularioPassaporte">➕ Novo registro</h3>
        <input type="hidden" name="registro_id">

        <label>Tipo de registro *</label>
        <select name="tipo" required>
            <option value="">Selecione</option>
            <option value="vacina">Vacina</option>
            <option value="consulta">Consulta veterinária</option>
            <option value="exame">Exame</option>
            <option value="medicamento">Medicamento</option>
            <option value="outro">Outro cuidado</option>
        </select>

        <label>Nome ou título do registro *</label>
        <input type="text" name="titulo" maxlength="150" placeholder="Ex.: Vacina antirrábica" required>

        <label>Descrição e observações</label>
        <textarea name="descricao" placeholder="Informações importantes sobre o atendimento ou cuidado..."></textarea>

        <label>Data do registro</label>
        <input type="date" name="data_registro">

        <label>Próxima data ou reforço</label>
        <input type="date" name="proxima_data">

        <label>Profissional ou clínica (opcional)</label>
        <input type="text" name="profissional" maxlength="150" placeholder="Nome do veterinário ou clínica">

        <div class="passaporte-acoes">
            <button type="submit" id="botaoSalvarPassaporte">💾 Salvar registro</button>
            <button type="button" class="cancelar" id="botaoCancelarEdicaoPassaporte">Cancelar edição</button>
        </div>

        <p class="mensagem oculto" id="mensagemPassaporte"></p>
    `;

    area.appendChild(formulario);

    const lista = document.createElement("div");
    lista.innerHTML = "<h3>📋 Histórico de cuidados</h3><p class='pequeno'>Carregando registros...</p>";
    area.appendChild(lista);

    card.appendChild(area);

    const campoId = formulario.elements.registro_id;
    const campoTipo = formulario.elements.tipo;
    const campoTitulo = formulario.elements.titulo;
    const campoDescricao = formulario.elements.descricao;
    const campoData = formulario.elements.data_registro;
    const campoProxima = formulario.elements.proxima_data;
    const campoProfissional = formulario.elements.profissional;
    const mensagem = formulario.querySelector("#mensagemPassaporte");
    const botaoSalvar = formulario.querySelector("#botaoSalvarPassaporte");

    function limparFormularioPassaporte() {
        formulario.reset();
        campoId.value = "";

        formulario.querySelector("#tituloFormularioPassaporte").textContent = "➕ Novo registro";
        botaoSalvar.textContent = "💾 Salvar registro";

        mensagem.textContent = "";
        mensagem.classList.add("oculto");
    }

    formulario.querySelector("#botaoCancelarEdicaoPassaporte")
        .addEventListener("click", limparFormularioPassaporte);

    formulario.addEventListener("submit", async event => {
        event.preventDefault();

        if (!usuarioAtual) {
            mensagem.textContent = "Entre na sua conta primeiro.";
            mensagem.classList.remove("oculto");
            return;
        }

        const tipo = campoTipo.value;
        const tituloRegistro = campoTitulo.value.trim();

        if (!tipo || !tituloRegistro) {
            mensagem.textContent = "Informe o tipo e o título do registro.";
            mensagem.classList.remove("oculto");
            return;
        }

        const dados = {
            pet_id: pet.id,
            owner_id: usuarioAtual.id,
            tipo: tipo,
            titulo: tituloRegistro,
            descricao: campoDescricao.value.trim() || null,
            data_registro: campoData.value || null,
            proxima_data: campoProxima.value || null,
            profissional: campoProfissional.value.trim() || null
        };

        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";

        try {
            let resultado;

            if (campoId.value) {
                resultado = await supabaseClient
                    .from("pet_passaporte_registros")
                    .update(dados)
                    .eq("id", campoId.value)
                    .eq("pet_id", pet.id)
                    .eq("owner_id", usuarioAtual.id)
                    .select("id")
                    .maybeSingle();
            } else {
                resultado = await supabaseClient
                    .from("pet_passaporte_registros")
                    .insert(dados)
                    .select("id")
                    .maybeSingle();
            }

            if (resultado.error) {
                throw new Error(resultado.error.message);
            }

            if (!resultado.data) {
                throw new Error("O registro não foi salvo. Verifique se você é o tutor deste pet.");
            }

            limparFormularioPassaporte();

            mensagem.textContent = "Registro salvo com sucesso!";
            mensagem.classList.remove("oculto");

            await carregarRegistrosPassaporte(pet.id, lista, formulario);

        } catch (erro) {
            mensagem.textContent = "Não foi possível salvar: " + erro.message;
            mensagem.classList.remove("oculto");
        } finally {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = campoId.value
                ? "💾 Salvar alterações"
                : "💾 Salvar registro";
        }
    });

    carregarRegistrosPassaporte(pet.id, lista, formulario);

    area.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =====================================
   CARREGAR HISTÓRICO DE CUIDADOS
===================================== */

async function carregarRegistrosPassaporte(petId, lista, formulario) {
    lista.innerHTML = "<h3>📋 Histórico de cuidados</h3><p class='pequeno'>Carregando registros...</p>";

    if (!usuarioAtual) {
        lista.textContent = "Entre na sua conta para consultar o passaporte.";
        return;
    }

    const { data: registros, error } = await supabaseClient
        .from("pet_passaporte_registros")
        .select("id,pet_id,owner_id,tipo,titulo,descricao,data_registro,proxima_data,profissional,created_at")
        .eq("pet_id", petId)
        .eq("owner_id", usuarioAtual.id)
        .order("data_registro", { ascending: false });

    if (error) {
        lista.textContent = "Não foi possível carregar o passaporte: " + error.message;
        return;
    }

    lista.innerHTML = "<h3>📋 Histórico de cuidados</h3>";

    if (!registros || registros.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "pequeno";
        vazio.textContent = "Ainda não existem registros para este pet. Use o formulário acima para adicionar o primeiro.";
        lista.appendChild(vazio);
        return;
    }

    const nomesTipos = {
        vacina: "Vacina",
        consulta: "Consulta",
        exame: "Exame",
        medicamento: "Medicamento",
        outro: "Outro cuidado"
    };

    registros.forEach(registro => {
        const item = document.createElement("div");
        item.className = "passaporte-registro";

        const etiqueta = document.createElement("span");
        etiqueta.className = "passaporte-tipo";
        etiqueta.textContent = nomesTipos[registro.tipo] || registro.tipo;
        item.appendChild(etiqueta);

        const titulo = document.createElement("h3");
        titulo.textContent = registro.titulo;
        item.appendChild(titulo);

        function adicionarInformacao(rotulo, valor, data = false) {
            if (!valor) return;

            const p = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = rotulo + ": ";
            p.appendChild(strong);

            const texto = data
                ? new Date(valor + "T12:00:00").toLocaleDateString("pt-BR")
                : valor;

            p.appendChild(document.createTextNode(texto));
            item.appendChild(p);
        }

        adicionarInformacao("Data", registro.data_registro, true);
        adicionarInformacao("Próxima data", registro.proxima_data, true);
        adicionarInformacao("Profissional ou clínica", registro.profissional);
        adicionarInformacao("Observações", registro.descricao);

        const acoes = document.createElement("div");
        acoes.className = "passaporte-acoes";

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "editar";
        editar.textContent = "✏️ Editar";

        editar.addEventListener("click", () => {
            formulario.elements.registro_id.value = registro.id;
            formulario.elements.tipo.value = registro.tipo;
            formulario.elements.titulo.value = registro.titulo;
            formulario.elements.descricao.value = registro.descricao || "";
            formulario.elements.data_registro.value = registro.data_registro || "";
            formulario.elements.proxima_data.value = registro.proxima_data || "";
            formulario.elements.profissional.value = registro.profissional || "";

            formulario.querySelector("#tituloFormularioPassaporte").textContent = "✏️ Editar registro";
            formulario.querySelector("#botaoSalvarPassaporte").textContent = "💾 Salvar alterações";

            formulario.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        });

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "excluir";
        excluir.textContent = "🗑 Excluir";

        excluir.addEventListener("click", () => {
            excluirRegistroPassaporte(registro.id, petId, lista, formulario);
        });

        acoes.appendChild(editar);
        acoes.appendChild(excluir);
        item.appendChild(acoes);

        lista.appendChild(item);
    });
}

/* =====================================
   EXCLUIR REGISTRO
===================================== */

async function excluirRegistroPassaporte(registroId, petId, lista, formulario) {
    if (!usuarioAtual) return;

    if (!confirm("Deseja realmente excluir este registro do Passaporte Digital?")) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("pet_passaporte_registros")
        .delete()
        .eq("id", registroId)
        .eq("pet_id", petId)
        .eq("owner_id", usuarioAtual.id)
        .select("id")
        .maybeSingle();

    if (error) {
        alert("Não foi possível excluir o registro: " + error.message);
        return;
    }

    if (!data) {
        alert("O registro não foi encontrado ou você não tem permissão para excluí-lo.");
        return;
    }

    await carregarRegistrosPassaporte(petId, lista, formulario);
}

/* =====================================
   GERAR PASSAPORTE PARA IMPRESSÃO / PDF
===================================== */

async function gerarPassaporteImpressao(pet, botao) {
    if (!usuarioAtual) {
        alert("Entre na sua conta primeiro.");
        return;
    }

    const janela = window.open("", "_blank");

    if (!janela) {
        alert("O navegador bloqueou a abertura do passaporte. Permita pop-ups para o PETMUNDO e tente novamente.");
        return;
    }

    janela.document.open();
    janela.document.write(
        "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Preparando passaporte</title></head><body style='font-family:Arial;text-align:center;padding:30px'><h2>🐾 PETMUNDO</h2><p>Preparando o passaporte do seu animal...</p></body></html>"
    );
    janela.document.close();

    const textoOriginal = botao.textContent;

    botao.disabled = true;
    botao.textContent = "Preparando passaporte...";

    try {
        const nomeTutor = obterNome(usuarioAtual);

        const { data: registros, error: erroRegistros } = await supabaseClient
            .from("pet_passaporte_registros")
            .select("id,tipo,titulo,descricao,data_registro,proxima_data,profissional")
            .eq("pet_id", pet.id)
            .eq("owner_id", usuarioAtual.id)
            .order("data_registro", { ascending: false });

        if (erroRegistros) {
            throw new Error("Não foi possível carregar o histórico: " + erroRegistros.message);
        }

        let fotoUrl = "";

        if (pet.photo_path) {
            const { data } = supabaseClient
                .storage
                .from("petmundo-pets")
                .getPublicUrl(pet.photo_path);

            fotoUrl = data?.publicUrl || "";
        }

        const tipos = {
            vacina: "Vacina",
            consulta: "Consulta veterinária",
            exame: "Exame",
            medicamento: "Medicamento",
            outro: "Outro cuidado"
        };

        let historico = "";

        if (registros && registros.length) {
            historico = registros.map(registro => `
                <div class="registro">
                    <div class="tipo">${escaparPassaporte(tipos[registro.tipo] || registro.tipo)}</div>
                    <h3>${escaparPassaporte(registro.titulo)}</h3>
                    <p><strong>Data:</strong> ${escaparPassaporte(dataPassaporte(registro.data_registro))}</p>
                    <p><strong>Próxima data:</strong> ${escaparPassaporte(dataPassaporte(registro.proxima_data))}</p>
                    ${registro.profissional ? `<p><strong>Profissional ou clínica:</strong> ${escaparPassaporte(registro.profissional)}</p>` : ""}
                    ${registro.descricao ? `<p><strong>Observações:</strong> ${escaparPassaporte(registro.descricao)}</p>` : ""}
                </div>
            `).join("");
        } else {
            historico = "<p>Nenhum registro de saúde foi cadastrado até o momento.</p>";
        }

        const documento = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Passaporte PET - ${escaparPassaporte(pet.name)}</title>

<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#26332d;margin:0;padding:25px;background:#fff}
.folha{max-width:800px;margin:auto;border:3px solid #087c56;border-radius:16px;padding:25px}
.cabecalho{text-align:center;background:#087c56;color:white;padding:18px;border-radius:10px}
.cabecalho h1{margin:0;font-size:28px}
.cabecalho p{margin:7px 0 0}
.titulo{text-align:center;color:#087c56;font-size:25px;margin:22px 0}
.identificacao{display:flex;gap:22px;align-items:center;border:1px solid #dce9e0;border-radius:12px;padding:16px}
.foto{width:190px;height:190px;object-fit:cover;border-radius:10px;background:#edf5ef}
.dados{flex:1}
.dados p{margin:9px 0;line-height:1.4}
.secao{margin-top:24px}
.secao h2{font-size:18px;color:#087c56;border-bottom:2px solid #b9dfca;padding-bottom:8px}
.registro{border:1px solid #dce9e0;border-radius:9px;padding:12px;margin:12px 0;break-inside:avoid}
.registro h3{margin:8px 0;color:#087c56}
.registro p{margin:6px 0;font-size:14px;line-height:1.4}
.tipo{display:inline-block;background:#eaf7f0;color:#087c56;padding:5px 9px;border-radius:20px;font-size:12px;font-weight:bold}
.rodape{text-align:center;margin-top:28px;padding-top:15px;border-top:1px solid #dce9e0;color:#68756e;font-size:12px}
.acoes{text-align:center;margin:18px auto}
button{background:#087c56;color:white;border:0;border-radius:8px;padding:12px 20px;font-size:16px;font-weight:bold;cursor:pointer}
.aviso{font-size:11px;color:#68756e;line-height:1.5;margin-top:15px}
@media(max-width:600px){
body{padding:8px}
.folha{padding:12px}
.identificacao{display:block;text-align:center}
.foto{width:160px;height:160px}
.dados{text-align:left;margin-top:12px}
}
@media print{
@page{size:A4;margin:12mm}
body{padding:0}
.folha{border:2px solid #087c56;max-width:none;padding:18px}
.acoes{display:none!important}
}
</style>
</head>

<body>
<div class="acoes">
<button onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
</div>

<div class="folha">
    <div class="cabecalho">
        <h1>🐾 PETMUNDO</h1>
        <p>Um mundo de amor pelos animais</p>
    </div>

    <h2 class="titulo">PASSAPORTE DIGITAL PET</h2>

    <div class="identificacao">
        ${fotoUrl
            ? `<img class="foto" src="${escaparPassaporte(fotoUrl)}" alt="Foto de ${escaparPassaporte(pet.name)}">`
            : `<div class="foto" style="display:flex;align-items:center;justify-content:center">🐾</div>`
        }

        <div class="dados">
            <p><strong>Nome:</strong> ${escaparPassaporte(pet.name)}</p>
            <p><strong>Espécie:</strong> ${escaparPassaporte(pet.species || "Não informada")}</p>
            <p><strong>Raça:</strong> ${escaparPassaporte(pet.breed || "Não informada")}</p>
            <p><strong>Sexo:</strong> ${escaparPassaporte(pet.sex || "Não informado")}</p>
            <p><strong>Nascimento:</strong> ${escaparPassaporte(dataPassaporte(pet.birth_date))}</p>
            <p><strong>Idade aproximada:</strong> ${escaparPassaporte(calcularIdade(pet.birth_date))}</p>
        </div>
    </div>

    <div class="secao">
        <h2>IDENTIFICAÇÃO DO TUTOR</h2>
        <p><strong>Responsável:</strong> ${escaparPassaporte(nomeTutor)}</p>
        <p><strong>E-mail:</strong> ${escaparPassaporte(usuarioAtual.email || "Não informado")}</p>
    </div>

    <div class="secao">
        <h2>HISTÓRICO DE SAÚDE E CUIDADOS</h2>
        ${historico}
    </div>

    <div class="aviso">
        Este documento reúne informações cadastradas pelo tutor no PETMUNDO. Os registros não são certificados pela plataforma e não substituem carteira de vacinação, atestados, receitas ou documentos emitidos por médico-veterinário.
    </div>

    <div class="rodape">
        <strong>PETMUNDO - Rede Social Pet</strong><br>
        Cuidar é amar!<br>
        Passaporte gerado em ${new Date().toLocaleDateString("pt-BR")}
    </div>
</div>

<div class="acoes">
<button onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
</div>
</body>
</html>`;

        janela.document.open();
        janela.document.write(documento);
        janela.document.close();

    } catch (erro) {
        if (janela && !janela.closed) {
            janela.document.open();
            janela.document.write(
                "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Erro no passaporte</title></head><body style='font-family:Arial;padding:20px'><h2>Não foi possível gerar o passaporte</h2><p>" +
                escaparPassaporte(erro.message || "Erro inesperado.") +
                "</p><p>Feche esta janela e tente novamente.</p></body></html>"
            );
            janela.document.close();
        }

        alert(erro.message || "Não foi possível gerar o passaporte.");

    } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
}
