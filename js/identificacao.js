
/* =====================================
   PETMUNDO - IDENTIFICAÇÃO E QR CODE
===================================== */

async function abrirPetmundoId(pet, card) {
    if (!usuarioAtual) {
        alert("Faça login para gerar o PETMUNDO ID.");
        return;
    }

    const anterior = card.querySelector(".painel-petmundo-id");

    if (anterior) {
        anterior.remove();
        return;
    }

    const painel = document.createElement("div");
    painel.className = "painel-petmundo-id";
    painel.style.cssText = "background:#eef8f2;padding:15px;margin-top:15px;border-radius:12px;";

    const titulo = document.createElement("h3");
    titulo.textContent = "🆔 PETMUNDO ID - " + pet.name;
    painel.appendChild(titulo);

    const aviso = document.createElement("p");
    aviso.textContent = "Carregando identificação...";
    painel.appendChild(aviso);

    card.appendChild(painel);

    const { data: existente, error: erroBusca } = await supabaseClient
        .from("pet_identificacoes")
        .select("*")
        .eq("pet_id", pet.id)
        .maybeSingle();

    if (erroBusca) {
        aviso.textContent = "Erro ao consultar identificação: " + erroBusca.message;
        return;
    }

    const foto = pet.photo_path
        ? supabaseClient.storage
            .from("petmundo-pets")
            .getPublicUrl(pet.photo_path).data.publicUrl
        : null;

    let registro = existente;

    if (!registro) {
        const { data, error } = await supabaseClient
            .from("pet_identificacoes")
            .insert({
                pet_id: pet.id,
                owner_id: usuarioAtual.id,
                nome: pet.name,
                especie: pet.species,
                raca: pet.breed,
                foto_url: foto,
                telefone: pet.tutor_phone,
                contato_publico: false,
                animal_perdido: false,
                mensagem: ""
            })
            .select()
            .single();

        if (error) {
            aviso.textContent = "Erro ao criar identificação: " + error.message;
            return;
        }

        registro = data;
    }

    aviso.textContent = "Configure os dados públicos da identificação:";

    const contato = document.createElement("input");
    contato.type = "checkbox";
    contato.checked = registro.contato_publico;

    const textoContato = document.createElement("label");
    textoContato.appendChild(contato);
    textoContato.appendChild(
        document.createTextNode(" Permitir contato pelo WhatsApp")
    );
    painel.appendChild(textoContato);

    const perdido = document.createElement("input");
    perdido.type = "checkbox";
    perdido.checked = registro.animal_perdido;

    const textoPerdido = document.createElement("label");
    textoPerdido.style.display = "block";
    textoPerdido.appendChild(perdido);
    textoPerdido.appendChild(
        document.createTextNode(" Meu animal está perdido")
    );
    painel.appendChild(textoPerdido);

    const telefone = document.createElement("input");
    telefone.type = "tel";
    telefone.placeholder = "Telefone com DDD";
    telefone.value = registro.telefone || "";
    telefone.style.cssText = "display:block;width:100%;padding:10px;margin:10px 0;";
    painel.appendChild(telefone);

    const mensagem = document.createElement("textarea");
    mensagem.placeholder = "Mensagem sobre o animal...";
    mensagem.value = registro.mensagem || "";
    mensagem.style.cssText = "display:block;width:100%;padding:10px;margin:10px 0;";
    painel.appendChild(mensagem);

    const salvar = document.createElement("button");
    salvar.type = "button";
    salvar.textContent = "Salvar identificação e gerar QR Code";
    painel.appendChild(salvar);

    const areaQR = document.createElement("div");
    areaQR.style.cssText = "margin:15px auto;text-align:center;";
    painel.appendChild(areaQR);

    salvar.addEventListener("click", async () => {
        salvar.disabled = true;
        salvar.textContent = "Salvando...";

        try {
            const { data, error } = await supabaseClient
                .from("pet_identificacoes")
                .update({
                    nome: pet.name,
                    especie: pet.species,
                    raca: pet.breed,
                    foto_url: foto,
                    telefone: telefone.value.trim(),
                    contato_publico: contato.checked,
                    animal_perdido: perdido.checked,
                    mensagem: mensagem.value.trim(),
                    atualizado_em: new Date().toISOString()
                })
                .eq("id", registro.id)
                .select()
                .single();

            if (error) {
                throw new Error("Erro ao salvar: " + error.message);
            }

            registro = data;
            areaQR.innerHTML = "";

            if (typeof QRCode === "undefined") {
                throw new Error("A biblioteca QR Code não carregou. Atualize a página e tente novamente.");
            }

            const endereco = window.location.origin +
                window.location.pathname +
                "?petid=" + registro.codigo;

            new QRCode(areaQR, {
                text: endereco,
                width: 200,
                height: 200
            });

            const link = document.createElement("p");
            link.textContent = "QR Code criado para " + pet.name;
            areaQR.appendChild(link);

            salvar.textContent = "Identificação salva!";

        } catch (erro) {
            alert(erro.message);
            salvar.textContent = "Salvar identificação e gerar QR Code";
        } finally {
            salvar.disabled = false;
        }
    });
}
