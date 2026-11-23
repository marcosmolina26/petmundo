
/* =====================================
   PETMUNDO - PASSAPORTE DIGITAL
===================================== */

function dataPassaporte(data) {
    if (!data) return "";

    const dataObjeto = new Date(data);

    if (isNaN(dataObjeto.getTime())) return "";

    return dataObjeto.toLocaleDateString("pt-BR");
}

function escaparPassaporte(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

