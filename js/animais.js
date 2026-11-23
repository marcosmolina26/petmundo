
/* =====================================
   PETMUNDO - CADASTRO E GESTÃO DE PETS
===================================== */

function extensaoArquivo(arquivo) {
    if (!arquivo || !arquivo.name) return "";
    return arquivo.name.split(".").pop().toLowerCase();
}

async function enviarArquivoPet(arquivo) {
    if (!arquivo || !usuarioAtual) return null;

    const extensao = extensaoArquivo(arquivo);
    const nomeArquivo = `${usuarioAtual.id}/${Date.now()}.${extensao}`;

    const { data, error } = await supabaseClient.storage
        .from("petmundo-pets")
        .upload(nomeArquivo, arquivo);

    if (error) {
        console.error("Erro ao enviar arquivo:", error);
        return null;
    }

    const { data: urlData } = supabaseClient.storage
        .from("petmundo-pets")
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

function calcularIdade(dataNascimento) {
    if (!dataNascimento) return "";

    const nascimento = new Date(dataNascimento + "T00:00:00");
    const hoje = new Date();

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (hoje.getDate() < nascimento.getDate()) meses--;

    if (meses < 0) {
        anos--;
        meses += 12;
    }

    if (anos > 0) {
        return `${anos} ano(s) e ${meses} mês(es)`;
    }

    return `${meses} mês(es)`;
}

