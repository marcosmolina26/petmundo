
/* =====================================
   PETMUNDO - ADOÇÃO E RESGATES
===================================== */

function validarDadosResgate(dados) {
    if (!dados) return false;

    const obrigatorios = [
        dados.nome,
        dados.descricao,
        dados.local
    ];

    return obrigatorios.every(
        valor => valor && String(valor).trim() !== ""
    );
}

