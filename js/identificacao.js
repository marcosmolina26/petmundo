
/* =====================================
   PETMUNDO - IDENTIFICAÇÃO E QR CODE
===================================== */

function gerarQRCodePetmundo(elemento, codigo) {
    if (!elemento || !codigo) {
        console.error("Elemento ou código do PETMUNDO ID não informado.");
        return;
    }

    elemento.innerHTML = "";

    if (typeof QRCode === "undefined") {
        console.error("Biblioteca QRCode não carregada.");
        return;
    }

    new QRCode(elemento, {
        text: codigo,
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.H
    });
}

